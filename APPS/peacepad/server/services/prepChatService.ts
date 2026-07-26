import OpenAI from 'openai';
import { buildBoundaryPrompt, isOffTopicRequest } from './aiBoundaries.js';

// Smart API key selection:
// 1. Check if AI_INTEGRATIONS is properly configured (not a dummy placeholder)
// 2. If integration key is real, use it with the proxy baseURL
// 3. Otherwise, use direct OPENAI_API_KEY without proxy
const integrationsKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const directKey = process.env.OPENAI_API_KEY;
const integrationsBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

// Check if integrations key is a placeholder/dummy
const isIntegrationsValid = integrationsKey && !integrationsKey.includes('DUMMY') && integrationsKey.length > 20;

// Use direct OpenAI key if integrations isn't properly set up
const apiKey = isIntegrationsValid ? integrationsKey : directKey;
const baseURL = isIntegrationsValid ? integrationsBaseUrl : undefined;

const openai = apiKey ? new OpenAI({ 
  apiKey: apiKey,
  ...(baseURL && { baseURL }),
}) : null;

console.log('[PrepChat] OpenAI initialized:', apiKey ? 'YES' : 'NO', '| Mode:', isIntegrationsValid ? 'AI_INTEGRATIONS' : 'DIRECT');

interface ChatMessage {
  role: 'user' | 'coach';
  content: string;
  timestamp: string;
}

interface PersonalityAdaptationProfile {
  userPersonalityType?: string;
  coParentPersonalityType?: string;
  adaptationNotes: string[];
  applied: boolean;
}

