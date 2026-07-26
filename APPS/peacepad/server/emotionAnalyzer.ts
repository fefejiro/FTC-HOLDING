import OpenAI from "openai";
import { aiCache, isDevMode, getMaxTokens, logTokenUsage, mockEmotionAnalysis, mockSessionSummary, createCacheKey } from "./aiHelper";

const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
}) : null;

// Incoming/shared message analysis remains deterministic and local for iOS 1.0.
const EXTERNAL_EMOTION_AI_ENABLED = false;

export interface EmotionResult {
  emotion: 'calm' | 'cooperative' | 'neutral' | 'frustrated' | 'tense' | 'defensive';
  confidence: number; // 0-100
  summary: string;
  timestamp: number;
  language?: string; // Detected language
}

export interface EmotionIntervention {
  shouldIntervene: boolean;
  type: 'tone_alert' | 'empathy_nudge' | 'conflict_detected' | 'communication_tip' | null;
  message: string;
  suggestion?: string; // For empathy nudges - alternative phrasing
  severity: 'low' | 'medium' | 'high';
  language?: string; // Response in detected language
}

export interface TurnSummary {
  keyPoints: string[];
  unaddressedConcerns: string[];
  overallSentiment: string;
  counselorNote: string; // Like a therapist's observation
  language?: string;
}

export interface ConflictAnalysis {
  hasConflict: boolean;
  conflictType: 'scheduling' | 'financial' | 'parenting_style' | 'communication' | 'boundaries' | 'past_issues' | 'none';
  severity: 'low' | 'medium' | 'high';
  triggerPhrases: string[];
  rootCause: string;
  resolution: {
    immediate: string; // What to say/do right now
    shortTerm: string; // Steps for the next few days
    longTerm: string; // Systemic changes to prevent recurrence
  };
  communicationTip: string;
  language: string;
}

export interface MessageAnalysis {
  emotion: EmotionResult;
  language: string;
  conflictAnalysis?: ConflictAnalysis;
  suggestedResponse?: string;
  communicationScore: number; // 1-10
  improvementTips: string[];
}

const COMMON_CONFLICT_PATTERNS = {
  scheduling: ['pickup', 'drop off', 'schedule', 'time', 'late', 'wait', 'cancel', 'reschedule', 'weekend', 'holiday', 'vacation'],
  financial: ['money', 'pay', 'support', 'expense', 'cost', 'afford', 'reimburse', 'bill', 'child support', 'share'],
  parenting_style: ['discipline', 'rules', 'bedtime', 'screen time', 'diet', 'homework', 'chores', 'permission', 'too strict', 'too lenient'],
  communication: ['never listen', 'always', 'you said', 'didn\'t tell', 'inform', 'communicate', 'respond', 'ignore'],
  boundaries: ['my time', 'your time', 'private', 'none of your business', 'partner', 'new relationship', 'introduce'],
  past_issues: ['last time', 'you always', 'remember when', 'never forget', 'still', 'again']
};

function safeJsonParse<T>(content: string, fallback: T): T {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T;
    }
    return JSON.parse(content) as T;
  } catch {
    console.warn('[EmotionAnalyzer] Failed to parse AI JSON response');
    return fallback;
  }
}

/**
 * Detect language from text with confidence
 */
export async function detectLanguage(text: string): Promise<string> {
  if (!text || text.length < 10) return 'en';
  return detectLanguageSimple(text);
}

function detectLanguageSimple(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Mauritian Creole detection - check BEFORE French since it uses French characters
  // Common Mauritian Creole patterns: mo (I), to (you), li (he/she), nou (we), zot (they)
  // ki manyer (how), kifer (why), pa kapav (cannot), bizin (must/need), aster (now)
  const creolePatterns = /\b(mo|to|li|nou|zot|ki manyer|kifer|pa kapav|bizin|aster|ena|pena|eski|komsi|kouma|lerla|zordi|dime|yer|sa|la|dan|pou|ek|me|mwa|twa|lavi)\b/i;
  if (creolePatterns.test(lowerText)) return 'mf'; // Mauritian French Creole (ISO 639-3: mfe, using 'mf')
  
  if (/[àâäéèêëïîôùûüÿœæç]/.test(text)) return 'fr';
  if (/[áéíóúüñ¿¡]/.test(text)) return 'es';
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';
  if (/[äöüßẞ]/.test(text)) return 'de';
  if (/[àèéìíîòóùú]/.test(text) && lowerText.includes('che')) return 'it';
  if (/[ãõç]/.test(text)) return 'pt';
  return 'en';
}

