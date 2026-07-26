import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import crypto from "crypto";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { sendNewUserAdminNotification } from "./email";
import { db } from "./db";
import { mobileAuthTokens, mobileAuthStates as mobileAuthStatesTable } from "@shared/schema";
import { eq, and, gt, lt, isNull } from "drizzle-orm";
import { config as appConfig } from "./config";

// Extend session type to include mobile auth flag
declare module 'express-session' {
  interface SessionData {
    mobileAuth?: boolean;
    mobileState?: string;
  }
}

const getOidcConfig = memoize(
  async () => {
    if (!appConfig.auth.oidcClientId) {
      throw new Error("OIDC client ID is not configured. Set OIDC_CLIENT_ID.");
    }
    return await client.discovery(
      new URL(appConfig.auth.oidcIssuerUrl),
      appConfig.auth.oidcClientId
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: appConfig.database.url,
    createTableIfMissing: false,
    ttl: sessionTtl,
    schemaName: process.env.SESSION_SCHEMA || "public",
    tableName: "sessions",
  });
  return session({
    secret: appConfig.auth.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'lax', // Allow cookie on OAuth redirects from Replit
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Generate displayName from firstName and lastName
  const firstName = claims["first_name"] || "";
  const lastName = claims["last_name"] || "";
  const displayName = `${firstName} ${lastName}`.trim() || claims["email"]?.split("@")[0] || "User";
  
  const { user, isNewUser } = await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    displayName,
  });
  
  // Send admin notification for new user signups
  if (isNewUser) {
    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'New User';
    console.log("[Auth] New user signup completed");
    
    // Send admin notification email asynchronously (don't block auth flow)
    sendNewUserAdminNotification(
      user.email || 'No email provided',
      userName,
      user.id,
      user.createdAt || new Date()
    ).catch(error => {
      console.error('[Auth] Failed to send admin notification:', error);
    });
  }
  
  return user;
}

function getSupabaseAuthBaseUrl(): string {
  return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim().replace(/\/+$/, "");
}

function getSupabaseAnonKey(): string {
  return (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "").trim();
}

function getStringValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

// Store registered domains and OIDC config for dynamic registration
const registeredDomains: string[] = [];
const pendingRegistrations = new Map<string, Promise<string>>(); // Prevent race conditions
let oidcConfig: any = null;
let verifyCallback: VerifyFunction | null = null;

// Mobile auth state DB helpers (replaces in-memory Map for autoscale compatibility)
async function storeMobileAuthState(state: string, nonce: string, codeVerifier: string, hostname: string) {
  await db.insert(mobileAuthStatesTable).values({ state, nonce, codeVerifier, hostname });
}

async function getMobileAuthState(state: string) {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const [record] = await db.select().from(mobileAuthStatesTable)
    .where(and(
      eq(mobileAuthStatesTable.state, state),
      gt(mobileAuthStatesTable.createdAt, tenMinutesAgo)
    ))
    .limit(1);
  return record || null;
}

async function deleteMobileAuthState(state: string) {
  await db.delete(mobileAuthStatesTable).where(eq(mobileAuthStatesTable.state, state));
}

async function cleanupExpiredMobileAuthStates() {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  await db.delete(mobileAuthStatesTable).where(lt(mobileAuthStatesTable.createdAt, tenMinutesAgo));
}

// Allowed domains whitelist - only these can have OAuth strategies
// SECURITY: This prevents Host header injection attacks
function getAllowedDomains(): string[] {
  return appConfig.auth.allowedHostnames;
}

// Normalize and validate hostname
function normalizeHostname(hostname: string): string {
  // Remove port if present
  const normalized = hostname.split(':')[0].toLowerCase().trim();
  return normalized;
}

