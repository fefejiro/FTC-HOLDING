import NodeCache from "node-cache";

/**
 * AI Helper - Centralized utilities for dev mode protection and cost optimization
 * MVP SIMPLIFIED: Only flag HOSTILE content - everything else defaults to calm
 */

// Cache for AI responses (default 5 min TTL)
const cacheTTL = parseInt(process.env.CACHE_TTL || "300", 10);
export const aiCache = new NodeCache({ 
  stdTTL: cacheTTL, 
  checkperiod: 120,
  useClones: false // Performance optimization
});

/**
 * Check if we're in development mode and should use mock responses
 */
export function isDevMode(): boolean {
  return process.env.NODE_ENV !== "production" && !process.env.ALLOW_DEV_AI;
}

/**
 * Get max completion tokens with safety cap
 */
export function getMaxTokens(defaultTokens: number = 128): number {
  const maxTokens = parseInt(process.env.MAX_COMPLETION_TOKENS || String(defaultTokens), 10);
  const safeMax = 512; // Safety cap to prevent runaway costs
  
  if (maxTokens > safeMax) {
    console.warn(`[Token Budget] Requested ${maxTokens} tokens, capping at ${safeMax}`);
  }
  
  return Math.min(maxTokens, safeMax);
}

/**
 * Log token usage for cost tracking
 */
export function logTokenUsage(endpoint: string, estimatedTokens: number, cached: boolean = false): void {
  if (process.env.LOG_TOKEN_USAGE === "true") {
    const status = cached ? "CACHED" : "API_CALL";
    console.log(`[Token Usage] ${endpoint} - ${status} - ~${estimatedTokens} tokens`);
  }
}

/**
 * ENHANCED TONE DETECTION - Multilingual + Intent-Based
 * Supports: English, Nigerian Pidgin, Creoles, mixed language
 * Detects: Social intent (belittling, mocking, provoking) not just keywords
 */

// HOSTILE: Direct attacks, threats, vulgar language
const HOSTILE_PATTERNS = [
  // English vulgar language
  /\bfuck\b|\bfucks\b|\bfucked\b|\bfucking\b|\bfucker\b|fuck you|fuck off|fuckin|f\*ck|f\*\*k/i,
  /\bshit\b|\bshits\b|\bshitty\b|bullshit|horseshit|shithead|sh\*t|s\*\*t/i,
  /\bass\b|\basses\b|asshole|assholes|bitch|bitches|bastard|prick|\bdick\b|dickhead|a\*\*hole|b\*tch/i,
  /piece of shit|scumbag|\bscum\b|you're trash|you are trash/i,
  /go to hell|burn in hell|rot in hell|drop dead/i,
  /shut up|shut the fuck up/i,
  
  // Nigerian Pidgin hostile/vulgar
  /\bcraze\b|u dey craze|you dey craze|craze person|craze man|craze woman/i,
  /\bmumu\b|mumu person|you be mumu/i,
  /\bolodo\b|you be olodo/i,
  /thunder fire|make thunder strike/i,
  /your papa!?|your mama!?|your mama.*die|wey born you/i,
  /\bwerey\b|you be werey/i,
  /\byeye\b|yeye person|yeye man|yeye woman/i,
  /\billiterate\b|fucking illiterate/i,
  
  // Direct threats (English + Pidgin)
  /i'll (take|get) (full|sole) custody/i,
  /you'll never see (the kids|them|your children)/i,
  /i'll (destroy|ruin) you/i,
  /you'll (pay|regret|be sorry)/i,
  /wait (until|till) (the court|a judge|my lawyer)/i,
  /i go show you|i go deal with you|see wetin go happen/i,
];

// ESCALATING: Belittling, mocking, provoking - catches cultural insults before profanity
const ESCALATING_PATTERNS = [
  // English belittling/mocking
  /you're (crazy|insane|psycho|an idiot|a moron|stupid)/i,
  /you are (crazy|insane|psycho|an idiot|a moron|stupid)/i,
  /terrible (parent|mother|father)/i,
  /bad parent|unfit parent/i,
  /pathetic|worthless|useless|failure/i,
  // NOTE: Removed "you always/never" - too broad, catches innocent statements like "you always pick up on Fridays"
  // These patterns only trigger conflict when followed by negative words
  /you always\s+(mess|screw|ruin|forget|ignore|lie|fail)/i,
  /you never\s+(listen|help|care|try|pay|remember)/i,
  
  // Nigerian Pidgin belittling/mocking (catches "you are mad", "fool", etc.)
  /\byou (are|be) mad\b|you dey mad|na mad/i,
  /\bfool\b|like fool|na fool|foolish/i,
  /\bany\s*how\b|talk any how|dey do any how/i,
  /na why.*dey talk/i,
  /\bna wa\b|e be like say/i,
  /for fear|I for fear/i,
  /\bsense\b.*no.*get|no get sense/i,
  /shame.*you|you no get shame/i,
  
  // Mocking particles and sarcasm markers
  /\babi\?|abi na|na so\?|shey na/i,
  /\boh!\b|\booh!\b|ehn ehn|aaah|hmmmm/i,
];

// DEFENSIVE: Blame-shifting, deflection, passive-aggression
const DEFENSIVE_PATTERNS = [
  /that's not fair|you know it/i,
  /you're (always )?blaming me/i,
  /typical of you|this is typical/i,
  /you never listen|never understand/i,
  /i can't believe you/i,
  /after all i (do|did|have done)/i,
  /na you cause am|na your fault/i,
  /wetin i do\?|wetin i do now/i,
];

