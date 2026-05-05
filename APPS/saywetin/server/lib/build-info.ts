import fs from "node:fs";
import path from "node:path";

interface PackageJsonLike {
  name?: string;
  version?: string;
}

export interface BackendBuildInfo {
  appName: string;
  version: string;
  commitSha: string | null;
  buildTime: string | null;
  deploymentId: string | null;
  environment: string;
  deployRole: string | null;
}

let cachedPackageInfo: PackageJsonLike | null = null;

function loadPackageInfo(): PackageJsonLike {
  if (cachedPackageInfo) {
    return cachedPackageInfo;
  }

  const candidates = [
    path.resolve(process.cwd(), "package.json"),
    path.resolve(process.cwd(), "APPS", "saywetin", "package.json"),
  ];

  for (const candidate of candidates) {
    try {
      const raw = fs.readFileSync(candidate, "utf8");
      cachedPackageInfo = JSON.parse(raw) as PackageJsonLike;
      return cachedPackageInfo;
    } catch {
      // Try the next location.
    }
  }

  cachedPackageInfo = {};
  return cachedPackageInfo;
}

export function getBackendBuildInfo(env: NodeJS.ProcessEnv = process.env): BackendBuildInfo {
  const pkg = loadPackageInfo();

  return {
    appName: pkg.name || "saywetin-api",
    version: pkg.version || "0.0.0",
    commitSha:
      env.APP_COMMIT_SHA ||
      env.RAILWAY_GIT_COMMIT_SHA ||
      env.CF_PAGES_COMMIT_SHA ||
      env.GITHUB_SHA ||
      null,
    buildTime:
      env.APP_BUILD_TIME ||
      env.BUILD_TIME ||
      null,
    deploymentId:
      env.RAILWAY_DEPLOYMENT_ID ||
      env.CF_PAGES_DEPLOYMENT_ID ||
      null,
    environment: env.NODE_ENV || "development",
    deployRole: env.DEPLOY_ROLE || null,
  };
}
