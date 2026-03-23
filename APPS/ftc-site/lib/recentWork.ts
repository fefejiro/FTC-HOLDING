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
};

export const emergencyPromptCaseStudy: ClientLaunch = {
  slug: "emergency-prompt",
  clientName: "Emergency Prompt",
  tileTitle: "Emergency Prompt",
  subtitle: "Live onboarding snapshot for a local-service lead engine",
  service: "Lead engine setup",
  status: "New client · Setup phase",
  tags: ["Local SEO", "Content pipeline", "Conversion"],
  summary:
    "Lead engine setup for a newly onboarded local service client, with service clarity, local search structure, and a cleaner path from discovery to inbound call.",
  currentFocus: [
    "Service clarity",
    "Local search structure",
    "Lead capture path"
  ],
  nextMilestone: [
    "Launch-ready homepage draft",
    "Inbound call flow setup",
    "Local SEO baseline"
  ],
  websiteUrl: "https://emergencyprompt.com",
  youtubeUrl: "https://www.youtube.com/@EmergencyPromptOttawa"
};

export const clientLaunches = [emergencyPromptCaseStudy] as const;
