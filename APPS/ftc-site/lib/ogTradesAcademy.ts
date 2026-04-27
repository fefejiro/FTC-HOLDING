import type { Metadata } from "next";
import { SITE_URL } from "./site";

export type OgTradesNavLink = {
  label: string;
  href: string;
};

export type OgTradesStat = {
  label: string;
  value: string;
  detail: string;
};

export type OgTradesCourseWeek = {
  week: string;
  title: string;
  summary: string;
  outcomes: string[];
};

export type OgTradesFaq = {
  question: string;
  answer: string;
};

export type OgTradesResource = {
  title: string;
  summary: string;
  format: string;
};

export type OgTradesContentPillar = {
  title: string;
  summary: string;
  bullets: string[];
};

export type OgTradesCommunityBenefit = {
  title: string;
  summary: string;
};

export type OgTradesService = {
  title: string;
  summary: string;
  audience: string;
  price: string;
  note: string;
};

export type OgTradesVideo = {
  title: string;
  href: string;
  embedUrl: string;
  duration: string;
  summary: string;
};

type OgTradesMetadataOptions = {
  title: string;
  description: string;
  pathname?: string;
  host?: string;
};

export const ogTradesAcademyBasePath = "/og-trades-academy" as const;
const DEFAULT_OG_TRADES_SITE_URL = "https://www.ogtradesacademy.com";
const configuredOgTradesSiteUrl =
  process.env.NEXT_PUBLIC_OG_TRADES_SITE_URL ||
  process.env.OG_TRADES_SITE_URL ||
  DEFAULT_OG_TRADES_SITE_URL;

export const OG_TRADES_SITE_URL = configuredOgTradesSiteUrl.replace(/\/+$/, "");
export const OG_TRADES_SITE_HOST = new URL(OG_TRADES_SITE_URL).host.toLowerCase();
export const OG_TRADES_APEX_HOST = OG_TRADES_SITE_HOST.replace(/^www\./, "");
export const OG_TRADES_WWW_HOST = OG_TRADES_SITE_HOST.startsWith("www.")
  ? OG_TRADES_SITE_HOST
  : `www.${OG_TRADES_SITE_HOST}`;
export const OG_TRADES_ALTERNATE_HOST =
  OG_TRADES_SITE_HOST === OG_TRADES_APEX_HOST ? OG_TRADES_WWW_HOST : OG_TRADES_APEX_HOST;

// Additional hosts that should render the OG Trades shell (preview + Una Labs subdomain).
// SEO canonical still points at OG_TRADES_SITE_URL; these are recognized at runtime so the
// Header/Footer/nav helpers render the OG-branded shell on these URLs.
const OG_TRADES_EXTRA_HOSTS = new Set<string>([
  "og.unalabs.cloud",
  "og-trades-pages.pages.dev"
]);

export const ogTradesAcademyNavItems = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Programs", path: "/course" },
  { label: "Resources", path: "/resources" },
  { label: "Community", path: "/community" },
  { label: "Contact", path: "/contact" }
] as const;

export const ogTradesAcademyPublicPaths = new Set<string>(ogTradesAcademyNavItems.map((item) => item.path));

function normalizeHost(host = "") {
  return String(host || "").trim().toLowerCase().replace(/:\d+$/, "");
}

function normalizePathname(pathname = "/") {
  const normalized = `/${String(pathname || "/").trim().replace(/^\/+/, "")}`.replace(/\/+$/, "");
  return normalized === "" ? "/" : normalized;
}

export function isOgTradesCustomHost(host = "") {
  const normalized = normalizeHost(host);
  if (!normalized) {
    return false;
  }
  return (
    normalized === OG_TRADES_SITE_HOST ||
    normalized === OG_TRADES_ALTERNATE_HOST ||
    OG_TRADES_EXTRA_HOSTS.has(normalized)
  );
}

export function isOgTradesRedirectHost(host = "") {
  return normalizeHost(host) === OG_TRADES_ALTERNATE_HOST;
}

export function isOgTradesPublicPath(pathname = "/") {
  return ogTradesAcademyPublicPaths.has(normalizePathname(pathname));
}

export function getOgTradesInternalPath(pathname = "/") {
  const normalized = normalizePathname(pathname);
  return normalized === "/" ? ogTradesAcademyBasePath : `${ogTradesAcademyBasePath}${normalized}`;
}