// FRUSTRATED: Impatience, irritation, exasperation
const FRUSTRATED_PATTERNS = [
  /i'm (so )?frustrated/i,
  /this is (so )?frustrating/i,
  /i can't (deal|cope|take) (with )?this/i,
  /unilateral decisions/i,
  /keep (making|doing)/i,
  /e don tire me|i don tire/i,
  /wahala|this wahala/i,
];

/**
 * Generate personalized coaching based on MBTI personality types (both user and co-parent)
 * When both personalities are known, provides tailored suggestions for better communication
 */
export function getMBTISuggestion(
  tone: string, 
  myPersonalityType: string,
  coParentPersonalityType?: string | null,
  isCoParentGuessed?: boolean
): string | null {
  const myThinking = myPersonalityType.includes('T');
  const myFeeling = myPersonalityType.includes('F');
  const myIntrovert = myPersonalityType.includes('I');
  const myJudging = myPersonalityType.includes('J');
  
  // Co-parent personality analysis (if available)
  const coThinking = coParentPersonalityType?.includes('T');
  const coFeeling = coParentPersonalityType?.includes('F');
  const coIntrovert = coParentPersonalityType?.includes('I');
  const coExtrovert = coParentPersonalityType?.includes('E');

  if (tone === "hostile") {
    // Dual-personality adapted suggestions (co-parent-facing messages, not self-reflections)
    if (coParentPersonalityType) {
      if (myThinking && coFeeling) {
        return "I understand this is affecting you emotionally. Let's talk about how we can make this work for the kids.";
      }
      if (myFeeling && coThinking) {
        return "Here's what I'm concerned about regarding the kids. Can we work through the specifics together?";
      }
      if (myIntrovert && coExtrovert) {
        return "I need a bit of time to think this through. Can we revisit this in a few hours?";
      }
    }
    
    // Single personality fallback (co-parent-facing)
    if (myThinking) return "Let's focus on the facts here. What specifically needs to be resolved for the kids?";
    if (myFeeling) return "I'm feeling overwhelmed right now. Can we discuss this later when I'm in a better headspace?";
    return "I need some space right now. Let's revisit this when we're both calmer.";
  }

  if (tone === "escalating") {
    // Dual-personality adapted suggestions (co-parent-facing messages)
    if (coParentPersonalityType) {
      if (coIntrovert) {
        return "Take your time to think about this. We can discuss it when you're ready.";
      }
      if (coFeeling && myThinking) {
        return "I hear that you're frustrated. Let's figure out a solution that works for both of us and the kids.";
      }
      if (coThinking && myFeeling) {
        return "Here's what I'm feeling and what I need. Can we find a practical solution together?";
      }
    }
    
    // Single personality fallback (co-parent-facing)
    if (myThinking) return "Let's focus on the specific issue. What exactly needs to be resolved?";
    if (myIntrovert) return "Can we take a step back and discuss this more calmly?";
    if (myJudging) return "Here's what I think would work. What's your take?";
    return "I don't think this approach is helping either of us. Can we try a different way?";
  }

  return null;
}

/**
 * ENHANCED: Generate mock tone analysis with multilingual support
 * Detects: Hostile > Escalating > Defensive > Frustrated > Neutral
 * Supports: English, Nigerian Pidgin, Creoles, mixed language
 * Now includes dual-personality adaptation for better co-parent communication
 */
export function mockToneAnalysis(content: string, userPrefs?: {
  personalityType?: string;
  coParentPersonalityType?: string | null;
  isCoParentPersonalityGuessed?: boolean;
  communicationStyle?: string;
  conflictResolutionStyle?: string;
}): {
  tone: string;
  summary: string;
  emoji: string;
  rewordingSuggestion: string | null;
  personalityAdapted?: boolean; // Indicates if suggestion was adapted for co-parent
} {
  const hasMyPersonality = !!userPrefs?.personalityType;
  const hasCoParentPersonality = !!userPrefs?.coParentPersonalityType;
  console.log(`[Mock Mode] Enhanced tone analysis${hasMyPersonality ? ` with my personality: ${userPrefs.personalityType}` : ""}${hasCoParentPersonality ? ` and co-parent: ${userPrefs.coParentPersonalityType}${userPrefs.isCoParentPersonalityGuessed ? " (guessed)" : ""}` : ""}`);
  
  // Priority 1: Check for HOSTILE patterns (highest severity)
  for (const pattern of HOSTILE_PATTERNS) {
    if (pattern.test(content)) {
      console.log(`[Mock Mode] HOSTILE detected: ${pattern}`);
      const tone = "hostile";
      const suggestion = userPrefs?.personalityType 
        ? getMBTISuggestion(tone, userPrefs.personalityType, userPrefs.coParentPersonalityType, userPrefs.isCoParentPersonalityGuessed) 
        : "I need some space right now. Let's revisit this when we're both calmer.";
      return {
        tone,
        summary: "Aggressive language detected",
        emoji: "🚨",
        rewordingSuggestion: suggestion,
        personalityAdapted: hasMyPersonality && hasCoParentPersonality,
      };
    }
  }

  // Priority 1.5: Check for DISMISSIVE patterns only (direct insults)
  // NOTE: Removed LEGAL/MONEY/ACCUSATORY patterns from instant-hostile detection
  // because normal co-parenting messages often mention "custody", "support", "you always pick up on..."
  // These topics should be analyzed with more context, not flagged as hostile immediately
  for (const item of DISMISSIVE_PATTERNS) {
    if (item.pattern.test(content)) {
      console.log(`[Mock Mode] DISMISSIVE detected: ${item.description}`);
      return {
        tone: "hostile",
        summary: item.description,
        emoji: "⚠️",
        rewordingSuggestion: "Can we focus on what's best for the kids here?",
        personalityAdapted: hasMyPersonality && hasCoParentPersonality,
      };
    }
  }
  
  // Priority 2: Check for ESCALATING patterns (belittling, mocking, provoking)
  for (const pattern of ESCALATING_PATTERNS) {
    if (pattern.test(content)) {
      console.log(`[Mock Mode] ESCALATING detected: ${pattern}`);
      const tone = "escalating";
      const suggestion = userPrefs?.personalityType 
        ? getMBTISuggestion(tone, userPrefs.personalityType, userPrefs.coParentPersonalityType, userPrefs.isCoParentPersonalityGuessed) 
        : "I don't think this approach is helping either of us. Can we try a different way?";
      return {
        tone: "hostile", // Treat escalating as hostile for intervention
        summary: "This message might escalate the situation",
        emoji: "⚠️",
        rewordingSuggestion: suggestion,
        personalityAdapted: hasMyPersonality && hasCoParentPersonality,
      };
    }
  }
  
  // Priority 3: Check for DEFENSIVE patterns
  for (const pattern of DEFENSIVE_PATTERNS) {
    if (pattern.test(content)) {
      console.log(`[Mock Mode] DEFENSIVE detected: ${pattern}`);
      return {
        tone: "defensive",
        summary: "Defensive response",
        emoji: "🛡️",
        rewordingSuggestion: "I understand we see this differently. Can you help me understand your perspective?"
      };
    }
  }
  
  // Priority 4: Check for FRUSTRATED patterns
  for (const pattern of FRUSTRATED_PATTERNS) {
    if (pattern.test(content)) {
      console.log(`[Mock Mode] FRUSTRATED detected: ${pattern}`);
      return {
        tone: "frustrated",
        summary: "Frustration expressed",
        emoji: "😤",
        rewordingSuggestion: "I'm finding this situation challenging. Could we discuss a solution together?"
      };
    }
  }
  
  // Default: NEUTRAL (not "calm" - more accurate for unknown content)
  console.log(`[Mock Mode] No patterns matched, returning neutral`);
  return { 
    tone: "neutral", 
    summary: "Message ready to send", 
    emoji: "😐", 
    rewordingSuggestion: null 
  };
}

