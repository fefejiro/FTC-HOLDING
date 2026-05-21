/// <reference types="vite-plugin-pwa/client" />

declare const __SAYWETIN_FRONTEND_BUILD__: {
  appName: string;
  version: string;
  commitSha: string | null;
  buildTime: string;
  deploymentId: string | null;
};
