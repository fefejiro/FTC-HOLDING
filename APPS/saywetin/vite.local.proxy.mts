import { defineConfig, mergeConfig } from "vite";
import base from "./vite.config.ts";

export default mergeConfig(base, defineConfig({
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:8001", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:8001", changeOrigin: true },
      "/__replit_health": { target: "http://127.0.0.1:8001", changeOrigin: true }
    }
  }
}));
