import { defineConfig, type PluginOption } from "vite";
import { VitePWA } from "vite-plugin-pwa";
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

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      includeAssets: [
        "favicon.png",
        "apple-touch-icon.png",
        "app-icon.jpg",
        "saywetin-logo.png",
        "og-image.png",
      ],
      manifest: {
        id: "/",
        name: "SayWetin: Lyrics & Meaning",
        short_name: "SayWetin",
        description:
          "Recognize songs, follow live lyrics, and understand slang and cultural meaning.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0A0A0F",
        theme_color: "#00C853",
        categories: ["music", "lifestyle", "entertainment"],
        icons: [
          {
            src: "/apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/saywetin-logo.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        shortcuts: [
          {
            name: "Listen Now",
            short_name: "Listen",
            description: "Start listening and recognize what is playing.",
            url: "/",
            icons: [{ src: "/favicon.png", sizes: "32x32", type: "image/png" }],
          },
          {
            name: "Search Lyrics",
            short_name: "Search",
            description: "Search lyrics, artist names, and slang meanings.",
            url: "/explore",
            icons: [{ src: "/favicon.png", sizes: "32x32", type: "image/png" }],
          },
        ],
      },
      workbox: {
        navigateFallback: "/index.html",
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.saywetin\.app\/.*$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "saywetin-api",
              networkTimeoutSeconds: 8,
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60,
              },
            },
          },
          {
            urlPattern: /\/assets\/.*\.(?:js|css|woff2?|png|jpe?g|webp|svg)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "saywetin-assets",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }) as unknown as PluginOption,
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
});
