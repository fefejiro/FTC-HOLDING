import { siteLinks } from "./siteLinks";
export type CapabilityPillar =
  | "ai-systems"
  | "creative-technology"
  | "business-intelligence";

export interface CapabilityItem {
  slug: CapabilityPillar;
  title: string;
  summary: string;
  examples: string[];
}

export interface ServiceTrack {
  audience: "businesses" | "creators" | "startups";
  title: string;
  summary: string;
  examples: string[];
}

export interface ProjectCaseStudy {
  slug: string;
  name: string;
  tagline: string;
  pillar: CapabilityPillar;
  tags: string[];
  summary: string;
  status: "live" | "active-development" | "internal-runtime";
  availabilityLabel?: string;
  googlePlayUrl?: string;
  marketingBullets?: string[];
  sections: {
    problem: string;
    insight: string;
    solution: string;
    capabilities: string[];
    technology: string[];
    outcome: string;
  };
}

export interface NetworkingLink {
  label: string;
  url: string;
  description: string;
}

export interface NetworkingProfile {
  fullName: string;
  title: string;
  studioName: string;
  studioLine: string;
  phoneDisplay: string;
  phoneE164: string;
  email: string;
  linkedInUrl: string;
  networkHubUrl: string;
  startProjectHref: string;
  portfolioLinks: NetworkingLink[];
}

export const siteNav = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Client Launches", href: "/work" },
  { label: "ATEAM", href: "/ateam" },
  { label: "Start a Project", href: "/work-with-ftc" }
] as const;

export const networkingProfile: NetworkingProfile = {
  fullName: "Fejiro Efiuvwere",
  title: "AI Product Builder | Technical Product Manager | Automation Systems Lead",
  studioName: "Una Labs",
  studioLine: "Fast websites, lead automation, and practical AI systems",
  phoneDisplay: "+1 (416) 473-2732",
  phoneE164: "+14164732732",
  email: "hello@unalabs.cloud",
  linkedInUrl: siteLinks.linkedIn,
  networkHubUrl: "https://unalabs.cloud/connect",
  startProjectHref: "/work-with-ftc",
  portfolioLinks: [
    {
      label: "Client Launches",
      url: "https://unalabs.cloud/work",
      description: "Recently onboarded client delivery proof."
    },
    {
      label: "PeacePad",
      url: "https://peacepad.ca",
      description: "Pre-send communication safety product."
    },
    {
      label: "SayWetin",
      url: "https://saywetin.app",
      description: "Nigerian music and language context intelligence."
    }
  ]
};

export const capabilities: CapabilityItem[] = [
  {
    slug: "ai-systems",
    title: "AI Systems",
    summary:
      "We design assistants, workflow logic, and intelligence layers that turn complex tasks into repeatable operations.",
    examples: [
      "Agent orchestration",
      "Workflow automation",
      "Speech and language analysis",
      "Decision-support assistants"
    ]
  },
  {
    slug: "creative-technology",
    title: "Creative Technology",
    summary:
      "We build tools where media, storytelling, and AI meet practical product experiences.",
    examples: [
      "Audio and language intelligence",
      "AI-assisted media systems",
      "Interactive content tooling",
      "Creator workflow automation"
    ]
  },
  {
    slug: "business-intelligence",
    title: "Business Intelligence",
    summary:
      "We connect data, workflows, and operational context to help teams act with better signal.",
    examples: [
      "Operational dashboards",
      "Promotion and return analytics",
      "Workflow observability",
      "Actionable reporting pipelines"
    ]
  }
];

export const serviceTracks: ServiceTrack[] = [
  {
    audience: "businesses",
    title: "Fast Website Launch",
    summary:
      "Launch a clear, conversion-focused site quickly without sacrificing structure, performance, or trust.",
    examples: [
      "Messaging and structure that makes the offer obvious",
      "High-performance build, mobile polish, SEO foundation",
      "Clear calls-to-action and intake path"
    ]
  },
  {
    audience: "creators",
    title: "Local Services Lead Engine",
    summary:
      "Turn clicks and calls into a visible lead flow with routing, follow-up, and cleaner attribution.",
    examples: [
      "Lead capture forms and qualification logic",
      "Follow-up automation and response timing",
      "Local search and inbound conversion setup"
    ]
  },
  {
    audience: "startups",
    title: "AI Workflow / Product Direction",
    summary:
      "Shape an idea into a believable build path with practical AI-assisted workflows and scoped next steps.",
    examples: [
      "Guided intake and concept clarification",
      "Phased deliverables and likely stack",
      "Prototype, workflow, or product-direction planning"
    ]
  }
];

