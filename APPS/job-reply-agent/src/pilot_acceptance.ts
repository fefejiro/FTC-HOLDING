import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config.js";
import { checkGmailAuthStatus } from "./gmail.js";
import { instanceBanner, loadUserInstance } from "./instance.js";
import { evaluateOnboardingReadiness } from "./onboarding.js";

type CheckStatus = "pass" | "needs_user_action" | "blocked";

interface AcceptanceCheck {
  key: string;
  status: CheckStatus;
  summary: string;
  evidence?: string;
  nextAction?: string;
}

interface AcceptanceReport {
  generatedAt: string;
  overall: "ready" | "needs_user_action" | "blocked";
  instance: ReturnType<typeof instanceBanner>;
  checks: AcceptanceCheck[];
}

function textFiles(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  const output: string[] = [];
  const walk = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (["data", "proof", "browser", "logs", "resumes", "secrets"].includes(entry.name)) continue;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (/\.(?:yaml|yml|json|md|txt)$/i.test(entry.name)) output.push(target);
    }
  };
  walk(root);
  return output;
}

function findForeignIdentity(instanceRoot: string, instanceId: string): string[] {
  if (instanceId === "fejiro") return [];
  return textFiles(instanceRoot).filter((file) => {
    if (path.basename(file).toLowerCase() === "scoring_rules.yaml") return false;
    const content = fs.readFileSync(file, "utf8");
    return /\bFejiro Efiuvwere\b|fejiro\.efiuvwere@gmail\.com/i.test(content);
  });
}

function renderMarkdown(report: AcceptanceReport): string {
  const lines = [
    `# ${String(report.instance.candidate)} Pilot Acceptance`,
    "",
    `Generated: ${report.generatedAt}`,
    `Overall: ${report.overall}`,
    "",
    "| Check | Status | Evidence |",
    "| --- | --- | --- |"
  ];
  for (const check of report.checks) {
    lines.push(`| ${check.summary} | ${check.status} | ${(check.evidence || "").replace(/\|/g, "\\|")} |`);
  }
  const actions = report.checks.filter((check) => check.nextAction);
  if (actions.length) {
    lines.push("", "## Required Actions", "");
    for (const check of actions) lines.push(`- ${check.nextAction}`);
  }
  lines.push(
    "",
    "## Proof Rule",
    "",
    "This report does not activate automation. Recruiter sends and job submissions remain locked until onboarding consent, account authorization, resume-template QA, and instance activation all pass."
  );
  return `${lines.join("\n")}\n`;
}

