import { findMatchingPhrases, NIGERIAN_PHRASES, type NigerianPhrase } from "./nigerian-phrases";
import { getAiClient, getAiProviderConfig, isAiConfigured } from "./lib/ai-config";

// This is using OpenAI's API directly with your own API key for reliable cultural analysis
// Using gpt-4o-mini for cost efficiency (user requested to save tokens)
const MODEL = getAiProviderConfig().model;

function getOpenAIClient() {
  return getAiClient();
}

interface TranslationResult {
  translation: string;
  culturalMeaning: string;
}

interface SlangTerm {
  term: string;
  meaning: string;
  language: string;
}

interface CulturalAnalysisResult {
  translation: string;
  detectedLanguage?: string;
  culturalContext: string;
  artistIntent: string;
  deeperMeaning: string;
  languageNotes?: string;
  lyricBreakdown?: string;
  slangTerms?: SlangTerm[];
}

export async function generateLyricTranslation(
  lyricText: string,
  sourceLanguage: string,
  languageName: string
): Promise<TranslationResult> {
  try {
    const prompt = `You are an expert in African languages and cultural heritage. Translate the following ${languageName} lyric to English and provide cultural context.

Lyric: "${lyricText}"
Source Language: ${languageName}

Please provide:
1. An accurate English translation
2. The cultural meaning and significance of this lyric (explain any cultural references, metaphors, or traditional concepts)

Return your response as JSON with this exact structure:
{
  "translation": "English translation here",
  "culturalMeaning": "Cultural explanation here"
}`;

    const response = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content) as TranslationResult;
    return result;
  } catch (error) {
    console.error("Error generating lyric translation:", error);
    throw new Error("Failed to generate translation");
  }
}

export async function generateBatchTranslations(
  lyrics: Array<{ id: string; text: string }>,
  sourceLanguage: string,
  languageName: string
): Promise<Map<string, TranslationResult>> {
  const results = new Map<string, TranslationResult>();

  // Process lyrics in batches to avoid rate limits
  const batchSize = 3;
  for (let i = 0; i < lyrics.length; i += batchSize) {
    const batch = lyrics.slice(i, i + batchSize);

    const promises = batch.map(async (lyric) => {
      try {
        const result = await generateLyricTranslation(
          lyric.text,
          sourceLanguage,
          languageName
        );
        return { id: lyric.id, result };
      } catch (error) {
        console.error(`Error translating lyric ${lyric.id}:`, error);
        return {
          id: lyric.id,
          result: {
            translation: "Translation unavailable",
            culturalMeaning: "Unable to generate cultural context at this time",
          },
        };
      }
    });

    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ id, result }) => {
      results.set(id, result);
    });

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < lyrics.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Generate comprehensive cultural analysis for a lyric line
 * This is the core value proposition of SayWetin - deep cultural insights
 */
export async function generateCulturalAnalysis(
  lyricText: string,
  songTitle?: string,
  artistName?: string,
  genre?: string,
  knownLanguage?: string
): Promise<CulturalAnalysisResult> {
  try {
    const languageHint = knownLanguage ? `The language is likely ${knownLanguage}.` : '';
    const songContext = songTitle && artistName 
      ? `This line is from "${songTitle}" by ${artistName}.` 
      : '';
    const genreContext = genre ? `Genre: ${genre}.` : '';

    const prompt = `You are a renowned expert in African music, languages, and culture with deep knowledge of:
- Yoruba, Igbo, Hausa, Zulu, Xhosa, Swahili, Amharic, Somali, and other African languages
- Pidgin English (Nigerian, Ghanaian, Cameroonian varieties)
- Code-switching patterns in African music
- Traditional African proverbs, idioms, and metaphors
- Historical and political context of African songs
- Religious and spiritual references in African music

${songContext} ${genreContext} ${languageHint}

Lyric line: "${lyricText}"

Provide a scholarly, in-depth analysis in JSON format:

{
  "translation": "Natural, contextual English translation (not literal word-for-word). Preserve the poetic feel.",
  "detectedLanguage": "Specific language(s) detected (e.g., 'Yoruba', 'Pidgin English + Igbo', 'Zulu')",
  "culturalContext": "3-4 sentences explaining cultural references, traditions, proverbs, symbolism, or historical context. What cultural knowledge helps understand this line?",
  "artistIntent": "2-3 sentences on what the artist likely meant to express. What emotion, message, or story are they conveying?",
  "deeperMeaning": "2-3 sentences on wordplay, hidden meanings, double entendres, or layers beyond the surface. Any linguistic creativity?",
  "languageNotes": "Optional: Explain code-switching, dialect choices, or why the artist mixed languages (if applicable). Leave empty if not relevant."
}

Important:
- Be specific and scholarly, not generic
- Reference actual cultural traditions and concepts
- Explain proverbs and idioms fully
- Note if there's wordplay or multiple meanings
- If code-switching occurs, explain WHY (cultural significance)`;

    const response = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content) as CulturalAnalysisResult;
    return result;
  } catch (error) {
    console.error("Error generating cultural analysis:", error);
    throw new Error("Failed to generate cultural analysis");
  }
}