// Helper to get or create the correct strategy for a hostname
async function ensureStrategy(hostname: string): Promise<string> {
  // Normalize hostname for security
  const normalizedHost = normalizeHostname(hostname);
  const strategyName = `replitauth:${normalizedHost}`;
  
  // SECURITY: Check if domain is in allowlist
  const allowedDomains = getAllowedDomains();
  if (!allowedDomains.includes(normalizedHost)) {
    console.error(`[Auth Security] Rejected unauthorized domain: ${normalizedHost}`);
    console.error(`[Auth Security] Allowed domains: ${allowedDomains.join(', ')}`);
    throw new Error(`Domain ${normalizedHost} is not authorized for OAuth`);
  }
  
  // If already registered, return it
  if (registeredDomains.includes(normalizedHost)) {
    return strategyName;
  }
  
  // Check for pending registration to prevent race conditions
  if (pendingRegistrations.has(normalizedHost)) {
    console.log(`[Auth] Waiting for pending registration of: ${normalizedHost}`);
    return await pendingRegistrations.get(normalizedHost)!;
  }
  
  // Create pending promise to prevent concurrent registrations
  const registrationPromise = (async () => {
    try {
      console.log(`[Auth] Dynamically registering strategy for allowed domain: ${normalizedHost}`);
      
      if (!oidcConfig || !verifyCallback) {
        throw new Error("OIDC config not initialized");
      }
      
      const strategy = new Strategy(
        {
          name: strategyName,
          config: oidcConfig,
          scope: "openid email profile offline_access",
          callbackURL: `https://${normalizedHost}/api/callback`,
        },
        verifyCallback,
      );
      
      passport.use(strategy);
      registeredDomains.push(normalizedHost);
      console.log(`[Auth] Strategy registered: ${strategyName}`);
      
      return strategyName;
    } finally {
      pendingRegistrations.delete(normalizedHost);
    }
  })();
  
  pendingRegistrations.set(normalizedHost, registrationPromise);
  return await registrationPromise;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  const hasSharedSession = Boolean(app.get("softAuthSessionConfigured"));
  if (!hasSharedSession) {
    app.use(getSession());
  } else if (process.env.NODE_ENV !== "production") {
    console.log("[Auth] Reusing shared session middleware from softAuth");
  }
  app.use(passport.initialize());
  app.use(passport.session());

  // Public OIDC/Supabase sign-in is intentionally unavailable in the focused
  // App Review recovery release. Reviewer access is isolated in softAuth.
  const legacyPublicAuthDisabled = process.env.NODE_ENV === "production";
  const oidcEnabled = appConfig.auth.oidcEnabled && !legacyPublicAuthDisabled;
  let oidcProviderConfig: Awaited<ReturnType<typeof getOidcConfig>> | null = null;

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };
  verifyCallback = verify;

  if (oidcEnabled) {
    oidcProviderConfig = await getOidcConfig();
    oidcConfig = oidcProviderConfig;

    const domains = getAllowedDomains();
    console.log("[Auth] Registering OIDC strategies for domains:", domains);

    for (const domain of domains) {
      const trimmedDomain = domain.trim().toLowerCase();
      if (!trimmedDomain) {
        continue;
      }

      if (!registeredDomains.includes(trimmedDomain)) {
        registeredDomains.push(trimmedDomain);
      }
      const strategyName = `replitauth:${trimmedDomain}`;
      console.log(`[Auth] Registering strategy: ${strategyName}`);

      const strategy = new Strategy(
        {
          name: strategyName,
          config: oidcProviderConfig,
          scope: "openid email profile offline_access",
          callbackURL: `https://${trimmedDomain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }
    console.log("[Auth] OIDC strategies registered successfully");
  } else {
    oidcConfig = null;
    verifyCallback = null;
    console.warn("[Auth] OIDC is disabled. Set OIDC_CLIENT_ID to enable /api/login and /api/callback.");
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", async (req, res, next) => {
    if (legacyPublicAuthDisabled) {
      return res.status(404).json({ message: "Not found" });
    }
    if (!oidcEnabled) {
      return res.status(503).json({ message: "OIDC authentication is not configured." });
    }
    try {
      const strategyName = await ensureStrategy(req.hostname);
      console.log(`[Auth] Login requested - hostname: ${req.hostname}, strategy: ${strategyName}`);
      passport.authenticate(strategyName, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } catch (error) {
      console.error("[Auth] Error during login:", error);
      const message = error instanceof Error ? error.message : "Authentication configuration error";
      res.status(403).json({ message });
    }
  });

  app.get("/api/callback", async (req, res, next) => {
    if (legacyPublicAuthDisabled) {
      return res.status(404).send("Not found");
    }
    if (!oidcEnabled) {
      return res.status(503).send("OIDC authentication is not configured.");
    }
    try {
      const stateParam = req.query.state as string | undefined;
      const codeParam = req.query.code as string | undefined;
      console.log(`[Auth] Callback received - hostname: ${req.hostname}`);
      
      // Check if this is a mobile app OAuth flow by matching state against database
      const mobileState = stateParam ? await getMobileAuthState(stateParam) : null;
      const isMobileCallback = !!mobileState;
      
      console.log(`[Auth] Mobile detection: viaState=${isMobileCallback}`);
      
      if (isMobileCallback && mobileState && codeParam) {
        // MOBILE FLOW: Handle entirely without passport (bypass session dependency)
        // This works because we stored the PKCE code_verifier in the database
        await deleteMobileAuthState(stateParam!);
        console.log(`[Auth] Mobile callback - manually exchanging code with stored PKCE verifier`);
        
        try {
          const config = await getOidcConfig();
          const normalizedHost = normalizeHostname(req.hostname);
          const redirectUri = `https://${normalizedHost}/api/callback`;
          
          // Build the callback URL with all query params for openid-client
          const callbackUrl = new URL(redirectUri);
          for (const [key, value] of Object.entries(req.query)) {
            if (typeof value === 'string') {
              callbackUrl.searchParams.set(key, value);
            }
          }
          
          // Exchange auth code for tokens using our stored PKCE code_verifier
          const tokens = await client.authorizationCodeGrant(
            config,
            callbackUrl,
            {
              pkceCodeVerifier: mobileState.codeVerifier,
              expectedState: mobileState.state,
              expectedNonce: mobileState.nonce,
            }
          );
          
          console.log("[Auth] Mobile token exchange successful");
          
          // Get user claims from tokens
          const claims = tokens.claims();
          if (!claims) {
            console.error("[Auth] Mobile: No claims in token response");
            return res.redirect("/api/auth/mobile-complete?error=no_claims");
          }
          
          // Upsert user in database (same as passport verify callback)
          await upsertUser(claims);
          
          // Create a passport-compatible session user object to store with the token
          const sessionUser: any = {};
          updateUserSession(sessionUser, tokens);
          
          // Generate a one-time token for the mobile app to exchange
          const mobileToken = crypto.randomBytes(32).toString('hex');
          await db.insert(mobileAuthTokens).values({
            userId: claims.sub as string,
            token: mobileToken,
            sessionData: JSON.stringify(sessionUser),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
          });
          
          console.log("[Auth] Mobile auth generated a one-time token");
          
          // Redirect to custom scheme - this always triggers the Android intent-filter
          // The app's deep link handler will exchange this token for a session in the WebView
          return res.redirect(`peacepad://auth-success?token=${mobileToken}`);

        } catch (mobileErr) {
          console.error("[Auth] Mobile token exchange error:", mobileErr);
          return res.redirect("/api/auth/mobile-complete?error=exchange_failed");
        }
      }
      
      // STANDARD WEB FLOW: Use passport as normal (only runs when NOT a mobile callback)
      const strategyName = await ensureStrategy(req.hostname);
      
      passport.authenticate(strategyName, (err: any, user: any, info: any) => {
        if (err) {
          console.error("[Auth] Authentication error:", err);
          return res.redirect("/api/login");
        }
        if (!user) {
          console.error("[Auth] No user returned:", info);
          return res.redirect("/api/login");
        }
        
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error("[Auth] Login error:", loginErr);
            return res.redirect("/api/login");
          }
          
          // For web, redirect to home
          return res.redirect("/");
        });
      })(req, res, next);
    } catch (error) {
      console.error("[Auth] Error during callback:", error);
      res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Authentication Error</title></head>
        <body style="font-family: system-ui; padding: 2rem; max-width: 600px; margin: 0 auto;">
          <h1>Authentication Error</h1>
          <p>${error instanceof Error ? error.message : 'Authentication configuration error'}</p>
          <p>Please contact support if this issue persists.</p>
        </body>
        </html>
      `);
    }
  });
  
  // Mobile-specific login endpoint
  // Uses the standard /api/callback but stores state to detect mobile flow
  // (session doesn't persist across external browser → app WebView)
  app.get("/api/login/mobile", async (req, res, next) => {
    if (legacyPublicAuthDisabled) {
      return res.status(404).json({ message: "Not found" });
    }
    if (!oidcEnabled) {
      return res.status(503).json({ message: "OIDC authentication is not configured." });
    }
    try {
      const hostname = req.hostname;
      const normalizedHost = normalizeHostname(hostname);
      console.log(`[Auth] Mobile login requested - hostname: ${normalizedHost}`);
      
      // Verify domain is allowed
      const allowedDomains = getAllowedDomains();
      if (!allowedDomains.includes(normalizedHost)) {
        console.error(`[Auth Security] Mobile login rejected for unauthorized domain: ${normalizedHost}`);
        return res.status(403).json({ message: `Domain ${normalizedHost} is not authorized` });
      }
      
      const config = await getOidcConfig();
      
      // Generate PKCE code_verifier and code_challenge ourselves
      const codeVerifier = client.randomPKCECodeVerifier();
      const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
      
      // Generate state and nonce
      const mobileState = crypto.randomBytes(32).toString('hex');
      const nonce = crypto.randomBytes(16).toString('hex');
      
      // Store in database (NOT session or memory, since autoscale may route callback to different instance)
      await storeMobileAuthState(mobileState, nonce, codeVerifier, normalizedHost);
      
      // Clean up expired states in background
      cleanupExpiredMobileAuthStates().catch(err => 
        console.error("[Auth] Failed to cleanup expired mobile auth states:", err)
      );
      
      console.log("[Auth] Mobile state created with PKCE verifier stored");
      
      // Manually construct the OIDC authorization URL
      // This avoids passport storing PKCE in session (which Chrome can't access)
      const authUrl = client.buildAuthorizationUrl(config, {
        redirect_uri: `https://${normalizedHost}/api/callback`,
        scope: "openid email profile offline_access",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state: mobileState,
        nonce,
        prompt: "login consent",
      });
      
      console.log(`[Auth] Mobile auth redirecting to: ${authUrl.origin}${authUrl.pathname}`);
      res.redirect(authUrl.href);
    } catch (error) {
      console.error("[Auth] Error during mobile login:", error);
      const message = error instanceof Error ? error.message : "Authentication configuration error";
      res.status(403).json({ message });
    }
  });
  
  // Mobile auth completion page - served as HTML inside the WebView
  // After OAuth callback creates the session, this page redirects to the app
  app.get("/api/auth/mobile-complete", (req, res) => {
    if (legacyPublicAuthDisabled) {
      return res.status(404).send("Not found");
    }
    const success = req.query.success === 'true';
    const error = req.query.error as string | undefined;
    
    console.log(`[Auth] Mobile complete page - success: ${success}, error: ${error || 'none'}`);
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-store, no-cache');
    
    if (success) {
      return res.send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PeacePad - Signing In</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#faf9f7;color:#3d3830;}
.container{text-align:center;padding:2rem;}
.spinner{width:40px;height:40px;border:3px solid #e8e5e0;border-top:3px solid #7c3aed;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 1.5rem;}
@keyframes spin{to{transform:rotate(360deg)}}
h2{font-size:1.25rem;margin:0 0 0.5rem;font-weight:600;}
p{color:#8a8278;font-size:0.9rem;margin:0;}
</style></head><body>
<div class="container">
<div class="spinner"></div>
<h2>Welcome to PeacePad</h2>
<p>Setting up your account...</p>
</div>
<script>setTimeout(function(){window.location.href='/';},800);</script>
</body></html>`);
    }
    
    const errorMessages: Record<string, string> = {
      no_claims: "Could not retrieve your account information.",
      session_failed: "Could not create your session. Please try again.",
      exchange_failed: "Authentication failed. Please try again.",
    };
    const message = errorMessages[error || ''] || "Something went wrong. Please try again.";
    
    return res.send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PeacePad - Sign In Error</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#faf9f7;color:#3d3830;}
.container{text-align:center;padding:2rem;max-width:320px;}
h2{font-size:1.25rem;margin:0 0 0.75rem;font-weight:600;}
p{color:#8a8278;font-size:0.9rem;margin:0 0 1.5rem;}
a{display:inline-block;padding:0.75rem 2rem;background:#7c3aed;color:#fff;border-radius:0.5rem;text-decoration:none;font-weight:500;}
</style></head><body>
<div class="container">
<h2>Sign In Issue</h2>
<p>${message}</p>
<a href="/api/login/mobile">Try Again</a>
</div>
</body></html>`);
  });
  
  // Exchange a one-time mobile auth token for a session in the WebView context
  // After OAuth completes in Chrome, the server generates a one-time token and redirects
  // to peacepad://auth-success?token=xxx. The app's deep link handler calls this endpoint
  // to create a proper session cookie inside the WebView.
  app.post("/api/auth/exchange-token", async (req, res) => {
    if (legacyPublicAuthDisabled) {
      return res.status(404).json({ message: "Not found" });
    }
    try {
      const { token } = req.body;
      
      if (!token || typeof token !== 'string') {
        console.log("[Auth] Token exchange failed - no token provided");
        return res.status(400).json({ message: "Token is required" });
      }
      
      // Find valid, unused token
      const [tokenRecord] = await db.select()
        .from(mobileAuthTokens)
        .where(
          and(
            eq(mobileAuthTokens.token, token),
            gt(mobileAuthTokens.expiresAt, new Date()),
            isNull(mobileAuthTokens.usedAt)
          )
        )
        .limit(1);
      
      if (!tokenRecord) {
        console.log("[Auth] Token exchange failed - token not found, expired, or already used");
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      // Mark token as used immediately to prevent replay
      await db.update(mobileAuthTokens)
        .set({ usedAt: new Date() })
        .where(eq(mobileAuthTokens.id, tokenRecord.id));
      
      // Use stored session data (passport-compatible user object with tokens) if available
      let sessionUser: any;
      if (tokenRecord.sessionData) {
        try {
          sessionUser = JSON.parse(tokenRecord.sessionData);
          console.log("[Auth] Token exchange - using stored passport session data");
        } catch {
          console.warn("[Auth] Token exchange - failed to parse session data, falling back to DB user");
        }
      }
      
      // Fallback: get user from database (won't have OAuth tokens but better than nothing)
      if (!sessionUser) {
        const user = await storage.getUser(tokenRecord.userId);
        if (!user || user.isDeactivated || user.deletedAt) {
          console.log("[Auth] Token exchange failed because the account is unavailable");
          return res.status(401).json({ message: "User not found" });
        }
        sessionUser = user;
      }

      const storedUser = await storage.getUser(tokenRecord.userId);
      if (!storedUser || storedUser.isDeactivated || storedUser.deletedAt) {
        return res.status(401).json({ message: "User not found" });
      }
      
      // Log user in - creates session cookie in WebView context
      req.logIn(sessionUser, (err) => {
        if (err) {
          console.error("[Auth] Token exchange login error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }
        
        console.log("[Auth] Token exchange completed");
        return res.json({ success: true });
      });
    } catch (error) {
      console.error("[Auth] Token exchange error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // Exchange a Supabase access token for the existing server-side session cookie.
  // This keeps the current middleware and route auth model unchanged.
  app.post("/api/auth/supabase/exchange", async (req, res) => {
    if (legacyPublicAuthDisabled) {
      return res.status(404).json({ message: "Not found" });
    }
    try {
      const accessToken = getStringValue(req.body?.accessToken);
      if (!accessToken) {
        return res.status(400).json({ message: "accessToken is required" });
      }

      const supabaseBaseUrl = getSupabaseAuthBaseUrl();
      if (!supabaseBaseUrl) {
        console.error("[Auth] Supabase exchange failed: SUPABASE_URL not configured");
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
        console.error(`[Auth] Supabase exchange rejected token: ${userResponse.status}`);
        return res.status(401).json({ message: "Invalid Supabase access token." });
      }

      const supabaseUser = await userResponse.json() as {
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
      const displayName =
        getStringValue(metadata.full_name) ||
        getStringValue(metadata.name) ||
        [firstName, lastName].filter(Boolean).join(" ").trim() ||
        (email ? email.split("@")[0] : "User");

      const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
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
          console.error("[Auth] Supabase exchange login error:", err.message || err);
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
      // Explicitly destroy the session from the database
      req.session.destroy((err) => {
        if (err) {
          console.error("[Auth] Error destroying session:", err);
        }
        // Clear both possible session cookies
        res.clearCookie('connect.sid', { path: '/' });
        res.clearCookie('peacepad.sid', { path: '/' });
        res.clearCookie('peacepad_guest', { path: '/' });
        
        if (oidcEnabled && oidcProviderConfig && appConfig.auth.oidcClientId) {
          res.redirect(
            client.buildEndSessionUrl(oidcProviderConfig, {
              client_id: appConfig.auth.oidcClientId,
              post_logout_redirect_uri: `${req.protocol}://${req.hostname}/?logged_out=1`,
            }).href
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

  const userId = user?.claims?.sub || user?.id;
  try {
    const storedUser = userId ? await storage.getUser(userId) : undefined;
    if (!storedUser || storedUser.isDeactivated || storedUser.deletedAt) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    if (!appConfig.auth.oidcEnabled) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const oidcRuntimeConfig = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(oidcRuntimeConfig, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

export const isAdmin: RequestHandler = async (req: any, res, next) => {
  const user = req.user as any;
  const isSessionAuthenticated =
    typeof req.isAuthenticated === "function" && req.isAuthenticated();

  if (!isSessionAuthenticated || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if user has admin flag
  try {
    const dbUser = await storage.getUser(user.claims?.sub);
    if (!dbUser?.isAdmin || dbUser.isDeactivated || dbUser.deletedAt) {
      return res.status(403).json({ message: "Admin access required" });
    }
    return next();
  } catch {
    return res.status(403).json({ message: "Admin access required" });
  }
};
