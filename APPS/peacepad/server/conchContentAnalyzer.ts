import OpenAI from "openai";
import { aiCache, isDevMode, getMaxTokens, logTokenUsage, createCacheKey } from "./aiHelper";

const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
}) : null;

export interface ContentAnalysisResult {
  hasManipulation: boolean;
  manipulationType: 'gaslighting' | 'blame_shifting' | 'guilt_tripping' | 'threat' | 'intimidation' | 'financial_control' | 'isolation' | 'none';
  severity: 'low' | 'medium' | 'high';
  triggerPhrases: string[];
  explanation: string;
  suggestedResponse?: string;
  counselorNote?: string;
  language: string;
}

export interface ConchTurnAnalysis {
  content: ContentAnalysisResult;
  emotionalSafety: {
    isSafe: boolean;
    concerns: string[];
    supportMessage?: string;
  };
  communicationQuality: {
    score: number;
    strengths: string[];
    improvements: string[];
  };
}

const MANIPULATION_PATTERNS = {
  gaslighting: [
    /you'?re (crazy|insane|psycho|paranoid|delusional|imagining|overreacting|too sensitive|being dramatic)/i,
    /that (never|didn'?t) happen/i,
    /you'?re making (that|this|it) up/i,
    /it'?s all in your head/i,
    /you'?re (twisting|distorting) (things|the truth|reality)/i,
    /no one (else|will) believe you/i,
    /you'?re losing (your mind|it|the plot)/i,
    /you need (help|therapy|medication)/i,
  ],
  blame_shifting: [
    /you made me/i,
    /it'?s (your|all your) fault/i,
    /if you (hadn'?t|wouldn'?t|didn'?t)/i,
    /you (started|caused) (this|it)/i,
    /look what you made me do/i,
    /you (brought|bring) this on yourself/i,
    /you'?re the (reason|problem)/i,
    /because of you/i,
    /you (forced|pushed) me/i,
    /what about (when you|what you did)/i,
  ],
  guilt_tripping: [
    /after (everything|all) I('?ve)? (done|did|sacrificed)/i,
    /you (don'?t|never) appreciate/i,
    /I gave up (everything|so much) for you/i,
    /you'?re (so|being) (ungrateful|selfish)/i,
    /you (owe|should be grateful)/i,
    /I do (everything|so much) for (you|this family|the kids)/i,
    /the kids will (suffer|be hurt|blame you)/i,
    /you'?re (hurting|destroying) (the family|our children|them)/i,
  ],
  threat: [
    /you'?ll (never|not) see (the kids|them|your children) again/i,
    /I'?ll (take|get) (full|sole) custody/i,
    /I'?ll make sure (you|everyone) (knows|finds out|hears)/i,
    /you'?ll (pay|regret|be sorry)/i,
    /wait (until|till) (the court|a judge|my lawyer)/i,
    /I'?ll (destroy|ruin) you/i,
    /say goodbye to/i,
    /you'?ll lose (everything|them|it all)/i,
  ],
  intimidation: [
    /you (better|best) (not|watch|be careful)/i,
    /don'?t (test|try|push) me/i,
    /you (know|have no idea) what I('?m| am) capable of/i,
    /I'?ll show you/i,
    /you (have|got) no (choice|options)/i,
    /I'?m warning you/i,
    /don'?t make me/i,
  ],
  financial_control: [
    /you'?ll (get|see) (nothing|no money|not a dime)/i,
    /I'?ll (stop|cut off|withhold) (paying|support|money)/i,
    /you can'?t (afford|survive) without me/i,
    /good luck (paying|affording|surviving)/i,
    /you'?ll be (broke|homeless|poor)/i,
    /I control the money/i,
  ],
  isolation: [
    /no one (else|will) (love|want|put up with) you/i,
    /your (friends|family) (don'?t|won'?t) (care|help|believe)/i,
    /you'?re (alone|on your own)/i,
    /who (else|would) (want|have) you/i,
    /you (have|got) (no one|nobody)/i,
  ],
};

const CONSTRUCTIVE_PATTERNS = [
  /let'?s (work|figure) (this|it) out (together)?/i,
  /I (understand|hear|appreciate) (your|what you'?re)/i,
  /how can we/i,
  /what (do you think|works for you)/i,
  /I'?m (sorry|willing to)/i,
  /for (the kids|our children)/i,
  /let'?s (focus on|talk about|discuss)/i,
  /I (want to|'?d like to) (help|understand|support)/i,
  /can we (agree|compromise|find a way)/i,
];

function detectManipulationPatterns(text: string): { type: string; matches: string[] }[] {
  const results: { type: string; matches: string[] }[] = [];
  
  for (const [type, patterns] of Object.entries(MANIPULATION_PATTERNS)) {
    const matches: string[] = [];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        matches.push(match[0]);
      }
    }
    if (matches.length > 0) {
      results.push({ type, matches });
    }
  }
  
  return results;
}

function countConstructivePatterns(text: string): number {
  let count = 0;
  for (const pattern of CONSTRUCTIVE_PATTERNS) {
    if (pattern.test(text)) {
      count++;
    }
  }
  return count;
}

export async function analyzeConchContent(
  transcript: string,
  conversationContext?: string[],
  detectedLanguage: string = 'en'
): Promise<ContentAnalysisResult> {
  if (!transcript || transcript.length < 5) {
    return {
      hasManipulation: false,
      manipulationType: 'none',
      severity: 'low',
      triggerPhrases: [],
      explanation: '',
      language: detectedLanguage,
    };
  }

  const patternMatches = detectManipulationPatterns(transcript);
  
  if (isDevMode() || !openai) {
    if (patternMatches.length > 0) {
      const primaryMatch = patternMatches[0];
      const allMatches = patternMatches.flatMap(m => m.matches);
      
      const severityByType: Record<string, 'low' | 'medium' | 'high'> = {
        gaslighting: 'high',
        threat: 'high',
        intimidation: 'high',
        blame_shifting: 'medium',
        guilt_tripping: 'medium',
        financial_control: 'high',
        isolation: 'high',
      };
      
      const suggestionsByType: Record<string, string> = {
        gaslighting: "I trust my memory and feelings. Let's stick to facts we can verify.",
        blame_shifting: "I understand you're frustrated. Let's focus on solutions, not blame.",
        guilt_tripping: "I appreciate your contributions. Let's discuss what we both need.",
        threat: "I need to feel safe in this conversation. Let's take a break.",
        intimidation: "I'd like to continue this conversation when we can both feel calm.",
        financial_control: "Our financial arrangements are separate from this discussion.",
        isolation: "I have support systems. Let's focus on the matter at hand.",
      };
      
      const counselorNotes: Record<string, string> = {
        gaslighting: "This language attempts to make you doubt your own reality. Trust yourself.",
        blame_shifting: "Remember: you are not responsible for another person's choices or behavior.",
        guilt_tripping: "Healthy relationships don't use guilt as leverage. Your needs matter.",
        threat: "If you feel unsafe, please reach out to support resources.",
        intimidation: "You have the right to end conversations that feel threatening.",
        financial_control: "Financial decisions should be made through proper legal channels.",
        isolation: "You are not alone. Reach out to friends, family, or support services.",
      };
      
      return {
        hasManipulation: true,
        manipulationType: primaryMatch.type as ContentAnalysisResult['manipulationType'],
        severity: severityByType[primaryMatch.type] || 'medium',
        triggerPhrases: allMatches,
        explanation: `Detected ${primaryMatch.type.replace('_', ' ')} patterns in speech`,
        suggestedResponse: suggestionsByType[primaryMatch.type],
        counselorNote: counselorNotes[primaryMatch.type],
        language: detectedLanguage,
      };
    }
    
    return {
      hasManipulation: false,
      manipulationType: 'none',
      severity: 'low',
      triggerPhrases: [],
      explanation: 'No manipulation patterns detected',
      language: detectedLanguage,
    };
  }

  const cacheKey = createCacheKey('conch-content', transcript.substring(0, 100));
  const cached = aiCache.get<ContentAnalysisResult>(cacheKey);
  
  if (cached) {
    logTokenUsage('analyzeConchContent', 200, true);
    return { ...cached, language: detectedLanguage };
  }

  try {
    const maxTokens = getMaxTokens(400);
    
    const systemPrompt = `You are an AI safety counselor specialized in detecting manipulation, coercive control, and emotional abuse in co-parenting communication.

RESPOND IN: ${detectedLanguage === 'en' ? 'English' : detectedLanguage}

Analyze the spoken content for these patterns:
1. GASLIGHTING: Making someone doubt their reality, memory, or sanity
2. BLAME_SHIFTING: Avoiding responsibility by blaming the other person
3. GUILT_TRIPPING: Using guilt as emotional leverage
4. THREAT: Explicit or implicit threats about custody, money, or harm
5. INTIMIDATION: Language meant to frighten or control
6. FINANCIAL_CONTROL: Using money as a weapon or threat
7. ISOLATION: Attempts to cut off from support systems

Be sensitive but accurate. Respond ONLY in JSON:
{
  "hasManipulation": boolean,
  "manipulationType": "gaslighting|blame_shifting|guilt_tripping|threat|intimidation|financial_control|isolation|none",
  "severity": "low|medium|high",
  "triggerPhrases": ["phrase1", "phrase2"],
  "explanation": "Brief explanation",
  "suggestedResponse": "How the listener could respond constructively",
  "counselorNote": "Supportive message for the person hearing this"
}`;

    const contextText = conversationContext?.slice(-3).join('\n') || '';
    const userPrompt = contextText 
      ? `Recent context:\n${contextText}\n\nCurrent speech: "${transcript}"`
      : `Speech: "${transcript}"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty response');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]);
    logTokenUsage('analyzeConchContent', maxTokens, false);

    const result: ContentAnalysisResult = {
      hasManipulation: parsed.hasManipulation || false,
      manipulationType: parsed.manipulationType || 'none',
      severity: parsed.severity || 'low',
      triggerPhrases: parsed.triggerPhrases || [],
      explanation: parsed.explanation || '',
      suggestedResponse: parsed.suggestedResponse,
      counselorNote: parsed.counselorNote,
      language: detectedLanguage,
    };

    aiCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('[ConchContentAnalyzer] Analysis failed:', error);
    
    if (patternMatches.length > 0) {
      return {
        hasManipulation: true,
        manipulationType: patternMatches[0].type as ContentAnalysisResult['manipulationType'],
        severity: 'medium',
        triggerPhrases: patternMatches.flatMap(m => m.matches),
        explanation: 'Pattern-based detection (AI unavailable)',
        language: detectedLanguage,
      };
    }
    
    return {
      hasManipulation: false,
      manipulationType: 'none',
      severity: 'low',
      triggerPhrases: [],
      explanation: '',
      language: detectedLanguage,
    };
  }
}

export async function analyzeConchTurn(
  transcript: string,
  emotionSnapshot?: { emotion: string; confidence: number },
  conversationContext?: string[],
  detectedLanguage: string = 'en'
): Promise<ConchTurnAnalysis> {
  const content = await analyzeConchContent(transcript, conversationContext, detectedLanguage);
  
  const concerns: string[] = [];
  if (content.hasManipulation) {
    concerns.push(`Detected ${content.manipulationType.replace('_', ' ')} language`);
  }
  if (emotionSnapshot?.emotion === 'defensive' || emotionSnapshot?.emotion === 'frustrated') {
    concerns.push(`Speaker showing ${emotionSnapshot.emotion} emotion`);
  }
  
  const constructiveCount = countConstructivePatterns(transcript);
  const qualityScore = Math.max(1, Math.min(10, 
    7 
    - (content.hasManipulation ? 4 : 0)
    + (constructiveCount * 0.5)
  ));
  
  const strengths: string[] = [];
  const improvements: string[] = [];
  
  if (constructiveCount > 0) {
    strengths.push('Using collaborative language');
  }
  if (/\bi\s+(feel|think|believe|understand)\b/i.test(transcript)) {
    strengths.push('Using "I" statements');
  }
  if (!/you (always|never)/i.test(transcript)) {
    strengths.push('Avoiding absolutes');
  }
  
  if (content.hasManipulation) {
    improvements.push('Focus on specific behaviors rather than character');
  }
  if (/you (always|never)/i.test(transcript)) {
    improvements.push('Replace "always/never" with specific examples');
  }
  if (qualityScore < 5) {
    improvements.push('Take a breath and focus on what you need');
  }
  
  return {
    content,
    emotionalSafety: {
      isSafe: !content.hasManipulation || content.severity === 'low',
      concerns,
      supportMessage: content.counselorNote,
    },
    communicationQuality: {
      score: Math.round(qualityScore),
      strengths: strengths.slice(0, 3),
      improvements: improvements.slice(0, 3),
    },
  };
}

export async function generateTurnSummary(
  turnTranscripts: string[],
  speakerName: string,
  detectedLanguage: string = 'en'
): Promise<{
  keyPoints: string[];
  unaddressedConcerns: string[];
  overallSentiment: string;
  counselorNote: string;
}> {
  const combinedText = turnTranscripts.join(' ');
  
  if (isDevMode() || !openai || combinedText.length < 20) {
    return {
      keyPoints: ['Turn completed'],
      unaddressedConcerns: [],
      overallSentiment: 'neutral',
      counselorNote: 'Good communication flow.',
    };
  }

  try {
    const maxTokens = getMaxTokens(300);
    
    const systemPrompt = `You are an empathetic co-parenting counselor summarizing a turn in a structured conversation.

RESPOND IN: ${detectedLanguage === 'en' ? 'English' : detectedLanguage}

Summarize what ${speakerName} communicated during their turn:
1. Key points they raised
2. Any concerns that weren't addressed
3. Overall emotional tone
4. A brief supportive observation

Be concise and constructive. Respond ONLY in JSON:
{
  "keyPoints": ["point1", "point2"],
  "unaddressedConcerns": ["concern1"],
  "overallSentiment": "calm|cooperative|neutral|frustrated|tense|defensive",
  "counselorNote": "Brief observation"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Turn transcripts:\n${combinedText}` },
      ],
      temperature: 0.5,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty response');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]);
    logTokenUsage('generateTurnSummary', maxTokens, false);

    return {
      keyPoints: parsed.keyPoints || [],
      unaddressedConcerns: parsed.unaddressedConcerns || [],
      overallSentiment: parsed.overallSentiment || 'neutral',
      counselorNote: parsed.counselorNote || '',
    };
  } catch (error) {
    console.error('[ConchContentAnalyzer] Turn summary failed:', error);
    return {
      keyPoints: ['Turn completed'],
      unaddressedConcerns: [],
      overallSentiment: 'neutral',
      counselorNote: 'Keep communicating constructively.',
    };
  }
}

export interface ConchSessionSummary {
  overallTone: string;
  keyTopicsDiscussed: string[];
  resolutionsReached: string[];
  outstandingIssues: string[];
  communicationHighlights: string[];
  areasForImprovement: string[];
  counselorRecommendation: string;
  sessionDurationMinutes: number;
  turnCount: number;
}

export async function generateConchSessionSummary(
  turnSummaries: Array<{
    speakerName: string;
    keyPoints: string[];
    unaddressedConcerns: string[];
    overallSentiment: string;
  }>,
  sessionDurationMinutes: number,
  detectedLanguage: string = 'en'
): Promise<ConchSessionSummary> {
  const turnCount = turnSummaries.length;
  
  if (isDevMode() || !openai || turnCount === 0) {
    return {
      overallTone: 'neutral',
      keyTopicsDiscussed: ['Session completed'],
      resolutionsReached: [],
      outstandingIssues: [],
      communicationHighlights: ['Both parties participated'],
      areasForImprovement: [],
      counselorRecommendation: 'Continue practicing structured communication.',
      sessionDurationMinutes,
      turnCount,
    };
  }

  try {
    const maxTokens = getMaxTokens(500);
    
    const turnsText = turnSummaries.map((turn, i) => 
      `Turn ${i + 1} (${turn.speakerName}): Points: ${turn.keyPoints.join(', ')}. Concerns: ${turn.unaddressedConcerns.join(', ') || 'None'}. Sentiment: ${turn.overallSentiment}`
    ).join('\n');

    const systemPrompt = `You are an empathetic co-parenting counselor providing a summary of a structured Conch Mode conversation between co-parents.

RESPOND IN: ${detectedLanguage === 'en' ? 'English' : detectedLanguage}

Analyze the conversation and provide:
1. Overall emotional tone of the session
2. Key topics that were discussed
3. Any resolutions or agreements reached
4. Outstanding issues that still need attention
5. Positive communication moments to celebrate
6. Areas where communication could improve
7. A constructive recommendation for future sessions

Be supportive, constructive, and focused on helping the parents communicate better for their children's wellbeing.

Respond ONLY in JSON:
{
  "overallTone": "cooperative|productive|tense|constructive|challenging|positive",
  "keyTopicsDiscussed": ["topic1", "topic2"],
  "resolutionsReached": ["agreement1"],
  "outstandingIssues": ["issue1"],
  "communicationHighlights": ["highlight1"],
  "areasForImprovement": ["area1"],
  "counselorRecommendation": "Brief actionable recommendation"
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Session had ${turnCount} turns over ${sessionDurationMinutes} minutes.\n\n${turnsText}` },
      ],
      temperature: 0.5,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty response');

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]);
    logTokenUsage('generateConchSessionSummary', maxTokens, false);

    return {
      overallTone: parsed.overallTone || 'neutral',
      keyTopicsDiscussed: parsed.keyTopicsDiscussed || [],
      resolutionsReached: parsed.resolutionsReached || [],
      outstandingIssues: parsed.outstandingIssues || [],
      communicationHighlights: parsed.communicationHighlights || [],
      areasForImprovement: parsed.areasForImprovement || [],
      counselorRecommendation: parsed.counselorRecommendation || 'Keep practicing structured communication.',
      sessionDurationMinutes,
      turnCount,
    };
  } catch (error) {
    console.error('[ConchContentAnalyzer] Session summary failed:', error);
    return {
      overallTone: 'neutral',
      keyTopicsDiscussed: ['Session completed'],
      resolutionsReached: [],
      outstandingIssues: [],
      communicationHighlights: ['Both parties participated'],
      areasForImprovement: [],
      counselorRecommendation: 'Continue practicing structured communication.',
      sessionDurationMinutes,
      turnCount,
    };
  }
}