/**
 * Generate cultural analysis for a SECTION of lyrics (5-8 lines)
 * Optimized for fast initial display - analyze only what user is hearing
 * 
 * @param startLineIndex - Index to start analysis from (based on playOffsetMs)
 * @param maxLines - Maximum lines to analyze (default 8 for speed)
 * @param onBatchComplete - Optional callback for progressive saving
 */
export async function generateSectionCulturalAnalysis(
  lyrics: Array<{ text: string; lineNumber?: number }>,
  songTitle?: string,
  artistName?: string,
  genre?: string,
  knownLanguage?: string,
  startLineIndex: number = 0,
  maxLines: number = 8,
  onBatchComplete?: (results: CulturalAnalysisResult[], startIndex: number, originalLines: string[]) => Promise<void>
): Promise<CulturalAnalysisResult[]> {
  const startTime = Date.now();

  if (!isAiConfigured()) {
    console.log("[AI] Section analysis skipped - no AI provider configured");
    return [];
  }
  
  // Filter out empty lines and very short lines
  const meaningfulLyrics = lyrics.filter(l => l.text.trim().length > 3);
  
  // Analyze only the section around where user started listening (maxLines, default 8)
  const sectionStart = Math.max(0, startLineIndex);
  const lyricsToAnalyze = meaningfulLyrics.slice(sectionStart, sectionStart + maxLines);
  const allLines = lyricsToAnalyze.map(l => l.text);
  
  if (lyricsToAnalyze.length === 0) {
    return [];
  }
  
  console.log(`⚡ [AI] Fast section analysis: ${lyricsToAnalyze.length} lines (starting at line ${sectionStart + 1})...`);
  
  try {
    const languageHint = knownLanguage ? `The song is in ${knownLanguage}.` : '';
    const songContext = songTitle && artistName 
      ? `Song: "${songTitle}" by ${artistName}` 
      : '';
    const genreContext = genre ? `Genre: ${genre}` : '';

    const lyricsText = lyricsToAnalyze
      .map((l, idx) => `${idx + 1}. "${l.text}"`)
      .join('\n');

    const prompt = `African music language expert. ${songContext} ${genreContext} ${languageHint}

Analyze concisely:
${lyricsText}

JSON ${lyricsToAnalyze.length} items:
{"analyses":[{"translation":"...","detectedLanguage":"...","culturalContext":"1 sentence","artistIntent":"1 sentence","deeperMeaning":"1 sentence","lyricBreakdown":"word(meaning)+word(meaning)","languageNotes":"","slangTerms":[{"term":"w","meaning":"d","language":"l"}]}]}`;

    const response = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      const results = parsed.analyses || parsed.lyrics || (Array.isArray(parsed) ? parsed : []);
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ [AI] Section analyzed in ${elapsed}ms (${Math.round(elapsed/results.length)}ms per line)`);
      
      // Call callback with results
      if (onBatchComplete && results.length > 0) {
        await onBatchComplete(results, sectionStart, allLines);
      }
      
      return results;
    }
  } catch (error) {
    console.error(`❌ [AI] Error analyzing section:`, error);
  }
  
  return [];
}

/**
 * Generate cultural analysis for a SINGLE lyric line (on-demand/lazy load)
 * Called when user taps a line that hasn't been analyzed yet
 */
export async function generateSingleLineAnalysis(
  lyricText: string,
  songTitle?: string,
  artistName?: string,
  genre?: string,
  knownLanguage?: string
): Promise<CulturalAnalysisResult | null> {
  const startTime = Date.now();

  if (!isAiConfigured()) {
    console.log("[AI] Single-line analysis skipped - no AI provider configured");
    return null;
  }
  
  if (lyricText.trim().length < 3) {
    return null;
  }
  
  console.log(`⚡ [AI] On-demand analysis for: "${lyricText.substring(0, 40)}..."`);
  
  try {
    const languageHint = knownLanguage ? `The song is in ${knownLanguage}.` : '';
    const songContext = songTitle && artistName 
      ? `Song: "${songTitle}" by ${artistName}` 
      : '';
    const genreContext = genre ? `Genre: ${genre}` : '';

    const prompt = `You are an expert in African music and languages (Yoruba, Igbo, Pidgin, Zulu, Swahili, etc).

${songContext} ${genreContext} ${languageHint}

Analyze this lyric line concisely:
"${lyricText}"

Return JSON:
{"translation": "...", "detectedLanguage": "...", "culturalContext": "1-2 sentences", "artistIntent": "1 sentence", "deeperMeaning": "1 sentence", "languageNotes": "", "lyricBreakdown": "word1 (meaning) + word2 (meaning) = full meaning", "slangTerms": [{"term": "slang word", "meaning": "definition", "language": "Pidgin/Yoruba/etc"}]}

For lyricBreakdown: break key words/phrases with their meanings. Be concise. Focus on notable slang/idioms.`;

    const response = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 600, // Slightly more for breakdown
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const result = JSON.parse(content) as CulturalAnalysisResult;
      const elapsed = Date.now() - startTime;
      console.log(`✅ [AI] Single line analyzed in ${elapsed}ms`);
      return result;
    }
  } catch (error) {
    console.error(`❌ [AI] Error analyzing single line:`, error);
  }
  
  return null;
}

/**
 * Generate cultural analysis for ALL lyric lines in a SINGLE API call
 * Optimized for speed - analyzes entire song at once instead of batching
 * 
 * @param onBatchComplete - Optional callback called when analysis completes, 
 *   allowing progressive saving to database. Receives all results at once.
 */
export async function generateBatchCulturalAnalysis(
  lyrics: Array<{ text: string; lineNumber?: number }>,
  songTitle?: string,
  artistName?: string,
  genre?: string,
  knownLanguage?: string,
  onBatchComplete?: (results: CulturalAnalysisResult[], startIndex: number, originalLines: string[]) => Promise<void>
): Promise<CulturalAnalysisResult[]> {
  const startTime = Date.now();

  if (!isAiConfigured()) {
    console.log("[AI] Batch analysis skipped - no AI provider configured");
    return [];
  }
  
  // Filter out empty lines and very short lines
  const meaningfulLyrics = lyrics.filter(l => l.text.trim().length > 3);
  
  // Analyze up to 30 meaningful lines in ONE call for speed
  const lyricsToAnalyze = meaningfulLyrics.slice(0, 30);
  const allLines = lyricsToAnalyze.map(l => l.text);
  
  if (lyricsToAnalyze.length === 0) {
    return [];
  }
  
  console.log(`⚡ [AI] Analyzing ${lyricsToAnalyze.length} lines in SINGLE API call...`);
  
  try {
    const languageHint = knownLanguage ? `The song is in ${knownLanguage}.` : '';
    const songContext = songTitle && artistName 
      ? `Song: "${songTitle}" by ${artistName}` 
      : '';
    const genreContext = genre ? `Genre: ${genre}` : '';

    const lyricsText = lyricsToAnalyze
      .map((l, idx) => `${idx + 1}. "${l.text}"`)
      .join('\n');

    const prompt = `You are an expert in African music and languages (Yoruba, Igbo, Pidgin, Zulu, Swahili, etc).

${songContext} ${genreContext} ${languageHint}

Analyze ALL these lyric lines concisely:

${lyricsText}

Return JSON with EXACTLY ${lyricsToAnalyze.length} analyses (one per line):
{"analyses": [{"translation": "...", "detectedLanguage": "...", "culturalContext": "1 sentence max", "artistIntent": "1 sentence", "deeperMeaning": "1 sentence", "languageNotes": "", "lyricBreakdown": "word1 (meaning) + word2 (meaning) = full meaning", "slangTerms": [{"term": "slang word", "meaning": "definition", "language": "Pidgin/Yoruba/etc"}]}]}

For lyricBreakdown: break key words/phrases with their meanings like "omo (child) + naija (Nigeria) = Nigerian youth"
For slangTerms: identify 1-2 notable slang/idioms per line. Focus on Pidgin, Yoruba, Igbo words. Be very concise.`;

    const response = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 5000,
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      const results = parsed.analyses || parsed.lyrics || (Array.isArray(parsed) ? parsed : []);
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ [AI] Analyzed ${results.length} lines in ${elapsed}ms (${Math.round(elapsed/results.length)}ms per line)`);
      
      // Call callback with all results at once
      if (onBatchComplete && results.length > 0) {
        await onBatchComplete(results, 0, allLines);
      }
      
      return results;
    }
  } catch (error) {
    console.error(`❌ [AI] Error analyzing lyrics:`, error);
  }
  
  return [];
}

