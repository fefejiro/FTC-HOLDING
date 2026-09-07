import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./tests/global_setup.ts"],
    setupFiles: ["./tests/setup.ts"]
  }
});
