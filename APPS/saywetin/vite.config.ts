import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "path";

const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(import.meta.dirname, "package.json"), "utf8"),
) as { version?: string; name?: string };

const frontendBuildInfo = {
  appName: packageJson.name || "saywetin-web",
  version: packageJson.version || "0.0.0",
  commitSha:
    process.env.VITE_APP_COMMIT_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    null,
  buildTime:
    process.env.VITE_APP_BUILD_TIME ||
    process.env.BUILD_TIME ||
    new Date().toISOString(),
  deploymentId:
    process.env.CF_PAGES_DEPLOYMENT_ID ||
    null,
};

const config = {
  plugins: [
    react(),
  ],
  define: {
    __SAYWETIN_FRONTEND_BUILD__: JSON.stringify(frontendBuildInfo),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
};

export default config;