/**
 * Generate streaming cultural analysis for a single lyric line
 * Returns an async generator that yields chunks as they're generated
 * Used for real-time "typing" effect in the UI
 */
export async function* streamSingleLineAnalysis(
  lyricText: string,
  songTitle?: string,
  artistName?: string,
  genre?: string,
  knownLanguage?: string
): AsyncGenerator<{ type: 'chunk' | 'complete' | 'error'; data: string }> {
  const startTime = Date.now();

  if (!isAiConfigured()) {
    yield { type: 'error', data: 'Deeper breakdown is unavailable right now.' };
    return;
  }
  
  if (lyricText.trim().length < 3) {
    yield { type: 'error', data: 'Line too short to analyze' };
    return;
  }
  
  console.log(`🔄 [AI] Streaming analysis for: "${lyricText.substring(0, 40)}..."`);
  
  try {
    const languageHint = knownLanguage ? `The song is in ${knownLanguage}.` : '';
    const songContext = songTitle && artistName 
      ? `Song: "${songTitle}" by ${artistName}` 
      : '';
    const genreContext = genre ? `Genre: ${genre}` : '';

    const prompt = `You are an expert in African music and languages (Yoruba, Igbo, Pidgin, Zulu, Swahili, etc).

${songContext} ${genreContext} ${languageHint}

Analyze this lyric line:
"${lyricText}"

Return JSON:
{"translation": "...", "detectedLanguage": "...", "culturalContext": "1-2 sentences", "artistIntent": "1 sentence", "deeperMeaning": "1 sentence", "languageNotes": "", "lyricBreakdown": "word1 (meaning) + word2 (meaning) = full meaning", "slangTerms": [{"term": "slang word", "meaning": "definition", "language": "Pidgin/Yoruba/etc"}]}

For lyricBreakdown: break key words/phrases with their meanings. Be concise. Focus on notable slang/idioms.`;

    const stream = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      stream: true,
    });

    let fullContent = '';
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        yield { type: 'chunk', data: content };
      }
    }
    
    // Parse and validate the final result
    try {
      const result = JSON.parse(fullContent) as CulturalAnalysisResult;
      const elapsed = Date.now() - startTime;
      console.log(`✅ [AI] Streaming analysis complete in ${elapsed}ms`);
      yield { type: 'complete', data: JSON.stringify(result) };
    } catch (parseError) {
      console.error(`⚠️ [AI] Could not parse streaming result, using raw content`);
      yield { type: 'complete', data: fullContent };
    }
  } catch (error) {
    console.error(`❌ [AI] Error in streaming analysis:`, error);
    yield { type: 'error', data: 'Deeper breakdown is unavailable right now. Please try again shortly.' };
  }
}