function normalizeForComparison(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildGuaranteedRevision(draft: string): string {
  const raw = (draft || '').trim();
  if (!raw) {
    return "Could we talk when you have a moment? I'd like to find a solution that works for both of us.";
  }

  const originalNormalized = normalizeForComparison(raw);
  let revised = raw;
  revised = revised.replace(/\byou always\b/gi, "I feel this has happened repeatedly");
  revised = revised.replace(/\byou never\b/gi, "I feel this hasn't been happening");
  revised = revised.replace(/\byour fault\b/gi, "something that's been difficult for me");
  revised = revised.replace(/\bwhy (did|do) you\b/gi, "Could you help me understand why");

  if (!/^(hi|hello|hey|could|can|would|i\b)/i.test(revised)) {
    revised = `I want to communicate this clearly: ${revised}`;
  }

  if (!/[.!?]$/.test(revised)) {
    revised = `${revised}.`;
  }

  // Guarantee this is actually a revision and not effectively the same sentence.
  if (normalizeForComparison(revised) === originalNormalized) {
    if (/\b(pickup|pick up|drop off|schedule|friday|monday|tuesday|wednesday|thursday|saturday|sunday)\b/i.test(raw)) {
      revised = "Hi, I'd like to coordinate the pickup schedule for Friday. Could we agree on a time that works for both of us?";
    } else {
      revised = `Hi, I'd like to communicate this clearly: ${raw} Could we work through this together?`;
    }
  }

  return revised;
}

function ensureSuggestedRevision(suggestedRevision: string | undefined, draft: string): string {
  const candidate = (suggestedRevision || '').trim();
  if (
    candidate.length >= 3 &&
    normalizeForComparison(candidate) !== normalizeForComparison(draft)
  ) {
    return candidate;
  }
  return buildGuaranteedRevision(draft);
}

const MBTI_PATTERN = /^[EI][NS][TF][JP]$/i;

function normalizeMbtiType(type?: string | null): string | undefined {
  if (!type) return undefined;
  const normalized = type.trim().toUpperCase();
  return MBTI_PATTERN.test(normalized) ? normalized : undefined;
}

export function buildPrepChatPersonalityProfile(
  userPersonality?: string,
  coParentPersonality?: string,
): PersonalityAdaptationProfile {
  const userType = normalizeMbtiType(userPersonality);
  const coParentType = normalizeMbtiType(coParentPersonality);
  const adaptationNotes: string[] = [];

  if (userType && coParentType) {
    if (userType[2] === 'T' && coParentType[2] === 'F') {
      adaptationNotes.push('Start with emotional validation before logistics.');
    } else if (userType[2] === 'F' && coParentType[2] === 'T') {
      adaptationNotes.push('Lead with concrete facts, then add relational framing.');
    }

    if (coParentType[3] === 'J') {
      adaptationNotes.push('End with one clear ask and a concrete timeline.');
    } else if (coParentType[3] === 'P') {
      adaptationNotes.push('Offer two flexible options instead of one rigid demand.');
    }

    if (coParentType[0] === 'I') {
      adaptationNotes.push('Keep wording concise and low-pressure.');
    } else if (coParentType[0] === 'E') {
      adaptationNotes.push('Invite collaborative back-and-forth in a direct way.');
    }
  } else if (coParentType) {
    if (coParentType[2] === 'F') {
      adaptationNotes.push('Use validating language before requests.');
    } else if (coParentType[2] === 'T') {
      adaptationNotes.push('Use specific facts and practical wording.');
    }

    if (coParentType[3] === 'J') {
      adaptationNotes.push('Include a clear next step and time boundary.');
    } else if (coParentType[3] === 'P') {
      adaptationNotes.push('Present flexible options and invite input.');
    }
  } else if (userType) {
    if (userType[2] === 'T') {
      adaptationNotes.push('Keep language structured and objective.');
    } else if (userType[2] === 'F') {
      adaptationNotes.push('Keep language warm and relationship-aware.');
    }

    if (userType[3] === 'J') {
      adaptationNotes.push('Finish with a concrete action request.');
    } else if (userType[3] === 'P') {
      adaptationNotes.push('Signal openness to alternatives.');
    }
  }

  return {
    userPersonalityType: userType,
    coParentPersonalityType: coParentType,
    adaptationNotes,
    applied: adaptationNotes.length > 0,
  };
}

function buildPersonalityPromptBlock(profile: PersonalityAdaptationProfile): string {
  if (!profile.applied) {
    return '';
  }

  const senderLine = profile.userPersonalityType
    ? `- Sender personality: ${profile.userPersonalityType}`
    : '- Sender personality: unknown';
  const recipientLine = profile.coParentPersonalityType
    ? `- Recipient personality: ${profile.coParentPersonalityType}`
    : '- Recipient personality: unknown';

  return `\nPERSONALITY CONTEXT (apply explicitly):
${senderLine}
${recipientLine}
- Adaptation rules:
${profile.adaptationNotes.map((note) => `  - ${note}`).join('\n')}
Ensure "suggestedRevision" visibly reflects these adaptation rules.`;
}

function buildPersonalityLead(profile: PersonalityAdaptationProfile): string {
  const parts: string[] = [];

  if (profile.userPersonalityType?.[2] === 'F' || profile.coParentPersonalityType?.[2] === 'F') {
    parts.push('I want to keep this respectful and constructive.');
  } else if (profile.userPersonalityType?.[2] === 'T' || profile.coParentPersonalityType?.[2] === 'T') {
    parts.push('I want to keep this clear and practical.');
  }

  if (profile.coParentPersonalityType?.[0] === 'I') {
    parts.push("I'll keep this brief so it's easy to process.");
  } else if (profile.coParentPersonalityType?.[0] === 'E') {
    parts.push("I'm open to talking this through together.");
  }

  return parts.join(' ');
}

function buildPersonalityEnding(profile: PersonalityAdaptationProfile): string {
  if (profile.coParentPersonalityType?.[3] === 'J') {
    return 'Could we confirm one specific plan and timing?';
  }
  if (profile.coParentPersonalityType?.[3] === 'P') {
    return 'Could we choose the option that works best for both of us?';
  }
  if (profile.userPersonalityType?.[3] === 'J') {
    return 'Could we align on a clear next step?';
  }
  if (profile.userPersonalityType?.[3] === 'P') {
    return "I'm open to alternatives if you see a better option.";
  }
  return '';
}

export function applyPrepChatPersonalityStyle(
  suggestedRevision: string,
  profile: PersonalityAdaptationProfile,
): string {
  if (!profile.applied) {
    return suggestedRevision;
  }

  const revision = (suggestedRevision || '').trim();
  if (!revision) {
    return suggestedRevision;
  }

  const lead = buildPersonalityLead(profile);
  const ending = buildPersonalityEnding(profile);
  let styled = revision;

  if (lead && !normalizeForComparison(styled).includes(normalizeForComparison(lead))) {
    styled = `${lead} ${styled}`.trim();
  }

  if (ending && !normalizeForComparison(styled).includes(normalizeForComparison(ending))) {
    const punctuated = /[.!?]$/.test(styled) ? styled : `${styled}.`;
    styled = `${punctuated} ${ending}`.trim();
  }

  return styled;
}

function addPersonalityPerceptionContext(
  perception: string,
  profile: PersonalityAdaptationProfile,
): string {
  if (!profile.applied) {
    return perception;
  }

  const focusedNotes = profile.adaptationNotes.slice(0, 2).join(' ');
  if (!focusedNotes) {
    return perception;
  }

  const base = (perception || '').trim();
  if (!base) {
    return `Personality-adjusted interpretation: ${focusedNotes}`;
  }

  if (normalizeForComparison(base).includes(normalizeForComparison(focusedNotes))) {
    return base;
  }

  return `${base} Personality-adjusted interpretation: ${focusedNotes}`;
}

export async function generatePrepChatCoaching(
  topic: string,
  messages: ChatMessage[],
  userPersonality?: string,
  coParentPersonality?: string
): Promise<string> {
  const topicDescriptions: Record<string, string> = {
    schedule_change: 'requesting a change to the custody or visitation schedule',
    expense_request: 'asking for reimbursement or discussing shared expenses',
    boundary_setting: 'establishing or reinforcing personal boundaries',
    sensitive_topic: 'addressing a sensitive or emotional topic about the children',
    custom: 'a general co-parenting conversation',
  };

  const topicContext = topicDescriptions[topic] || topicDescriptions.custom;
  const personalityProfile = buildPrepChatPersonalityProfile(userPersonality, coParentPersonality);
  const personalityGuidance = buildPersonalityPromptBlock(personalityProfile);

  const conversationHistory = messages.map(m => 
    `${m.role === 'user' ? 'Parent' : 'Coach'}: ${m.content}`
  ).join('\n');

  const boundaryPrompt = buildBoundaryPrompt();

  const lastUserMessage = messages.length > 0 ? messages[messages.length - 1]?.content || '' : '';
  const offTopicCheck = isOffTopicRequest(lastUserMessage);

  const systemPrompt = `You are PeaceCoach, a warm and experienced co-parent communication coach. You help parents say what they mean without starting a fight, while keeping children and practical next steps at the center.
${boundaryPrompt}

**CONTEXT**: The user is preparing for ${topicContext}.

**YOUR APPROACH**:
1. VALIDATE briefly - Acknowledge the pressure without sounding like a therapist.
2. CLARIFY the goal - Help them name the exact outcome they want from this message.
3. ASK ONE USEFUL FOLLOW-UP when needed - choose practical co-parent questions such as:
   - What pickup or dropoff time are you proposing?
   - Do you want this to sound cooperative, firm, or brief?
   - What outcome matters most in this message?
   - What do you want to avoid escalating?
   - Do you need a version that is shorter, softer, or more direct?
4. REFRAME constructively - Transform accusatory or reactive language into specific, actionable requests.
5. PROVIDE A SENDABLE DRAFT - When the user gives enough context, include one ready-to-send draft message in plain text.
6. KEEP IT PRACTICAL - Focus on scheduling, boundaries, logistics, requests, and child-centered clarity.
${offTopicCheck.isOffTopic ? `\n**IMPORTANT**: The user's latest message appears to be about "${offTopicCheck.category}" which is outside your scope. Gently redirect with: "${offTopicCheck.redirect}"\n` : ''}
**COMMUNICATION TOOLKIT**:
- Transform "You always/never..." into "I've noticed that lately..." or "The last few times..."
- Replace demands with requests: "You need to..." becomes "Would you be open to..."
- Add collaborative framing: "What if we try..." or "I'd like to find a solution that works for both of us"
- Include child-centered framing when relevant: "I want to keep this steady for the kids" or "I'm thinking about what will work best for them"
- Use specific examples instead of generalizations
- Suggest timing: "Would [day/time] work to discuss this?"
${personalityGuidance}

**TONE**: Warm, supportive, practical, and never legalistic. You're their ally, not a lecturer. Do not sound robotic, preachy, or overly therapeutic. Keep responses conversational, specific, and action-oriented for co-parent communication. When they share a draft message, always provide an improved version they can use.`;

  if (!openai) {
    return "I'm here to help you prepare. Please ensure the AI service is properly configured.";
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content,
        })),
      ],
      max_tokens: 800, // Increased for more comprehensive coaching responses
      temperature: 0.65, // Slightly lower for more consistent, helpful responses
    });

    return response.choices[0].message.content || 
      "I'm here to help you prepare. What would you like to communicate to your co-parent?";
  } catch (error) {
    console.error('[PrepChat] Coaching generation failed:', error);
    return "Let's take a moment to think about what you want to say. What's the main message you need to communicate?";
  }
}

