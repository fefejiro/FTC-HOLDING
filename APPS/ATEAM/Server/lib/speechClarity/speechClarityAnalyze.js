export function createSpeechClarityAnalyze() {
  const FILLER_WORDS = [
    "um",
    "uh",
    "like",
    "you know",
    "basically",
    "actually",
    "sort of",
    "kind of",
    "right",
    "yeah"
  ];

  const TARGET_WORDS_WITH_FINALS = [
    { word: "photosynthesis", final: "s" },
    { word: "consonants", final: "s" },
    { word: "tests", final: "s" },
    { word: "consistency", final: "y" },
    { word: "completeness", final: "s" }
  ];

  const WORD_ENDING_CONSONANTS = ["s", "t", "k", "p", "d", "g", "z", "th"];

  function countWords(text) {
    return String(text || "").trim().split(/\s+/).filter(Boolean).length;
  }

  function detectFillers(transcript) {
    const text = String(transcript || "").toLowerCase();
    const fillerCount = {};
    let totalCount = 0;

    for (const filler of FILLER_WORDS) {
      const regex = new RegExp(`\\b${filler}\\b`, "gi");
      const matches = text.match(regex) || [];
      if (matches.length > 0) {
        fillerCount[filler] = matches.length;
        totalCount += matches.length;
      }
    }

    return {
      fillerCount: totalCount,
      fillerDensityPer100: countWords(text) > 0 ? Math.round((totalCount / countWords(text)) * 100) : 0,
      topFillers: Object.entries(fillerCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([word, count]) => ({ word, count }))
    };
  }

  function calculateWpm(wordCount, durationSeconds) {
    if (!durationSeconds || durationSeconds <= 0) return null;
    const minutes = durationSeconds / 60;
    return Math.round(wordCount / minutes);
  }

  function detectFlaggedEndings(transcript) {
    const text = String(transcript || "").toLowerCase();
    const words = text.split(/\s+/).filter(Boolean);

    const flaggedEndings = {};
    const examples = [];

    for (const { word, final } of TARGET_WORDS_WITH_FINALS) {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      const matches = text.match(regex) || [];
      if (matches.length > 0) {
        flaggedEndings[word] = matches.length;
        examples.push(word);
      }
    }

    // Heuristic: check for missing plural 's
    const pluralMissCount = (text.match(/\bword\b(?!s)/g) || []).length;

    const totalFlaggedWords = Object.values(flaggedEndings).reduce((sum, count) => sum + count, 0);

    return {
      flaggedEndingsCount: totalFlaggedWords + pluralMissCount,
      flaggedEndingsExamples: examples.slice(0, 4),
      pluralMissingCount: pluralMissCount
    };
  }

  function generateDrills(transcript, fillerStats) {
    const drills = [];
    const topFiller = fillerStats.topFillers?.[0]?.word || null;

    // Drill 1: Final "s" release
    drills.push({
      id: "drill_final_s",
      title: "Final 's' Release",
      description: "Practice clear final 's' sounds",
      words: ["hiss", "miss", "kiss", "sis"],
      target: "photosynthesis",
      targetGuide: "phuh-toh-SIN-thuh-sis (with exaggerated 'sss')",
      duration: "2-3 min"
    });

    // Drill 2: Pencil vowel reduction
    drills.push({
      id: "drill_pencil_vowel",
      title: "Vowel Reduction: Pencil",
      description: "Master the schwa sound in unstressed syllables",
      pattern: "/ˈpen.səl/",
      pronunciation: "PEN-suhl (not PEN-seal)",
      targetSentence: "Pass me the pencil.",
      duration: "1-2 min"
    });

    // Drill 3: Minimal pair
    drills.push({
      id: "drill_minimal_pair",
      title: "Minimal Pair: Cloud vs Claude",
      description: "Distinguish similar sounds",
      pair: ["cloud", "Claude"],
      guide: "Notice the subtle difference in articulation",
      duration: "1 min"
    });

    // Drill 4: Sentence ending clarity
    drills.push({
      id: "drill_sentence_ending",
      title: "Sentence Ending Clarity",
      description: "Pronounce final consonant clusters",
      sentence: "I consistently complete my consonants.",
      focus: "Final 'ts' in 'consonants' and 'complete'",
      duration: "2 min"
    });

    return drills;
  }

  function analyzeTranscript(transcript, durationSeconds = null) {
    const wordCount = countWords(transcript);
    const fillerStats = detectFillers(transcript);
    const endingStats = detectFlaggedEndings(transcript);
    const wpm = calculateWpm(wordCount, durationSeconds);

    const metrics = {
      wordCount,
      wpm,
      fillerCount: fillerStats.fillerCount,
      fillerDensityPer100: fillerStats.fillerDensityPer100,
      topFillers: fillerStats.topFillers,
      flaggedEndingsCount: endingStats.flaggedEndingsCount,
      flaggedEndingsExamples: endingStats.flaggedEndingsExamples
    };

    const drills = generateDrills(transcript, fillerStats);

    return {
      metrics,
      drills
    };
  }

  return {
    analyzeTranscript
  };
}
