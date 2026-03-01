/**
 * Simple language detection for AI features
 * Detects language and handles Nigerian Pidgin specifically
 */

interface LanguageResult {
  language: string; // ISO code like 'en', 'es', 'fr', 'pcm' (Pidgin)
  displayName: string; // Human-readable name
  confidence: number; // 0-100
}

/**
 * Detect the language of text
 * Includes specific support for Nigerian Pidgin (Naija/broken English)
 */
export function detectLanguage(text: string): LanguageResult {
  if (!text || text.trim().length < 5) {
    return { language: 'en', displayName: 'English', confidence: 50 };
  }

  const normalizedText = text.toLowerCase();

  // Nigerian Pidgin indicators (VERY conservative - require multiple strong signals)
  // Remove common false positives: "don", "shey", "oya" can appear in English
  const strongPidginPatterns = /\b(wetin|abeg|una|no be|na so|wahala|pikin)\b/gi;
  const moderatePidginPatterns = /\b(i no dey|e no dey|dem no|how far|make we|go fit)\b/gi;
  
  const strongMatches = (normalizedText.match(strongPidginPatterns) || []).length;
  const moderateMatches = (normalizedText.match(moderatePidginPatterns) || []).length;
  
  // Only classify as Pidgin if we have MULTIPLE strong indicators
  // OR combination of strong + moderate with high confidence
  const pidginScore = (strongMatches * 2) + moderateMatches;
  
  if (pidginScore >= 4 || strongMatches >= 2) {
    return { language: 'pcm', displayName: 'Nigerian Pidgin', confidence: Math.min(90, 50 + (pidginScore * 8)) };
  }

  // French patterns
  const strongFrenchPatterns = /\b(jamais|toujours|s'il vous plaît|merci|pardon|désolé|pourquoi|comment|quand|où)\b/gi;
  const commonFrenchPatterns = /\b(je|tu|il|elle|nous|vous|ils|elles|le|la|les|des|un|une|est|sont|avec|pour|dans|de|ne|pas)\b/gi;
  
  const strongFrenchMatches = (normalizedText.match(strongFrenchPatterns) || []).length;
  const commonFrenchMatches = (normalizedText.match(commonFrenchPatterns) || []).length;
  
  const frenchScore = (strongFrenchMatches * 3) + commonFrenchMatches;
  
  if (strongFrenchMatches >= 1 || commonFrenchMatches >= 2) {
    return { language: 'fr', displayName: 'French', confidence: Math.min(90, 50 + (frenchScore * 5)) };
  }

  // Spanish patterns - including high-confidence indicators
  const strongSpanishPatterns = /\b(nunca|siempre|por favor|gracias|perdón|disculpa|también|dónde|cuándo|cómo|porqué)\b/gi;
  const commonSpanishPatterns = /\b(el|la|los|las|un|una|es|son|con|para|en|de|que|pero|y|mi|tu|su|me|te|se|no|sí)\b/gi;
  const spanishPunctuation = /¿|¡/g;
  
  const strongSpanishMatches = (normalizedText.match(strongSpanishPatterns) || []).length;
  const commonSpanishMatches = (normalizedText.match(commonSpanishPatterns) || []).length;
  const spanishPunctuationMatches = (normalizedText.match(spanishPunctuation) || []).length;
  
  const spanishScore = (strongSpanishMatches * 3) + commonSpanishMatches + (spanishPunctuationMatches * 2);
  
  // Lower threshold for Spanish: 1 strong indicator OR 2 common words OR inverted punctuation
  if (strongSpanishMatches >= 1 || spanishPunctuationMatches >= 1 || commonSpanishMatches >= 2) {
    return { language: 'es', displayName: 'Spanish', confidence: Math.min(90, 50 + (spanishScore * 5)) };
  }

  // Portuguese patterns
  const strongPortuguesePatterns = /\b(nunca|sempre|por favor|obrigado|obrigada|desculpa|também|onde|quando|como|porquê)\b/gi;
  const commonPortuguesePatterns = /\b(o|a|os|as|um|uma|é|são|com|para|em|de|que|mas|e|meu|teu|seu|não|sim|me|te|se)\b/gi;
  
  const strongPortugueseMatches = (normalizedText.match(strongPortuguesePatterns) || []).length;
  const commonPortugueseMatches = (normalizedText.match(commonPortuguesePatterns) || []).length;
  
  const portugueseScore = (strongPortugueseMatches * 3) + commonPortugueseMatches;
  
  if (strongPortugueseMatches >= 1 || commonPortugueseMatches >= 2) {
    return { language: 'pt', displayName: 'Portuguese', confidence: Math.min(90, 50 + (portugueseScore * 5)) };
  }

  // Yoruba patterns (Nigerian language)
  const yorubaPatterns = /\b(emi|iwo|oun|wa|nwon|ni|ko|ti|se|je|nkan|bi|fun|si)\b/gi;
  const yorubaMatches = (normalizedText.match(yorubaPatterns) || []).length;
  if (yorubaMatches >= 2) {
    return { language: 'yo', displayName: 'Yoruba', confidence: Math.min(85, 50 + (yorubaMatches * 10)) };
  }

  // Default to English with medium confidence
  return { language: 'en', displayName: 'English', confidence: 70 };
}

/**
 * Get language-specific instructions for AI prompts
 */
export function getLanguageInstructions(language: string): string {
  const instructions: Record<string, string> = {
    'pcm': `IMPORTANT: The user is writing in Nigerian Pidgin (broken English). This is a legitimate creole language mixing English with Nigerian languages.
- Understand common Pidgin words: "wetin" (what), "dey" (is/are), "abeg" (please), "una" (you all), "dem" (they/them), "no be" (is not), "wahala" (trouble/problem)
- Provide responses and suggestions in Pidgin if appropriate
- Don't treat code-switching between English and Pidgin as an error
- Respect the informal, conversational nature of Pidgin`,
    
    'fr': `IMPORTANT: The user is writing in French.
- Provide tone summaries and suggestions in French
- Understand French grammar and cultural context
- Respect formal vs informal register (tu/vous)`,
    
    'es': `IMPORTANT: The user is writing in Spanish.
- Provide tone summaries and suggestions in Spanish
- Understand Spanish grammar and cultural context
- Respect formal vs informal register (tú/usted)`,
    
    'pt': `IMPORTANT: The user is writing in Portuguese.
- Provide tone summaries and suggestions in Portuguese
- Understand Portuguese grammar and cultural context`,
    
    'yo': `IMPORTANT: The user is writing in Yoruba.
- Provide tone summaries and suggestions in Yoruba when possible
- Understand Yoruba cultural context and honorifics`,
    
    'en': '' // No special instructions for English
  };

  return instructions[language] || '';
}

/**
 * Get examples for AI prompts based on language
 */
export function getLanguageExamples(language: string): string {
  const examples: Record<string, string> = {
    'pcm': `
Examples of Nigerian Pidgin tone analysis:
- "Abeg, make we discuss this pickin matter" → cooperative, planning tone
- "Wetin be this wahala again?" → frustrated, questioning
- "I dey tell you say no wahala" → calm, reassuring
- "Una no dey hear word" → tense, accusatory`,
    
    'fr': `
Examples in French:
- "On peut en discuter calmement" → calm, cooperative
- "Tu ne m'écoutes jamais!" → frustrated, accusatory
- "Je comprends ton point de vue" → cooperative, empathetic`,
    
    'es': `
Examples in Spanish:
- "Podemos hablar de esto con calma" → calm, cooperative
- "¡Nunca me escuchas!" → frustrated, accusatory
- "Entiendo tu punto de vista" → cooperative, empathetic`,
    
    'en': '' // No special examples needed
  };

  return examples[language] || '';
}