// Song DNA for Continuation Engine
export interface SongDNA {
  emotionalTone: string; // "joyful", "nostalgic", "hype", "spiritual", "melancholic", "romantic", "defiant"
  emotionalToneConfidence: number; // 0-1 confidence score
  culturalThemes: string[]; // ["love", "hustle", "celebration", "struggle", "faith", "party"]
  culturalThemeConfidence: number; // 0-1 confidence score (highest theme confidence)
  region: string; // "Nigeria", "West Africa", "South Africa", "East Africa"
  era: string; // "2020s", "2010s", "classic", "90s"
  trivia?: string; // Inline trivia fact about the song/artist
}

/**
 * Extract Song DNA from lyrics analysis for the Continuation Engine
 * This enables "If this resonates, you might also like..." suggestions
 */
export async function extractSongDNA(
  songTitle: string,
  artistName: string,
  lyricsText: string,
  genre?: string,
  releaseYear?: number
): Promise<SongDNA | null> {
  try {
    console.log(`🧬 [AI] Extracting Song DNA for "${songTitle}" by ${artistName}`);
    const startTime = Date.now();

    const prompt = `You are an African music expert. Analyze this song and extract its "DNA" - the emotional and cultural fingerprint.

Song: "${songTitle}" by ${artistName}
${genre ? `Genre: ${genre}` : ''}
${releaseYear ? `Year: ${releaseYear}` : ''}

Lyrics excerpt:
${lyricsText.slice(0, 1500)}

Return JSON with the song's DNA and confidence scores (0.0 to 1.0):
{
  "emotionalTone": "ONE word from: joyful, nostalgic, hype, spiritual, melancholic, romantic, defiant, celebratory, reflective, hopeful",
  "emotionalToneConfidence": 0.85,
  "culturalThemes": ["2-4 themes from: love, hustle, celebration, struggle, faith, party, unity, identity, success, family, street-life, spirituality, romance, social-commentary"],
  "culturalThemeConfidence": 0.75,
  "region": "Primary region: Nigeria, Ghana, South Africa, Kenya, Tanzania, West Africa, East Africa, Southern Africa",
  "era": "Music era: 2020s, 2010s, 2000s, 90s, classic",
  "trivia": "One brief, interesting fact about this song or artist (15 words max). Something fans would love to know."
}

Confidence scoring:
- 0.9-1.0: Very clear, unmistakable signal in lyrics
- 0.7-0.89: Strong signal, high certainty
- 0.5-0.69: Moderate signal, reasonable guess
- Below 0.5: Weak or ambiguous signal

Be accurate and specific. The emotional tone should capture the dominant feeling of the song.`;

    const response = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content) as SongDNA;
    // Ensure confidence scores have defaults
    result.emotionalToneConfidence = result.emotionalToneConfidence || 0.5;
    result.culturalThemeConfidence = result.culturalThemeConfidence || 0.5;
    const elapsed = Date.now() - startTime;
    console.log(`✅ [AI] Song DNA extracted in ${elapsed}ms: ${result.emotionalTone}(${result.emotionalToneConfidence}), themes=${result.culturalThemes.join(',')}(${result.culturalThemeConfidence})`);
    return result;
  } catch (error) {
    console.error("❌ [AI] Error extracting song DNA:", error);
    return null;
  }
}

