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

  const personalityGuidance = userPersonality && coParentPersonality
    ? `\n\nPersonality context:
- You are coaching someone with ${userPersonality} personality type
- They are preparing to communicate with a co-parent who has ${coParentPersonality} personality type
- Adjust your coaching to help bridge these communication styles`
    : '';

  const conversationHistory = messages.map(m => 
    `${m.role === 'user' ? 'Parent' : 'Coach'}: ${m.content}`
  ).join('\n');

  const boundaryPrompt = buildBoundaryPrompt();

  const lastUserMessage = messages.length > 0 ? messages[messages.length - 1]?.content || '' : '';
  const offTopicCheck = isOffTopicRequest(lastUserMessage);

  const systemPrompt = `You are PeaceCoach, a warm and experienced communication coach. You help people navigate difficult conversations — whether with co-parents, family members, roommates, or anyone they share responsibilities with — while keeping everyone's wellbeing at the center.
${boundaryPrompt}

**CONTEXT**: The user is preparing for ${topicContext}.

**YOUR APPROACH**:
1. VALIDATE first - Acknowledge their emotions and the difficulty of the situation. Let them know their feelings are understandable.
2. CLARIFY intent - Help them identify what outcome they really want (not just venting, but what change they're seeking).
3. REFRAME constructively - Transform accusatory or reactive language into specific, actionable requests.
4. PROVIDE EXAMPLES - Give them 2-3 concrete reworded versions of their message, not just principles.
5. ANTICIPATE REACTIONS - Briefly mention how the other person might receive different phrasings.
6. OFFER A SCRIPT - When helpful, provide a complete ready-to-send message they can copy or adapt.
${offTopicCheck.isOffTopic ? `\n**IMPORTANT**: The user's latest message appears to be about "${offTopicCheck.category}" which is outside your scope. Gently redirect with: "${offTopicCheck.redirect}"\n` : ''}
**COMMUNICATION TOOLKIT**:
- Transform "You always/never..." into "I've noticed that lately..." or "The last few times..."
- Replace demands with requests: "You need to..." becomes "Would you be open to..."
- Add collaborative framing: "What if we try..." or "I'd like to find a solution that works for both of us"
- Include impact statements: "This matters to me because..." or "I'm concerned about [child's name] because..."
- Use specific examples instead of generalizations
- Suggest timing: "Would [day/time] work to discuss this?"
${personalityGuidance}

**TONE**: Warm, supportive, and practical. You're their ally, not a lecturer. Keep responses conversational but actionable. When they share a draft message, always provide an improved version they can use.`;

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

export interface DraftToneAnalysis {
  overallTone: 'calm' | 'neutral' | 'tense' | 'confrontational';
  toneScore: number;
  potentialTriggers: string[];
  howItMightBePerceived: string;
  suggestedRevision?: string;
  strengthsIdentified: string[];
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
  
  const personalityContext = coParentPersonality && userPersonality
    ? `
PERSONALITY CONTEXT (Critical for suggestions):
- Sender personality: ${userPersonality}
- Recipient personality: ${coParentPersonality}
- Tailor the suggested revision to bridge these communication styles.`
    : coParentPersonality
    ? `\nRecipient personality: ${coParentPersonality}. Consider how they might perceive this.`
    : '';

  const systemPrompt = `You are an expert co-parenting communication analyst and mediator. Your job is to analyze message drafts ACCURATELY and help prevent conflict.

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
  "howItMightBePerceived": "Detailed analysis of how the recipient will likely react emotionally and why",
  "suggestedRevision": "A rewritten version that maintains the core message but uses calm, collaborative language. Focus on 'I' statements, specific requests, and shared goals.",
  "strengthsIdentified": ["any positive aspects of the message"]
}

IMPORTANT: If the message is accusatory or uses "you never/always" language, it is NEVER neutral. It is confrontational.`;

  if (!openai) {
    // Even without AI, use pattern detection for basic classification
    if (patternCheck.isConfrontational) {
      return {
        overallTone: 'confrontational',
        toneScore: 20,
        potentialTriggers: patternCheck.triggers,
        howItMightBePerceived: 'This message contains accusatory language that may trigger defensiveness.',
        suggestedRevision: undefined,
        strengthsIdentified: [],
      };
    }
    return {
      overallTone: 'neutral',
      toneScore: 50,
      potentialTriggers: [],
      howItMightBePerceived: 'AI service not available for detailed analysis.',
      suggestedRevision: undefined,
      strengthsIdentified: [],
    };
  }

  try {
    console.log('[PrepChat] Analyzing draft:', draft.substring(0, 50) + '...');
    
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
      
      console.log('[PrepChat] Analysis result:', {
        tone: alignedResult.overallTone,
        score: alignedResult.toneScore,
        triggers: alignedResult.potentialTriggers.length,
      });
      
      return alignedResult;
    }
  } catch (error) {
    console.error('[PrepChat] Draft analysis failed:', error);
  }

  // Fallback with pattern detection
  if (patternCheck.isConfrontational) {
    return {
      overallTone: 'confrontational',
      toneScore: 22,
      potentialTriggers: patternCheck.triggers,
      howItMightBePerceived: 'This message may come across as accusatory and could trigger a defensive response.',
      suggestedRevision: undefined,
      strengthsIdentified: [],
    };
  }

  return {
    overallTone: 'neutral',
    toneScore: 50,
    potentialTriggers: [],
    howItMightBePerceived: 'Analysis temporarily unavailable. Please try again.',
    strengthsIdentified: [],
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
