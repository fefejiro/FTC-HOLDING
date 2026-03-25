export type ClientLaunchBrand = {
  mark: string;
  wordmark: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
  accentSurface: string;
};

export type ClientLaunch = {
  slug: string;
  clientName: string;
  tileTitle: string;
  subtitle: string;
  service: string;
  status: string;
  tags: string[];
  summary: string;
  currentFocus?: string[];
  nextMilestone?: string[];
  websiteUrl: string;
  youtubeUrl: string;
  brand: ClientLaunchBrand;
};

export const emergencyPromptCaseStudy: ClientLaunch = {
  slug: "emergency-prompt",
  clientName: "Emergency Prompt",
  tileTitle: "Emergency Prompt",
  subtitle: "Live onboarding snapshot for a local-service lead engine",
  service: "Lead engine setup",
  status: "New client / Setup phase",
  tags: ["Local SEO", "Content pipeline", "Conversion"],
  summary:
    "Lead engine setup for a newly onboarded local service client, with service clarity, local search structure, and a cleaner path from discovery to inbound call.",
  currentFocus: ["Service clarity", "Local search structure", "Lead capture path"],
  nextMilestone: [
    "Launch-ready homepage draft",
    "Inbound call flow setup",
    "Local SEO baseline"
  ],
  websiteUrl: "https://emergencyprompt.com",
  youtubeUrl: "https://www.youtube.com/@EmergencyPromptOttawa",
  brand: {
    mark: "EP",
    wordmark: "Emergency Prompt",
    accent: "#ff7b39",
    accentSoft: "rgba(255, 123, 57, 0.18)",
    accentGlow: "rgba(255, 123, 57, 0.28)",
    accentSurface:
      "linear-gradient(135deg, rgba(255, 123, 57, 0.26), rgba(255, 123, 57, 0.06) 58%, rgba(8, 12, 20, 0.18))"
  }
};

export const clientLaunches = [emergencyPromptCaseStudy] as const;
