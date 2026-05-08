const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL"
];

const OPTIONAL_VARS = [
  "NEXT_PUBLIC_GARDEN_PORTAL_ADMIN_EMAILS",
  "RESEND_API_KEY",
  "GARDEN_CLEANERS_ADMIN_EMAIL",
  "GARDEN_CLEANERS_QUOTE_WEBHOOK_URL"
];

const missing = REQUIRED_VARS.filter((name) => !String(process.env[name] || "").trim());

if (missing.length > 0) {
  console.error("[garden-portal-env] Missing required environment variables:");
  for (const name of missing) {
    console.error(`- ${name}`);
  }
  process.exit(1);
}

console.log("[garden-portal-env] Required environment variables are set.");

const missingOptional = OPTIONAL_VARS.filter((name) => !String(process.env[name] || "").trim());
if (missingOptional.length > 0) {
  console.log("[garden-portal-env] Optional variables not set (non-blocking):");
  for (const name of missingOptional) {
    console.log(`- ${name}`);
  }
}