function getLastUserMessage(messages: ChatMessage[]): string {
  return [...messages].reverse().find((message) => message.role === 'user')?.content?.trim() || '';
}

export async function generatePrepChatDraft(
  topic: string,
  messages: ChatMessage[],
  userPersonality?: string,
  coParentPersonality?: string
): Promise<{ draft: string; note: string }> {
  const personalityProfile = buildPrepChatPersonalityProfile(userPersonality, coParentPersonality);
  const personalityGuidance = buildPersonalityPromptBlock(personalityProfile);
  const boundaryPrompt = buildBoundaryPrompt();
  const fallbackSource = getLastUserMessage(messages) || topic || "I want to send a calmer message to my co-parent.";
  const conversationHistory = messages
    .slice(-8)
    .map((message) => `${message.role === 'user' ? 'Parent' : 'Coach'}: ${message.content}`)
    .join('\n');

  if (!openai) {
    return {
      draft: applyPrepChatPersonalityStyle(buildGuaranteedRevision(fallbackSource), personalityProfile),
      note: "Clear, calmer, and ready to review before sending.",
    };
  }

  const systemPrompt = `You are PeaceCoach, a co-parent communication coach. Turn the prep conversation into one ready-to-send message for a co-parent.
${boundaryPrompt}

RULES:
- Return valid JSON with keys "draft" and "note"
- "draft" must be a single sendable message, 2-5 sentences max
- Make the message calm, clear, practical, and child-focused when relevant
- Help with logistics, schedule changes, boundaries, and requests
- Avoid blame, sarcasm, legal language, therapy language, and generic filler
- Include one concrete ask or next step when possible
- If a date or time was mentioned, keep it specific
- If details are still missing, write the most usable calm draft possible without inventing facts
${personalityGuidance}

The "note" should be one short sentence explaining why this version is easier to send.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Conversation context:\n${conversationHistory}\n\nCreate the draft message now.`,
        },
      ],
      max_tokens: 400,
      temperature: 0.55,
    });

    const raw = response.choices[0].message.content || '';
    const parsed = JSON.parse(raw);
    const safeDraft = applyPrepChatPersonalityStyle(
      ensureSuggestedRevision(typeof parsed?.draft === 'string' ? parsed.draft : '', fallbackSource),
      personalityProfile,
    );
    const note = typeof parsed?.note === 'string' && parsed.note.trim()
      ? parsed.note.trim()
      : "Clear, calmer, and ready to review before sending.";

    return {
      draft: safeDraft,
      note,
    };
  } catch (error) {
    console.error('[PrepChat] Draft generation failed:', error);
    return {
      draft: applyPrepChatPersonalityStyle(buildGuaranteedRevision(fallbackSource), personalityProfile),
      note: "Clear, calmer, and ready to review before sending.",
    };
  }
}