// X-Ray style artist and song info
export interface ArtistSongInfo {
  artistBio: string;
  artistOrigin: string;
  musicStyle: string;
  songBackground: string;
  albumInfo?: string;
  funFact?: string;
  verification: 'verified' | 'unverified';
  verificationNote?: string;
}

const artistInfoCache = new Map<string, { data: ArtistSongInfo; timestamp: number }>();
const ARTIST_CACHE_TTL = 1000 * 60 * 60; // 1 hour

interface ArtistInfoGenerationOptions {
  spotifyId?: string | null;
  isrc?: string | null;
  confidenceScore?: number | null;
}

const GENERIC_ARTIST_PATTERNS: RegExp[] = [
  /\bvarious\s+artists\b/i,
  /\bunknown\s+artist\b/i,
  /\bafro\s*hits?\b/i,
  /\btop\s*hits?\b/i,
  /\bbest\s*hits?\b/i,
  /\bmusic\b/i,
  /\bsounds?\b/i,
  /\btopic\b/i,
  /\bofficial\b/i,
  /\brecords?\b/i,
  /\bchannel\b/i,
];

const HALLUCINATION_PATTERNS: string[] = [
  'rising star in the african music scene',
  'known for blending traditional african',
  'contemporary beats',
  'dedicated following across the continent',
  'innovative artist known for blending',
];