// Mock emotion responses for call monitoring (enhanced with Pidgin support)
const HOSTILE_EMOTION_PATTERNS = [
  // English
  /fuck|shit|damn|asshole|bitch|bastard/i,
  /hate you|despise|loathe/i,
  /shut up|go to hell/i,
  // Nigerian Pidgin
  /craze|mumu|olodo|werey|yeye/i,
  /thunder fire|you dey mad|you are mad/i,
  /fool|foolish|like fool/i,
];

/**
 * MVP SIMPLIFIED: Generate mock emotion analysis for call monitoring
 * Only flags hostile - everything else is calm/neutral
 */
export function mockEmotionAnalysis(transcript: string): {
  emotion: 'calm' | 'cooperative' | 'neutral' | 'frustrated' | 'tense' | 'defensive';
  confidence: number;
  summary: string;
  timestamp: number;
} {
  console.log("[Mock Mode] MVP simplified emotion analysis");
  
  // Check for hostile patterns
  for (const pattern of HOSTILE_EMOTION_PATTERNS) {
    if (pattern.test(transcript)) {
      return {
        emotion: 'defensive',
        confidence: 85,
        summary: 'Aggressive language detected',
        timestamp: Date.now()
      };
    }
  }
  
  // Default to calm
  return {
    emotion: 'calm',
    confidence: 80,
    summary: 'Conversation proceeding normally',
    timestamp: Date.now()
  };
}

/**
 * Generate mock session summary
 */
export function mockSessionSummary(emotionCount: number): string {
  console.log("[Mock Mode] Returning simulated session summary");
  
  return `Your conversation showed thoughtful communication throughout. ${
    emotionCount > 5 
      ? "You maintained good emotional awareness across the discussion." 
      : "Keep building on these positive interactions."
  } Remember, every conversation is an opportunity to strengthen your co-parenting relationship.`;
}

/**
 * Create cache key from content
 */
export function createCacheKey(prefix: string, content: string): string {
  // Normalize content for better cache hits
  const normalized = content.toLowerCase().trim().substring(0, 200);
  return `${prefix}:${normalized}`;
}

/**
 * MVP: Mock calendar suggestions for development
 */
export function mockCalendarSuggestions(): any[] {
  return [
    {
      title: "Sample Event",
      suggestedTime: new Date(Date.now() + 86400000).toISOString(),
      reason: "Mock suggestion for development"
    }
  ];
}

// ============================================================================
// CONFLICT ESCALATION SCORE (CES) SYSTEM
// Predictive harm prevention for co-parenting communication
// ============================================================================

/**
 * Conversation state enum for tracking escalation trajectory
 */
export type ConversationState = 
  | "neutral"    // 0-20 CES: Normal conversation flow
  | "sensitive"  // 21-40 CES: Touchy topics detected (money, custody, etc.)
  | "defensive"  // 41-60 CES: Blame-shifting, deflection patterns
  | "escalating" // 61-80 CES: Personal attacks beginning, rapid replies
  | "hostile";   // 81-100 CES: Direct attacks, threats, vulgar language

/**
 * Intervention level based on CES score
 */
export type InterventionLevel = 
  | "none"        // CES 0-30: No intervention needed
  | "soft_nudge"  // CES 31-50: Inline suggestion, non-blocking
  | "modal"       // CES 51-75: Pre-send modal with options
  | "hard_block"; // CES 76-100: Message blocked

/**
 * Conversation phase based on message count and escalation history
 * This affects how aggressive the AI mediator should be
 */
export type ConversationPhase = 
  | "cold"   // <5 messages: New conversation, minimal intervention
  | "warm"   // 5-15 messages: Building rapport, moderate guidance
  | "hot";   // >15 messages OR escalated: Active monitoring

