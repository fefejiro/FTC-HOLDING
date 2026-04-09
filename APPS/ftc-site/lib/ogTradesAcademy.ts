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

export const ogTradesAcademyNavItems = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Course", path: "/course" },
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
  return normalized === OG_TRADES_SITE_HOST || normalized === OG_TRADES_ALTERNATE_HOST;
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
  tagline: "Forex education built around process, discipline, and risk-first execution",
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
  priceNote: "50% off the regular rate",
  primaryCta: { label: "Buy the 8-Week Course", href: "https://shop.beacons.ai/ogtradesacademy.com/f2481efd-649b-4c42-badf-f1626ace2ea3" },
  secondaryCta: { label: "See the Course Details", href: "/course" },
  hero: {
    eyebrow: "Structured forex training for beginners",
    headline: "Learn forex with a clear plan, real trading context, and a risk-first foundation.",
    subheadline:
      "OG_Trades Academy turns scattered trading advice into a guided 8-week curriculum focused on market structure, entries, exits, psychology, and responsible risk management.",
    bullets: [
      "Built from the same themes already taught on YouTube: risk, execution, mindset, and prop-firm accountability.",
      "Structured for beginners who need order, not information overload.",
      "Designed to lead from theory into repeatable market preparation."
    ]
  },
  founderHighlights: [
    "Forex educator with public content centered on risk management and disciplined execution.",
    "Shares FundingPips account progression and prop-firm context as part of the learning narrative.",
    "Teaching style blends chart reading, trading mindset, and practical beginner repetition.",
    "Background references banking experience alongside active trading education."
  ],
  trustStatements: [
    "Risk management before trade frequency",
    "Prop-firm account progression context",
    "Beginner-friendly structure with weekly milestones",
    "Trading psychology and discipline built into the curriculum"
  ],
  stats: [
    {
      label: "Core offer",
      value: "8 weeks",
      detail: "A defined beginner curriculum instead of disconnected lessons."
    },
    {
      label: "Launch price",
      value: "$199",
      detail: "Current discounted entry point for the flagship course."
    },
    {
      label: "Course focus",
      value: "Risk first",
      detail: "Position sizing, discipline, and survival come before aggressive setups."
    },
    {
      label: "Social proof",
      value: "5.0 / 5",
      detail: "Current Beacons listing shows a 5-star rating from 1 review."
    }
  ] satisfies OgTradesStat[],
  founderStory: {
    headline: "A teaching style grounded in process, not hype.",
    paragraphs: [
      "OG_Trades Academy is positioned around steady skill-building for traders who are new to forex and need a reliable structure.",
      "Instead of promising unrealistic outcomes, the brand leads with risk control, chart literacy, entry and exit planning, and the emotional discipline needed to stay consistent.",
      "Public content around FundingPips progression, the LASER strategy, and account development helps reinforce that the academy is rooted in active market context rather than generic theory."
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
      title: "Prop-firm context and performance review",
      summary: "Understand challenge rules, drawdown pressure, and how to trade under accountability.",
      outcomes: ["Think in rules", "Respect evaluation structure", "Avoid challenge-ending mistakes"]
    },
    {
      week: "Week 8",
      title: "Execution plan and next-step roadmap",
      summary: "Pull everything together into a practical plan for demo, prop-firm, or early live-market development.",
      outcomes: ["Build a personal trading plan", "Know what to practice next", "Leave with a structured workflow"]
    }
  ] satisfies OgTradesCourseWeek[],
  faqs: [
    {
      question: "Who is this course for?",
      answer:
        "The course is built for beginner traders who want a structured path into forex, especially people who feel overwhelmed by random videos and fragmented advice."
    },
    {
      question: "Do I need trading experience before joining?",
      answer:
        "No. The curriculum starts with foundations, chart setup, and risk basics before moving into execution, psychology, and prop-firm context."
    },
    {
      question: "What makes this different from free content?",
      answer:
        "The main difference is structure. Instead of isolated tips, students follow a sequenced plan with weekly progression, practical exercises, and a clearer learning arc."
    },
    {
      question: "Does the course guarantee profits?",
      answer:
        "No. The academy is positioned as trading education, not guaranteed financial outcomes. Forex and prop-firm trading both involve real risk."
    },
    {
      question: "How much time should I expect each week?",
      answer:
        "Students should expect time for lessons, chart review, note-taking, and practice. The strongest results usually come from consistent weekly repetition."
    },
    {
      question: "Is there a community attached to the program?",
      answer:
        "Yes. The academy also points students toward a community space where they can stay connected to updates, support, and future offers."
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
      title: "Risk management",
      summary: "Capital protection, position sizing, and drawdown awareness stay central to the brand story.",
      bullets: ["Risk-per-trade discipline", "Account protection habits", "Prop-firm rule awareness"]
    },
    {
      title: "Strategy breakdowns",
      summary: "Public education can keep unpacking setups like the LASER strategy and how they fit different market conditions.",
      bullets: ["Entry logic", "Exit logic", "Context and invalidation"]
    },
    {
      title: "Mindset and psychology",
      summary: "The academy can own a strong lane around patience, discipline, and the emotional side of execution.",
      bullets: ["Journal-driven review", "Avoiding impulsive trades", "Consistency over excitement"]
    }
  ] satisfies OgTradesContentPillar[],
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
      title: "Stay close to the teaching flow",
      summary: "Students can keep up with updates, reminders, and future drops without relying on scattered social posts."
    },
    {
      title: "See what to focus on next",
      summary: "A community layer helps turn passive watching into guided repetition and stronger follow-through."
    },
    {
      title: "Grow with future offers",
      summary: "The platform is ready for more advanced tracks, challenge support, and members-only breakdowns over time."
    }
  ] satisfies OgTradesCommunityBenefit[],
  videos: [
    {
      title: "$100K FundingPips Account in drawdown of -2%… My Next Trades",
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
      title: "I Bought a $100K Prop Firm Account… Here's My Weekly Market Analysis",
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
      title: "Forex Trading Strategy for Beginners — LASER Strategy Breakdown Explained",
      href: "https://youtube.com/watch?v=ItzyXZQHxoo",
      embedUrl: "https://www.youtube.com/embed/ItzyXZQHxoo",
      duration: "8:46",
      summary: "A core beginner strategy explainer that supports both course sales and blog clustering."
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
    "FundingPips account progression and prop-firm context",
    "LASER strategy breakdowns and setup logic",
    "Entry and exit structure on live charts",
    "Trading psychology and mindset resets"
  ],
  disclaimer:
    "OG_Trades Academy provides trading education only. Nothing on this site should be treated as financial advice or a guarantee of trading performance."
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