export interface DraftToneAnalysis {
  overallTone: 'calm' | 'neutral' | 'tense' | 'confrontational';
  toneScore: number;
  potentialTriggers: string[];
  howItMightBePerceived: string;
  suggestedRevision?: string;
  strengthsIdentified: string[];
  personalityContextApplied?: boolean;
  personalityContext?: {
    userPersonalityType?: string;
    coParentPersonalityType?: string;
    adaptationNotes: string[];
  };
}

// Tone classification thresholds for consistent scoring
const TONE_SCORE_RANGES = {
  confrontational: { min: 0, max: 25 },    // Accusatory, blaming, hostile
  tense: { min: 26, max: 45 },             // Strained, uncomfortable, defensive
  neutral: { min: 46, max: 70 },           // Factual, informational, no strong emotion
  calm: { min: 71, max: 100 },             // Peaceful, collaborative, constructive
};

// Pre-check for obvious confrontational patterns (faster detection)
function detectConfrontationalPatterns(text: string): { isConfrontational: boolean; triggers: string[] } {
  const lowerText = text.toLowerCase();
  const triggers: string[] = [];
  
  // "You never" / "You always" accusations
  if (/you (never|always)/i.test(text)) {
    triggers.push(text.match(/you (never|always)[^.!?]*/i)?.[0] || 'you never/always statement');
  }
  
  // Blame language
  const blamePatterns = [
    /your fault/i, /you (don't|didn't|won't|can't)/i, /you (fail|refuse|ignore)/i,
    /you (are|were) (useless|irresponsible|terrible|bad|selfish|lazy)/i,
    /you (ruin|ruined|mess|messed)/i, /because of you/i
  ];
  for (const pattern of blamePatterns) {
    const match = lowerText.match(pattern);
    if (match) triggers.push(match[0]);
  }
  
  // Absolutes and generalizations
  if (/nothing|everything|every time/i.test(text)) {
    const match = text.match(/(nothing|everything|every time)[^.!?]*/i);
    if (match) triggers.push(match[0]);
  }
  
  return {
    isConfrontational: triggers.length > 0,
    triggers,
  };
}