/**
 * CES Result structure returned to the client
 */
export interface CESResult {
  score: number;                    // 0-100 escalation score
  state: ConversationState;         // Current conversation state
  phase: ConversationPhase;         // Cold/Warm/Hot based on message count & escalation
  interventionLevel: InterventionLevel;
  trajectory: "improving" | "stable" | "worsening"; // Direction of conversation
  signals: CESSignal[];             // Detected risk signals
  suggestedActions: SuggestedAction[];
  pauseRecommended: boolean;        // Should we suggest a cooling period?
  pauseDuration?: number;           // Suggested pause in minutes
  childImpactReminder: boolean;     // Show child-focused reminder (sparingly)
}

export interface CESSignal {
  type: "linguistic" | "behavioral" | "contextual" | "pattern";
  signal: string;
  weight: number; // How much this contributes to CES
  description: string;
}

export interface SuggestedAction {
  type: "rewrite" | "pause" | "send_anyway" | "save_draft" | "request_mediator";
  label: string;
  priority: number; // 1 = primary, 2 = secondary, 3 = tertiary
  dangerous?: boolean; // If true, requires confirmation
}

// Legal patterns - REDUCED weights (legal discussions are normal in co-parenting)
// Only custody THREATS should be high-weight
const LEGAL_ESCALATION_PATTERNS = [
  // Actual threats (higher weight)
  { pattern: /\bi['']?ll\s+(get|take)\s+(full|sole)\s+custody\b/i, weight: 18, description: "Custody threat" },
  { pattern: /\byou['']?ll\s+never\s+see\s+(the\s+)?(kids?|children?|them)\b/i, weight: 20, description: "Access denial threat" },
  // Neutral legal mentions (low weight - these are normal topics)
  { pattern: /\blawyer\b/i, weight: 5, description: "Legal mention" },
  { pattern: /\battorney\b/i, weight: 5, description: "Legal mention" },
  { pattern: /\bcourt\b/i, weight: 4, description: "Court mentioned" },
  { pattern: /\bjudge\b/i, weight: 4, description: "Court authority referenced" },
  { pattern: /\bcustody\b/i, weight: 3, description: "Custody topic" }, // Normal topic, not a threat
];

// Money patterns - REDUCED weights (expense discussions are expected in co-parenting)
const MONEY_TENSION_PATTERNS = [
  // Only aggressive financial demands should be flagged higher
  { pattern: /\bwhere['']?s\s+(my|the)\s+money\b/i, weight: 12, description: "Demanding tone about money" },
  { pattern: /\byou\s+(owe|stole|took)\b.*\bmoney\b/i, weight: 15, description: "Accusation about money" },
  // Normal expense discussions - very low weight
  { pattern: /\b(child\s*)?support\b/i, weight: 2, description: "Child support topic" },
  { pattern: /\bwhen\s+(are\s+you|can\s+you)\b.*\b(pay|send)\b/i, weight: 4, description: "Payment inquiry" },
  { pattern: /\bpaid\b.*\b(that|it|already)\b/i, weight: 3, description: "Payment clarification" },
];

// Child-expense terms that REDUCE hostility score when combined with money
// These indicate the financial discussion is about legitimate child needs
const CHILD_EXPENSE_CONTEXT_PATTERNS = [
  // School-related
  { pattern: /\bschool\s*supplies?\b/i, reduction: 20, description: "School supplies expense" },
  { pattern: /\btuition\b/i, reduction: 15, description: "Education expense" },
  { pattern: /\buniform\b/i, reduction: 15, description: "School uniform expense" },
  { pattern: /\bschool\s*fees?\b/i, reduction: 15, description: "School fees" },
  { pattern: /\btextbooks?\b/i, reduction: 12, description: "Textbook expense" },
  
  // Medical/health
  { pattern: /\bdoctor\b|\bmedical\b|\bmedicine\b/i, reduction: 18, description: "Medical expense" },
  { pattern: /\bprescription\b/i, reduction: 15, description: "Prescription expense" },
  { pattern: /\bdental\b|\bdentist\b/i, reduction: 15, description: "Dental expense" },
  { pattern: /\btherapy\b|\btherapist\b/i, reduction: 15, description: "Therapy expense" },
  { pattern: /\bbraces\b|\bglasses\b/i, reduction: 15, description: "Health equipment" },
  
  // Basic needs
  { pattern: /\bclothes\b|\bclothing\b|\bshoes\b/i, reduction: 12, description: "Clothing expense" },
  { pattern: /\bfood\b|\bgroceries\b/i, reduction: 10, description: "Food expense" },
  
  // Childcare & activities
  { pattern: /\bdaycare\b|\bchildcare\b/i, reduction: 18, description: "Childcare expense" },
  { pattern: /\bcamp\b|\bsummer\s*camp\b/i, reduction: 12, description: "Camp expense" },
  { pattern: /\blessons?\b|\btutoring\b/i, reduction: 12, description: "Lessons expense" },
  { pattern: /\bsports\b|\bactivities\b/i, reduction: 10, description: "Activities expense" },
  
  // General child context
  { pattern: /\b(for|about)\s+(the\s+)?(kids?|children?|son|daughter)\b/i, reduction: 15, description: "Child-focused expense" },
];

