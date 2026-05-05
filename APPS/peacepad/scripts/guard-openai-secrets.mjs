import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const ALLOWLIST_PATHS = new Set([
  "client/public/.well-known/openai-verification.txt",
  "public/.well-known/openai-verification.txt",
]);

const PATTERNS = [
  {
    name: "OpenAI key-like prefix",
    regex: /\bsk[-_][A-Za-z0-9]{16,}\b/g,
  },
  {
    name: "OpenAI API key assignment",
    regex: /\bOPENAI(?:_API)?_KEY\b\s*[:=]\s*["'`][^"'`\r\n]{10,}["'`]/gi,
  },
  {
    name: "Bearer OpenAI key",
    regex: /\bBearer\s+sk[-_][A-Za-z0-9]{16,}\b/gi,
  },
];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function runGit(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024,
  });
}

function getTargetFiles(mode) {
  const args =
    mode === "all"
      ? ["ls-files"]
      : ["diff", "--cached", "--name-only", "--diff-filter=ACMR"];

  const output = runGit(args);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function readFileContentFromGit(filePath, mode) {
  try {
    const refPath = mode === "all" ? `HEAD:${filePath}` : `:${filePath}`;
    return runGit(["show", refPath]);
  } catch {
    return null;
  }
}

function isLikelyBinary(content) {
  return content.includes("\u0000");
}

function lineForIndex(content, index) {
  return content.slice(0, index).split("\n").length;
}

function maskSample(sample) {
  if (sample.length <= 8) {
    return `${sample.slice(0, 2)}***`;
  }
  return `${sample.slice(0, 4)}***${sample.slice(-2)}`;
}

function findSecretLikeMatches(content, filePath) {
  const normalized = normalizePath(filePath);
  if (ALLOWLIST_PATHS.has(normalized)) {
    return [];
  }

  const findings = [];
  for (const { name, regex } of PATTERNS) {
    regex.lastIndex = 0;
    for (const match of content.matchAll(regex)) {
      const value = match[0];
      const index = match.index ?? 0;
      findings.push({
        filePath: normalized,
        rule: name,
        line: lineForIndex(content, index),
        sample: maskSample(value),
      });
    }
  }

  return findings;
}

function runScan(mode = "staged") {
  const files = getTargetFiles(mode);
  if (files.length === 0) {
    const scope = mode === "all" ? "tracked" : "staged";
    console.log(`[guard:openai-secrets] No ${scope} files to scan.`);
    return [];
  }

  const findings = [];
  for (const filePath of files) {
    const content = readFileContentFromGit(filePath, mode);
    if (content === null || isLikelyBinary(content)) {
      continue;
    }
    findings.push(...findSecretLikeMatches(content, filePath));
  }

  if (findings.length === 0) {
    console.log("[guard:openai-secrets] OK: no OpenAI key-like strings found.");
    return [];
  }

  console.error("[guard:openai-secrets] Potential OpenAI key-like strings found:");
  for (const finding of findings) {
    console.error(
      `- ${finding.filePath}:${finding.line} [${finding.rule}] ${finding.sample}`,
    );
  }
  console.error(
    "[guard:openai-secrets] Commit blocked. Move secrets to Cloudflare env vars or .env.local.",
  );

  return findings;
}

function runSelfTest() {
  const hitSkDash = findSecretLikeMatches(
    "const key = 'sk-abcDEF1234567890abcd';",
    "client/src/example.ts",
  );
  assert.equal(hitSkDash.length, 1);

  const hitSkUnderscore = findSecretLikeMatches(
    'const auth = "Bearer sk_abcDEF1234567890abcd";',
    "server/example.ts",
  );
  assert.equal(hitSkUnderscore.length, 2);

  const assignmentHit = findSecretLikeMatches(
    'OPENAI_API_KEY="example-secret-value"',
    ".env",
  );
  assert.equal(assignmentHit.length, 1);

  const allowedVerificationPath = findSecretLikeMatches(
    "sk_abcDEF1234567890abcd",
    "client/public/.well-known/openai-verification.txt",
  );
  assert.equal(allowedVerificationPath.length, 0);

  const cleanText = findSecretLikeMatches(
    "const label = 'task-skill';",
    "client/src/clean.ts",
  );
  assert.equal(cleanText.length, 0);

  console.log("[guard:openai-secrets] Self-test passed.");
}

const args = new Set(process.argv.slice(2));
if (args.has("--self-test")) {
  runSelfTest();
  process.exit(0);
}

const mode = args.has("--all") ? "all" : "staged";
const findings = runScan(mode);
if (findings.length > 0) {
  process.exit(1);
}