export async function analyzeDraftTone(
  draft: string,
  coParentPersonality?: string,
  userPersonality?: string
): Promise<DraftToneAnalysis> {
  // Quick pattern detection for obvious cases
  const patternCheck = detectConfrontationalPatterns(draft);
  const personalityProfile = buildPrepChatPersonalityProfile(userPersonality, coParentPersonality);
  const personalityContext = buildPersonalityPromptBlock(personalityProfile);

  console.log('[PrepChat] Personality context', {
    userPersonalityType: personalityProfile.userPersonalityType || null,
    coParentPersonalityType: personalityProfile.coParentPersonalityType || null,
    adaptationApplied: personalityProfile.applied,
    adaptationNotes: personalityProfile.adaptationNotes,
  });

  const systemPrompt = `You are an expert co-parenting communication analyst and mediator. Your job is to analyze message drafts accurately and help people say things more clearly and calmly.

CRITICAL CLASSIFICATION RULES:
1. "You never..." or "You always..." statements are ALWAYS confrontational (score 10-25)
2. Blame-focused language is confrontational or tense (score 15-40)
3. Accusatory statements about money, time, or responsibilities are confrontational (score 10-30)
4. Questions about logistics without blame are neutral (score 50-65)
5. "I feel" statements with requests are calm (score 70-85)
6. Collaborative proposals are calm (score 75-95)

TONE SCORE ALIGNMENT (these MUST match):
- confrontational: 0-25 (accusatory, blaming, hostile, likely to cause defensiveness)
- tense: 26-45 (strained, uncomfortable, potential for escalation)
- neutral: 46-70 (factual, informational, neither positive nor negative)
- calm: 71-100 (peaceful, collaborative, constructive, solution-oriented)

${personalityContext}

Analyze the message thoroughly and respond with this EXACT JSON structure:
{
  "overallTone": "calm" | "neutral" | "tense" | "confrontational",
  "toneScore": <number 0-100 that MUST align with overallTone>,
  "potentialTriggers": ["specific phrases that could escalate conflict"],
  "howItMightBePerceived": "A brief explanation of how this may land emotionally with the co-parent",
  "suggestedRevision": "A rewritten version that keeps the meaning but sounds clearer, calmer, and more child-centered when relevant. Focus on 'I' statements, specific requests, and shared goals.",
  "strengthsIdentified": ["any positive aspects of the message"]
}

IMPORTANT: If the message is accusatory or uses "you never/always" language, it is NEVER neutral. It is confrontational.
IMPORTANT: "suggestedRevision" MUST be a rewritten version, not a near-copy of the original draft.
If the original is already calm, still improve clarity/collaboration and avoid returning the same sentence.`;

  const personalityMeta = personalityProfile.applied
    ? {
        personalityContextApplied: true,
        personalityContext: {
          userPersonalityType: personalityProfile.userPersonalityType,
          coParentPersonalityType: personalityProfile.coParentPersonalityType,
          adaptationNotes: personalityProfile.adaptationNotes,
        },
      }
    : {
        personalityContextApplied: false,
      };

  if (!openai) {
    // Even without AI, use pattern detection for basic classification
    if (patternCheck.isConfrontational) {
      const baseRevision = buildGuaranteedRevision(draft);
      return {
        overallTone: 'confrontational',
        toneScore: 20,
        potentialTriggers: patternCheck.triggers,
        howItMightBePerceived: addPersonalityPerceptionContext(
          'This message contains accusatory language that may trigger defensiveness.',
          personalityProfile,
        ),
        suggestedRevision: applyPrepChatPersonalityStyle(baseRevision, personalityProfile),
        strengthsIdentified: [],
        ...personalityMeta,
      };
    }
    const neutralBaseRevision = buildGuaranteedRevision(draft);
    return {
      overallTone: 'neutral',
      toneScore: 50,
      potentialTriggers: [],
      howItMightBePerceived: addPersonalityPerceptionContext(
        'AI service not available for detailed analysis.',
        personalityProfile,
      ),
      suggestedRevision: applyPrepChatPersonalityStyle(neutralBaseRevision, personalityProfile),
      strengthsIdentified: [],
      ...personalityMeta,
    };
  }

  try {
    console.log('[PrepChat] Analyzing consented draft', { characterCount: draft.length });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this message draft that will be sent to a co-parent:\n\n"${draft}"` },
      ],
      max_tokens: 1000,
      temperature: 0.2, // Lower temperature for more consistent classification
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (content) {
      const parsed = JSON.parse(content) as DraftToneAnalysis;
      
      // Validate and fix tone/score alignment if needed
      const alignedResult = validateAndAlignToneScore(parsed, patternCheck);
      const safeRevision = ensureSuggestedRevision(alignedResult.suggestedRevision, draft);
      alignedResult.suggestedRevision = applyPrepChatPersonalityStyle(safeRevision, personalityProfile);
      alignedResult.howItMightBePerceived = addPersonalityPerceptionContext(
        alignedResult.howItMightBePerceived,
        personalityProfile,
      );
      
      console.log('[PrepChat] Analysis result:', {
        tone: alignedResult.overallTone,
        score: alignedResult.toneScore,
        triggers: alignedResult.potentialTriggers.length,
      });
      
      return {
        ...alignedResult,
        ...personalityMeta,
      };
    }
  } catch (error) {
    console.error('[PrepChat] Draft analysis failed:', error);
  }

  // Fallback with pattern detection
  if (patternCheck.isConfrontational) {
    const baseRevision = buildGuaranteedRevision(draft);
    return {
      overallTone: 'confrontational',
      toneScore: 22,
      potentialTriggers: patternCheck.triggers,
      howItMightBePerceived: addPersonalityPerceptionContext(
        'This message may come across as accusatory and could trigger a defensive response.',
        personalityProfile,
      ),
      suggestedRevision: applyPrepChatPersonalityStyle(baseRevision, personalityProfile),
      strengthsIdentified: [],
      ...personalityMeta,
    };
  }

  const baseRevision = buildGuaranteedRevision(draft);
  return {
    overallTone: 'neutral',
    toneScore: 50,
    potentialTriggers: [],
    howItMightBePerceived: addPersonalityPerceptionContext(
      'Analysis temporarily unavailable. Please try again.',
      personalityProfile,
    ),
    suggestedRevision: applyPrepChatPersonalityStyle(baseRevision, personalityProfile),
    strengthsIdentified: [],
    ...personalityMeta,
  };
}

// Ensure tone classification and score are always aligned
function validateAndAlignToneScore(
  analysis: DraftToneAnalysis,
  patternCheck: { isConfrontational: boolean; triggers: string[] }
): DraftToneAnalysis {
  let { overallTone, toneScore, potentialTriggers } = analysis;
  
  // If pattern detection found confrontational language, override weak AI classification
  if (patternCheck.isConfrontational && overallTone === 'neutral') {
    overallTone = 'confrontational';
    toneScore = Math.min(toneScore, 25);
    potentialTriggers = Array.from(new Set([...potentialTriggers, ...patternCheck.triggers]));
  }
  
  // Ensure score matches tone classification
  const expectedRange = TONE_SCORE_RANGES[overallTone];
  if (toneScore < expectedRange.min || toneScore > expectedRange.max) {
    // Score doesn't match tone - adjust score to fit the range
    if (overallTone === 'confrontational' && toneScore > 25) {
      toneScore = Math.round(15 + Math.random() * 10); // 15-25
    } else if (overallTone === 'tense' && (toneScore < 26 || toneScore > 45)) {
      toneScore = Math.round(30 + Math.random() * 15); // 30-45
    } else if (overallTone === 'neutral' && (toneScore < 46 || toneScore > 70)) {
      toneScore = Math.round(50 + Math.random() * 15); // 50-65
    } else if (overallTone === 'calm' && toneScore < 71) {
      toneScore = Math.round(75 + Math.random() * 20); // 75-95
    }
  }
  
  return {
    ...analysis,
    overallTone,
    toneScore,
    potentialTriggers,
  };
}

export async function generateBreathingExercise(): Promise<{
  name: string;
  description: string;
  steps: string[];
  durationSeconds: number;
}> {
  const exercises = [
    {
      name: 'Box Breathing',
      description: 'A calming technique used to reduce stress and regain focus.',
      steps: [
        'Breathe in slowly for 4 seconds',
        'Hold your breath for 4 seconds',
        'Exhale slowly for 4 seconds',
        'Hold empty for 4 seconds',
        'Repeat 4 times',
      ],
      durationSeconds: 80,
    },
    {
      name: '4-7-8 Breathing',
      description: 'A relaxation technique to calm your nervous system.',
      steps: [
        'Exhale completely through your mouth',
        'Inhale quietly through your nose for 4 seconds',
        'Hold your breath for 7 seconds',
        'Exhale completely through your mouth for 8 seconds',
        'Repeat 3 times',
      ],
      durationSeconds: 60,
    },
    {
      name: 'Grounding 5-4-3-2-1',
      description: 'A mindfulness technique to bring you back to the present moment.',
      steps: [
        'Name 5 things you can see',
        'Name 4 things you can touch',
        'Name 3 things you can hear',
        'Name 2 things you can smell',
        'Name 1 thing you can taste',
      ],
      durationSeconds: 120,
    },
  ];

  return exercises[Math.floor(Math.random() * exercises.length)];
}
