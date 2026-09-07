import crypto from "node:crypto";
import type pg from "pg";
import { google } from "googleapis";
import type { Credentials } from "google-auth-library";
import {
  consumeProductOAuthState,
  getProductConnectionSecret,
  saveConnectedGmailAccount,
  saveProductOAuthState
} from "./product_repository.js";
import {
  decryptProductSecret,
  encryptProductSecret,
  type SecretKeyring
} from "./product_secret_crypto.js";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.compose"
];

export interface ProductGmailOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GmailOAuthDeps {
  exchangeCode(config: ProductGmailOAuthConfig, code: string, codeVerifier: string): Promise<Credentials>;
  fetchMailbox(config: ProductGmailOAuthConfig, tokens: Credentials): Promise<string>;
  revokeToken(config: ProductGmailOAuthConfig, token: string): Promise<void>;
}

function base64Url(bytes: Buffer): string {
  return bytes.toString("base64url");
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function pkceChallenge(verifier: string): string {
  return base64Url(crypto.createHash("sha256").update(verifier).digest());
}

function createOAuthClient(config: ProductGmailOAuthConfig) {
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

export function productGmailOAuthConfig(): ProductGmailOAuthConfig {
  const appOrigin = String(process.env.APP_ORIGIN || "").replace(/\/$/, "");
  const config = {
    clientId: String(process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "").trim(),
    clientSecret: String(process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "").trim(),
    redirectUri: String(
      process.env.GMAIL_PRODUCT_REDIRECT_URI
      || (appOrigin ? `${appOrigin}/api/v1/oauth/gmail/callback` : "")
    ).trim()
  };
  if (!config.clientId || !config.clientSecret || !config.redirectUri) {
    throw new Error("Product Gmail OAuth client configuration is incomplete.");
  }
  if (process.env.NODE_ENV === "production" && !config.redirectUri.startsWith("https://")) {
    throw new Error("Product Gmail OAuth redirect URI must use HTTPS in production.");
  }
  return config;
}

const defaultDeps: GmailOAuthDeps = {
  async exchangeCode(config, code, codeVerifier) {
    const oauth = createOAuthClient(config);
    const response = await oauth.getToken({ code, codeVerifier } as any);
    return response.tokens;
  },
  async fetchMailbox(config, tokens) {
    const oauth = createOAuthClient(config);
    oauth.setCredentials(tokens);
    const gmail = google.gmail({ version: "v1", auth: oauth });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const mailbox = String(profile.data.emailAddress || "").trim().toLowerCase();
    if (!mailbox) throw new Error("Gmail did not return the authenticated mailbox identity.");
    return mailbox;
  },
  async revokeToken(config, token) {
    await createOAuthClient(config).revokeToken(token);
  }
};

export async function beginProductGmailOAuth(
  db: pg.Pool,
  userId: string,
  keyring?: SecretKeyring
): Promise<{ authorizationUrl: string; expiresAt: string }> {
  const config = productGmailOAuthConfig();
  const state = base64Url(crypto.randomBytes(32));
  const stateHash = sha256(state);
  const codeVerifier = base64Url(crypto.randomBytes(64));
  const encrypted = encryptProductSecret(
    { codeVerifier },
    `oauth-state:${userId}:gmail:${stateHash}`,
    keyring
  );
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await saveProductOAuthState(db, userId, {
    provider: "gmail",
    stateHash,
    encryptedCodeVerifier: encrypted.encryptedPayload,
    keyVersion: encrypted.keyVersion,
    redirectUri: config.redirectUri,
    expiresAt
  });
  const authorizationUrl = createOAuthClient(config).generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    state,
    code_challenge: pkceChallenge(codeVerifier),
    code_challenge_method: "S256" as any,
    scope: GMAIL_SCOPES
  });
  return { authorizationUrl, expiresAt: expiresAt.toISOString() };
}

export async function completeProductGmailOAuth(
  db: pg.Pool,
  input: {
    userId: string;
    expectedMailbox: string;
    code: string;
    state: string;
  },
  deps: GmailOAuthDeps = defaultDeps,
  keyring?: SecretKeyring
): Promise<{ mailbox: string }> {
  const config = productGmailOAuthConfig();
  const stateHash = sha256(input.state);
  const stored = await consumeProductOAuthState(db, input.userId, "gmail", stateHash);
  if (!stored || stored.redirectUri !== config.redirectUri) {
    throw new Error("Gmail authorization state is invalid, expired, or already used.");
  }
  const { codeVerifier } = decryptProductSecret<{ codeVerifier: string }>(
    stored.encryptedCodeVerifier,
    stored.keyVersion,
    `oauth-state:${input.userId}:gmail:${stateHash}`,
    keyring
  );
  const tokens = await deps.exchangeCode(config, input.code, codeVerifier);
  if (!tokens.refresh_token) {
    throw new Error("Gmail did not return an offline refresh token.");
  }
  const mailbox = (await deps.fetchMailbox(config, tokens)).trim().toLowerCase();
  if (mailbox !== input.expectedMailbox.trim().toLowerCase()) {
    await deps.revokeToken(config, tokens.refresh_token).catch(() => undefined);
    throw new Error(`Authenticated Gmail mailbox ${mailbox} does not match the account email.`);
  }
  const encrypted = encryptProductSecret(
    tokens,
    `connection:${input.userId}:gmail`,
    keyring
  );
  await saveConnectedGmailAccount(db, input.userId, {
    mailbox,
    encryptedPayload: encrypted.encryptedPayload,
    keyVersion: encrypted.keyVersion
  });
  return { mailbox };
}

export async function revokeProductGmailOAuth(
  db: pg.Pool,
  userId: string,
  deps: GmailOAuthDeps = defaultDeps,
  keyring?: SecretKeyring
): Promise<{ providerRevoked: boolean }> {
  const stored = await getProductConnectionSecret(db, userId, "gmail");
  if (!stored) return { providerRevoked: true };
  const tokens = decryptProductSecret<Credentials>(
    stored.encryptedPayload,
    stored.keyVersion,
    `connection:${userId}:gmail`,
    keyring
  );
  const token = tokens.refresh_token || tokens.access_token;
  if (!token) return { providerRevoked: false };
  try {
    await deps.revokeToken(productGmailOAuthConfig(), token);
    return { providerRevoked: true };
  } catch {
    return { providerRevoked: false };
  }
}