export function getOgTradesBrandedPath(
  pathname = "/",
  options: { host?: string; customDomain?: boolean } = {}
) {
  const normalized = normalizePathname(pathname);
  const useCustomDomain = options.customDomain ?? isOgTradesCustomHost(options.host || "");
  if (useCustomDomain) {
    return normalized;
  }
  return getOgTradesInternalPath(normalized);
}

export function stripOgTradesBasePath(pathname = "/") {
  const normalized = normalizePathname(pathname);
  if (normalized === ogTradesAcademyBasePath) {
    return "/";
  }
  if (normalized.startsWith(`${ogTradesAcademyBasePath}/`)) {
    return normalized.slice(ogTradesAcademyBasePath.length);
  }
  return null;
}

export function getOgTradesAbsoluteUrl(
  pathname = "/",
  options: { host?: string; customDomain?: boolean } = {}
) {
  const useCustomDomain = options.customDomain ?? isOgTradesCustomHost(options.host || "");
  const origin = useCustomDomain ? OG_TRADES_SITE_URL : SITE_URL;
  return new URL(getOgTradesBrandedPath(pathname, { customDomain: useCustomDomain }), `${origin}/`).toString();
}

export function getOgTradesNavLinks(options: { host?: string; customDomain?: boolean } = {}): OgTradesNavLink[] {
  return ogTradesAcademyNavItems.map((item) => ({
    label: item.label,
    href: getOgTradesBrandedPath(item.path, options)
  }));
}

