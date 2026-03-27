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

export const polarAnchorLaunch: ClientLaunch = {
  slug: "polar-anchor",
  clientName: "Polar Anchor",
  tileTitle: "Polar Anchor",
  subtitle: "Freight forwarding and logistics — Toronto, Ontario",
  service: "Website and lead system",
  status: "Live",
  tags: ["Freight & Logistics", "Website", "Quote System"],
  summary:
    "Full website and quote lead system for a Toronto-based freight forwarding company handling cargo, vehicles, customs clearance, and import-export coordination across Canada.",
  currentFocus: ["Organic search visibility", "Quote lead conversion", "Vehicle shipping market"],
  nextMilestone: ["Local SEO baseline", "Quote form optimization", "Polar Anchor domain launch"],
  websiteUrl: "https://unalabs.cloud/polar-anchor",
  youtubeUrl: "",
  brand: {
    mark: "PA",
    wordmark: "Polar Anchor",
    accent: "#3b82f6",
    accentSoft: "rgba(59, 130, 246, 0.18)",
    accentGlow: "rgba(59, 130, 246, 0.28)",
    accentSurface:
      "linear-gradient(135deg, rgba(59, 130, 246, 0.24), rgba(59, 130, 246, 0.06) 58%, rgba(8, 12, 20, 0.18))"
  }
};

export const gardenCleanersLaunch: ClientLaunch = {
  slug: "garden-cleaners",
  clientName: "Garden Cleaners",
  tileTitle: "Garden Cleaners",
  subtitle: "Professional cleaning services — Oshawa, Ontario",
  service: "Website and quote system",
  status: "Live",
  tags: ["Cleaning Services", "Local SEO", "Quote System"],
  summary:
    "Website and quote lead system for a residential and commercial cleaning company serving Oshawa and the Durham Region, Ontario, with recurring booking and move-in/move-out capability.",
  currentFocus: ["Oshawa local search presence", "Residential booking flow", "Move-in/out service visibility"],
  nextMilestone: ["Google Business Profile setup", "Recurring booking path", "Durham Region expansion"],
  websiteUrl: "https://unalabs.cloud/garden-cleaners",
  youtubeUrl: "",
  brand: {
    mark: "GC",
    wordmark: "Garden Cleaners",
    accent: "#10b981",
    accentSoft: "rgba(16, 185, 129, 0.18)",
    accentGlow: "rgba(16, 185, 129, 0.28)",
    accentSurface:
      "linear-gradient(135deg, rgba(16, 185, 129, 0.24), rgba(16, 185, 129, 0.06) 58%, rgba(8, 12, 20, 0.18))"
  }
};

export const clientLaunches = [emergencyPromptCaseStudy, polarAnchorLaunch, gardenCleanersLaunch] as const;
