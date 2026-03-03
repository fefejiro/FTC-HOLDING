import type { Request, RequestHandler, Response } from "express";

type GuestIdentity = {
  session: {
    sessionId: string;
    guestId: string;
    userId: string;
    expiresAt: string | Date;
  };
  trial: {
    expiresAt: string;
    isExpired: boolean;
  };
};

type UpgradeDependencies = {
  storage: {
    migrateGuestDataToUser: (guestUserId: string, userId: string) => Promise<void>;
    markGuestSessionUpgradedBySessionId?: (sessionId: string, userId: string) => Promise<void>;
    markGuestSessionUpgraded: (guestId: string, userId: string) => Promise<void>;
  };
  resolveGuestIdentity: (req: Request, options?: { allowExpired?: boolean }) => Promise<GuestIdentity | null>;
  clearGuestCookie: (req: Request, res: Response) => void;
};

const GUEST_COOKIE_NAME = "peacepad_guest";

function hasUpgradeConfirmation(body: any): boolean {
  return body?.confirmUpgrade === true;
}

function getAuthenticatedUserId(req: any): string | null {
  const fromClaims = req?.user?.claims?.sub;
  if (typeof fromClaims === "string" && fromClaims.trim()) {
    return fromClaims;
  }

  const fromUserId = req?.user?.id;
  if (typeof fromUserId === "string" && fromUserId.trim()) {
    return fromUserId;
  }

  return null;
}

function hasGuestCookie(req: Request): boolean {
  const rawCookie = String((req as any)?.headers?.cookie || "");
  return rawCookie
    .split(";")
    .map((part) => part.trim())
    .some((part) => part.startsWith(`${GUEST_COOKIE_NAME}=`));
}

export function createUpgradeFromGuestHandler({
  storage,
  resolveGuestIdentity,
  clearGuestCookie,
}: UpgradeDependencies): RequestHandler {
  return async (req: any, res) => {
    try {
      const authUserId = getAuthenticatedUserId(req);
      if (!authUserId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!hasUpgradeConfirmation(req.body)) {
        return res.status(400).json({
          message: "Upgrade confirmation is required",
          code: "UPGRADE_CONFIRMATION_REQUIRED",
        });
      }

      if (!hasGuestCookie(req)) {
        clearGuestCookie(req, res);
        return res.status(401).json({
          message: "No valid guest session found",
          code: "GUEST_SESSION_NOT_FOUND",
        });
      }

      const guestIdentity = await resolveGuestIdentity(req, { allowExpired: true });
      if (!guestIdentity) {
        clearGuestCookie(req, res);
        return res.status(401).json({
          message: "No valid guest session found",
          code: "GUEST_SESSION_NOT_FOUND",
        });
      }

      if (guestIdentity.trial.isExpired) {
        return res.status(403).json({
          code: "TRIAL_EXPIRED",
          message: "Guest session has expired. Please sign in again to continue.",
          expiresAt: guestIdentity.trial.expiresAt,
        });
      }

      await storage.migrateGuestDataToUser(guestIdentity.session.userId, authUserId);

      if (storage.markGuestSessionUpgradedBySessionId) {
        await storage.markGuestSessionUpgradedBySessionId(guestIdentity.session.sessionId, authUserId);
      } else {
        await storage.markGuestSessionUpgraded(guestIdentity.session.guestId, authUserId);
      }

      clearGuestCookie(req, res);

      if (req.session) {
        delete req.session.userId;
        delete req.session.sessionId;
        delete req.session.guestId;
      }

      return res.json({
        success: true,
        upgraded: true,
        guestSessionId: guestIdentity.session.sessionId,
        upgradedToUserId: authUserId,
        mergeStrategy: "prefer-authenticated-user",
      });
    } catch (error) {
      console.error("Error upgrading from guest session:", error);
      return res.status(500).json({ message: "Failed to upgrade guest session" });
    }
  };
}
