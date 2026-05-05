import { findMatchingPhrases, type NigerianPhrase } from "./nigerian-phrases";

export interface GlossarySlangTerm {
  term: string;
  meaning: string;
  language: string;
}

export interface GlossaryAnalysisResult {
  translation: string;
  detectedLanguage?: string;
  culturalContext: string;
  artistIntent: string;
  deeperMeaning: string;
  languageNotes?: string;
  lyricBreakdown?: string;
  slangTerms?: GlossarySlangTerm[];
}

export interface GlossaryLyricAnalysisRecord extends Omit<GlossaryAnalysisResult, 'slangTerms'> {
  id: string;
  originalText: string;
  slangTerms: string | null;
  upvotes: number;
  downvotes: number;
}

interface PhraseMatch {
  phrase: NigerianPhrase;
  matchedText: string;
  index: number;
}

function isBoundaryCharacter(char: string | undefined): boolean {
  return !char || /[^a-z0-9]/i.test(char);
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function inferPhraseLanguage(phrase: NigerianPhrase): string {
  const combined = `${phrase.meaning} ${phrase.culturalUsage}`.toLowerCase();
  if (combined.includes("yoruba")) return "Yoruba";
  if (combined.includes("igbo")) return "Igbo";
  if (combined.includes("pidgin")) return "Nigerian Pidgin";
  return "Nigerian phrase";
}

function getDisplayMeaning(phrase: NigerianPhrase): string {
  return phrase.meaning.replace(/\s*\([^)]*\)/g, "").trim();
}

function findPhraseMatchesInText(text: string): PhraseMatch[] {
  const lowerText = text.toLowerCase();
  const matches: PhraseMatch[] = [];

  for (const phrase of findMatchingPhrases(text)) {
    const candidates = [phrase.phrase, ...(phrase.variations || [])];

    for (const candidate of candidates) {
      const lowerCandidate = candidate.toLowerCase();
      let searchFrom = 0;

      while (searchFrom < lowerText.length) {
        const index = lowerText.indexOf(lowerCandidate, searchFrom);
        if (index === -1) {
          break;
        }

        const before = lowerText[index - 1];
        const after = lowerText[index + lowerCandidate.length];
        if (isBoundaryCharacter(before) && isBoundaryCharacter(after)) {
          matches.push({
            phrase,
            matchedText: text.slice(index, index + lowerCandidate.length),
            index,
          });
        }

        searchFrom = index + lowerCandidate.length;
      }
    }
  }

  matches.sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index;
    return b.matchedText.length - a.matchedText.length;
  });

  const deduped: PhraseMatch[] = [];
  let lastCoveredIndex = -1;

  for (const match of matches) {
    if (match.index < lastCoveredIndex) {
      continue;
    }

    const duplicate = deduped.some(
      (existing) =>
        existing.index === match.index &&
        existing.matchedText.toLowerCase() === match.matchedText.toLowerCase(),
    );
    if (duplicate) {
      continue;
    }

    deduped.push(match);
    lastCoveredIndex = match.index + match.matchedText.length;
  }

  return deduped;
}

function buildReplacementTranslation(text: string, matches: PhraseMatch[]): string {
  let cursor = 0;
  let containsUnknownWords = false;
  let translated = "";

  for (const match of matches) {
    const between = text.slice(cursor, match.index);
    if (/[A-Za-z\u00C0-\u024F]/.test(between)) {
      containsUnknownWords = true;
    }

    translated += between;
    translated += getDisplayMeaning(match.phrase);
    cursor = match.index + match.matchedText.length;
  }

  const trailing = text.slice(cursor);
  if (/[A-Za-z\u00C0-\u024F]/.test(trailing)) {
    containsUnknownWords = true;
  }
  translated += trailing;

  const normalized = normalizeWhitespace(translated.replace(/\s+([,.;:!?])/g, "$1"));
  if (!containsUnknownWords) {
    return normalized;
  }

  const summaries = matches.map(
    (match) => `"${match.matchedText}" = ${getDisplayMeaning(match.phrase)}`,
  );
  return `Known phrase${summaries.length > 1 ? "s" : ""}: ${summaries.join("; ")}`;
}

function buildCulturalContext(matches: PhraseMatch[]): string {
  const usages = Array.from(
    new Set(matches.map((match) => match.phrase.culturalUsage.trim()).filter(Boolean)),
  );

  if (usages.length === 0) {
    return "This line leans on recognizable Nigerian slang and local phrasing.";
  }

  if (usages.length === 1) {
    return usages[0];
  }

  return `${usages[0]} Also, ${usages[1].charAt(0).toLowerCase()}${usages[1].slice(1)}`;
}

function buildArtistIntent(matches: PhraseMatch[]): string {
  const intents = Array.from(
    new Set(matches.map((match) => match.phrase.emotionalIntent.trim()).filter(Boolean)),
  );

  if (intents.length === 0) {
    return "The line carries a strong local vibe with everyday street-language confidence.";
  }

  if (intents.length === 1) {
    return `The line carries a ${intents[0].toLowerCase()} energy.`;
  }

  return `The line blends ${intents
    .slice(0, 2)
    .map((intent) => intent.toLowerCase())
    .join(" and ")} energy.`;
}

function buildGlossaryDeeperMeaning(matches: PhraseMatch[]): string {
  const leadMatch = matches[0];
  const leadMeaning = getDisplayMeaning(leadMatch.phrase).toLowerCase();
  const leadIntent = leadMatch.phrase.emotionalIntent.trim().toLowerCase();

  if (matches.length === 1) {
    return `"${leadMatch.matchedText}" anchors the line in ${leadMeaning}, giving it a clear ${leadIntent || "streetwise"} pulse.`;
  }

  const phraseList = matches
    .slice(0, 2)
    .map((match) => `"${match.matchedText}"`)
    .join(" and ");

  return `${phraseList} turn the line into a compact flex of local meaning, attitude, and street-level emotion.`;
}

