import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";

const oidcClientId = process.env.OIDC_CLIENT_ID ?? process.env.REPL_ID;
const oidcIssuerUrl = process.env.OIDC_ISSUER_URL ?? process.env.ISSUER_URL ?? "https://replit.com/oidc";
const oidcEnabled = Boolean(oidcClientId);

function getSessionSecret(): string {
  const configured = process.env.SESSION_SECRET?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV !== "production") {
    return "dev-session-secret-change-me";
  }

  throw new Error("SESSION_SECRET must be set in production.");
}

function getStringValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function getSupabaseAuthBaseUrl(): string {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim().replace(/\/+$/, "");
}

function getSupabaseAnonKey(): string {
  return (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
}

const getOidcConfig = memoize(
  async () => {
    if (!oidcClientId) {
      throw new Error("OIDC client ID is not configured. Set OIDC_CLIENT_ID or REPL_ID.");
    }

    return await client.discovery(new URL(oidcIssuerUrl), oidcClientId);
  },
  { maxAge: 3600 * 1000 },
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret: getSessionSecret(),
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await authStorage.upsertUser({
    id: claims.sub,
    email: claims.email,
    firstName: claims.first_name,
    lastName: claims.last_name,
    profileImageUrl: claims.profile_image_url,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  let oidcConfig: Awaited<ReturnType<typeof getOidcConfig>> | null = null;
  if (oidcEnabled) {
    oidcConfig = await getOidcConfig();
  } else {
    console.warn("[Auth] OIDC disabled (OIDC_CLIENT_ID/REPL_ID not set). /api/login will return 503.");
  }

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback,
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    if (!oidcConfig) {
      throw new Error("OIDC is not configured.");
    }

    const normalizedDomain = domain.split(":")[0].toLowerCase();
    const strategyName = `replitauth:${normalizedDomain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config: oidcConfig,
          scope: "openid email profile offline_access",
          callbackURL: `https://${normalizedDomain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }

    return strategyName;
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    if (!oidcEnabled) {
      return res.status(503).json({ message: "OIDC authentication is not configured." });
    }

    const strategyName = ensureStrategy(req.hostname);
    return passport.authenticate(strategyName, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    if (!oidcEnabled) {
      return res.status(503).json({ message: "OIDC authentication is not configured." });
    }

    const strategyName = ensureStrategy(req.hostname);
    return passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  // Exchange a Supabase access token for a server-side cookie session.
  // This lets web/mobile Supabase auth coexist with existing passport/session routes.
  app.post("/api/auth/supabase/exchange", async (req, res) => {
    try {
      const accessToken = getStringValue(req.body?.accessToken);
      if (!accessToken) {
        return res.status(400).json({ message: "accessToken is required" });
      }

      const supabaseBaseUrl = getSupabaseAuthBaseUrl();
      if (!supabaseBaseUrl) {
        return res.status(500).json({ message: "Supabase auth is not configured on the server." });
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${accessToken}`,
      };

      const supabaseAnonKey = getSupabaseAnonKey();
      if (supabaseAnonKey) {
        headers.apikey = supabaseAnonKey;
      }

      const userResponse = await fetch(`${supabaseBaseUrl}/auth/v1/user`, {
        method: "GET",
        headers,
      });

      if (!userResponse.ok) {
        return res.status(401).json({ message: "Invalid Supabase access token." });
      }

      const supabaseUser = (await userResponse.json()) as {
        id?: string;
        email?: string;
        user_metadata?: Record<string, unknown>;
      };

      const userId = getStringValue(supabaseUser.id);
      if (!userId) {
        return res.status(401).json({ message: "Supabase user payload is invalid." });
      }

      const metadata = supabaseUser.user_metadata || {};
      const email = getStringValue(supabaseUser.email);
      const firstName =
        getStringValue(metadata.given_name) ||
        getStringValue(metadata.first_name);
      const lastName =
        getStringValue(metadata.family_name) ||
        getStringValue(metadata.last_name);
      const profileImageUrl =
        getStringValue(metadata.avatar_url) ||
        getStringValue(metadata.picture);

      const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
      const claims = {
        sub: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        profile_image_url: profileImageUrl,
        exp: expiresAt,
      };

      await upsertUser(claims);

      const sessionUser = {
        claims,
        access_token: accessToken,
        refresh_token: undefined,
        expires_at: expiresAt,
      };

      req.logIn(sessionUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to create session." });
        }

        return res.json({ success: true });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[Auth] Supabase exchange error:", message);
      return res.status(500).json({ message: "Failed to complete Supabase authentication." });
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          console.error("[Auth] Error destroying session:", err);
        }

        res.clearCookie("connect.sid", { path: "/" });

        if (oidcEnabled && oidcConfig && oidcClientId) {
          res.redirect(
            client.buildEndSessionUrl(oidcConfig, {
              client_id: oidcClientId,
              post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
            }).href,
          );
          return;
        }

        res.redirect("/");
      });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  const isSessionAuthenticated =
    typeof req.isAuthenticated === "function" && req.isAuthenticated();

  if (!isSessionAuthenticated || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken || !oidcEnabled) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
