export const CUSTOMER_ONBOARDING_STEPS = [
  "goals",
  "location",
  "employment",
  "compensation",
  "eligibility",
  "strengths",
  "resume",
  "control",
  "review"
] as const;

export type CustomerOnboardingStep = typeof CUSTOMER_ONBOARDING_STEPS[number];

export const CUSTOMER_ONBOARDING_STEP_FIELDS: Readonly<Record<CustomerOnboardingStep, readonly string[]>> = {
  goals: ["fullName", "phone", "linkedIn", "targetTitles", "adjacentTitles", "excludedTitles"],
  location: ["location", "timeZone", "locations", "workModes", "relocation"],
  employment: ["employmentTypes", "urgency", "desiredVolume"],
  compensation: ["compensationFloor", "compensationCurrency", "compensationBasis", "compensationPrivate"],
  eligibility: ["workAuthorization", "sponsorshipRequired"],
  strengths: ["industries", "excludedIndustries", "seniority", "skills", "certifications", "languages"],
  resume: ["resumeStrategy", "notificationChannels"],
  control: ["controlMode", "quietHoursStart", "quietHoursEnd", "dailyApplicationLimit", "consent"],
  review: ["consent"]
};

export const RECOMMENDATION_FEEDBACK_REASONS = [
  "company",
  "location",
  "salary",
  "title",
  "seniority",
  "industry",
  "skills",
  "work_arrangement",
  "authorization",
  "already_applied",
  "not_interested",
  "other"
] as const;

export type RecommendationFeedbackReason = typeof RECOMMENDATION_FEEDBACK_REASONS[number];

const stringFields = new Set([
  "fullName",
  "phone",
  "location",
  "timeZone",
  "linkedIn",
  "seniority",
  "relocation",
  "compensationFloor",
  "compensationCurrency",
  "compensationBasis",
  "workAuthorization",
  "urgency",
  "resumeStrategy"
]);

const numberFields = new Set(["quietHoursStart", "quietHoursEnd", "dailyApplicationLimit"]);

const listFields = new Set([
  "targetTitles",
  "adjacentTitles",
  "excludedTitles",
  "industries",
  "excludedIndustries",
  "locations",
  "workModes",
  "employmentTypes",
  "skills",
  "certifications",
  "languages",
  "notificationChannels"
]);

const booleanFields = new Set(["sponsorshipRequired", "compensationPrivate"]);

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function cleanList(value: unknown, preserveCommas = false): string[] | undefined {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string" ? value.split(preserveCommas ? /\r?\n/ : /\r?\n|,/) : [];
  const cleaned = values
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return cleaned;
}

function cleanBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function mergeCustomerOnboardingRecord(
  existing: Record<string, unknown>,
  step: CustomerOnboardingStep,
  data: Record<string, unknown>,
  now = new Date().toISOString()
): Record<string, unknown> {
  const record: Record<string, unknown> = { ...existing };
  const allowedFields = new Set(CUSTOMER_ONBOARDING_STEP_FIELDS[step]);
  for (const [key, value] of Object.entries(data)) {
    if (!allowedFields.has(key)) continue;
    if (stringFields.has(key)) {
      const cleaned = cleanString(value);
      if (cleaned !== undefined) record[key] = cleaned;
    } else if (listFields.has(key)) {
      record[key] = cleanList(value, key === "locations");
    } else if (booleanFields.has(key)) {
      const cleaned = cleanBoolean(value);
      if (cleaned !== undefined) record[key] = cleaned;
    } else if (numberFields.has(key) && typeof value === "number" && Number.isInteger(value)) {
      record[key] = value;
    }
  }

  if (allowedFields.has("consent") && data.consent && typeof data.consent === "object" && !Array.isArray(data.consent)) {
    const existingConsent = record.consent && typeof record.consent === "object" && !Array.isArray(record.consent)
      ? record.consent as Record<string, unknown>
      : {};
    const consent = { ...existingConsent };
    for (const [key, value] of Object.entries(data.consent as Record<string, unknown>)) {
      const cleaned = cleanBoolean(value);
      if (cleaned !== undefined) consent[key] = cleaned;
    }
    record.consent = consent;
  }

  const progress = record._progress && typeof record._progress === "object" && !Array.isArray(record._progress)
    ? record._progress as Record<string, unknown>
    : {};
  const completedSteps = Array.isArray(progress.completedSteps)
    ? progress.completedSteps.filter((value): value is string => typeof value === "string")
    : [];
  record._progress = {
    currentStep: step,
    completedSteps: [...new Set([...completedSteps, step])],
    updatedAt: now
  };
  return record;
}

export function onboardingConsentChanged(
  previous: Record<string, unknown> | null | undefined,
  next: Record<string, unknown>
): boolean {
  const keys = ["truthConfirmed", "recruiterDrafts", "recruiterSends", "assistedApplications", "controlledSubmissions"];
  const oldConsent = previous?.consent && typeof previous.consent === "object"
    ? previous.consent as Record<string, unknown>
    : {};
  const newConsent = next.consent && typeof next.consent === "object"
    ? next.consent as Record<string, unknown>
    : {};
  return keys.some((key) => Boolean(oldConsent[key]) !== Boolean(newConsent[key]));
}

export function onboardingRecordHasValidConsent(record: Record<string, unknown> | null | undefined): boolean {
  if (!record) return false;
  const consent = record.consent && typeof record.consent === "object"
    ? record.consent as Record<string, unknown>
    : {};
  return consent.truthConfirmed === true;
}

export function automationModeForCustomer(value: unknown): "assist" | "approval_required" {
  return value === "assisted" ? "assist" : "approval_required";
}

export function customerOnboardingProgress(record: Record<string, unknown> | null | undefined) {
  const progress = record?._progress;
  if (!progress || typeof progress !== "object" || Array.isArray(progress)) {
    return { currentStep: CUSTOMER_ONBOARDING_STEPS[0], completedSteps: [] as string[] };
  }
  const progressRecord = progress as Record<string, unknown>;
  const currentStep = typeof progressRecord.currentStep === "string" && CUSTOMER_ONBOARDING_STEPS.includes(progressRecord.currentStep as CustomerOnboardingStep)
    ? progressRecord.currentStep as CustomerOnboardingStep
    : CUSTOMER_ONBOARDING_STEPS[0];
  const completedSteps = Array.isArray(progressRecord.completedSteps)
    ? progressRecord.completedSteps.filter((value): value is string => CUSTOMER_ONBOARDING_STEPS.includes(value as CustomerOnboardingStep))
    : [];
  return { currentStep, completedSteps: [...new Set(completedSteps)] };
}
