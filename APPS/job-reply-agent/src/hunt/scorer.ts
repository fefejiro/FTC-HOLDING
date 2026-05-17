import type { HuntConfig } from "./config_loader.js";
import type { RawJob } from "./types.js";

export interface ScoreBreakdown {
  total: number;
  bands: {
    package_ready: boolean;
    needs_review: boolean;
    save_only: boolean;
  };
  weights: Record<string, number>;
  components: Record<string, number>;
  hard_red_flag: string | null;
  soft_red_flags: string[];
}

export function scoreJob(job: RawJob, config: HuntConfig): ScoreBreakdown {
  const weights = config.scoring.weights;
  const bands = config.scoring.bands;
  const hardFlags = config.scoring.hard_red_flags.map((s) => s.toLowerCase());
  const softFlags = config.scoring.soft_red_flags.map((s) => s.toLowerCase());
  const desc = (job.description ?? "").toLowerCase();

  // Hard red flag check
  let hard_red_flag: string | null = null;
  for (const flag of hardFlags) {
    if (desc.includes(flag)) {
      hard_red_flag = flag;
      break;
    }
  }

  // Soft red flag check
  const soft_red_flags: string[] = [];
  for (const flag of softFlags) {
    if (desc.includes(flag)) soft_red_flags.push(flag);
  }

  // Scoring components (placeholder logic, to be replaced with real matching)
  // For now, just check if job.title matches any search title, etc.
  const userTitles = Object.values(config.searches.searches).flatMap((s) => s.titles);
  const userSkills = Object.values(config.searches.searches).flatMap((s) => s.keywords);
  const userIndustries = config.searches.industries;
  const userLocations = Object.values(config.searches.searches).flatMap((s) => s.locations);

  // Title match: exact or substring
  let title_match = 0;
  if (job.title && userTitles.some((t) => job.title.toLowerCase().includes(t.toLowerCase()))) {
    title_match = 1;
  }

  // Skills match: at least one keyword in description
  let skills_match = 0;
  if (userSkills.length && userSkills.some((k) => desc.includes(k.toLowerCase()))) {
    skills_match = 1;
  }

  // Industry match: company or description contains industry
  let industry_match = 0;
  if (
    (job.company && userIndustries.some((i) => job.company.toLowerCase().includes(i.toLowerCase()))) ||
    userIndustries.some((i) => desc.includes(i.toLowerCase()))
  ) {
    industry_match = 1;
  }

  // Location fit: job.location matches any user location
  let location_fit = 0;
  if (
    job.location &&
    userLocations.some((l) => job.location?.toLowerCase().includes(l.toLowerCase()))
  ) {
    location_fit = 1;
  }

  // Compensation fit: always 1 if not specified (placeholder)
  let compensation_fit = 1;
  // Work authorization fit: always 1 (placeholder)
  let work_authorization_fit = 1;
  // Seniority fit: always 1 (placeholder)
  let seniority_fit = 1;
  // Application effort: always 1 (placeholder)
  let application_effort = 1;

  // Compose weighted score
  const components = {
    title_match: title_match * weights.title_match,
    skills_match: skills_match * weights.skills_match,
    industry_match: industry_match * weights.industry_match,
    location_fit: location_fit * weights.location_fit,
    compensation_fit: compensation_fit * weights.compensation_fit,
    work_authorization_fit: work_authorization_fit * weights.work_authorization_fit,
    seniority_fit: seniority_fit * weights.seniority_fit,
    application_effort: application_effort * weights.application_effort
  };
  let total = Object.values(components).reduce((a, b) => a + b, 0);

  // If hard red flag, force total to 0
  if (hard_red_flag) total = 0;

  // Bands
  const band = {
    package_ready: total >= bands.package_ready && !hard_red_flag,
    needs_review: total >= bands.needs_review && total < bands.package_ready && !hard_red_flag,
    save_only: total >= bands.save_only && total < bands.needs_review && !hard_red_flag
  };

  return {
    total,
    bands: band,
    weights,
    components,
    hard_red_flag,
    soft_red_flags
  };
}
