import { Resend } from "resend";

export interface TransactionalEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

function emailConfig() {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(
    process.env.TRANSACTIONAL_EMAIL_FROM
    || "Una Labs JobAgent <jobagent@unalabs.cloud>"
  ).trim();
  const appOrigin = String(process.env.APP_ORIGIN || "").replace(/\/$/, "");
  if (process.env.NODE_ENV === "production" && (!apiKey || !appOrigin.startsWith("https://"))) {
    throw new Error("Transactional email and HTTPS application origin must be configured.");
  }
  return { apiKey, from, appOrigin };
}

export function transactionalEmailConfigured(): boolean {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const appOrigin = String(process.env.APP_ORIGIN || "").replace(/\/$/, "");
  return Boolean(apiKey && appOrigin.startsWith("https://"));
}

function link(pathname: string, token: string): string {
  const { appOrigin } = emailConfig();
  return `${appOrigin}${pathname}?token=${encodeURIComponent(token)}`;
}

export async function sendTransactionalEmail(message: TransactionalEmail): Promise<string | null> {
  const { apiKey, from } = emailConfig();
  if (!apiKey) return null;
  const response = await new Resend(apiKey).emails.send({
    from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html
  });
  if (response.error) throw new Error(`Transactional email failed: ${response.error.message}`);
  return response.data?.id || null;
}

export async function sendVerificationEmail(email: string, token: string) {
  const url = link("/verify-email", token);
  return await sendTransactionalEmail({
    to: email,
    subject: "Verify your Una Labs JobAgent email",
    text: `Verify your email to continue setting up JobAgent: ${url}\n\nThis link expires in 24 hours.`,
    html: `<p>Verify your email to continue setting up JobAgent.</p><p><a href="${url}">Verify email</a></p><p>This link expires in 24 hours.</p>`
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = link("/reset-password", token);
  return await sendTransactionalEmail({
    to: email,
    subject: "Reset your Una Labs JobAgent password",
    text: `Reset your JobAgent password: ${url}\n\nThis link expires in one hour. Ignore this message if you did not request it.`,
    html: `<p>Reset your JobAgent password.</p><p><a href="${url}">Reset password</a></p><p>This link expires in one hour. Ignore this message if you did not request it.</p>`
  });
}

export async function sendInvitationEmail(email: string, token: string, expiresAt: string) {
  const url = link("/accept-invite", token);
  return await sendTransactionalEmail({
    to: email,
    subject: "Your Una Labs JobAgent invitation",
    text: `Your private JobAgent invitation is ready: ${url}\n\nIt expires ${expiresAt}.`,
    html: `<p>Your private JobAgent invitation is ready.</p><p><a href="${url}">Accept invitation</a></p><p>It expires ${expiresAt}.</p>`
  });
}

export async function verifyResendWebhook(
  rawPayload: string,
  headers: { id: string; timestamp: string; signature: string }
): Promise<Record<string, any>> {
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const webhookSecret = String(process.env.RESEND_INBOUND_WEBHOOK_SECRET || "").trim();
  if (!apiKey || !webhookSecret) throw new Error("Inbound email webhook is not configured.");
  return new Resend(apiKey).webhooks.verify({
    payload: rawPayload,
    headers,
    webhookSecret
  }) as Record<string, any>;
}