/**
 * Analyze emotional tone with language detection
 */
export async function analyzeEmotion(
  transcript: string,
  context?: string
): Promise<EmotionResult> {
  if (!EXTERNAL_EMOTION_AI_ENABLED || isDevMode()) {
    return mockEmotionAnalysis(transcript);
  }

  const cacheKey = createCacheKey('emotion', context ? `${context}:${transcript}` : transcript);
  const cached = aiCache.get<EmotionResult>(cacheKey);
  
  if (cached) {
    logTokenUsage('analyzeEmotion', 150, true);
    return { ...cached, timestamp: Date.now() };
  }

  if (!openai) {
    console.log('[EmotionAnalyzer] OpenAI not configured - using mock data');
    return mockEmotionAnalysis(transcript);
  }

  try {
    const maxTokens = getMaxTokens(200);
    
    const systemPrompt = `You are an empathetic AI assistant analyzing emotional tone in co-parenting conversations across ALL languages.

MULTI-LANGUAGE SUPPORT:
- Automatically detect the language (English, Spanish, French, Nigerian Pidgin, Mauritian Creole, etc.)
- Provide summary in the SAME LANGUAGE as the transcript
- Handle all languages with cultural sensitivity

Analyze the emotional tone and classify into ONE category:
- calm: Peaceful, measured, understanding tone
- cooperative: Collaborative, solution-oriented, positive
- neutral: Factual, informational, no strong emotion
- frustrated: Impatient, annoyed, slightly negative
- tense: Strained, uncomfortable, conflict present
- defensive: Protective, reactive, guarded

Provide:
1. Emotion category (in English)
2. Confidence level (0-100)
3. Brief summary explaining why (in same language as transcript)

You MUST respond with valid JSON:
{"emotion": "calm|cooperative|neutral|frustrated|tense|defensive", "confidence": 0-100, "summary": "explanation in user's language", "language": "ISO 639-1 code"}`;

    const userPrompt = context 
      ? `Context: ${context}\n\nTranscript: "${transcript}"`
      : `Transcript: "${transcript}"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // GPT-4o-mini natively supports 100+ languages
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content);

    const result: EmotionResult = {
      emotion: parsed.emotion,
      confidence: Math.min(100, Math.max(0, parsed.confidence)),
      summary: parsed.summary,
      timestamp: Date.now(),
      language: parsed.language || 'en',
    };

    aiCache.set(cacheKey, { ...result, timestamp: 0 });
    logTokenUsage('analyzeEmotion', maxTokens, false);

    return result;
  } catch (error) {
    console.error('[EmotionAnalyzer] Analysis failed:', error);
    
    return {
      emotion: 'neutral',
      confidence: 0,
      summary: 'Unable to analyze emotion',
      timestamp: Date.now(),
      language: 'en',
    };
  }
}

/**
 * Analyze message for co-parenting conflicts and provide resolution suggestions
 */
export async function analyzeConflict(
  message: string,
  conversationHistory?: string[],
  detectedLanguage?: string
): Promise<ConflictAnalysis> {
  const lang = detectedLanguage || await detectLanguage(message);
  
  const mockResult: ConflictAnalysis = {
    hasConflict: false,
    conflictType: 'none',
    severity: 'low',
    triggerPhrases: [],
    rootCause: '',
    resolution: { immediate: '', shortTerm: '', longTerm: '' },
    communicationTip: '',
    language: lang,
  };

  if (!EXTERNAL_EMOTION_AI_ENABLED || isDevMode() || !openai) {
    const lowerMessage = message.toLowerCase();
    for (const [type, patterns] of Object.entries(COMMON_CONFLICT_PATTERNS)) {
      if (patterns.some(p => lowerMessage.includes(p))) {
        return {
          hasConflict: true,
          conflictType: type as ConflictAnalysis['conflictType'],
          severity: 'medium',
          triggerPhrases: patterns.filter(p => lowerMessage.includes(p)),
          rootCause: `Detected potential ${type.replace('_', ' ')} issue`,
          resolution: {
            immediate: 'Take a breath and focus on the specific issue at hand',
            shortTerm: 'Schedule a calm discussion about this topic',
            longTerm: 'Consider establishing clear guidelines for this area',
          },
          communicationTip: 'Use "I feel" statements instead of "You always"',
          language: lang,
        };
      }
    }
    return mockResult;
  }

  try {
    const maxTokens = getMaxTokens(500);
    const historyContext = conversationHistory?.slice(-5).join('\n') || '';
    
    const systemPrompt = `You are an expert co-parenting mediator and family therapist. Analyze messages for conflicts and provide constructive resolution strategies.

IMPORTANT: Respond in the language: ${lang === 'en' ? 'English' : lang}

Common co-parenting conflict types:
- scheduling: pickup/dropoff times, holidays, vacations
- financial: expenses, child support, reimbursements
- parenting_style: discipline, rules, screen time, diet
- communication: not informing, ignoring messages
- boundaries: privacy, new partners, personal life
- past_issues: bringing up old conflicts

Analyze for:
1. Is there a conflict? (even subtle tension counts)
2. What type of conflict?
3. Severity (low/medium/high)
4. What phrases triggered the conflict?
5. Root cause analysis
6. Resolution strategies (immediate, short-term, long-term)
7. A specific communication tip

Respond ONLY in JSON format:
{
  "hasConflict": boolean,
  "conflictType": "scheduling|financial|parenting_style|communication|boundaries|past_issues|none",
  "severity": "low|medium|high",
  "triggerPhrases": ["phrase1", "phrase2"],
  "rootCause": "brief explanation",
  "resolution": {
    "immediate": "what to say/do right now",
    "shortTerm": "steps for next few days",
    "longTerm": "systemic changes"
  },
  "communicationTip": "specific actionable advice"
}`;

    const userPrompt = historyContext 
      ? `Recent conversation:\n${historyContext}\n\nLatest message: "${message}"`
      : `Message: "${message}"`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty response');

    const parsed = JSON.parse(content);
    logTokenUsage('analyzeConflict', maxTokens, false);

    return {
      hasConflict: parsed.hasConflict || false,
      conflictType: parsed.conflictType || 'none',
      severity: parsed.severity || 'low',
      triggerPhrases: parsed.triggerPhrases || [],
      rootCause: parsed.rootCause || '',
      resolution: parsed.resolution || { immediate: '', shortTerm: '', longTerm: '' },
      communicationTip: parsed.communicationTip || '',
      language: lang,
    };
  } catch (error) {
    console.error('[EmotionAnalyzer] Conflict analysis failed:', error);
    return mockResult;
  }
}

/**
 * Generate a suggested response that de-escalates conflict and improves communication
 */
export async function generateSuggestedResponse(
  originalMessage: string,
  emotion: EmotionResult,
  conflictAnalysis?: ConflictAnalysis
): Promise<string> {
  const lang = emotion.language || conflictAnalysis?.language || 'en';
  
  if (!EXTERNAL_EMOTION_AI_ENABLED || isDevMode() || !openai) {
    const tips: Record<string, string> = {
      en: "I understand your concern. Let's work together to find a solution that works for both of us.",
      fr: "Je comprends votre préoccupation. Travaillons ensemble pour trouver une solution qui convient à nous deux.",
      es: "Entiendo tu preocupación. Trabajemos juntos para encontrar una solución que funcione para ambos.",
      de: "Ich verstehe Ihre Bedenken. Lassen Sie uns gemeinsam eine Lösung finden, die für uns beide funktioniert.",
    };
    return tips[lang] || tips.en;
  }

  try {
    const maxTokens = getMaxTokens(200);
    
    const conflictContext = conflictAnalysis?.hasConflict 
      ? `\nConflict type: ${conflictAnalysis.conflictType}\nRoot cause: ${conflictAnalysis.rootCause}`
      : '';

    const systemPrompt = `You are an expert co-parenting communication coach. Generate a calm, constructive response suggestion.

RESPOND IN: ${lang === 'en' ? 'English' : lang}

Guidelines:
- Acknowledge the other person's perspective
- Use "I feel" statements
- Focus on solutions, not blame
- Keep it brief (1-3 sentences)
- Be respectful and collaborative
- If there's conflict, de-escalate gently

Generate a response the person could send that would improve the conversation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Original message received: "${originalMessage}"\nCurrent emotion detected: ${emotion.emotion}${conflictContext}\n\nSuggest a constructive response:` },
      ],
      temperature: 0.6,
      max_tokens: maxTokens,
    });

    logTokenUsage('generateSuggestedResponse', maxTokens, false);
    return response.choices[0]?.message?.content?.trim() || 
      "I appreciate you sharing that. Let's discuss this calmly.";
  } catch (error) {
    console.error('[EmotionAnalyzer] Response suggestion failed:', error);
    return "I understand. Let's work together on this.";
  }
}

/**
 * Comprehensive message analysis combining all AI features
 */
export async function analyzeMessageComprehensive(
  message: string,
  conversationHistory?: string[],
  context?: string
): Promise<MessageAnalysis> {
  const [emotion, language] = await Promise.all([
    analyzeEmotion(message, context),
    detectLanguage(message),
  ]);

  const needsConflictAnalysis = 
    emotion.emotion === 'frustrated' || 
    emotion.emotion === 'tense' || 
    emotion.emotion === 'defensive' ||
    Object.values(COMMON_CONFLICT_PATTERNS).flat().some(p => message.toLowerCase().includes(p));

  let conflictAnalysis: ConflictAnalysis | undefined;
  let suggestedResponse: string | undefined;

  if (needsConflictAnalysis) {
    conflictAnalysis = await analyzeConflict(message, conversationHistory, language);
    
    if (conflictAnalysis.hasConflict || emotion.confidence > 60) {
      suggestedResponse = await generateSuggestedResponse(message, emotion, conflictAnalysis);
    }
  }

  const communicationScore = calculateCommunicationScore(message, emotion, conflictAnalysis);
  const improvementTips = generateImprovementTips(message, emotion, conflictAnalysis, language);

  return {
    emotion,
    language,
    conflictAnalysis,
    suggestedResponse,
    communicationScore,
    improvementTips,
  };
}

function calculateCommunicationScore(
  message: string,
  emotion: EmotionResult,
  conflict?: ConflictAnalysis
): number {
  let score = 7;
  
  if (emotion.emotion === 'calm' || emotion.emotion === 'cooperative') score += 2;
  if (emotion.emotion === 'frustrated' || emotion.emotion === 'tense') score -= 2;
  if (emotion.emotion === 'defensive') score -= 3;
  
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('i feel')) score += 1;
  if (lowerMessage.includes('thank you') || lowerMessage.includes('please')) score += 1;
  if (/you always|you never/i.test(message)) score -= 2;
  if (/!{2,}/.test(message)) score -= 1;
  
  if (conflict?.hasConflict) {
    if (conflict.severity === 'high') score -= 2;
    if (conflict.severity === 'medium') score -= 1;
  }
  
  return Math.max(1, Math.min(10, score));
}

function generateImprovementTips(
  message: string,
  emotion: EmotionResult,
  conflict?: ConflictAnalysis,
  language: string = 'en'
): string[] {
  const tips: string[] = [];
  const lowerMessage = message.toLowerCase();

  const tipTemplates: Record<string, Record<string, string>> = {
    youAlways: {
      en: 'Replace "you always" with specific examples: "Last Tuesday when..."',
      fr: 'Remplacez "tu fais toujours" par des exemples précis: "Mardi dernier quand..."',
      es: 'Reemplaza "siempre" con ejemplos específicos: "El martes pasado cuando..."',
    },
    iFeel: {
      en: 'Try starting with "I feel..." to express your perspective',
      fr: 'Essayez de commencer par "Je ressens..." pour exprimer votre point de vue',
      es: 'Intenta comenzar con "Me siento..." para expresar tu perspectiva',
    },
    accusatory: {
      en: 'Focus on the issue, not the person',
      fr: 'Concentrez-vous sur le problème, pas sur la personne',
      es: 'Enfócate en el problema, no en la persona',
    },
    positive: {
      en: 'Great job keeping the conversation constructive!',
      fr: 'Bravo pour maintenir une conversation constructive!',
      es: '¡Buen trabajo manteniendo la conversación constructiva!',
    },
  };

  const getLang = (key: string) => tipTemplates[key]?.[language] || tipTemplates[key]?.en || '';

  if (/you always|you never/i.test(message)) {
    tips.push(getLang('youAlways'));
  }

  if (!lowerMessage.includes('i feel') && (emotion.emotion === 'frustrated' || emotion.emotion === 'defensive')) {
    tips.push(getLang('iFeel'));
  }

  if (/your fault|blame|stupid|idiot/i.test(message)) {
    tips.push(getLang('accusatory'));
  }

  if (emotion.emotion === 'calm' || emotion.emotion === 'cooperative') {
    tips.push(getLang('positive'));
  }

  if (conflict?.communicationTip) {
    tips.push(conflict.communicationTip);
  }

  return tips.slice(0, 3);
}

/**
 * Generate end-of-session emotional summary
 */
export async function generateSessionSummary(
  emotionTimeline: EmotionResult[]
): Promise<string> {
  if (emotionTimeline.length === 0) {
    return "No emotional data recorded for this session.";
  }

  if (!EXTERNAL_EMOTION_AI_ENABLED || isDevMode()) {
    return mockSessionSummary(emotionTimeline.length);
  }

  if (!openai) {
    console.log('[EmotionAnalyzer] OpenAI not configured - using mock summary');
    return mockSessionSummary(emotionTimeline.length);
  }

  try {
    const emotionCounts = emotionTimeline.reduce((acc, e) => {
      acc[e.emotion] = (acc[e.emotion] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const cacheKey = createCacheKey('summary', JSON.stringify(emotionCounts));
    const cached = aiCache.get<string>(cacheKey);
    
    if (cached) {
      logTokenUsage('generateSessionSummary', 200, true);
      return cached;
    }

    const maxTokens = getMaxTokens(200);
    const detectedLang = emotionTimeline[0]?.language || 'en';

    const timelineText = emotionTimeline
      .map((e) => `${e.emotion} (${e.confidence}%): ${e.summary}`)
      .join('\n');

    const systemPrompt = `You are an empathetic AI assistant providing supportive feedback for co-parenting communication.

RESPOND IN: ${detectedLang === 'en' ? 'English' : detectedLang}

Based on the emotional timeline, provide:
1. A warm, encouraging summary (2-3 sentences)
2. Highlight positive moments
3. Gently acknowledge challenges if present
4. End with constructive encouragement

Keep tone supportive, non-judgmental, and focused on progress.`;

    const userPrompt = `Emotional Timeline:\n${timelineText}\n\nDistribution: ${JSON.stringify(emotionCounts)}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    });

    const summary = response.choices[0]?.message?.content?.trim() || 
           "Your conversation showed thoughtful communication. Keep building on these positive interactions.";
    
    aiCache.set(cacheKey, summary);
    logTokenUsage('generateSessionSummary', maxTokens, false);

    return summary;
  } catch (error) {
    console.error('[EmotionAnalyzer] Summary generation failed:', error);
    return "Your conversation showed thoughtful communication. Keep building on these positive interactions.";
  }
}