function looksGenericArtistName(artistName: string): boolean {
  const name = artistName.trim();
  if (!name) return true;
  return GENERIC_ARTIST_PATTERNS.some((pattern) => pattern.test(name));
}

function includesTemplateHallucination(info: ArtistSongInfo): boolean {
  const haystack = `${info.artistBio} ${info.musicStyle} ${info.songBackground}`.toLowerCase();
  return HALLUCINATION_PATTERNS.some((pattern) => haystack.includes(pattern));
}

function buildUnverifiedArtistInfo(
  artistName: string,
  songTitle: string,
  album?: string,
  genre?: string,
  releaseYear?: number
): ArtistSongInfo {
  const genreLabel = genre || 'the detected genre';
  const albumLabel = album ? `The track is linked to "${album}". ` : '';
  const yearLabel = releaseYear ? `Release year detected: ${releaseYear}. ` : '';
  return {
    artistBio: `We never fit verify a trusted public profile for ${artistName} yet, so we dey avoid guessing biography details.`,
    artistOrigin: '',
    musicStyle: `${artistName} is currently shown as connected to ${genreLabel}.`,
    songBackground: `${albumLabel}${yearLabel}"${songTitle}" was recognized from your audio sample, but artist background still needs verification.`,
    albumInfo: album ? `Album: ${album}` : undefined,
    funFact: undefined,
    verification: 'unverified',
    verificationNote: 'Artist profile hidden until we can verify trusted source data.',
  };
}

export function buildUnavailableArtistInfo(
  artistName: string,
  songTitle: string,
  album?: string,
  genre?: string,
  releaseYear?: number
): ArtistSongInfo {
  return buildUnverifiedArtistInfo(artistName, songTitle, album, genre, releaseYear);
}

