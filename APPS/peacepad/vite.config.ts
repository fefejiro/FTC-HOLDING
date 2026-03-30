import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const isReplitDevelopment =
  process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined;

export default defineConfig(async () => {
  const replitDevPlugins = isReplitDevelopment
    ? [
        (await import("@replit/vite-plugin-runtime-error-modal")).default(),
        await import("@replit/vite-plugin-cartographer").then((m) =>
          m.cartographer(),
        ),
        await import("@replit/vite-plugin-dev-banner").then((m) =>
          m.devBanner(),
        ),
      ]
    : [];

  return {
    plugins: [
      react(),
      ...replitDevPlugins,
    ],
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
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React core into its own chunk (rarely changes)
          'react-vendor': ['react', 'react-dom'],
          // Split UI framework (Radix components)
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-select',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch',
            '@radix-ui/react-avatar',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
            '@radix-ui/react-label',
            '@radix-ui/react-toast',
          ],
          // Split charting library (heavy, only used in some pages)
          'recharts': ['recharts'],
          // Split date utilities
          'date-utils': ['date-fns', 'date-fns-tz'],
          // Split form handling
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Split TanStack Query
          'query': ['@tanstack/react-query'],
          // Split animation libraries
          'animation': ['framer-motion'],
        },
      },
    },
  },
  server: {
    host: true,
    hmr: false,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  };
});
