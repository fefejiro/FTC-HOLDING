// Mood analysis service for Conch Mode
// Analyzes speech tone and provides real-time feedback

export type MoodColor = "blue" | "green" | "yellow" | "orange" | "red";
export type MoodLevel = "calm" | "positive" | "neutral" | "frustrated" | "hostile";

export interface MoodAnalysisResult {
  color: MoodColor;
  level: MoodLevel;
  confidence: number;
  shouldWarn: boolean;
  strikeLevel: 0 | 1 | 2 | 3;
}

interface MoodAnalysisOptions {
  personalityType?: string;
  previousMood?: MoodLevel;
}

// Map mood levels to colors
const moodColorMap: Record<MoodLevel, MoodColor> = {
  calm: "blue",
  positive: "green",
  neutral: "yellow",
  frustrated: "orange",
  hostile: "red",
};

// Personality type modifiers (simplified for now)
const personalityModifiers: Record<string, { calmThreshold: number; warningThreshold: number }> = {
  // Introverts - more tolerance for direct communication
  INTJ: { calmThreshold: 0.4, warningThreshold: 0.7 },
  INTP: { calmThreshold: 0.4, warningThreshold: 0.7 },
  INFJ: { calmThreshold: 0.5, warningThreshold: 0.65 },
  INFP: { calmThreshold: 0.5, warningThreshold: 0.65 },
  ISTJ: { calmThreshold: 0.35, warningThreshold: 0.75 },
  ISFJ: { calmThreshold: 0.5, warningThreshold: 0.65 },
  ISTP: { calmThreshold: 0.3, warningThreshold: 0.8 },
  ISFP: { calmThreshold: 0.5, warningThreshold: 0.65 },
  
  // Extroverts - more tolerance for animated discussion
  ENTJ: { calmThreshold: 0.3, warningThreshold: 0.75 },
  ENTP: { calmThreshold: 0.3, warningThreshold: 0.75 },
  ENFJ: { calmThreshold: 0.45, warningThreshold: 0.7 },
  ENFP: { calmThreshold: 0.45, warningThreshold: 0.7 },
  ESTJ: { calmThreshold: 0.3, warningThreshold: 0.8 },
  ESFJ: { calmThreshold: 0.45, warningThreshold: 0.7 },
  ESTP: { calmThreshold: 0.25, warningThreshold: 0.85 },
  ESFP: { calmThreshold: 0.4, warningThreshold: 0.75 },
};

/**
 * Analyze mood from speech/text
 * This is a simplified version - in production, this would call OpenAI API
 */
export function analyzeMood(
  text: string,
  options: MoodAnalysisOptions = {}
): MoodAnalysisResult {
  const { personalityType, previousMood } = options;
  
  // Get personality-specific thresholds
  const thresholds = personalityType
    ? personalityModifiers[personalityType] || { calmThreshold: 0.4, warningThreshold: 0.7 }
    : { calmThreshold: 0.4, warningThreshold: 0.7 };
  
  // Simple keyword-based analysis (would be replaced with OpenAI in production)
  const hostileKeywords = ['hate', 'stupid', 'idiot', 'worst', 'terrible', 'never', 'always'];
  const frustratedKeywords = ['frustrated', 'annoyed', 'upset', 'disappointed', 'tired'];
  const neutralKeywords = ['okay', 'fine', 'sure', 'maybe', 'think'];
  const positiveKeywords = ['thanks', 'appreciate', 'good', 'great', 'understand', 'agree'];
  const calmKeywords = ['calm', 'peaceful', 'respectful', 'kind', 'patient'];
  
  const lowerText = text.toLowerCase();
  
  let hostileCount = hostileKeywords.filter(k => lowerText.includes(k)).length;
  let frustratedCount = frustratedKeywords.filter(k => lowerText.includes(k)).length;
  let neutralCount = neutralKeywords.filter(k => lowerText.includes(k)).length;
  let positiveCount = positiveKeywords.filter(k => lowerText.includes(k)).length;
  let calmCount = calmKeywords.filter(k => lowerText.includes(k)).length;
  
  // Calculate mood score (0-1, where 1 is most hostile)
  const totalKeywords = hostileCount + frustratedCount + neutralCount + positiveCount + calmCount || 1;
  const hostilityScore = (hostileCount * 1.0 + frustratedCount * 0.7 + neutralCount * 0.4 + positiveCount * 0.2 + calmCount * 0.0) / totalKeywords;
  
  // Determine mood level
  let level: MoodLevel = "neutral";
  if (hostilityScore < thresholds.calmThreshold) {
    level = hostileCount === 0 && frustratedCount === 0 ? (positiveCount > neutralCount ? "positive" : "calm") : "neutral";
  } else if (hostilityScore < thresholds.warningThreshold) {
    level = "frustrated";
  } else {
    level = "hostile";
  }
  
  // Determine strike level
  let strikeLevel: 0 | 1 | 2 | 3 = 0;
  if (level === "frustrated") strikeLevel = 1;
  if (level === "hostile") strikeLevel = 2;
  if (hostileCount >= 3) strikeLevel = 3;
  
  return {
    color: moodColorMap[level],
    level,
    confidence: Math.min(totalKeywords / 5, 1), // Higher with more keywords
    shouldWarn: strikeLevel > 0,
    strikeLevel,
  };
}

/**
 * Simulate real-time mood analysis from audio stream
 * In production, this would use Web Audio API + Whisper + OpenAI
 */
export function startRealtimeMoodAnalysis(
  onMoodUpdate: (result: MoodAnalysisResult) => void,
  personalityType?: string
): () => void {
  // Mock implementation - would be replaced with actual audio analysis
  let mockText = "";
  
  const interval = setInterval(() => {
    // Simulate periodic analysis
    if (mockText) {
      const result = analyzeMood(mockText, { personalityType });
      onMoodUpdate(result);
      mockText = ""; // Reset
    }
  }, 3000); // Analyze every 3 seconds
  
  // Return cleanup function
  return () => clearInterval(interval);
}