// ACCUSATORY_PATTERNS: Only flag when followed by negative/accusatory words
// "You always pick up on Fridays" = OK (routine statement)
// "You always forget" = Flag (accusation)
const ACCUSATORY_PATTERNS = [
  // Only flag "you always/never" when followed by negative verbs
  { pattern: /\byou\s+always\s+(mess|screw|ruin|forget|ignore|lie|fail|break|miss|skip|cancel|flake)/i, weight: 8, description: "Pattern accusation" },
  { pattern: /\byou\s+never\s+(listen|help|care|try|remember|pay|show|answer|respond|follow)/i, weight: 8, description: "Pattern accusation" },
  // Direct blame statements remain flagged
  { pattern: /\byour\s+fault\b/i, weight: 10, description: "Direct blame" },
  { pattern: /\bbecause\s+of\s+you\b/i, weight: 8, description: "Blame attribution" },
  // Passive-aggressive accusations
  { pattern: /\btypical\s+(of\s+)?you\b/i, weight: 8, description: "Dismissive generalization" },
];

const DISMISSIVE_PATTERNS = [
  { pattern: /\bare\s+you\s+(slow|dumb|stupid|crazy|insane)\b/i, weight: 25, description: "Intelligence attack" },
  { pattern: /\byou\s+(are|must\s+be)\s+(dumb|stupid|slow|crazy|an?\s+idiot)\b/i, weight: 25, description: "Intelligence attack" },
  // NOTE: "your mother/mom/dad" removed - often refers to grandparents in co-parenting context
  // Only flag when used as an insult with specific phrases
  { pattern: /\byour\s+(mother|mom|dad|father)\s+(is|was|raised)\b.*\b(crazy|insane|terrible)\b/i, weight: 20, description: "Family insult" },
];

// NEW SIGNAL CATEGORY: Emotional Charge (high intensity without hostility)
const EMOTIONAL_CHARGE_PATTERNS = [
  { pattern: /\bi\s+can['']?t\s+(take|handle|do)\s+this\b/i, weight: 12, description: "Emotional overwhelm expressed" },
  { pattern: /\bthis\s+is\s+(so\s+)?(hard|difficult|exhausting|overwhelming)\b/i, weight: 10, description: "Expressing difficulty" },
  { pattern: /\bi['']?m\s+(so\s+)?(tired|exhausted|drained|burnt\s*out)\b/i, weight: 10, description: "Emotional fatigue" },
  { pattern: /\bi\s+(feel|am)\s+(hurt|sad|disappointed|frustrated)\b/i, weight: 8, description: "Emotional disclosure" },
  { pattern: /\!{2,}/g, weight: 8, description: "Multiple exclamation marks" },
  { pattern: /\b(please|just)\s+stop\b/i, weight: 10, description: "Plea to stop" },
];

// NEW SIGNAL CATEGORY: Boundary Assertion (healthy limits - REDUCES score)
const BOUNDARY_ASSERTION_PATTERNS = [
  { pattern: /\bi\s+(need|require|would\s+like)\s+(some\s+)?(space|time)\b/i, reduction: 10, description: "Healthy space request" },
  { pattern: /\blet['']?s\s+(talk|discuss)\s+(about\s+)?this\s+(later|tomorrow|another\s+time)\b/i, reduction: 12, description: "Constructive delay" },
  { pattern: /\bi['']?m\s+not\s+(comfortable|okay)\s+(with|discussing)\b/i, reduction: 8, description: "Boundary setting" },
  { pattern: /\bcan\s+we\s+(please\s+)?(focus|stick\s+to)\b/i, reduction: 10, description: "Refocusing request" },
  { pattern: /\bi['']?d\s+(rather|prefer)\s+(not\s+)?(to\s+)?discuss\b/i, reduction: 8, description: "Topic boundary" },
];

// NEW SIGNAL CATEGORY: Collaborative Language (constructive tone - REDUCES score significantly)
const COLLABORATIVE_PATTERNS = [
  { pattern: /\bthank\s+you\b|\bthanks\b/i, reduction: 15, description: "Expression of gratitude" },
  { pattern: /\bi\s+appreciate\b/i, reduction: 12, description: "Appreciation expressed" },
  { pattern: /\bwhat\s+(do\s+you\s+think|works\s+for\s+you)\b/i, reduction: 15, description: "Seeking input" },
  { pattern: /\bwould\s+(you\s+)?(be\s+)?(open|willing|okay)\s+to\b/i, reduction: 12, description: "Respectful request" },
  { pattern: /\blet['']?s\s+(work|figure|sort)\s+(this\s+)?out\b/i, reduction: 15, description: "Collaborative proposal" },
  { pattern: /\bi\s+understand\b|\bi\s+hear\s+you\b/i, reduction: 12, description: "Acknowledgment" },
  { pattern: /\bfor\s+the\s+(kids?|children)\b/i, reduction: 10, description: "Child-focused framing" },
  { pattern: /\bwhat\s+if\s+we\b/i, reduction: 12, description: "Collaborative suggestion" },
  { pattern: /\bi['']?m\s+sorry\b/i, reduction: 10, description: "Apology expressed" },
  { pattern: /\bplease\s+let\s+me\s+know\b/i, reduction: 10, description: "Polite request" },
];

// NEW SIGNAL CATEGORY: Pressure/Control (manipulation, demands, ultimatums)
const PRESSURE_CONTROL_PATTERNS = [
  { pattern: /\bif\s+you\s+(don['']?t|won['']?t)\b.*\bi['']?ll\b/i, weight: 18, description: "Ultimatum detected" },
  { pattern: /\b(do\s+it|answer\s+me|respond)\s+(now|immediately|right\s+now)\b/i, weight: 15, description: "Demanding immediate response" },
  { pattern: /\b(you\s+)?(have|need)\s+to\s+(decide|choose|pick)\s+(now|today)\b/i, weight: 15, description: "Forcing decision" },
  { pattern: /\b(don['']?t\s+)?make\s+me\b/i, weight: 12, description: "Pressure language" },
  { pattern: /\byou\s+(better|had\s+better)\b/i, weight: 15, description: "Threatening tone" },
  { pattern: /\bor\s+else\b/i, weight: 20, description: "Direct threat" },
  { pattern: /\blast\s+chance\b/i, weight: 15, description: "Ultimatum language" },
];

