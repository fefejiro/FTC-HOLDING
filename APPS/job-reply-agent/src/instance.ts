import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { z } from "zod";
import { evaluateOnboardingReadiness } from "./onboarding.js";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INSTANCE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,31}$/;

const instanceSchema = z.object({
  id: z.string().regex(INSTANCE_ID_PATTERN),
  candidate_name: z.string(),
  expected_gmail_account: z.string().email(),
  onboarding_approved: z.boolean(),
  activation_enabled: z.boolean(),
  proactive_work_authorization: z.boolean().default(false),
  enabled_channels: z.array(z.enum(["gmail", "linkedin", "dice", "indeed", "monster"])),
  paths: z.object({
    config_dir: z.string(),
    database: z.string(),
    gmail_tokens: z.string(),
    resume_root: z.string(),
    browser_profile: z.string(),
    logs: z.string(),
    proof: z.string()
  })
});

export type JobAgentChannel = "gmail" | "linkedin" | "dice" | "indeed" | "monster";

export interface UserInstanceConfig {
  id: string;
  candidateName: string;
  expectedGmailAccount: string;
  onboardingApproved: boolean;
  activationEnabled: boolean;
  proactiveWorkAuthorization: boolean;
  enabledChannels: JobAgentChannel[];
  manifestPath: string;
  paths: {
    configDir: string;
    database: string;
    gmailTokens: string;
    resumeRoot: string;
    browserProfile: string;
    logs: string;
    proof: string;
  };
}

export interface CareerFact {
  id: string;
  category: "employment" | "education" | "certification" | "skill" | "achievement";
  statement: string;
  source: string;
  verified: boolean;
  approvedAt?: string;
}

export interface CareerTruthBank {
  instanceId: string;
  facts: CareerFact[];
}

export interface ApplicationAnswerProfile {
  instanceId: string;
  answers: Record<string, {
    value: string | number | boolean;
    sensitive: boolean;
    approvedAt?: string;
    applicableWording?: string[];
  }>;
}

export interface JobPreferencePolicy {
  instanceId: string;
  targetTitles: string[];
  excludedTitles: string[];
  locations: string[];
  workModes: Array<"remote" | "hybrid" | "onsite">;
  employmentTypes: string[];
  salaryMinimum?: number;
}

export interface AutomationPolicy {
  instanceId: string;
  mode: "package_only" | "approval_required" | "controlled_autopilot";
  pauseOnUnknown: true;
  pauseOnSensitive: true;
  pauseOnCaptcha: true;
}

export type ApplicationProofStatus =
  | "discovered"
  | "rejected_by_policy"
  | "package_ready"
  | "needs_approval"
  | "manual_gate"
  | "submission_attempted"
  | "submitted_unverified"
  | "submitted_verified"
  | "failed"
  | "withdrawn";

export interface ApplicationProof {
  instanceId: string;
  jobId: number;
  status: ApplicationProofStatus;
  resumeVersion?: string;
  answersJson?: string;
  finalUrl?: string;
  evidencePath?: string;
  verifiedAt?: string;
}

function resolveFromManifest(manifestDir: string, value: string): string {
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(manifestDir, value);
}

function resolveStateRoot(): string {
  const configured = (process.env.JOB_AGENT_STATE_ROOT || "").trim();
  return configured ? path.resolve(configured) : PROJECT_ROOT;
}

export function resolveInstanceId(explicit?: string): string {
  const value = (explicit || process.env.JOB_AGENT_INSTANCE_ID || "").trim().toLowerCase();
  if (!value) {
    throw new Error(
      "Missing JobAgent instance. Set JOB_AGENT_INSTANCE_ID or pass --instance=<id>; operational commands fail closed."
    );
  }
  if (!INSTANCE_ID_PATTERN.test(value)) {
    throw new Error(`Invalid JobAgent instance id: ${value}`);
  }
  return value;
}

export function loadUserInstance(explicit?: string): UserInstanceConfig {
  const id = resolveInstanceId(explicit);
  const manifestPath = path.join(PROJECT_ROOT, "instances", id, "instance.yaml");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Unknown JobAgent instance '${id}'. Expected manifest: ${manifestPath}`);
  }

  const parsed = instanceSchema.parse(YAML.parse(fs.readFileSync(manifestPath, "utf8")));
  if (parsed.id !== id) {
    throw new Error(`Instance manifest mismatch: requested '${id}', manifest declares '${parsed.id}'.`);
  }

  const manifestDir = path.dirname(manifestPath);
  const stateManifestDir = path.join(resolveStateRoot(), "instances", id);
  return {
    id,
    candidateName: parsed.candidate_name.trim(),
    expectedGmailAccount: parsed.expected_gmail_account.trim().toLowerCase(),
    onboardingApproved: parsed.onboarding_approved,
    activationEnabled: parsed.activation_enabled,
    proactiveWorkAuthorization: parsed.proactive_work_authorization,
    enabledChannels: parsed.enabled_channels,
    manifestPath,
    paths: {
      configDir: resolveFromManifest(manifestDir, parsed.paths.config_dir),
      database: resolveFromManifest(stateManifestDir, parsed.paths.database),
      gmailTokens: resolveFromManifest(stateManifestDir, parsed.paths.gmail_tokens),
      resumeRoot: resolveFromManifest(stateManifestDir, parsed.paths.resume_root),
      browserProfile: resolveFromManifest(stateManifestDir, parsed.paths.browser_profile),
      logs: resolveFromManifest(stateManifestDir, parsed.paths.logs),
      proof: resolveFromManifest(stateManifestDir, parsed.paths.proof)
    }
  };
}

export function assertInstanceReady(instance: UserInstanceConfig, command: string): void {
  const setupCommands = new Set([
    "instance:status",
    "instance:onboarding-status",
    "gmail:auth:url",
    "gmail:auth:local",
    "gmail:auth:save",
    "gmail:status"
  ]);
  if (setupCommands.has(command)) return;
  if (!instance.candidateName || !instance.onboardingApproved || !instance.activationEnabled) {
    throw new Error(
      `Instance '${instance.id}' is not activated. Complete and approve onboarding before running '${command}'.`
    );
  }
  const readiness = evaluateOnboardingReadiness(instance);
  if (!readiness.ready) {
    const missing = readiness.checks.filter((check) => !check.ready).map((check) => check.key).join(", ");
    throw new Error(`Instance '${instance.id}' activation is invalid; onboarding is incomplete: ${missing}.`);
  }
}

export function instanceBanner(instance: UserInstanceConfig): Record<string, unknown> {
  return {
    instanceId: instance.id,
    candidate: instance.candidateName || "(pending onboarding)",
    mailbox: instance.expectedGmailAccount,
    database: instance.paths.database,
    resumeRoot: instance.paths.resumeRoot,
    browserProfile: instance.paths.browserProfile,
    onboardingApproved: instance.onboardingApproved,
    activationEnabled: instance.activationEnabled,
    proactiveWorkAuthorization: instance.proactiveWorkAuthorization,
    channels: instance.enabledChannels
  };
}

export function getProjectRoot(): string {
  return PROJECT_ROOT;
}
