import OpenAI from "openai";
import { aiCache, isDevMode, getMaxTokens, logTokenUsage, createCacheKey } from "./aiHelper";

const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
}) : null;

// Validation can involve another participant's words, so it stays local in iOS 1.0.
const EXTERNAL_SHARED_MESSAGE_AI_ENABLED = false;

export interface SummaryValidationResult {
  isValid: boolean;
  score: number;
  capturedPoints: string[];
  missedPoints: string[];
  feedback: string;
  encouragement: string;
}

export interface SummaryValidationInput {
  originalContent: string;
  summaryText: string;
  context?: string;
}

const MOCK_VALIDATION_RESPONSES: SummaryValidationResult[] = [
  {
    isValid: true,
    score: 85,
    capturedPoints: ["They expressed concern about scheduling", "They mentioned wanting more flexibility"],
    missedPoints: ["They also mentioned feeling unheard in past discussions"],
    feedback: "You captured the main concerns well. Consider acknowledging the emotional undertone about feeling unheard.",
    encouragement: "Great job reflecting back what you heard!"
  },
  {
    isValid: true,
    score: 70,
    capturedPoints: ["They want to discuss the pickup schedule"],
    missedPoints: ["They expressed frustration with last-minute changes", "They suggested a specific solution"],
    feedback: "You got the topic right. Try to also capture the emotions and any suggestions they made.",
    encouragement: "Good start! Active listening takes practice."
  },
  {
    isValid: false,
    score: 45,
    capturedPoints: ["General topic was correct"],
    missedPoints: ["The specific concern they raised", "Their proposed compromise", "Their emotional state"],
    feedback: "Try to reflect more of what they actually said, including their feelings and specific points.",
    encouragement: "Keep practicing - understanding gets easier with time."
  }
];

function getMockValidation(summary: string): SummaryValidationResult {
  const wordCount = summary.split(/\s+/).length;
  if (wordCount > 20) {
    return MOCK_VALIDATION_RESPONSES[0];
  } else if (wordCount > 10) {
    return MOCK_VALIDATION_RESPONSES[1];
  }
  return MOCK_VALIDATION_RESPONSES[2];
}

export async function validateSummary(input: SummaryValidationInput): Promise<SummaryValidationResult> {
  const { originalContent, summaryText, context } = input;
  
  if (!EXTERNAL_SHARED_MESSAGE_AI_ENABLED || !openai || isDevMode()) {
    console.log('[SummaryValidator] Using mock validation (dev mode or no API key)');
    return getMockValidation(summaryText);
  }
  
  const cacheKey = createCacheKey('summary-validation', originalContent + summaryText);
  const cached = aiCache.get(cacheKey);
  if (cached) {
    console.log('[SummaryValidator] Returning cached result');
    return cached as SummaryValidationResult;
  }
  
  try {
    const systemPrompt = `You are an empathetic communication coach helping co-parents practice active listening based on Carl Rogers' principles.

Your role is to evaluate how well someone summarized what their co-parent said. Be encouraging and constructive, never critical or harsh.

IMPORTANT SAFETY GUIDELINES:
- If the original message contains manipulation, threats, or abuse, acknowledge that the listener doesn't need to validate harmful content
- Never coach someone to accept or validate abusive language
- Focus on the legitimate emotional needs and practical concerns that were expressed

Respond in JSON format with these fields:
- isValid: boolean (true if the summary captures at least 60% of key points)
- score: number (0-100, how well the summary reflects the original)
- capturedPoints: string[] (what the listener understood correctly)
- missedPoints: string[] (key points or emotions that were missed, if any)
- feedback: string (gentle coaching suggestion, 1-2 sentences)
- encouragement: string (positive reinforcement, 1 short sentence)`;

    const userPrompt = `Original message from co-parent:
"${originalContent}"

Listener's summary of what they heard:
"${summaryText}"

${context ? `Context: ${context}` : ''}

Evaluate how well the listener captured what was said. Focus on:
1. Did they understand the main point?
2. Did they acknowledge the emotions?
3. Did they capture any specific requests or concerns?`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: getMaxTokens(200),
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from OpenAI");
    }
    
    logTokenUsage('summary-validation', response.usage?.total_tokens || 0);
    
    const result = JSON.parse(content) as SummaryValidationResult;
    
    const validated: SummaryValidationResult = {
      isValid: result.isValid ?? result.score >= 60,
      score: Math.min(100, Math.max(0, result.score ?? 50)),
      capturedPoints: Array.isArray(result.capturedPoints) ? result.capturedPoints : [],
      missedPoints: Array.isArray(result.missedPoints) ? result.missedPoints : [],
      feedback: result.feedback || "Keep practicing active listening.",
      encouragement: result.encouragement || "Good effort!"
    };
    
    aiCache.set(cacheKey, validated);
    return validated;
    
  } catch (error) {
    console.error('[SummaryValidator] Error:', error);
    return getMockValidation(summaryText);
  }
}

export async function detectEmotionalMessage(content: string): Promise<{ isEmotional: boolean; intensity: number; emotions: string[] }> {
  if (!EXTERNAL_SHARED_MESSAGE_AI_ENABLED || !openai || isDevMode()) {
    const lowerContent = content.toLowerCase();
    const emotionalKeywords = ['frustrated', 'angry', 'hurt', 'worried', 'scared', 'upset', 'disappointed', 'anxious', 'stressed', 'overwhelmed'];
    const matchedEmotions = emotionalKeywords.filter(kw => lowerContent.includes(kw));
    
    const hasIntensifiers = /\b(really|very|so|extremely|always|never)\b/i.test(content);
    const hasExclamation = content.includes('!');
    const isLong = content.length > 200;
    
    let intensity = matchedEmotions.length * 20;
    if (hasIntensifiers) intensity += 15;
    if (hasExclamation) intensity += 10;
    if (isLong) intensity += 10;
    
    return {
      isEmotional: intensity >= 40,
      intensity: Math.min(100, intensity),
      emotions: matchedEmotions
    };
  }
  
  const cacheKey = createCacheKey('emotion-detect', content);
  const cached = aiCache.get(cacheKey);
  if (cached) {
    return cached as { isEmotional: boolean; intensity: number; emotions: string[] };
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Analyze the emotional content of this message from a co-parent. Return JSON with:
- isEmotional: boolean (true if message has significant emotional weight that would benefit from acknowledgment)
- intensity: number 0-100 (how emotionally charged the message is)
- emotions: string[] (detected emotions like "frustrated", "worried", "hurt", "hopeful")`
        },
        { role: "user", content: content }
      ],
      max_tokens: 100,
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    const validated = {
      isEmotional: result.isEmotional ?? false,
      intensity: Math.min(100, Math.max(0, result.intensity ?? 0)),
      emotions: Array.isArray(result.emotions) ? result.emotions : []
    };
    
    aiCache.set(cacheKey, validated);
    return validated;
    
  } catch (error) {
    console.error('[EmotionDetect] Error:', error);
    return { isEmotional: false, intensity: 0, emotions: [] };
  }
}