// NEW SIGNAL CATEGORY: Evasion (deflecting, not addressing questions)
const EVASION_PATTERNS = [
  { pattern: /\bthat['']?s\s+not\s+(the\s+)?(point|issue|what\s+we['']?re)\b/i, weight: 10, description: "Deflecting from topic" },
  { pattern: /\bwhy\s+are\s+you\s+(bringing|talking\s+about)\b/i, weight: 8, description: "Avoiding through blame" },
  { pattern: /\bwhatever\b/i, weight: 12, description: "Dismissive evasion" },
  { pattern: /\bi\s+don['']?t\s+(want\s+to|have\s+to)\s+(talk|discuss|answer)\b/i, weight: 8, description: "Refusal to engage" },
  { pattern: /\b(anyway|regardless|moving\s+on)\b/i, weight: 6, description: "Topic avoidance" },
];

const RAPID_REPLY_THRESHOLD_MS = 120000; // 2 minutes between messages = rapid fire

/**
 * Calculate Conflict Escalation Score based on conversation history
 * 
 * @param currentMessage - The message being typed/about to be sent
 * @param conversationHistory - Array of recent messages with metadata
 * @param userId - Current user's ID (to distinguish sender vs receiver)
 * @returns CESResult with score, state, and intervention recommendations
 */
