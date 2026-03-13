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
  { label: "Drone Services", href: "/services/drone" },
  { label: "Blog", href: "/blog" },
  { label: "Start a Project", href: "/#start-project" }
] as const;

export const networkingProfile: NetworkingProfile = {
  fullName: "Fejiro Efiuvwere",
  title: "Systems & Architecture Consultant",
  studioName: "Una Labs",
  studioLine: "Technology Studio",
  phoneDisplay: "+1 (416) 473-2732",
  phoneE164: "+14164732732",
  email: "fejiro.efiuvwere@gmail.com",
  linkedInUrl: siteLinks.linkedIn,
  networkHubUrl: "https://unalabs.cloud/connect",
  startProjectHref: "/work-with-ftc",
  portfolioLinks: [
    {
      label: "Una Labs Work",
      url: "https://unalabs.cloud/work",
      description: "Studio projects and case studies."
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
    title: "Businesses",
    summary:
      "We help teams automate operations, reduce manual risk, and improve decision quality with practical systems.",
    examples: [
      "AI assistants for internal ops",
      "Automation workflows",
      "Analytics dashboards",
      "Custom operational tooling"
    ]
  },
  {
    audience: "creators",
    title: "Creators",
    summary:
      "We design creative technology stacks for media production, storytelling, and audience-ready automation.",
    examples: [
      "AI storytelling systems",
      "Content workflow automation",
      "Media intelligence tooling",
      "Interactive experience design"
    ]
  },
  {
    audience: "startups",
    title: "Startups",
    summary:
      "We collaborate on architecture and product execution for founders building modern AI-enabled products.",
    examples: [
      "MVP architecture",
      "Capability-first API design",
      "Product workflow systems",
      "Execution roadmaps"
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
    tagline: "AI orchestration runtime for tools, context, and workflows.",
    pillar: "business-intelligence",
    tags: ["Automation", "Runtime", "Systems"],
    summary:
      "ATEAM coordinates agent behavior, context bundling, memory, and workflow routing across capability modules.",
    status: "internal-runtime",
    sections: {
      problem:
        "Most AI app stacks become brittle when orchestration, memory, and tool routing are tightly coupled.",
      insight:
        "A modular orchestration runtime can stabilize behavior and make capability extraction possible.",
      solution:
        "ATEAM provides route-level orchestration, context assembly, event and task handling, plus speech and voice capability surfaces under one backend shell.",
      capabilities: [
        "Agent orchestration",
        "Context bundling",
        "Event and task flow handling",
        "Storage and scope abstraction scaffolding"
      ],
      technology: [
        "Node/Express runtime",
        "Modular backend libraries",
        "Progressive storage and auth decoupling"
      ],
      outcome:
        "ATEAM is frozen at Phase 0 hardening and staged for phased capability extraction."
    }
  }
];

export function getProjectCaseStudy(slug: string): ProjectCaseStudy | undefined {
  return projectCaseStudies.find((item) => item.slug === slug);
}

