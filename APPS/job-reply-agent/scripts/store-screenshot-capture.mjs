import path from "node:path";

process.env.STORE_SCREENSHOT_DIR ||= path.resolve(import.meta.dirname, "..", ".local", "store-assets");
await import("./customer-journey-smoke.mjs");
