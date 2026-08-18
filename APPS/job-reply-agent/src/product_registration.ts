export function configuredPublicSignupCap(value = process.env.PUBLIC_SIGNUP_CAP): number | null {
  const configured = String(value || "").trim();
  if (!configured) return null;
  const cap = Number(configured);
  if (!Number.isInteger(cap) || cap < 1 || cap > 1_000_000) {
    throw new Error("PUBLIC_SIGNUP_CAP must be an integer from 1 to 1000000 when configured.");
  }
  return cap;
}
