import type { Express } from "express";
import { authStorage } from "./storage";
import { getAuthenticatedSessionUser, isAuthenticated } from "./supabaseAuth";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  const sendAuthenticatedUser = async (req: any, res: any) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user ?? null);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  };

  const sendSessionUser = async (req: any, res: any) => {
    try {
      const sessionUser = await getAuthenticatedSessionUser(req);
      if (!sessionUser?.claims?.sub) {
        return res.json(null);
      }

      const user = await authStorage.getUser(sessionUser.claims.sub);
      return res.json(user ?? null);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  };

  app.get("/api/auth/session", sendSessionUser);

  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, sendAuthenticatedUser);

  // Backward compatibility alias for older frontend bundles.
  app.get("/api/auth/me", isAuthenticated, sendAuthenticatedUser);
}