export async function runPilotAcceptance(instanceId: string): Promise<AcceptanceReport> {
  process.env.JOB_AGENT_INSTANCE_ID = instanceId;
  const instance = loadUserInstance(instanceId);
  const cfg = loadConfig();
  const readiness = evaluateOnboardingReadiness(instance);
  const checks: AcceptanceCheck[] = [];
  const instanceRoot = path.dirname(instance.manifestPath);

  const foreignFiles = findForeignIdentity(instanceRoot, instance.id);
  checks.push({
    key: "tenant_identity",
    status: foreignFiles.length ? "blocked" : "pass",
    summary: "Tenant identity isolation",
    evidence: foreignFiles.length ? `Foreign identity found in: ${foreignFiles.join(", ")}` : "No Fejiro identity found in Chukwuma text configuration."
  });

  checks.push({
    key: "onboarding",
    status: readiness.ready ? "pass" : "needs_user_action",
    summary: "Onboarding and consent",
    evidence: `${readiness.completed}/${readiness.total} checks complete`,
    nextAction: readiness.ready ? undefined : "Chukwuma must review the saved profile and grant the desired recruiter/application consent with a consent date."
  });

  const sourceResume = readiness.checks.find((check) => check.key === "source_resumes");
  checks.push({
    key: "source_resume",
    status: sourceResume?.ready ? "pass" : "blocked",
    summary: "Private source resume",
    evidence: sourceResume?.detail
  });

  const templatePath = cfg.rules.resume_tailoring?.template_path || "";
  const templateReady = Boolean(
    cfg.rules.resume_tailoring?.enabled &&
    templatePath &&
    /\.docx$/i.test(templatePath) &&
    fs.existsSync(templatePath)
  );
  checks.push({
    key: "tailoring_template",
    status: templateReady ? "pass" : "blocked",
    summary: "Verified DOCX tailoring template",
    evidence: templateReady ? templatePath : "No enabled Chukwuma-owned DOCX tailoring template is configured.",
    nextAction: templateReady ? undefined : "Create a Chukwuma-owned golden DOCX template from approved facts, render it, and pass structural and visual QA."
  });

  const gmail = await checkGmailAuthStatus(cfg.env);
  checks.push({
    key: "gmail",
    status: gmail.ok ? "pass" : "needs_user_action",
    summary: "Gmail OAuth identity",
    evidence: gmail.ok ? `Verified ${gmail.accountEmail}` : `${gmail.accountEmail}: ${gmail.message.split("\n")[0]}`,
    nextAction: gmail.ok ? undefined : `Chukwuma must authorize ${instance.expectedGmailAccount} through the onboarding server.`
  });

  const browser = spawnSync(
    "python",
    ["scripts/instance_chrome_status.py", `--instance=${instance.id}`],
    { cwd: path.resolve("."), encoding: "utf8", timeout: 30_000 }
  );
  const browserEvidence = `${browser.stdout || ""}\n${browser.stderr || ""}`.trim();
  checks.push({
    key: "browser_identity",
    status: browser.status === 0 ? "pass" : "needs_user_action",
    summary: "Visible browser identity",
    evidence: browserEvidence.split(/\r?\n/).slice(0, 6).join(" "),
    nextAction: browser.status === 0 ? undefined : "Open the Chukwuma Chrome profile and sign in to the enabled job platforms."
  });

  checks.push({
    key: "activation_lock",
    status: !instance.activationEnabled && !instance.onboardingApproved ? "pass" : readiness.ready ? "pass" : "blocked",
    summary: "Fail-closed activation",
    evidence: instance.activationEnabled
      ? "Instance activation is enabled."
      : "Automation remains disabled while personal authorization gates are incomplete."
  });

  const handoverEvidencePath = path.join(instance.paths.proof, "handover-email.json");
  const handoverEvidence = fs.existsSync(handoverEvidencePath)
    ? JSON.parse(fs.readFileSync(handoverEvidencePath, "utf8")) as { recipient?: string; status?: string; gmailMessageId?: string }
    : null;
  const handoverSent = Boolean(
    handoverEvidence?.status === "sent" &&
    handoverEvidence.recipient?.toLowerCase() === instance.expectedGmailAccount
  );
  checks.push({
    key: "handover_delivery",
    status: handoverSent ? "pass" : "blocked",
    summary: "Candidate handover delivery",
    evidence: handoverSent
      ? `Sent to ${handoverEvidence?.recipient}; Gmail message ${handoverEvidence?.gmailMessageId}`
      : "No sent handover evidence exists for the configured mailbox.",
    nextAction: handoverSent ? undefined : "Send the candidate handover and record Gmail message evidence."
  });

  const overall = checks.some((check) => check.status === "blocked")
    ? "blocked"
    : checks.some((check) => check.status === "needs_user_action")
      ? "needs_user_action"
      : "ready";
  return {
    generatedAt: new Date().toISOString(),
    overall,
    instance: instanceBanner(instance),
    checks
  };
}

async function main(): Promise<void> {
  const instanceArg = process.argv.find((arg) => arg.startsWith("--instance="));
  const instanceId = instanceArg?.slice("--instance=".length) || process.env.JOB_AGENT_INSTANCE_ID || "";
  if (!instanceId) throw new Error("pilot:acceptance requires --instance=<id>.");

  const report = await runPilotAcceptance(instanceId);
  const instance = loadUserInstance(instanceId);
  fs.mkdirSync(instance.paths.proof, { recursive: true });
  const jsonPath = path.join(instance.paths.proof, "handover-readiness.json");
  const markdownPath = path.join(instance.paths.proof, "handover-readiness.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  fs.writeFileSync(markdownPath, renderMarkdown(report), "utf8");
  process.stdout.write(`${JSON.stringify({ overall: report.overall, jsonPath, markdownPath, checks: report.checks }, null, 2)}\n`);
  if (report.overall !== "ready") process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
