export const PRODUCT_SCHEMA_VERSION = "013_product_application_packages";

function safeValue(value: unknown, fallback: string): string {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

export function productReleaseInfo() {
  const commitSha = safeValue(
    process.env.RELEASE_SHA || process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GITHUB_SHA,
    "unknown"
  );
  const buildTimestamp = safeValue(
    process.env.BUILD_TIMESTAMP || process.env.RAILWAY_DEPLOYMENT_TIMESTAMP,
    "unknown"
  );
  const environment = safeValue(process.env.NODE_ENV, "development");
  const schemaVersion = safeValue(process.env.PRODUCT_SCHEMA_VERSION, PRODUCT_SCHEMA_VERSION);
  return { commitSha, buildTimestamp, environment, schemaVersion };
}
