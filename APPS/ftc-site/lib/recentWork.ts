export type ClientLaunchBrand = {
  mark: string;
  wordmark: string;
  accent: string;
  accentSoft: string;
  accentGlow: string;
  accentSurface: string;
};

export type ClientLaunchOfferValue =
  | "scoped-first-pass"
  | "prototype-direction-sprint"
  | "build-execution-track";

export type ClientLaunchOfferProof = {
  value: ClientLaunchOfferValue;
  label: string;
  rationale: string;
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
  startedLabel?: string;
  lastUpdatedLabel?: string;
  phase?: {
    current: number;
    total: number;
    label: string;
  };
  offerProof: ClientLaunchOfferProof;
  websiteUrl: string;
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
  startedLabel: "Started 3 days ago",
  lastUpdatedLabel: "Last update: 2 hours ago",
  phase: {
    current: 2,
    total: 4,
    label: "Build"
  },
  offerProof: {
    value: "scoped-first-pass",
    label: "Scoped First Pass",
    rationale:
      "Shows the kind of local-service setup where the first win is a decision-ready scope before the broader build expands."
  },
  websiteUrl: "https://emergencyprompt.com",
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
  subtitle: "Freight forwarding and logistics, Toronto, Ontario",
  service: "Website and lead system",
  status: "Live",
  tags: ["Freight & Logistics", "Website", "Quote System"],
  summary:
    "Full website and quote lead system for a Toronto-based freight forwarding company handling cargo, vehicles, customs clearance, and import-export coordination across Canada.",
  currentFocus: ["Organic search visibility", "Quote lead conversion", "Vehicle shipping market"],
  nextMilestone: ["Local SEO baseline", "Quote form optimization", "Polar Anchor domain launch"],
  startedLabel: "Started 14 days ago",
  lastUpdatedLabel: "Last update: 18 hours ago",
  phase: {
    current: 4,
    total: 4,
    label: "Live"
  },
  offerProof: {
    value: "build-execution-track",
    label: "Build Execution Track",
    rationale:
      "Shows full delivery execution once the quote path, website structure, and shipping workflow are ready to move into execution."
  },
  websiteUrl: "https://unalabs.cloud/polar-anchor",
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
  subtitle: "Professional cleaning services, Oshawa, Ontario",
  service: "Website and quote system",
  status: "Public site live / post-launch hardening",
  tags: ["Cleaning Services", "Local SEO", "Quote System"],
  summary:
    "Public website and quote lead system for a residential and commercial cleaning company serving Oshawa and the Durham Region, Ontario. Booking and portal operations are being hardened after launch.",
  currentFocus: ["Oshawa local search presence", "Residential quote flow", "Move-in/out service visibility"],
  nextMilestone: ["Google Business Profile setup", "Recurring booking path", "Durham Region expansion"],
  startedLabel: "Started 11 days ago",
  lastUpdatedLabel: "Last update: 10 hours ago",
  phase: {
    current: 4,
    total: 4,
    label: "Post-launch"
  },
  offerProof: {
    value: "prototype-direction-sprint",
    label: "Prototype Direction Sprint",
    rationale:
      "Shows a service business where early booking flow, service packaging, and rollout direction had to be tightened before scaling the build."
  },
  websiteUrl: "https://unalabs.cloud/garden-cleaners",
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

export const ogTradesAcademyLaunch: ClientLaunch = {
  slug: "og-trades-academy",
  clientName: "OG_Trades Academy",
  tileTitle: "OG_Trades Academy",
  subtitle: "Forex education platform | course sales, content hub, and community path",
  service: "Premium education website and lead system",
  status: "Live",
  tags: ["Education", "Course Sales", "Content SEO"],
  summary:
    "A premium forex education website built around the OG_Trades Academy course offer, embedded YouTube proof, first-party enrollment capture, and community growth.",
  currentFocus: ["Course conversion path", "Content authority buildout", "Community funnel"],
  nextMilestone: ["Email automation hookup", "Blog rollout", "Offer expansion for advanced tracks"],
  startedLabel: "Started this week",
  lastUpdatedLabel: "Last update: today",
  phase: {
    current: 4,
    total: 4,
    label: "Live"
  },
  offerProof: {
    value: "build-execution-track",
    label: "Build Execution Track",
    rationale:
      "Shows a creator-education brand moving beyond link-in-bio tooling into a full sales, content, and community platform."
  },
  websiteUrl: "https://unalabs.cloud/og-trades-academy",
  brand: {
    mark: "OG",
    wordmark: "OG_Trades Academy",
    accent: "#1e5dd8",
    accentSoft: "rgba(30, 93, 216, 0.18)",
    accentGlow: "rgba(30, 93, 216, 0.28)",
    accentSurface:
      "linear-gradient(135deg, rgba(30, 93, 216, 0.24), rgba(30, 93, 216, 0.06) 58%, rgba(8, 12, 20, 0.18))"
  }
};

export const clientLaunches = [emergencyPromptCaseStudy, polarAnchorLaunch, gardenCleanersLaunch, ogTradesAcademyLaunch] as const;