export const projectCaseStudies: ProjectCaseStudy[] = [
  {
    slug: "peacepad",
    name: "PeacePad",
    tagline: "Pre-send communication safety for difficult conversations.",
    pillar: "ai-systems",
    tags: ["AI", "Communication", "Mobile"],
    summary:
      "PeacePad intervenes before a message is sent, helping users pause and choose a more constructive next action.",
    status: "live",
    availabilityLabel: "Live on Google Play",
    googlePlayUrl: "https://play.google.com/store/apps/details?id=ca.peacepad.family",
    sections: {
      problem:
        "High-stakes conversations often escalate because most messaging tools react only after a message is already sent.",
      insight:
        "Intervening in the pre-send moment is more effective than trying to repair conflict after delivery.",
      solution:
        "PeacePad analyzes message tone at composition time and prompts users with three choices: send original, edit manually, or send a calmer version.",
      capabilities: [
        "Pre-send message analysis",
        "Tone-sensitive rewrite options",
        "Human-in-control decision flow",
        "Communication coaching prompts"
      ],
      technology: [
        "Mobile-first interaction model",
        "LLM-assisted text intervention",
        "Cloud API integration"
      ],
      outcome:
        "PeacePad is a production-facing product proving Una Labs' communication-intelligence capability."
    }
  },
  {
    slug: "saywetin",
    name: "SayWetin",
    tagline: "Nigerian music and language context intelligence.",
    pillar: "creative-technology",
    tags: ["Audio", "Culture", "AI"],
    summary:
      "SayWetin combines audio recognition with cultural interpretation to explain meaning, slang, and context.",
    status: "live",
    availabilityLabel: "Live on Google Play",
    googlePlayUrl: "https://play.google.com/store/apps/details?id=com.saywetin.app",
    marketingBullets: [
      "Recognize Nigerian songs",
      "Explain slang and cultural meaning",
      "Provide contextual interpretation"
    ],
    sections: {
      problem:
        "Global audio tools identify tracks but rarely explain Nigerian nuance, slang, or local cultural references.",
      insight:
        "Recognition alone is insufficient; users need both identification and contextual interpretation.",
      solution:
        "SayWetin captures audio, maps likely matches, and adds plain-language interpretation of lyrics, slang, and cultural context.",
      capabilities: [
        "Audio ingestion and analysis",
        "Cultural context enrichment",
        "Language nuance explanation",
        "Interpretation-first UX"
      ],
      technology: [
        "Audio processing pipeline",
        "Metadata and language enrichment",
        "Cloud-backed service architecture"
      ],
      outcome:
        "SayWetin is an active product track that demonstrates Una Labs' creative technology and audio-intelligence direction."
    }
  },
  {
    slug: "ateam",
    name: "ATEAM",
    tagline: "The AI lab where rough ideas become clear next steps.",
    pillar: "business-intelligence",
    tags: ["Guided demo", "Scoping", "Systems"],
    summary:
      "ATEAM is Una Labs' guided AI lab for structured idea intake, phased project direction, and clear next-step recommendations.",
    status: "internal-runtime",
    availabilityLabel: "Public demo",
    marketingBullets: [
      "Guided idea intake",
      "Structured project direction",
      "Phased output and next steps"
    ],
    sections: {
      problem:
        "Early project ideas are usually too fuzzy to estimate, prioritize, or move into clean execution.",
      insight:
        "People move faster when an idea is translated into a clear lane, scope, and next action before build work begins.",
      solution:
        "ATEAM turns rough concepts into a compact project brief with a recommended lane, likely deliverables, and a handoff into real intake.",
      capabilities: [
        "Guided intake and clarification",
        "Lane recommendation and scoping",
        "Structured output generation",
        "CTA-ready project handoff"
      ],
      technology: [
        "Public demo shell",
        "Safe structured prompting",
        "Scoped handoff into intake"
      ],
      outcome:
        "ATEAM gives visitors a believable, useful preview of how Una Labs thinks before a project formally begins."
    }
  }
];

export function getProjectCaseStudy(slug: string): ProjectCaseStudy | undefined {
  return projectCaseStudies.find((item) => item.slug === slug);
}