export function calculateConflictEscalationScore(
  currentMessage: string,
  conversationHistory: Array<{
    content: string;
    senderId: string;
    createdAt: string | Date;
    tone?: string | null;
  }>,
  userId: string
): CESResult {
  console.log(`[CES] Analyzing message with ${conversationHistory.length} history items`);
  
  let score = 0;
  const signals: CESSignal[] = [];
  
  // === ANALYZE CURRENT MESSAGE ===
  
  // Check for hostile patterns (from existing detection)
  for (const pattern of HOSTILE_PATTERNS) {
    if (pattern.test(currentMessage)) {
      score += 35;
      signals.push({
        type: "linguistic",
        signal: "hostile_language",
        weight: 35,
        description: "Aggressive or vulgar language detected"
      });
      break; // Only count once
    }
  }
  
  // Check for escalating patterns
  for (const pattern of ESCALATING_PATTERNS) {
    if (pattern.test(currentMessage)) {
      score += 20;
      signals.push({
        type: "linguistic",
        signal: "escalating_language",
        weight: 20,
        description: "Belittling or mocking language detected"
      });
      break;
    }
  }
  
  // Check legal escalation
  for (const { pattern, weight, description } of LEGAL_ESCALATION_PATTERNS) {
    if (pattern.test(currentMessage)) {
      score += weight;
      signals.push({
        type: "contextual",
        signal: "legal_escalation",
        weight,
        description
      });
    }
  }
  
  // Check money tension
  let hasFinancialMention = false;
  for (const { pattern, weight, description } of MONEY_TENSION_PATTERNS) {
    if (pattern.test(currentMessage)) {
      score += weight;
      hasFinancialMention = true;
      signals.push({
        type: "contextual",
        signal: "financial_tension",
        weight,
        description
      });
    }
  }
  
  // IMPORTANT: If financial discussion is about legitimate child expenses, REDUCE the score
  // This prevents false positives for messages like "When are you sending money for school supplies?"
  if (hasFinancialMention) {
    let totalReduction = 0;
    let childExpenseContext = "";
    
    for (const { pattern, reduction, description } of CHILD_EXPENSE_CONTEXT_PATTERNS) {
      if (pattern.test(currentMessage)) {
        totalReduction += reduction;
        childExpenseContext = description;
        
        // Add a positive signal to explain the reduction
        signals.push({
          type: "contextual",
          signal: "child_expense_context",
          weight: -reduction, // Negative weight to show reduction
          description: `Child-focused expense: ${description}`
        });
        break; // Only apply one reduction to avoid over-correction
      }
    }
    
    if (totalReduction > 0) {
      score = Math.max(0, score - totalReduction);
      console.log(`[CES] Child expense context detected (${childExpenseContext}), reduced score by ${totalReduction}`);
    }
  }
  
  // Check accusatory language
  for (const { pattern, weight, description } of ACCUSATORY_PATTERNS) {
    if (pattern.test(currentMessage)) {
      score += weight;
      signals.push({
        type: "linguistic",
        signal: "accusatory",
        weight,
        description
      });
    }
  }
  
  // Check dismissive/insulting patterns
  for (const { pattern, weight, description } of DISMISSIVE_PATTERNS) {
    if (pattern.test(currentMessage)) {
      score += weight;
      signals.push({
        type: "linguistic",
        signal: "dismissive_attack",
        weight,
        description
      });
    }
  }
  
  // Check emotional charge (high intensity without hostility)
  for (const { pattern, weight, description } of EMOTIONAL_CHARGE_PATTERNS) {
    if (pattern.test(currentMessage)) {
      score += weight;
      signals.push({
        type: "linguistic",
        signal: "emotional_charge",
        weight,
        description
      });
      break; // Only count once per category
    }
  }
  
  // Check boundary assertion (healthy limits - REDUCES score)
  let hasBoundaryAssertion = false;
  for (const { pattern, reduction, description } of BOUNDARY_ASSERTION_PATTERNS) {
    if (pattern.test(currentMessage)) {
      score = Math.max(0, score - reduction);
      hasBoundaryAssertion = true;
      signals.push({
        type: "behavioral",
        signal: "boundary_assertion",
        weight: -reduction, // Negative to show reduction
        description: `Healthy boundary: ${description}`
      });
      break;
    }
  }
  
  // Check collaborative language (constructive tone - REDUCES score)
  let collaborativeReduction = 0;
  for (const { pattern, reduction, description } of COLLABORATIVE_PATTERNS) {
    if (pattern.test(currentMessage)) {
      collaborativeReduction += reduction;
      signals.push({
        type: "behavioral",
        signal: "collaborative_language",
        weight: -reduction,
        description: `Positive: ${description}`
      });
      // Don't break - accumulate multiple collaborative signals
    }
  }
  if (collaborativeReduction > 0) {
    // Cap the reduction at 40 points to prevent gaming
    const cappedReduction = Math.min(collaborativeReduction, 40);
    score = Math.max(0, score - cappedReduction);
    console.log(`[CES] Collaborative language detected, reduced score by ${cappedReduction}`);
  }
  
  // Check pressure/control patterns (manipulation, ultimatums)
  for (const { pattern, weight, description } of PRESSURE_CONTROL_PATTERNS) {
    if (pattern.test(currentMessage)) {
      score += weight;
      signals.push({
        type: "behavioral",
        signal: "pressure_control",
        weight,
        description
      });
    }
  }
  
  // Check evasion patterns (deflecting, avoiding)
  for (const { pattern, weight, description } of EVASION_PATTERNS) {
    if (pattern.test(currentMessage)) {
      score += weight;
      signals.push({
        type: "behavioral",
        signal: "evasion",
        weight,
        description
      });
      break; // Only count once
    }
  }
  
  // === ANALYZE CONVERSATION TRAJECTORY ===
  
  if (conversationHistory.length >= 2) {
    // Check for rapid-fire exchanges (emotional escalation indicator)
    const userMessages = conversationHistory.filter(m => m.senderId === userId);
    const partnerMessages = conversationHistory.filter(m => m.senderId !== userId);
    
    if (userMessages.length >= 2 && partnerMessages.length >= 2) {
      const lastUserMsg = userMessages[userMessages.length - 1];
      const prevUserMsg = userMessages[userMessages.length - 2];
      
      const lastUserTime = new Date(lastUserMsg.createdAt).getTime();
      const prevUserTime = new Date(prevUserMsg.createdAt).getTime();
      
      if (lastUserTime - prevUserTime < RAPID_REPLY_THRESHOLD_MS) {
        score += 8;
        signals.push({
          type: "behavioral",
          signal: "rapid_replies",
          weight: 8,
          description: "Rapid back-and-forth detected (emotional state)"
        });
      }
    }
    
    // Check for escalation trajectory in recent messages
    let recentHostileCount = 0;
    let recentDefensiveCount = 0;
    
    const recentMessages = conversationHistory.slice(-6); // Last 6 messages
    for (const msg of recentMessages) {
      // Check if partner's messages were hostile/defensive (indicates they may be escalating)
      if (msg.tone === "hostile" || msg.tone === "escalating") {
        recentHostileCount++;
      } else if (msg.tone === "defensive" || msg.tone === "frustrated") {
        recentDefensiveCount++;
      }
      
      // Also check content patterns
      for (const pattern of HOSTILE_PATTERNS) {
        if (pattern.test(msg.content)) {
          recentHostileCount++;
          break;
        }
      }
    }
    
    if (recentHostileCount >= 2) {
      score += 15;
      signals.push({
        type: "pattern",
        signal: "escalation_trajectory",
        weight: 15,
        description: "Conversation already escalating - high risk of further harm"
      });
    } else if (recentDefensiveCount >= 2) {
      score += 8;
      signals.push({
        type: "pattern",
        signal: "defensive_trajectory",
        weight: 8,
        description: "Defensive patterns detected - conversation may be getting tense"
      });
    }
  }
  
  // === DETERMINE TRAJECTORY ===
  let trajectory: "improving" | "stable" | "worsening" = "stable";
  
  if (conversationHistory.length >= 4) {
    const firstHalf = conversationHistory.slice(0, Math.floor(conversationHistory.length / 2));
    const secondHalf = conversationHistory.slice(Math.floor(conversationHistory.length / 2));
    
    const firstHalfHostile = firstHalf.filter(m => 
      m.tone === "hostile" || HOSTILE_PATTERNS.some(p => p.test(m.content))
    ).length;
    
    const secondHalfHostile = secondHalf.filter(m => 
      m.tone === "hostile" || HOSTILE_PATTERNS.some(p => p.test(m.content))
    ).length;
    
    if (secondHalfHostile > firstHalfHostile) {
      trajectory = "worsening";
      score += 5; // Bonus for worsening trajectory
    } else if (secondHalfHostile < firstHalfHostile) {
      trajectory = "improving";
      score = Math.max(0, score - 5); // Bonus for improving
    }
  }
  
  // === CAP SCORE AT 100 ===
  score = Math.min(100, Math.max(0, score));
  
  // === DETERMINE STATE ===
  let state: ConversationState;
  if (score <= 20) state = "neutral";
  else if (score <= 40) state = "sensitive";
  else if (score <= 60) state = "defensive";
  else if (score <= 80) state = "escalating";
  else state = "hostile";
  
  // === DETERMINE INTERVENTION LEVEL ===
  let interventionLevel: InterventionLevel;
  if (score <= 30) interventionLevel = "none";
  else if (score <= 50) interventionLevel = "soft_nudge";
  else if (score <= 75) interventionLevel = "modal";
  else interventionLevel = "hard_block";
  
  // === DETERMINE SUGGESTED ACTIONS ===
  const suggestedActions: SuggestedAction[] = [];
  
  if (interventionLevel !== "none") {
    suggestedActions.push({
      type: "rewrite",
      label: "Rewrite with calmer tone",
      priority: 1
    });
    
    if (score >= 50) {
      suggestedActions.push({
        type: "pause",
        label: "Take a 20-minute pause",
        priority: 2
      });
    }
    
    suggestedActions.push({
      type: "send_anyway",
      label: "Send as written",
      priority: 3,
      dangerous: score >= 60
    });
    
    if (score >= 70) {
      suggestedActions.push({
        type: "save_draft",
        label: "Save as draft",
        priority: 2
      });
    }
  }
  
  // === DETERMINE PAUSE RECOMMENDATION ===
  const pauseRecommended = score >= 60 || 
    signals.some(s => s.signal === "legal_escalation") ||
    signals.some(s => s.signal === "rapid_replies" && score >= 40);
  
  let pauseDuration: number | undefined;
  if (pauseRecommended) {
    if (score >= 80) pauseDuration = 60; // 1 hour for hostile
    else if (score >= 60) pauseDuration = 20; // 20 min for escalating
    else pauseDuration = 10; // 10 min for lighter cases
  }
  
  // === CHILD IMPACT REMINDER (SPARINGLY) ===
  // Only show at high escalation AND only once per conversation session
  const childImpactReminder = score >= 70 && signals.some(s => 
    s.signal === "hostile_language" || 
    s.signal === "escalating_language" ||
    s.signal === "dismissive_attack"
  );
  
  // === DETERMINE CONVERSATION PHASE ===
  // Phase affects how aggressive the AI mediator should be
  let phase: ConversationPhase;
  const msgCount = conversationHistory.length;
  const hasEscalation = state === "escalating" || state === "hostile" || trajectory === "worsening";
  
  if (hasEscalation) {
    phase = "hot"; // Any escalation = hot regardless of message count
  } else if (msgCount < 5) {
    phase = "cold"; // New conversation, minimal intervention
  } else if (msgCount >= 15) {
    phase = "hot"; // Long conversation = more active monitoring
  } else {
    phase = "warm"; // Building rapport, moderate guidance
  }
  
  console.log(`[CES] Final score: ${score}, state: ${state}, phase: ${phase}, intervention: ${interventionLevel}`);
  
  return {
    score,
    state,
    phase,
    interventionLevel,
    trajectory,
    signals,
    suggestedActions,
    pauseRecommended,
    pauseDuration,
    childImpactReminder
  };
}