/**
 * Generate AI counselor intervention when negative mood shifts detected
 */
export async function generateEmotionIntervention(
  currentEmotion: EmotionResult,
  previousEmotion?: EmotionResult,
  recentTranscript?: string
): Promise<EmotionIntervention> {
  const negativeEmotions = ['frustrated', 'tense', 'defensive'];
  const positiveEmotions = ['calm', 'cooperative', 'neutral'];
  
  const isCurrentNegative = negativeEmotions.includes(currentEmotion.emotion);
  const wasPreviousPositive = previousEmotion ? positiveEmotions.includes(previousEmotion.emotion) : true;
  const confidenceThreshold = 60;
  
  if (!isCurrentNegative || currentEmotion.confidence < confidenceThreshold) {
    return {
      shouldIntervene: false,
      type: null,
      message: '',
      severity: 'low',
    };
  }
  
  const isMoodShift = wasPreviousPositive && isCurrentNegative;
  const lang = currentEmotion.language || 'en';
  
  const severityMap: Record<string, 'low' | 'medium' | 'high'> = {
    frustrated: 'medium',
    tense: 'medium',
    defensive: 'high',
  };
  
  if (!EXTERNAL_EMOTION_AI_ENABLED || isDevMode()) {
    return {
      shouldIntervene: true,
      type: 'tone_alert',
      message: "I notice tension rising—take a breath",
      severity: currentEmotion.emotion === 'defensive' ? 'high' : 'medium',
      language: lang,
    };
  }
  
  if (!openai) {
    const fallbackMessages: Record<string, Record<string, string>> = {
      frustrated: {
        en: "I notice tension rising—take a breath",
        fr: "Je remarque une tension—prenez une respiration",
        es: "Noto tensión creciente—respira profundo",
      },
      tense: {
        en: "This feels challenging—let's pause and refocus",
        fr: "C'est difficile—faisons une pause",
        es: "Esto se siente difícil—pausemos y reenfoquemos",
      },
      defensive: {
        en: "I hear you feeling protective—take a moment",
        fr: "Je vous sens sur la défensive—prenez un moment",
        es: "Te siento protector—toma un momento",
      },
    };
    
    const emotionMessages = fallbackMessages[currentEmotion.emotion] || fallbackMessages.frustrated;
    return {
      shouldIntervene: true,
      type: 'tone_alert' as const,
      message: emotionMessages[lang] || emotionMessages.en,
      severity: severityMap[currentEmotion.emotion] || 'medium',
      language: lang,
    };
  }

  try {
    const maxTokens = getMaxTokens(150);
    
    const systemPrompt = `You are an empathetic marriage counselor providing gentle, real-time support during conversations across ALL languages.

MULTI-LANGUAGE SUPPORT:
- Automatically detect the language (English, Spanish, French, Nigerian Pidgin, Mauritian Creole, etc.)
- Respond in the SAME LANGUAGE as the transcript
- Use culturally appropriate, warm, supportive tone

Your role is to:
- Detect frustration, tension, or defensiveness
- Provide brief, supportive interventions (1 short sentence)
- Use "I notice..." language (never accusatory)
- Suggest calming techniques or reframing
- Handle manipulation patterns with extra support

Types of interventions:
- tone_alert: Gentle notification about rising tension
- empathy_nudge: Suggest better phrasing
- conflict_detected: When a specific conflict pattern is identified
- communication_tip: Actionable advice for better communication

Examples in English:
- tone_alert: "I notice tension rising—take a breath"
- empathy_nudge: "Try: 'I feel frustrated when...' instead of 'You always...'"

Examples in Nigerian Pidgin:
- tone_alert: "I dey see say tension dey rise—make you take breath"
- empathy_nudge: "Try: 'E dey vex me when...' instead of 'You always...'"

Examples in French:
- tone_alert: "Je remarque que la tension monte—respirez profondément"
- empathy_nudge: "Essayez: 'Je me sens frustré(e) quand...' au lieu de 'Tu fais toujours...'"

You MUST respond with valid JSON:
{"type": "tone_alert|empathy_nudge|conflict_detected|communication_tip", "message": "brief supportive message in user's language", "suggestion": "optional alternative phrasing or null"}`;

    const context = isMoodShift 
      ? `Mood shifted from ${previousEmotion?.emotion} to ${currentEmotion.emotion}. Confidence: ${currentEmotion.confidence}%`
      : `Current mood: ${currentEmotion.emotion}. Confidence: ${currentEmotion.confidence}%`;
    
    const userPrompt = recentTranscript
      ? `${context}\n\nRecent words: "${recentTranscript}"\n\nGenerate a brief, supportive intervention.`
      : `${context}\n\nGenerate a brief, supportive intervention.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content);
    
    logTokenUsage('generateEmotionIntervention', maxTokens, false);

    return {
      shouldIntervene: true,
      type: parsed.type,
      message: parsed.message,
      suggestion: parsed.suggestion,
      severity: severityMap[currentEmotion.emotion] || 'medium',
      language: lang,
    };
  } catch (error) {
    console.error('[EmotionAnalyzer] Intervention generation failed:', error);
    
    const fallbackMessages: Record<string, string> = {
      frustrated: "I notice tension rising—take a breath",
      tense: "This feels challenging—let's pause and refocus",
      defensive: "I hear you feeling protective—take a moment",
    };
    
    return {
      shouldIntervene: true,
      type: 'tone_alert',
      message: fallbackMessages[currentEmotion.emotion] || "Take a calming breath",
      severity: severityMap[currentEmotion.emotion] || 'medium',
      language: lang,
    };
  }
}

/**
 * Generate AI counselor summary after each speaking turn
 */
export async function generateTurnSummary(
  transcript: string,
  speakerName: string,
  context?: string
): Promise<TurnSummary> {
  if (!transcript || transcript.trim().length < 20) {
    return {
      keyPoints: [],
      unaddressedConcerns: [],
      overallSentiment: 'neutral',
      counselorNote: 'Turn was too brief for meaningful summary.',
    };
  }
  
  const lang = await detectLanguage(transcript);
  
  if (!EXTERNAL_EMOTION_AI_ENABLED || isDevMode()) {
    return {
      keyPoints: ["Discussed scheduling for next weekend", "Mentioned child's school event"],
      unaddressedConcerns: ["Pickup time still unclear"],
      overallSentiment: 'cooperative',
      counselorNote: `${speakerName} expressed their perspective clearly and stayed focused on practical matters.`,
      language: lang,
    };
  }
  
  if (!openai) {
    return {
      keyPoints: ["Discussed scheduling for next weekend", "Mentioned child's school event"],
      unaddressedConcerns: ["Pickup time still unclear"],
      overallSentiment: 'cooperative',
      counselorNote: `${speakerName} expressed their perspective clearly and stayed focused on practical matters.`,
      language: lang,
    };
  }

  try {
    const maxTokens = getMaxTokens(300);
    
    const systemPrompt = `You are an empathetic marriage counselor summarizing what someone just said during a structured conversation in multiple languages.

MULTI-LANGUAGE SUPPORT:
- Detect the language and respond in the SAME language as the transcript
- Use culturally appropriate, warm, supportive tone

Your role is to:
- Extract 2-3 key points they made
- Identify any concerns they raised but didn't fully address
- Note the overall sentiment (calm/cooperative/frustrated/tense) - in English
- Provide a brief, warm counselor observation (1 sentence) - in the same language

Tone: Professional, non-judgmental, observant (like a skilled therapist)

You MUST respond with valid JSON in this exact format:
{
  "keyPoints": ["point 1", "point 2"],
  "unaddressedConcerns": ["concern 1"] or [],
  "overallSentiment": "calm|cooperative|neutral|frustrated|tense",
  "counselorNote": "brief therapist observation"
}`;

    const userPrompt = context
      ? `Context: ${context}\n\nSpeaker: ${speakerName}\n\nWhat they said: "${transcript}"\n\nGenerate a counselor-style summary.`
      : `Speaker: ${speakerName}\n\nWhat they said: "${transcript}"\n\nGenerate a counselor-style summary.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: maxTokens,
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    const parsed = JSON.parse(content);
    
    logTokenUsage('generateTurnSummary', maxTokens, false);

    return {
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      unaddressedConcerns: Array.isArray(parsed.unaddressedConcerns) ? parsed.unaddressedConcerns : [],
      overallSentiment: parsed.overallSentiment || 'neutral',
      counselorNote: parsed.counselorNote || `${speakerName} shared their perspective.`,
      language: lang,
    };
  } catch (error) {
    console.error('[EmotionAnalyzer] Turn summary generation failed:', error);
    
    return {
      keyPoints: ["Unable to generate summary"],
      unaddressedConcerns: [],
      overallSentiment: 'neutral',
      counselorNote: `${speakerName} shared their thoughts during this turn.`,
      language: lang,
    };
  }
}