export async function generateArtistSongInfo(
  artistName: string,
  songTitle: string,
  album?: string,
  genre?: string,
  releaseYear?: number,
  options?: ArtistInfoGenerationOptions
): Promise<ArtistSongInfo | null> {
  if (!isAiConfigured()) {
    return buildUnverifiedArtistInfo(artistName, songTitle, album, genre, releaseYear);
  }

  try {
    const cacheKey = `${artistName.toLowerCase()}|${songTitle.toLowerCase()}|${options?.spotifyId || ''}|${options?.isrc || ''}`;
    const cached = artistInfoCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ARTIST_CACHE_TTL) {
      console.log(`[AI] X-Ray cache hit for ${artistName} - ${songTitle}`);
      return cached.data;
    }

    const noTrustedMetadata = !(options?.spotifyId || options?.isrc);
    const genericArtistName = looksGenericArtistName(artistName);
    const lowConfidence = typeof options?.confidenceScore === 'number' && options.confidenceScore < 75;

    if (genericArtistName || (noTrustedMetadata && lowConfidence)) {
      const safeInfo = buildUnverifiedArtistInfo(artistName, songTitle, album, genre, releaseYear);
      artistInfoCache.set(cacheKey, { data: safeInfo, timestamp: Date.now() });
      return safeInfo;
    }

    console.log(`[AI] Generating X-Ray info for ${artistName} - ${songTitle}`);
    const startTime = Date.now();

    const prompt = `African music expert. Provide only verified-safe info. Never invent facts.
Artist: ${artistName}, Song: ${songTitle}${album ? `, Album: ${album}` : ''}${genre ? `, Genre: ${genre}` : ''}${releaseYear ? `, Year: ${releaseYear}` : ''}

Rules:
- If a fact is not confidently known, say "Not publicly verified yet."
- Do not guess birthplace, awards, career history, or discography.
- Keep it concise and factual.

JSON: {"artistBio":"2 sentences","artistOrigin":"city, country or empty","musicStyle":"1 sentence","songBackground":"2 sentences","albumInfo":"1 sentence or null","funFact":"1 sentence or null","verification":"verified"|"unverified","verificationNote":"short note when unverified or empty"}`;

    const response = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content) as Partial<ArtistSongInfo>;
    const result: ArtistSongInfo = {
      artistBio: parsed.artistBio || `We no fit verify public profile details for ${artistName} yet.`,
      artistOrigin: parsed.artistOrigin || '',
      musicStyle: parsed.musicStyle || `${artistName} appears in this recognition result for "${songTitle}".`,
      songBackground: parsed.songBackground || `Recognition linked this sample to "${songTitle}".`,
      albumInfo: parsed.albumInfo || undefined,
      funFact: parsed.funFact || undefined,
      verification: parsed.verification === 'verified' ? 'verified' : 'unverified',
      verificationNote: parsed.verificationNote || undefined,
    };

    if (includesTemplateHallucination(result)) {
      const safeInfo = buildUnverifiedArtistInfo(artistName, songTitle, album, genre, releaseYear);
      artistInfoCache.set(cacheKey, { data: safeInfo, timestamp: Date.now() });
      return safeInfo;
    }

    const elapsed = Date.now() - startTime;
    console.log(`[AI] X-Ray info generated in ${elapsed}ms`);

    artistInfoCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  } catch (error) {
    console.error('[AI] Error generating artist/song info:', error);
    return null;
  }
}

/**
 * Fragment Interpretation Mode
 * When full lyrics aren't available, interpret the song title and any detected phrases
 * Returns cultural interpretation based on title, artist, and context
 */
export interface FragmentInterpretation {
  titleMeaning?: string;
  detectedPhrases: Array<{
    phrase: string;
    meaning: string;
    culturalContext: string;
    emotionalIntent: string;
  }>;
  likelyThemes: string[];
  culturalNote: string;
}

const fragmentCache = new Map<string, { data: FragmentInterpretation; timestamp: number }>();

export function buildUnavailableFragmentInterpretation(
  songTitle: string,
  artistName: string,
  genre?: string,
  region?: string
): FragmentInterpretation {
  const matchedPhrases = findMatchingPhrases(`${songTitle} ${artistName}`);

  return {
    titleMeaning: matchedPhrases[0]
      ? `"${songTitle}" includes "${matchedPhrases[0].phrase}", which usually means ${matchedPhrases[0].meaning}.`
      : undefined,
    detectedPhrases: matchedPhrases.map((phrase) => ({
      phrase: phrase.phrase,
      meaning: phrase.meaning,
      culturalContext: phrase.culturalUsage,
      emotionalIntent: phrase.emotionalIntent,
    })),
    likelyThemes: [genre, region].filter((value): value is string => Boolean(value && value.trim().length > 0)),
    culturalNote:
      matchedPhrases.length > 0
        ? "We recognized the song and matched a few known phrases, but deeper title breakdown is unavailable right now."
        : "We recognized the song, but deeper title breakdown is unavailable right now.",
  };
}