/**
 * Generate AI-powered rewrite suggestion for de-escalation
 * Uses the user's personality and co-parent's personality for tailored suggestions
 * 
 * IMPORTANT: This function now produces CONTEXTUAL rewrites that:
 * 1. Preserve the original request/intent (especially for child expenses)
 * 2. Only soften the tone/delivery, not change the topic
 * 3. Never suggest removing legitimate child expense discussions
 */
export function generateDeescalationRewrite(
  originalMessage: string,
  cesScore: number,
  signals: CESSignal[],
  userPrefs?: {
    personalityType?: string;
    coParentPersonalityType?: string | null;
  }
): string {
  const hasFinancialTension = signals.some(s => s.signal === "financial_tension");
  const hasChildExpenseContext = signals.some(s => s.signal === "child_expense_context");
  const hasLegalEscalation = signals.some(s => s.signal === "legal_escalation");
  const hasAccusatory = signals.some(s => s.signal === "accusatory");
  const hasInsult = signals.some(s => s.signal === "dismissive_attack" || s.signal === "hostile_language");
  
  // If it's an insult, suggest a firm boundary (co-parent-facing, not self-reflection)
  if (hasInsult) {
    return "I need some space right now. Let's talk about this later when we're both calm.";
  }
  
  // If legal escalation, suggest de-escalation
  if (hasLegalEscalation) {
    return "I'd like to discuss this calmly together before involving outside parties. Can we find a solution for the kids' sake?";
  }
  
  // CONTEXTUAL FINANCIAL REWRITES - preserve the intent, soften the delivery
  if (hasFinancialTension) {
    // Extract what they're asking about
    const schoolMatch = originalMessage.match(/school\s*supplies?|textbooks?|tuition|uniform|school\s*fees?/i);
    const medicalMatch = originalMessage.match(/doctor|medical|medicine|prescription|dental|therapy|braces|glasses/i);
    const clothingMatch = originalMessage.match(/clothes|clothing|shoes/i);
    const childcareMatch = originalMessage.match(/daycare|childcare|camp|lessons?|tutoring|sports|activities/i);
    const foodMatch = originalMessage.match(/food|groceries/i);
    
    // If child expense context, create a rewrite that PRESERVES the request
    if (hasChildExpenseContext || schoolMatch || medicalMatch || clothingMatch || childcareMatch || foodMatch) {
      const expenseType = schoolMatch?.[0] || medicalMatch?.[0] || clothingMatch?.[0] || childcareMatch?.[0] || foodMatch?.[0] || "the expense";
      
      // Soften "when are you going to" timing pressure while keeping the request
      if (/when\s+are\s+you\s+(going\s+to|gonna)/i.test(originalMessage)) {
        return `I wanted to check in about the ${expenseType.toLowerCase()}. The kids need this soon - can we discuss timing?`;
      }
      
      // General financial child expense softening
      return `Could we discuss the ${expenseType.toLowerCase()} expense? I want to make sure we're on the same page about covering it.`;
    }
    
    // Non-child financial discussions - more neutral suggestion
    return "Can we review our expense agreement to make sure we're on the same page?";
  }
  
  if (hasAccusatory) {
    return "I'm feeling frustrated about this situation. Can we work together to find a solution?";
  }
  
  // Default - don't give a generic "focus on children" if the message is already about children
  if (hasChildExpenseContext) {
    return originalMessage; // Don't suggest changes if it's already child-focused and not hostile
  }
  
  return "I want to make sure we understand each other. Can we discuss this calmly?";
}
