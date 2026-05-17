import path from "node:path";
import fs from "node:fs";
import YAML from "yaml";
import { z } from "zod";

const truthBankSchema = z.object({
  candidate: z.object({
    first_name: z.string(),
    last_name: z.string(),
    city: z.string(),
    province: z.string(),
    country: z.string(),
    phone: z.string(),
    email: z.string().email(),
    linkedin: z.string().url(),
    website: z.string().url()
  }),
  employment_history: z.array(
    z.object({
      employer: z.string(),
      role: z.string(),
      start: z.string(),
      end: z.string(),
      location: z.string()
    })
  ),
  education: z.array(
    z.object({ school: z.string(), credential: z.string(), year: z.number().int() })
  ),
  certifications: z.array(z.string()),
  languages: z.array(z.string()),
  approved_tools: z.array(z.string()),
  approved_projects: z.array(z.string()),
  approved_claims: z.array(z.string()),
  manual_review_claims: z.array(z.string()),
  do_not_claim: z.array(z.string()),
  approved_work_authorization_language: z.object({
    canada: z.array(z.string()),
    united_states: z.array(z.string())
  })
});
export type TruthBank = z.infer<typeof truthBankSchema>;

const searchSchema = z.object({
  titles: z.array(z.string()),
  keywords: z.array(z.string()),
  locations: z.array(z.string()),
  minimum_rate: z.number().optional(),
  minimum_salary: z.number().optional()
});

const searchesSchema = z.object({
  companies: z.object({
    greenhouse: z.array(z.string()).default([]),
    lever: z.array(z.string()).default([]),
    ashby: z.array(z.string()).default([])
  }),
  searches: z.record(z.string(), searchSchema),
  excluded_keywords: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([])
});
export type Searches = z.infer<typeof searchesSchema>;

const scoringSchema = z.object({
  weights: z.object({
    title_match: z.number(),
    skills_match: z.number(),
    industry_match: z.number(),
    location_fit: z.number(),
    compensation_fit: z.number(),
    work_authorization_fit: z.number(),
    seniority_fit: z.number(),
    application_effort: z.number()
  }),
  bands: z.object({
    package_ready: z.number().int(),
    needs_review: z.number().int(),
    save_only: z.number().int()
  }),
  hard_red_flags: z.array(z.string()).default([]),
  soft_red_flags: z.array(z.string()).default([]),
  seniority_floor: z.object({
    blocked: z.array(z.string()).default([]),
    needs_review: z.array(z.string()).default([])
  })
});
export type ScoringRules = z.infer<typeof scoringSchema>;

const blockedTermsSchema = z.object({
  generic_ai_phrases: z.array(z.string()).default([]),
  forbidden_claims: z.array(z.string()).default([]),
  forbidden_artifacts: z.array(z.string()).default([]),
  requisition_title_patterns: z.array(z.string()).default([])
});
export type BlockedTerms = z.infer<typeof blockedTermsSchema>;

const applicationAnswersSchema = z.object({
  name: z.object({ first: z.string(), last: z.string() }),
  contact: z.object({
    phone: z.string(),
    email: z.string().email(),
    linkedin: z.string().url(),
    website: z.string().url()
  }),
  location: z.object({
    city: z.string(),
    province: z.string(),
    country: z.string(),
    postal_code: z.string().default("")
  }),
  canada_work_authorization: z.object({ answer: z.string() }),
  united_states_work_authorization: z.object({
    default_answer: z.string(),
    safe_note: z.string(),
    never_claim: z.array(z.string())
  }),
  salary_expectation: z.object({ default: z.string() }),
  relocation: z.object({ default: z.string() }),
  eeo: z.object({ default: z.string() }),
  safe_fields: z.array(z.string()),
  sensitive_fields: z.array(z.string())
});
export type ApplicationAnswers = z.infer<typeof applicationAnswersSchema>;

const siteRulesSchema = z.object({
  defaults: z.object({
    request_delay_ms: z.number().int().nonnegative(),
    max_requests_per_minute: z.number().int().positive(),
    user_agent: z.string(),
    respect_robots_txt: z.boolean()
  }),
  sources: z.record(z.string(), z.record(z.string(), z.any())),
  apply_assist: z.object({
    trusted_apply_hosts: z.array(z.string()).default([]),
    blocked_apply_hosts: z.array(z.string()).default([])
  })
});
export type SiteRules = z.infer<typeof siteRulesSchema>;

export interface HuntConfig {
  truthBank: TruthBank;
  searches: Searches;
  scoring: ScoringRules;
  blockedTerms: BlockedTerms;
  applicationAnswers: ApplicationAnswers;
  siteRules: SiteRules;
}

function readYaml<S extends z.ZodTypeAny>(filename: string, schema: S): z.infer<S> {
  const filePath = path.join(process.cwd(), "config", filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing hunt config: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = YAML.parse(raw);
  return schema.parse(parsed);
}

export function loadHuntConfig(): HuntConfig {
  return {
    truthBank: readYaml("profile_truth_bank.yaml", truthBankSchema),
    searches: readYaml("searches.yaml", searchesSchema),
    scoring: readYaml("scoring_rules.yaml", scoringSchema),
    blockedTerms: readYaml("blocked_terms.yaml", blockedTermsSchema),
    applicationAnswers: readYaml("application_answers.yaml", applicationAnswersSchema),
    siteRules: readYaml("site_rules.yaml", siteRulesSchema)
  };
}
