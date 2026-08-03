import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MAXIMUMS = Object.freeze({
  critical: 0,
  high: 2,
  moderate: 9,
  low: 0,
  total: 11,
});

const packageDirectory = fileURLToPath(new URL("..", import.meta.url));
const npmArguments = ["audit", "--package-lock-only", "--workspaces=false", "--json"];

const invocation = process.env.npm_execpath
  ? {
      command: process.execPath,
      arguments: [process.env.npm_execpath, ...npmArguments],
    }
  : process.platform === "win32"
    ? {
        command: process.env.ComSpec ?? "cmd.exe",
        arguments: ["/d", "/s", "/c", `npm ${npmArguments.join(" ")}`],
      }
    : { command: "npm", arguments: npmArguments };

const audit = spawnSync(invocation.command, invocation.arguments, {
  encoding: "utf8",
  cwd: packageDirectory,
  maxBuffer: 20 * 1024 * 1024,
});

if (audit.error) {
  console.error(`[dependency-audit] Unable to run npm audit: ${audit.error.message}`);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout.replace(/^\uFEFF/, ""));
} catch {
  console.error("[dependency-audit] npm audit did not return valid JSON.");
  if (audit.stderr.trim()) {
    console.error(audit.stderr.trim());
  }
  process.exit(1);
}

const counts = report?.metadata?.vulnerabilities;
if (!counts) {
  console.error("[dependency-audit] Vulnerability totals are missing from the audit report.");
  process.exit(1);
}

const failures = Object.entries(MAXIMUMS)
  .filter(([severity, maximum]) => (counts[severity] ?? 0) > maximum)
  .map(
    ([severity, maximum]) =>
      `${severity}: ${counts[severity] ?? 0} exceeds allowed maximum ${maximum}`
  );

console.log(
  `[dependency-audit] Current counts: critical=${counts.critical ?? 0}, high=${counts.high ?? 0}, moderate=${counts.moderate ?? 0}, low=${counts.low ?? 0}, total=${counts.total ?? 0}`
);

if (failures.length > 0) {
  console.error("[dependency-audit] Dependency risk regression detected:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("[dependency-audit] PASS: dependency findings did not exceed the release baseline.");
