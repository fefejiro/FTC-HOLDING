import assert from "node:assert/strict";
import test from "node:test";

import { evaluateChanges, matches } from "./cf-pages-ignore-build.mjs";

test("wildcards match nested Cloudflare paths", () => {
  assert.equal(matches("APPS/peacepad/*", "APPS/peacepad/client/src/App.tsx"), true);
  assert.equal(matches("APPS/peacepad/*.md", "APPS/peacepad/README.md"), true);
  assert.equal(matches("APPS/peacepad/*.md", "APPS/peacepad/docs/STATUS.md"), true);
  assert.equal(matches("APPS/saywetin/*", "APPS/peacepad/client/src/App.tsx"), false);
});

test("PeacePad documentation and release-prep files skip Pages", () => {
  const result = evaluateChanges("ftc-holding", [
    "APPS/peacepad/docs/STATUS.md",
    "APPS/peacepad/ios-prep/APP_REVIEW_RESPONSE_2_1.md",
    "APPS/peacepad/README.md",
  ]);

  assert.equal(result.decision, "skip");
  assert.deepEqual(result.matchedFiles, []);
});

test("PeacePad application source still triggers Pages", () => {
  const result = evaluateChanges("ftc-holding", [
    "APPS/peacepad/client/src/App.tsx",
    "APPS/peacepad/docs/STATUS.md",
  ]);

  assert.equal(result.decision, "build");
  assert.deepEqual(result.matchedFiles, ["APPS/peacepad/client/src/App.tsx"]);
});

test("unrelated monorepo changes skip a known Pages project", () => {
  const result = evaluateChanges("ftc-holding", [
    "DOCS/CLOUDFLARE_MONOREPO_DEPLOY_GUARDS.md",
    "APPS/una-social-agent/README.md",
  ]);

  assert.equal(result.decision, "skip");
});

test("unknown projects fail open so a valid build is never silently suppressed", () => {
  const result = evaluateChanges("unknown-project", ["APPS/peacepad/client/src/App.tsx"]);

  assert.equal(result.decision, "build");
  assert.equal(result.reason, "unknown-project");
});
