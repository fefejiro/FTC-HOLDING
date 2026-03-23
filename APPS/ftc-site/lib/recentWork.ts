export type ClientLaunch = {
  slug: string;
  clientName: string;
  tileTitle: string;
  subtitle: string;
  service: string;
  status: string;
  tags: string[];
  summary: string;
  websiteUrl: string;
  youtubeUrl: string;
};

export const emergencyPromptCaseStudy: ClientLaunch = {
  slug: "emergency-prompt",
  clientName: "Emergency Prompt",
  tileTitle: "Emergency Prompt",
  subtitle: "Lead engine setup (YouTube SEO + inbound call flow)",
  service: "Lead engine setup",
  status: "In progress (Phase 1)",
  tags: ["Local SEO", "Content pipeline", "Conversion"],
  summary:
    "Newly onboarded local service client. Launch-ready web presence with service clarity, local search structure, and conversion-focused lead flow.",
  websiteUrl: "https://emergencyprompt.com",
  youtubeUrl: "https://www.youtube.com/@EmergencyPromptOttawa"
};

export const clientLaunches = [emergencyPromptCaseStudy] as const;