export async function generateFragmentInterpretation(
  songTitle: string,
  artistName: string,
  genre?: string,
  region?: string
): Promise<FragmentInterpretation | null> {
  if (!isAiConfigured()) {
    return buildUnavailableFragmentInterpretation(songTitle, artistName, genre, region);
  }

  try {
    const fragCacheKey = `${songTitle.toLowerCase()}|${artistName.toLowerCase()}`;
    const cachedFrag = fragmentCache.get(fragCacheKey);
    if (cachedFrag && Date.now() - cachedFrag.timestamp < ARTIST_CACHE_TTL) {
      console.log(`⚡ [AI] Fragment interpretation cache hit for ${songTitle}`);
      return cachedFrag.data;
    }
    
    const startTime = Date.now();
    console.log(`🔍 [AI] Fragment interpretation for: "${songTitle}" by ${artistName}...`);

    // First, check for matching phrases from our Nigerian Pidgin dataset
    const combinedText = `${songTitle} ${artistName}`;
    const matchedPhrases = findMatchingPhrases(combinedText);
    
    // Format matched phrases for the prompt
    const matchedPhrasesInfo = matchedPhrases.length > 0
      ? `\n\nWe found these known Nigerian phrases in the title/artist:\n${matchedPhrases.map(p => 
          `- "${p.phrase}": ${p.meaning} (${p.emotionalIntent})`
        ).join('\n')}`
      : '';

    const prompt = `You are an expert in Nigerian and African music languages (Pidgin English, Yoruba, Igbo, Hausa, Zulu, Swahili).

Song: "${songTitle}" by ${artistName}
${genre ? `Genre: ${genre}` : ''}
${region ? `Region: ${region}` : ''}
${matchedPhrasesInfo}

Even without full lyrics, interpret what this song might be about based on:
1. The song title - what does it mean? (especially if in Pidgin, Yoruba, Igbo, etc.)
2. Any recognizable Nigerian/African phrases in the title
3. Common themes from this artist/genre

Return JSON:
{
  "titleMeaning": "What the song title means in English (if not already English). Include language origin.",
  "detectedPhrases": [
    {
      "phrase": "Nigerian/African phrase found in title",
      "meaning": "What it literally means",
      "culturalContext": "How it's used in music/culture",
      "emotionalIntent": "The feeling/vibe it conveys"
    }
  ],
  "likelyThemes": ["theme1", "theme2", "theme3"],
  "culturalNote": "1-2 sentences about what this type of song typically expresses in Nigerian/African music culture"
}

${matchedPhrases.length > 0 ? 'Include the matched phrases above in detectedPhrases with their provided meanings.' : ''}
If the title is already clear English with no African phrases, still provide culturalNote about the artist's style. Keep responses concise.`;

    const response = await getOpenAIClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    let result = JSON.parse(content) as FragmentInterpretation;
    
    // Always merge matched phrases from dataset (deterministic) - dedupe by phrase
    if (matchedPhrases.length > 0) {
      const existingPhrases = new Set((result.detectedPhrases || []).map(p => p.phrase.toLowerCase()));
      const datasetPhrases = matchedPhrases
        .filter(p => !existingPhrases.has(p.phrase.toLowerCase()))
        .map(p => ({
          phrase: p.phrase,
          meaning: p.meaning,
          culturalContext: p.culturalUsage,
          emotionalIntent: p.emotionalIntent
        }));
      
      // Prepend dataset phrases (they're verified), then AI phrases
      result.detectedPhrases = [...datasetPhrases, ...(result.detectedPhrases || [])];
    }
    
    // Ensure detectedPhrases is always an array
    if (!result.detectedPhrases) {
      result.detectedPhrases = [];
    }
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ [AI] Fragment interpretation generated in ${elapsed}ms (${matchedPhrases.length} dataset matches)`);
    
    fragmentCache.set(fragCacheKey, { data: result, timestamp: Date.now() });
    
    return result;
  } catch (error) {
    console.error("❌ [AI] Error generating fragment interpretation:", error);
    return null;
  }
}

