export const PLAN_CODES = [
  "free_preview",
  "sprint_weekly",
  "jobagent_monthly",
  "jobagent_annual"
] as const;

export type PlanCode = typeof PLAN_CODES[number];
export type UsageKey =
  | "fit_analysis"
  | "tailored_package"
  | "interview_prep"
  | "recruiter_draft"
  | "assisted_application";

export interface PlanAllowances {
  fit_analysis: number;
  tailored_package: number;
  interview_prep: number;
  recruiter_draft: number;
  assisted_application: number;
}

export interface PublicPlan {
  code: PlanCode;
  name: string;
  amountCadCents: number;
  interval: "month" | "week" | "year" | null;
  allowances: PlanAllowances;
  features: string[];
  stripeLookupKey: string | null;
}

const DEFAULT_ALLOWANCES: Record<PlanCode, PlanAllowances> = {
  free_preview: {
    fit_analysis: 3,
    tailored_package: 1,
    interview_prep: 1,
    recruiter_draft: 0,
    assisted_application: 0
  },
  sprint_weekly: {
    fit_analysis: 15,
    tailored_package: 5,
    interview_prep: 5,
    recruiter_draft: 0,
    assisted_application: 0
  },
  jobagent_monthly: {
    fit_analysis: 100,
    tailored_package: 25,
    interview_prep: 25,
    recruiter_draft: 25,
    assisted_application: 10
  },
  jobagent_annual: {
    fit_analysis: 100,
    tailored_package: 25,
    interview_prep: 25,
    recruiter_draft: 25,
    assisted_application: 10
  }
};

function configuredInteger(name: string, fallback: number, minimum = 0): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value >= minimum ? value : fallback;
}

function configuredAllowances(code: PlanCode): PlanAllowances {
  const prefix = `JOBAGENT_${code.toUpperCase()}_`;
  const defaults = DEFAULT_ALLOWANCES[code];
  return {
    fit_analysis: configuredInteger(`${prefix}FIT_ANALYSES`, defaults.fit_analysis),
    tailored_package: configuredInteger(`${prefix}TAILORED_PACKAGES`, defaults.tailored_package),
    interview_prep: configuredInteger(`${prefix}INTERVIEW_PREP`, defaults.interview_prep),
    recruiter_draft: configuredInteger(`${prefix}RECRUITER_DRAFTS`, defaults.recruiter_draft),
    assisted_application: configuredInteger(
      `${prefix}ASSISTED_APPLICATIONS`,
      defaults.assisted_application
    )
  };
}

export function isPlanCode(value: unknown): value is PlanCode {
  return PLAN_CODES.includes(value as PlanCode);
}

export function billingCheckoutEnabled(): boolean {
  return process.env.BILLING_CHECKOUT_ENABLED === "true";
}

export function planAllowances(code: PlanCode): PlanAllowances {
  return configuredAllowances(code);
}

export function publicPlans(): PublicPlan[] {
  return [
    {
      code: "free_preview",
      name: "Free Preview",
      amountCadCents: 0,
      interval: null,
      allowances: configuredAllowances("free_preview"),
      features: ["Fit analysis", "Tailored application package", "Job tracking"],
      stripeLookupKey: null
    },
    {
      code: "sprint_weekly",
      name: "Job Search Sprint",
      amountCadCents: configuredInteger("JOBAGENT_SPRINT_WEEKLY_CAD_CENTS", 999, 100),
      interval: "week",
      allowances: configuredAllowances("sprint_weekly"),
      features: ["Fit analysis", "Tailored packages", "Interview preparation", "Tracking"],
      stripeLookupKey: process.env.JOBAGENT_SPRINT_WEEKLY_LOOKUP_KEY || "jobagent_sprint_weekly_cad"
    },
    {
      code: "jobagent_monthly",
      name: "JobAgent Monthly",
      amountCadCents: configuredInteger("JOBAGENT_MONTHLY_CAD_CENTS", 2999, 100),
      interval: "month",
      allowances: configuredAllowances("jobagent_monthly"),
      features: [
        "Fit analysis", "Tailored packages", "Recruiter drafts",
        "Proof timeline", "Controlled application assistance"
      ],
      stripeLookupKey: process.env.JOBAGENT_MONTHLY_LOOKUP_KEY || "jobagent_monthly_cad"
    },
    {
      code: "jobagent_annual",
      name: "JobAgent Annual",
      amountCadCents: configuredInteger("JOBAGENT_ANNUAL_CAD_CENTS", 23999, 100),
      interval: "year",
      allowances: configuredAllowances("jobagent_annual"),
      features: [
        "Monthly plan allowances", "Fit analysis", "Tailored packages",
        "Recruiter drafts", "Proof timeline", "Controlled application assistance"
      ],
      stripeLookupKey: process.env.JOBAGENT_ANNUAL_LOOKUP_KEY || "jobagent_annual_cad"
    }
  ];
}

export function planByCode(code: PlanCode): PublicPlan {
  return publicPlans().find((plan) => plan.code === code)!;
}
