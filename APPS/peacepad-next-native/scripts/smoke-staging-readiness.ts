import { smokeStagingReadiness } from "../src/staging/StagingSmoke";

const target = process.env.PEACEPAD_STAGING_SMOKE_URL;
if (!target) throw new Error("PEACEPAD_STAGING_SMOKE_URL is required.");
await smokeStagingReadiness(target);
console.info(JSON.stringify({ event: "staging.smoke.passed", target: new URL(target).origin }));