export const ogTradesAcademyConfig = {
  companyName: "OG_Trades Academy",
  tagline: "Founder-led forex education, mentorship, and community support for developing traders",
  founderName: "OG_Trades",
  beaconsUrl: "https://beacons.ai/ogtradesacademy.com",
  communityUrl: "https://tinyurl.com/ogtradesacademy",
  youtubeUrl: "https://youtube.com/@og_tradesacademy",
  tiktokUrl: "https://www.tiktok.com/@dobble__g",
  instagramUrl: "https://www.instagram.com/ogtradesacademy",
  coursePurchaseUrl: "https://shop.beacons.ai/ogtradesacademy.com/f2481efd-649b-4c42-badf-f1626ace2ea3",
  courseProductId: "f2481efd-649b-4c42-badf-f1626ace2ea3",
  profileImageUrl:
    "https://cdn.beacons.ai/user_content/9pWub1NsVEN9r5HO2uazmTqP8WV2/profile_ogtradesacademy.com.png",
  courseImageUrl:
    "https://cdn.beacons.ai/user_content/9pWub1NsVEN9r5HO2uazmTqP8WV2/referenced_images/generated-images__store__product-image__f2481efd-649b-4c42-badf-f1626ace2ea3__291499da-8a1f-4780-8363-c016f0d4b647.webp",
  courseName: "8 Week Beginner Forex Course",
  courseDuration: "8 weeks",
  priceNow: "$199",
  priceWas: "$399",
  priceNote: "Current public course price",
  primaryCta: { label: "Join the Academy", href: "#services" },
  secondaryCta: { label: "Explore Courses and Signals", href: "/course" },
  hero: {
    eyebrow: "Founder-led forex academy",
    headline: "Learn forex with more structure, mentorship, and guidance through a founder-led academy.",
    subheadline:
      "OG Trades Academy helps beginners and developing traders understand forex, build confidence, and access education, signals, and mentorship through a practical learning system.",
    bullets: [
      "Learn directly from OG_Trades through structured education, practical teaching, and mentorship-style support.",
      "Access courses, crash trainings, signals, community, and guided trader support in one academy brand.",
      "Built for beginners, curious learners, and traders who want to grow with clarity, discipline, and confidence."
    ]
  },
  founderHighlights: [
    "Founder and lead instructor teaching directly through the academy's programs, lessons, and support offers.",
    "Background shaped by both banking experience and a personal forex journey built on study, discipline, and market repetition.",
    "Teaching style centers on chart understanding, risk management, patience, emotional control, and practical execution.",
    "Built the academy to help beginners and developing traders learn forex in a more honest, personal, and supportive way."
  ],
  trustStatements: [
    "Founder-led forex instruction",
    "Beginner-friendly learning paths",
    "Telegram community support",
    "Courses, crash trainings, and signals"
  ],
  stats: [
    {
      label: "Led by",
      value: "OG_Trades",
      detail: "Learn directly from the founder and instructor behind the academy."
    },
    {
      label: "Flagship path",
      value: "8 weeks",
      detail: "A step-by-step beginner program with structure and progression."
    },
    {
      label: "Support layer",
      value: "Mentorship",
      detail: "Grow with community, guidance, and support beyond one standalone course."
    },
    {
      label: "Learning style",
      value: "Risk first",
      detail: "Discipline, capital protection, and clear process come before chasing trades."
    }
  ] satisfies OgTradesStat[],
  founderStory: {
    headline: "Meet the founder and instructor behind OG_Trades Academy.",
    paragraphs: [
      "OG_Trades is the founder and lead instructor of the academy, bringing together banking experience, a disciplined forex journey, and hands-on teaching built around steady trader development.",
      "His path in forex has been shaped by learning the market through repetition, risk management, chart study, and the kind of discipline that helps traders stay in the game long enough to improve.",
      "He started OG_Trades Academy to create a more personal and structured place for people who want to learn forex seriously without getting lost in hype, confusion, or scattered information online.",
      "The academy is built for people looking for extra income, people who are curious about trading, complete beginners, and developing traders who want to grow their forex knowledge with guidance and community."
    ]
  },
  curriculum: [
    {
      week: "Week 1",
      title: "Forex foundations and platform setup",
      summary: "Build the baseline: market sessions, chart setup, terminology, and how currency pairs behave.",
      outcomes: ["Understand pair structure", "Set up a charting workflow", "Read the market without guessing"]
    },
    {
      week: "Week 2",
      title: "Risk management and account protection",
      summary: "Learn how to size positions, set stop losses, and think in scenarios instead of emotion.",
      outcomes: ["Protect trading capital", "Use fixed risk per setup", "Avoid revenge and overtrading patterns"]
    },
    {
      week: "Week 3",
      title: "Market structure and chart analysis",
      summary: "Read trends, consolidation, liquidity areas, and key levels with more confidence.",
      outcomes: ["Mark support and resistance", "Spot trend context", "Build a cleaner pre-trade map"]
    },
    {
      week: "Week 4",
      title: "Entry and exit frameworks",
      summary: "Turn chart context into trade ideas with defined triggers, invalidation, and targets.",
      outcomes: ["Plan entries", "Set logical exits", "Write a repeatable execution checklist"]
    },
    {
      week: "Week 5",
      title: "LASER strategy and setup logic",
      summary: "Break down one of the signature strategy themes already discussed in the public content.",
      outcomes: ["Recognize setup conditions", "Filter weak trades", "Match the strategy to market context"]
    },
    {
      week: "Week 6",
      title: "Trading psychology and discipline",
      summary: "Work on habits that shape consistency: patience, journaling, and emotional control.",
      outcomes: ["Create a review rhythm", "Reduce impulsive entries", "Detach from outcome-chasing"]
    },
    {
      week: "Week 7",
      title: "Trading performance and accountability",
      summary: "Track your development, review your execution habits, and build the accountability structure traders need to keep improving.",
      outcomes: ["Review your setups objectively", "Build a performance tracking habit", "Develop accountability rituals for long-term growth"]
    },
    {
      week: "Week 8",
      title: "Execution plan and next-step roadmap",
      summary: "Pull everything together into a practical plan for demo trading or early live-market development.",
      outcomes: ["Build a personal trading plan", "Know what to practice next", "Leave with a structured workflow"]
    }
  ] satisfies OgTradesCourseWeek[],
  faqs: [
    {
      question: "Who is this for?",
      answer:
        "This is for anyone looking for extra income, people who are curious about trading, complete beginners, and people who want to learn and grow in forex with a clear, beginner-friendly foundation."
    },
    {
      question: "Do I need trading experience before joining?",
      answer:
        "No. The curriculum starts with the basics, including chart setup, core forex concepts, and risk management before moving into execution, psychology, and strategy."
    },
    {
      question: "What makes this different from free content?",
      answer:
        "The difference is structure and support. Instead of isolated tips, students get a guided learning path, clearer explanations, practical examples, and a community that helps them stay connected as they grow."
    },
    {
      question: "Does the course guarantee profits?",
      answer:
        "No. OG_Trades Academy provides education and support, not guaranteed financial outcomes. Forex trading involves real risk, so the focus is on learning, discipline, and responsible decision-making."
    },
    {
      question: "Is there a community attached to the program?",
      answer:
        "Yes. There is a Telegram community where students and traders can stay connected, learn, ask questions, and grow together."
    }
  ] satisfies OgTradesFaq[],
  resources: [
    {
      title: "Forex Starter Glossary",
      summary: "A beginner-friendly reference for sessions, pips, spreads, lots, and the terms new traders see every day.",
      format: "Guide"
    },
    {
      title: "Risk Calculator Worksheet",
      summary: "A simple worksheet for sizing positions and thinking in percentage risk before clicking buy or sell.",
      format: "Template"
    },
    {
      title: "Chart Markup Checklist",
      summary: "A repeatable pre-trade routine for levels, market structure, entry conditions, and invalidation.",
      format: "Checklist"
    },
    {
      title: "Trading Journal Prompt Pack",
      summary: "Reflection prompts to help traders review discipline, emotional state, and setup quality after each session.",
      format: "Journal"
    }
  ] satisfies OgTradesResource[],
  contentPillars: [
    {
      title: "Structured learning",
      summary: "Start with the essentials and move forward with clear steps instead of scattered information.",
      bullets: ["Beginner foundations", "Step-by-step progression", "Practical chart study"]
    },
    {
      title: "Mentorship and guidance",
      summary: "Learn from OG_Trades' teaching style through direct instruction, mentorship-style support, and clearer guidance.",
      bullets: ["Founder-led instruction", "Risk-first mindset", "Actionable trade education"]
    },
    {
      title: "Community support",
      summary: "Stay connected between lessons through a learning community designed for questions, accountability, and growth.",
      bullets: ["Telegram community", "Shared learning", "Long-term trader development"]
    }
  ] satisfies OgTradesContentPillar[],
  services: [
    {
      title: "8 Week Course",
      summary:
        "A structured beginner program covering forex foundations, market structure, risk management, entries, exits, and trading mindset.",
      audience: "Best for beginners who want a complete starting point and a step-by-step learning path.",
      price: "$199",
      note: "Current public course price"
    },
    {
      title: "Crash Courses",
      summary:
        "Shorter focused trainings built to help traders learn a specific topic, concept, or trading skill in a faster format.",
      audience: "Best for learners who want targeted education without committing to the full 8-week program.",
      price: "Pricing coming soon",
      note: "Public pricing can be added once finalized"
    },
    {
      title: "Signals",
      summary:
        "Market ideas and trading signals designed to help traders stay connected to setups, analysis, and decision-making support.",
      audience: "Best for traders who want added guidance while continuing to build their own chart understanding.",
      price: "Pricing coming soon",
      note: "Placeholder until the offer structure is finalized"
    },
    {
      title: "Mentorship and Support",
      summary:
        "A higher-touch support path designed to help traders stay accountable, ask better questions, and grow with more direct guidance.",
      audience: "Best for traders who want more personal support, feedback, and mentorship as they build consistency.",
      price: "Pricing coming soon",
      note: "Confirm format: private mentorship, group coaching, or office-hours model"
    },
    {
      title: "Telegram Community",
      summary:
        "A connected space where students and traders can ask questions, stay in the loop, learn together, and keep growing outside the lessons.",
      audience: "Best for students who want ongoing support, community, and accountability between learning sessions.",
      price: "Pricing coming soon",
      note: "Can also be bundled with select academy offers"
    },
    {
      title: "Free Resources and Video Lessons",
      summary:
        "Open-access lessons, breakdowns, and educational content that help new traders keep learning before and after paid programs.",
      audience: "Best for anyone who wants to start learning, revisit the basics, or stay connected to the academy's teaching style.",
      price: "Free",
      note: "Available through the academy's public content channels"
    }
  ] satisfies OgTradesService[],
  courseHighlights: [
    "Core principles of forex, currency pairs, and market structure",
    "Risk management techniques to protect trading capital",
    "Entry and exit strategies for more consistent execution",
    "Charts, indicators, and price action fundamentals",
    "Discipline, patience, and trading mindset development",
    "Practical exercises and live examples to reinforce learning"
  ],
  communityBenefits: [
    {
      title: "Stay connected between lessons",
      summary: "The Telegram community gives students and traders a place to stay in touch with updates, learning conversations, and shared momentum."
    },
    {
      title: "Ask questions and keep learning",
      summary: "Community support helps people move from passive watching to active learning with more clarity and follow-through."
    },
    {
      title: "Grow with the academy",
      summary: "As the academy expands with more services and support, the community stays at the center of the student experience."
    }
  ] satisfies OgTradesCommunityBenefit[],
  videos: [
    {
      title: "$100K FundingPips Account in drawdown of -2%... My Next Trades",
      href: "https://youtube.com/watch?v=4PPWpmXYBjo",
      embedUrl: "https://www.youtube.com/embed/4PPWpmXYBjo",
      duration: "2:41",
      summary: "Short-form breakdown of account management under pressure and what comes next."
    },
    {
      title: "How I Passed my $100K FundingPips Account | Trading Like a Business",
      href: "https://youtube.com/watch?v=hEFTRTlIvSc",
      embedUrl: "https://www.youtube.com/embed/hEFTRTlIvSc",
      duration: "12:27",
      summary: "A stronger authority piece around process, structure, and business-minded execution."
    },
    {
      title: "I Bought a $100K Prop Firm Account... Here's My Weekly Market Analysis",
      href: "https://youtube.com/watch?v=G5R0RX-qGCc",
      embedUrl: "https://www.youtube.com/embed/G5R0RX-qGCc",
      duration: "5:22",
      summary: "A timely market-analysis format that can double as evergreen authority content."
    },
    {
      title: "How a Pro Trader Analyzes and Trades USDJPY with Proper Risk Management Strategy",
      href: "https://youtube.com/watch?v=AzGdQ2NvntA",
      embedUrl: "https://www.youtube.com/embed/AzGdQ2NvntA",
      duration: "21:39",
      summary: "Long-form breakdown showing chart reading, pair focus, and disciplined trade planning."
    },
    {
      title: "I Finally Understood Risk Management (Thanks to My Old Banking Job)",
      href: "https://youtube.com/watch?v=ORveiz2qvTs",
      embedUrl: "https://www.youtube.com/embed/ORveiz2qvTs",
      duration: "12:23",
      summary: "Founder-story content that links banking experience to capital protection and trader discipline."
    },
    {
      title: "Forex Trading Strategy for Beginners - LASER Strategy Breakdown Explained",
      href: "https://youtube.com/watch?v=ItzyXZQHxoo",
      embedUrl: "https://www.youtube.com/embed/ItzyXZQHxoo",
      duration: "8:46",
      summary: "A core beginner strategy explainer that supports foundational learning and skill growth."
    },
    {
      title: "How I Took My $5K Account to #32 on FundingPips Leaderboard",
      href: "https://youtube.com/watch?v=JCL4hY9auf4",
      embedUrl: "https://www.youtube.com/embed/JCL4hY9auf4",
      duration: "6:20",
      summary: "A performance-led proof point that reinforces accountability and progression."
    }
  ] satisfies OgTradesVideo[],
  youtubeTopics: [
    "Risk management and beginner discipline",
    "Live account management and real trading context",
    "LASER strategy breakdowns and setup logic",
    "Entry and exit structure on live charts",
    "Trading psychology and mindset resets"
  ],
  disclaimer:
    "Trading involves real risk. OG Trades Academy provides education, discipline, risk management, and market understanding — not financial advice, and not a guarantee of trading profits. Only risk capital you can afford to lose."
} as const;

export function getOgTradesMetadata({
  title,
  description,
  pathname = "/",
  host
}: OgTradesMetadataOptions): Metadata {
  const canonicalUrl = getOgTradesAbsoluteUrl(pathname, { host });

  return {
    title,
    description,
    keywords: [
      "OG Trades Academy",
      "forex education",
      "beginner forex course",
      "forex trading community",
      "risk management trading",
      "OG Trades"
    ],
    alternates: {
      canonical: canonicalUrl
    },
    icons: {
      icon: "/images/brand/og-trades-logo.jpg",
      shortcut: "/images/brand/og-trades-logo.jpg"
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonicalUrl,
      siteName: ogTradesAcademyConfig.companyName,
      images: [
        {
          url: ogTradesAcademyConfig.profileImageUrl,
          alt: `${ogTradesAcademyConfig.companyName} profile`
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogTradesAcademyConfig.profileImageUrl]
    }
  };
}