function buildGlossaryLanguageNotes(matches: PhraseMatch[]): string {
  const detectedLanguage = buildDetectedLanguage(matches);
  if (!detectedLanguage) {
    return "Rooted in Nigerian street phrasing.";
  }

  return `Rooted in ${detectedLanguage} phrasing and everyday expression.`;
}

function buildDetectedLanguage(matches: PhraseMatch[]): string | undefined {
  const languages = Array.from(
    new Set(matches.map((match) => inferPhraseLanguage(match.phrase))),
  );

  if (languages.length === 0) return undefined;
  if (languages.length === 1) return languages[0];
  return languages.join(" / ");
}

export function buildGlossaryLineAnalysis(
  lyricText: string,
): GlossaryAnalysisResult | null {
  const trimmed = lyricText.trim();
  if (trimmed.length < 2) {
    return null;
  }

  const matches = findPhraseMatchesInText(trimmed);
  if (matches.length === 0) {
    return null;
  }

  const slangTerms = Array.from(
    new Map(
      matches.map((match) => {
        const slangTerm: GlossarySlangTerm = {
          term: match.matchedText,
          meaning: getDisplayMeaning(match.phrase),
          language: inferPhraseLanguage(match.phrase),
        };
        return [`${slangTerm.term.toLowerCase()}|${slangTerm.meaning.toLowerCase()}`, slangTerm];
      }),
    ).values(),
  );

  return {
    translation: buildReplacementTranslation(trimmed, matches),
    detectedLanguage: buildDetectedLanguage(matches),
    culturalContext: buildCulturalContext(matches),
    artistIntent: buildArtistIntent(matches),
    deeperMeaning: buildGlossaryDeeperMeaning(matches),
    languageNotes: buildGlossaryLanguageNotes(matches),
    lyricBreakdown: matches
      .map((match) => `${match.matchedText} (${getDisplayMeaning(match.phrase)})`)
      .join(" + "),
    slangTerms,
  };
}

export function buildBestEffortLineAnalysis(
  lyricText: string,
  metadata?: {
    songTitle?: string;
    artistName?: string;
    genre?: string;
    language?: string;
  },
): GlossaryAnalysisResult | null {
  const glossaryMatch = buildGlossaryLineAnalysis(lyricText);
  if (glossaryMatch) {
    return glossaryMatch;
  }

  const trimmed = lyricText.trim();
  if (trimmed.length < 2) {
    return null;
  }

  const songTitle = metadata?.songTitle?.trim();
  const artistName = metadata?.artistName?.trim();
  const genre = metadata?.genre?.trim();
  const language = metadata?.language?.trim();
  const hasLikelyAfricanLanguageMarkers = /[à-ÿ]|[\u0180-\u024f]/i.test(trimmed);
  const hasQuotedPhrase = /["'“”]/.test(trimmed);

  const contextLead =
    songTitle && artistName
      ? `This line sits inside "${songTitle}" by ${artistName}.`
      : artistName
        ? `This line lands as part of ${artistName}'s vocal phrasing.`
        : `This line carries the emotional point of the section directly.`;

  return {
    translation: trimmed,
    detectedLanguage: language || (hasLikelyAfricanLanguageMarkers ? "Likely mixed local phrasing" : undefined),
    culturalContext: genre
      ? `${contextLead} It reads more like a direct ${genre.toLowerCase()} mood line than a slang-heavy phrase, so the meaning comes through tone and delivery more than a coded expression.`
      : `${contextLead} It reads more like a direct mood line than a slang-heavy phrase, so the meaning comes through tone and delivery more than a coded expression.`,
    artistIntent: hasQuotedPhrase
      ? `The artist is landing a clear emotional or memorable phrase here rather than hiding the point behind heavy slang.`
      : `The artist is reinforcing the feeling of the moment here in a straightforward way.`,
    deeperMeaning: songTitle
      ? `This line helps ${songTitle} hold its emotional center in this section, even when there is no strong slang or proverb to unpack.`
      : `This line helps hold the emotional center of the moment, even when there is no strong slang or proverb to unpack.`,
    languageNotes:
      language || hasLikelyAfricanLanguageMarkers
        ? `The wording may still carry accent, cadence, or local phrasing that matters in performance even when the line reads plainly on the page.`
        : `This line appears fairly direct, so performance and tone likely carry more of the nuance than coded vocabulary.`,
  };
}

export function buildGlossaryAnalysesFromLyrics(
  lyricsText: string,
): GlossaryLyricAnalysisRecord[] {
  const lines = lyricsText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 1);

  return lines.flatMap((line, index) => {
    const analysis = buildGlossaryLineAnalysis(line);
    if (!analysis) {
      return [];
    }

    return [
      {
        id: `fallback-${index}`,
        originalText: line,
        translation: analysis.translation,
        culturalContext: analysis.culturalContext,
        artistIntent: analysis.artistIntent,
        deeperMeaning: analysis.deeperMeaning,
        languageNotes: analysis.languageNotes,
        lyricBreakdown: analysis.lyricBreakdown,
        detectedLanguage: analysis.detectedLanguage,
        slangTerms:
          analysis.slangTerms && analysis.slangTerms.length > 0
            ? JSON.stringify(analysis.slangTerms)
            : null,
        upvotes: 0,
        downvotes: 0,
      },
    ];
  });
}

export function buildStreamingGlossaryPayload(
  lyricText: string,
): string | null {
  const analysis = buildGlossaryLineAnalysis(lyricText);
  if (!analysis) {
    return null;
  }

  return JSON.stringify(analysis);
}
