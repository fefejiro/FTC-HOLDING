import OpenAI from 'openai';

export const AI_CONFIG = {
  // Toggle AI based on environment
  USE_REAL_AI: process.env.USE_REAL_AI === 'true',
  
  // Model configuration
  MODEL: 'gpt-4o-mini',
  
  // Cost-saving settings
  MAX_TOKENS: {
    TONE_ANALYSIS: 150,
    REWORD: 100,
    EMOTION: 50,
  },
  
  // Free tier limits (for testing)
  DAILY_REQUEST_LIMIT: process.env.USE_REAL_AI === 'true' ? Infinity : 50,
};

// Mock AI responses for development/testing (zero cost)
export const MOCK_AI_RESPONSES = {
  toneAnalysis: (message: string): string => {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('frustrated') || lowerMsg.includes('angry') || lowerMsg.includes('never')) {
      return "This message comes across as frustrated. Consider focusing on specific situations rather than using absolute terms like 'never' or 'always,' which can feel accusatory.";
    }
    
    if (lowerMsg.includes('difficult') || lowerMsg.includes('problem')) {
      return "This message might sound confrontational. Try framing challenges as opportunities to work together rather than pointing to problems.";
    }
    
    if (lowerMsg.includes('thank') || lowerMsg.includes('appreciate')) {
      return "This message has a positive, collaborative tone. Expressing appreciation helps build goodwill in co-parenting relationships.";
    }
    
    if (lowerMsg.includes('help') || lowerMsg.includes('together')) {
      return "This message shows a cooperative spirit. Asking for help or suggesting teamwork promotes healthy communication.";
    }
    
    return "This message appears neutral. Consider adding specific details or expressing your feelings clearly to improve understanding.";
  },
  
  rewordSuggestion: (message: string, personality: string): string => {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('you always') || lowerMsg.includes('you never')) {
      return "I've noticed that [specific situation]. Could we discuss how to handle this differently?";
    }
    
    if (lowerMsg.includes('difficult')) {
      return "I'm finding this situation challenging. Can we work together to find a solution?";
    }
    
    if (lowerMsg.includes('frustrated')) {
      return "I'm feeling concerned about [specific issue]. Would you be open to discussing this when we both have time?";
    }
    
    // Personality-based suggestions
    if (personality === 'collaborative') {
      return "I'd like to work together on this. What are your thoughts on [specific topic]?";
    }
    
    if (personality === 'direct') {
      return "I need to address [specific issue]. Here's what I'm thinking: [your perspective]. What's your view?";
    }
    
    return "Could we discuss this further? I'd like to understand your perspective.";
  },
  
  emotionDetection: (message: string): { emotion: string; confidence: number } => {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('frustrated') || lowerMsg.includes('angry')) {
      return { emotion: 'frustrated', confidence: 0.85 };
    }
    
    if (lowerMsg.includes('sad') || lowerMsg.includes('hurt')) {
      return { emotion: 'sad', confidence: 0.80 };
    }
    
    if (lowerMsg.includes('happy') || lowerMsg.includes('glad') || lowerMsg.includes('thank')) {
      return { emotion: 'happy', confidence: 0.90 };
    }
    
    if (lowerMsg.includes('worried') || lowerMsg.includes('concerned')) {
      return { emotion: 'anxious', confidence: 0.75 };
    }
    
    return { emotion: 'neutral', confidence: 0.60 };
  }
};

// Initialize OpenAI client only if using real AI
export const openai = AI_CONFIG.USE_REAL_AI 
  ? new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
    })
  : null;

// Request counter for free tier (in-memory, resets on restart)
let requestCount = 0;
let lastResetDate = new Date().toDateString();

export function canMakeAIRequest(): boolean {
  // Always allow if using mock AI
  if (!AI_CONFIG.USE_REAL_AI) {
    return true;
  }
  
  // Reset counter daily
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    requestCount = 0;
    lastResetDate = today;
  }
  
  // Check limit
  if (requestCount >= AI_CONFIG.DAILY_REQUEST_LIMIT) {
    console.warn(`[AI] Daily request limit reached: ${requestCount}/${AI_CONFIG.DAILY_REQUEST_LIMIT}`);
    return false;
  }
  
  requestCount++;
  return true;
}

export function getAIStats() {
  return {
    mode: AI_CONFIG.USE_REAL_AI ? 'REAL' : 'MOCK',
    requestsToday: requestCount,
    limit: AI_CONFIG.DAILY_REQUEST_LIMIT,
    model: AI_CONFIG.MODEL,
  };
}

console.log(`[AI Config] Mode: ${AI_CONFIG.USE_REAL_AI ? 'REAL OpenAI' : 'MOCK (Free)'}`);
console.log(`[AI Config] Daily limit: ${AI_CONFIG.DAILY_REQUEST_LIMIT}`);
