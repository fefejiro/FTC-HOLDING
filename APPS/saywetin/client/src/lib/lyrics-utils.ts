export interface SlangTerm {
  term: string;
  meaning: string;
  language: string;
}

export interface LyricBlock {
  id: string;
  lines: string[];
  type: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'unknown';
  startIndex: number;
  endIndex: number;
  isRepeated: boolean;
}

export interface LyricAnalysis {
  id: string;
  originalText: string;
  translation: string;
  culturalContext?: string;
  artistIntent?: string;
  deeperMeaning?: string;
  languageNotes?: string;
  lyricBreakdown?: string;
  detectedLanguage?: string;
  slangTerms?: SlangTerm[];
  upvotes: number;
  downvotes: number;
  originalIndex?: number;
}

export interface LyricBlockWithAnalysis extends LyricBlock {
  analyses: LyricAnalysis[];
}

export function parseSlangTerms(slangTermsJson: string | null | undefined): SlangTerm[] {
  if (!slangTermsJson) return [];
  try {
    const parsed = JSON.parse(slangTermsJson);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is SlangTerm =>
          item && typeof item.term === 'string' && typeof item.meaning === 'string'
      );
    }
    return [];
  } catch {
    return [];
  }
}

export function detectLyricBlocks(lyricsText: string): LyricBlock[] {
  const lines = lyricsText.split('\n');
  const blocks: LyricBlock[] = [];
  let currentBlock: string[] = [];
  let startIndex = 0;
  let blockId = 0;

  const lineSignatures = new Map<string, number>();
  
  lines.forEach((line, idx) => {
    const normalizedLine = line.trim().toLowerCase().replace(/[^\w\s]/g, '');
    if (normalizedLine.length > 10) {
      lineSignatures.set(normalizedLine, (lineSignatures.get(normalizedLine) || 0) + 1);
    }
  });

  const isEmptyLine = (line: string) => line.trim() === '';
  
  lines.forEach((line, idx) => {
    if (isEmptyLine(line) && currentBlock.length > 0) {
      const blockContent = currentBlock.join('\n').trim();
      if (blockContent.length > 0) {
        const hasRepeatedLines = currentBlock.some(l => {
          const normalized = l.trim().toLowerCase().replace(/[^\w\s]/g, '');
          return normalized.length > 10 && (lineSignatures.get(normalized) || 0) > 2;
        });

        blocks.push({
          id: `block-${blockId++}`,
          lines: [...currentBlock],
          type: hasRepeatedLines ? 'chorus' : 'verse',
          startIndex,
          endIndex: idx - 1,
          isRepeated: hasRepeatedLines,
        });
      }
      currentBlock = [];
      startIndex = idx + 1;
    } else if (!isEmptyLine(line)) {
      currentBlock.push(line);
    }
  });

  if (currentBlock.length > 0) {
    const hasRepeatedLines = currentBlock.some(l => {
      const normalized = l.trim().toLowerCase().replace(/[^\w\s]/g, '');
      return normalized.length > 10 && (lineSignatures.get(normalized) || 0) > 2;
    });

    blocks.push({
      id: `block-${blockId++}`,
      lines: [...currentBlock],
      type: hasRepeatedLines ? 'chorus' : 'verse',
      startIndex,
      endIndex: lines.length - 1,
      isRepeated: hasRepeatedLines,
    });
  }

  if (blocks.length === 0 && lines.length > 0) {
    const nonEmptyLines = lines.filter(l => l.trim());
    const chunkSize = Math.ceil(nonEmptyLines.length / Math.max(1, Math.ceil(nonEmptyLines.length / 8)));
    
    for (let i = 0; i < nonEmptyLines.length; i += chunkSize) {
      const chunk = nonEmptyLines.slice(i, i + chunkSize);
      blocks.push({
        id: `block-${blockId++}`,
        lines: chunk,
        type: 'verse',
        startIndex: i,
        endIndex: Math.min(i + chunkSize - 1, nonEmptyLines.length - 1),
        isRepeated: false,
      });
    }
  }

  return blocks;
}

export function calculateCurrentBlock(
  blocks: LyricBlock[],
  playOffsetMs: number | undefined,
  trackDurationMs: number | undefined
): number {
  if (!playOffsetMs || !trackDurationMs || blocks.length === 0) {
    return 0;
  }

  const progress = Math.min(1, Math.max(0, playOffsetMs / trackDurationMs));
  
  const totalLines = blocks.reduce((sum, b) => sum + b.lines.length, 0);
  const targetLine = Math.floor(progress * totalLines);
  
  let lineCount = 0;
  for (let i = 0; i < blocks.length; i++) {
    lineCount += blocks[i].lines.length;
    if (lineCount > targetLine) {
      return i;
    }
  }
  
  return blocks.length - 1;
}

export function prioritizeBlocks(
  blocks: LyricBlockWithAnalysis[],
  currentBlockIndex: number
): LyricBlockWithAnalysis[] {
  if (blocks.length === 0 || currentBlockIndex < 0) {
    return blocks;
  }

  const currentBlock = blocks[currentBlockIndex];
  const remainingBlocks = blocks.filter((_, i) => i !== currentBlockIndex);
  
  return [currentBlock, ...remainingBlocks];
}

export function getAdaptiveBlockCount(
  trackDurationMs: number | undefined,
  totalBlocks: number
): number {
  if (!trackDurationMs) {
    return Math.min(3, totalBlocks);
  }

  const durationSeconds = trackDurationMs / 1000;
  
  if (durationSeconds < 120) {
    return Math.min(2, totalBlocks);
  } else if (durationSeconds < 240) {
    return Math.min(3, totalBlocks);
  } else if (durationSeconds < 360) {
    return Math.min(4, totalBlocks);
  } else {
    return Math.min(5, totalBlocks);
  }
}

export function parseAnalysesWithSlang(
  analyses: Array<{
    id: string;
    originalText: string;
    translation: string;
    culturalContext?: string;
    artistIntent?: string;
    deeperMeaning?: string;
    languageNotes?: string;
    detectedLanguage?: string;
    slangTerms?: string | null;
    upvotes: number;
    downvotes: number;
  }>
): LyricAnalysis[] {
  return analyses.map((a, idx) => ({
    ...a,
    slangTerms: parseSlangTerms(a.slangTerms),
    originalIndex: idx,
  }));
}

function normalizeLyricLine(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function getBlockLabel(blockType: LyricBlock["type"], blockIndex: number): string {
  if (blockType === "chorus") return "Chorus";
  if (blockType === "bridge") return "Bridge";
  if (blockType === "intro") return "Intro";
  if (blockType === "outro") return "Outro";
  return `Verse ${blockIndex + 1}`;
}

export interface OrderedLyricLine {
  key: string;
  text: string;
  lineIndex: number;
  blockIndex: number;
  blockType: LyricBlock["type"];
  blockLabel: string;
  analysis?: LyricAnalysis;
}

export function buildOrderedLyricLines(
  lyricsText: string,
  analyses: LyricAnalysis[],
): OrderedLyricLine[] {
  const blocks = detectLyricBlocks(lyricsText);
  if (blocks.length === 0) {
    return [];
  }

  const availableAnalyses = analyses.map((analysis, index) => ({
    index,
    normalized: normalizeLyricLine(analysis.originalText),
    analysis,
  }));
  const usedAnalyses = new Set<number>();

  let lineIndex = 0;

  return blocks.flatMap((block, blockIndex) =>
    block.lines
      .map((line) => line.trim())
      .filter((line) => line.length > 3)
      .map((line) => {
        const normalizedLine = normalizeLyricLine(line);
        const matchedAnalysis = availableAnalyses.find((candidate) => {
          if (usedAnalyses.has(candidate.index)) return false;
          return candidate.normalized === normalizedLine;
        });

        if (matchedAnalysis) {
          usedAnalyses.add(matchedAnalysis.index);
        }

        const orderedLine: OrderedLyricLine = {
          key: `${lineIndex}-${normalizedLine || "line"}`,
          text: line,
          lineIndex,
          blockIndex,
          blockType: block.type,
          blockLabel: getBlockLabel(block.type, blockIndex),
          analysis: matchedAnalysis?.analysis,
        };

        lineIndex += 1;
        return orderedLine;
      }),
  );
}

export function estimateMomentLineIndex(
  totalLines: number,
  playOffsetMs: number | undefined,
  trackDurationMs: number | undefined,
): number | null {
  if (!playOffsetMs || !trackDurationMs || trackDurationMs <= 0 || totalLines <= 0) {
    return null;
  }

  const progress = Math.min(1, Math.max(0, playOffsetMs / trackDurationMs));
  return Math.min(totalLines - 1, Math.floor(progress * totalLines));
}

export type TrackMatchConfidence = "high" | "medium" | "low";
export type PhraseAlignmentConfidence = "high" | "low";
export type PhraseCaptureKind = "exact_match" | "instrumental" | "no_clear_lyric";

export interface PhraseCaptureModel {
  kind: PhraseCaptureKind;
  title: string;
  description: string;
  helper: string;
  trackMatchConfidence: TrackMatchConfidence;
  alignmentConfidence: PhraseAlignmentConfidence;
  sectionLabel?: string;
  highlightedLineIndexes: number[];
  anchoredLineIndex?: number;
}

function getTrackMatchConfidence(confidenceScore?: number): TrackMatchConfidence {
  if (typeof confidenceScore !== "number") {
    return "medium";
  }

  if (confidenceScore >= 85) return "high";
  if (confidenceScore >= 70) return "medium";
  return "low";
}

function getApproximateSectionLabel(
  playOffsetMs: number | undefined,
  trackDurationMs: number | undefined,
): string | undefined {
  if (!playOffsetMs || !trackDurationMs || trackDurationMs <= 0) {
    return undefined;
  }

  const progress = Math.min(1, Math.max(0, playOffsetMs / trackDurationMs));

  if (progress < 0.18) return "Closest match from the opening section";
  if (progress < 0.4) return "Closest match from the early section";
  if (progress < 0.65) return "Closest match from the middle section";
  if (progress < 0.85) return "Closest match from the later section";
  return "Closest match from the closing section";
}

export function buildPhraseCaptureModel(
  orderedLines: OrderedLyricLine[],
  playOffsetMs: number | undefined,
  trackDurationMs: number | undefined,
  confidenceScore?: number,
): PhraseCaptureModel {
  const trackMatchConfidence = getTrackMatchConfidence(confidenceScore);
  const estimatedIndex = estimateMomentLineIndex(orderedLines.length, playOffsetMs, trackDurationMs);
  const sectionLabel = getApproximateSectionLabel(playOffsetMs, trackDurationMs);

  if (estimatedIndex === null || orderedLines.length === 0) {
    return {
      kind: "no_clear_lyric",
      title: "No clear lyric captured yet",
      description:
        "We matched the song, but we cannot honestly lock this listen to one exact lyric line yet.",
      helper: "Try again during a clearer vocal moment for a tighter lyric match.",
      trackMatchConfidence,
      alignmentConfidence: "low",
      highlightedLineIndexes: [],
    };
  }

  const startIndex = Math.max(0, estimatedIndex - 1);
  const endIndex = Math.min(orderedLines.length, estimatedIndex + 2);
  const highlightedLines = orderedLines.slice(startIndex, endIndex);
  const highlightedLineIndexes = highlightedLines.map((line) => line.lineIndex);
  const anchoredLine = orderedLines[estimatedIndex];
  const analyzedCount = highlightedLines.filter((line) => line.analysis).length;
  const hasAnchoredLyricAnalysis = Boolean(anchoredLine?.analysis);
  const hasExactLyricAnchor =
    hasAnchoredLyricAnalysis &&
    analyzedCount >= 2 &&
    trackMatchConfidence === "high";

  if (hasExactLyricAnchor) {
    return {
      kind: "exact_match",
      title: "Exact lyric captured",
      description:
        "The song and vocal moment are both locked tightly enough to show one specific lyric line.",
      helper: "You can open the full lyrics below for more context around this line.",
      trackMatchConfidence,
      alignmentConfidence: "high",
      sectionLabel,
      highlightedLineIndexes,
      anchoredLineIndex: anchoredLine.lineIndex,
    };
  }

  if (analyzedCount === 0) {
    return {
      kind: "instrumental",
      title: "No clear vocal line locked yet",
      description:
        "This part of the song sounds instrumental or too loose for exact lyric timing, so we are not pretending to hear words that are not clearly there.",
      helper: "Try another listen when the vocals are clearer and we will narrow it down.",
      trackMatchConfidence,
      alignmentConfidence: "low",
      sectionLabel,
      highlightedLineIndexes,
    };
  }

  return {
    kind: "no_clear_lyric",
    title: "No clear lyric captured yet",
    description:
      "We matched the song, but this listen does not support one exact lyric line strongly enough yet.",
    helper: "Try again during a clearer vocal line for a more trustworthy lyric lock.",
    trackMatchConfidence,
    alignmentConfidence: "low",
    sectionLabel,
    highlightedLineIndexes,
  };
}

export function calculateYouWereHereIndex(
  totalAnalyses: number,
  playOffsetMs: number | undefined,
  trackDurationMs: number | undefined
): number {
  if (!playOffsetMs || !trackDurationMs || totalAnalyses === 0) {
    return 0;
  }

  const progress = Math.min(1, Math.max(0, playOffsetMs / trackDurationMs));
  return Math.min(totalAnalyses - 1, Math.floor(progress * totalAnalyses));
}

/**
 * Extract raw lyric lines at the play offset, independent of analysis state.
 * Used to show/auto-analyze "the moment" even before AI analysis completes.
 */
export function extractRawMomentLines(
  lyricsText: string,
  playOffsetMs: number | undefined,
  trackDurationMs: number | undefined
): string[] {
  if (!lyricsText || !playOffsetMs || !trackDurationMs || trackDurationMs <= 0) return [];

  const allLines = lyricsText.split('\n').filter(l => l.trim().length > 3);
  if (allLines.length === 0) return [];

  const progress = Math.min(1, Math.max(0, playOffsetMs / trackDurationMs));
  const targetIdx = Math.min(allLines.length - 1, Math.floor(progress * allLines.length));

  const startIdx = Math.max(0, targetIdx - 1);
  const endIdx = Math.min(allLines.length, targetIdx + 3);
  return allLines.slice(startIdx, endIdx).map(l => l.trim());
}

/**
 * Extract "the moment" - the specific lines the user was hearing
 * Returns 2-4 lines centered around where they tapped Listen
 */
export interface TheMoment {
  lines: LyricAnalysis[];
  rawLines: string[];
  blockLabel: string;
  timestamp: string; // e.g., "1:23 into the song"
  hasAnalysis: boolean;
}

export function extractTheMoment(
  blocks: LyricBlockWithAnalyses[],
  youWereHereIndex: number,
  playOffsetMs: number | undefined,
  lyricsText?: string,
  trackDurationMs?: number
): TheMoment | null {
  if (blocks.length === 0 && !lyricsText) return null;

  const rawLines = lyricsText ? extractRawMomentLines(lyricsText, playOffsetMs, trackDurationMs) : [];

  // Find the block containing the youWereHereIndex
  let targetBlock: LyricBlockWithAnalyses | null = null;
  let lineIndexInBlock = 0;

  for (const block of blocks) {
    for (let i = 0; i < block.analyses.length; i++) {
      if (block.analyses[i].originalIndex === youWereHereIndex) {
        targetBlock = block;
        lineIndexInBlock = i;
        break;
      }
    }
    if (targetBlock) break;
  }

  // Fallback: use first block with analyses
  if (!targetBlock) {
    targetBlock = blocks.find(b => b.analyses.length > 0) || null;
    if (!targetBlock && rawLines.length === 0) return null;
  }

  let momentLines: LyricAnalysis[] = [];
  let blockLabel = '';

  if (targetBlock) {
    const startIdx = Math.max(0, lineIndexInBlock - 1);
    const endIdx = Math.min(targetBlock.analyses.length, lineIndexInBlock + 3);
    momentLines = targetBlock.analyses.slice(startIdx, endIdx);
    blockLabel = targetBlock.blockLabel;
  }

  // Format timestamp
  let timestamp = '';
  if (playOffsetMs && playOffsetMs > 0) {
    const seconds = Math.floor(playOffsetMs / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timestamp = `${mins}:${secs.toString().padStart(2, '0')} into the song`;
  }

  if (momentLines.length === 0 && rawLines.length === 0) return null;

  return {
    lines: momentLines,
    rawLines,
    blockLabel,
    timestamp,
    hasAnalysis: momentLines.some(l => l.translation || l.culturalContext),
  };
}

export interface AnalysisWithBlock extends LyricAnalysis {
  originalIndex: number;
  blockIndex: number;
  blockType: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'unknown';
  isBlockStart: boolean;
}

export interface LyricBlockWithAnalyses {
  blockIndex: number;
  blockType: 'verse' | 'chorus' | 'bridge' | 'intro' | 'outro' | 'unknown';
  blockLabel: string;
  analyses: AnalysisWithBlock[];
  hasAnalyses: boolean;
}

export function buildBlocksWithAnalyses(
  analyses: LyricAnalysis[],
  lyricsText: string
): LyricBlockWithAnalyses[] {
  const blocks = detectLyricBlocks(lyricsText);
  
  if (blocks.length === 0) {
    const mapped = analyses.map((a, idx) => ({
      ...a,
      originalIndex: idx,
      blockIndex: 0,
      blockType: 'verse' as const,
      isBlockStart: idx === 0,
    }));
    return [{
      blockIndex: 0,
      blockType: 'verse',
      blockLabel: 'Verse 1',
      analyses: mapped,
      hasAnalyses: mapped.length > 0,
    }];
  }

  const numBlocks = blocks.length;
  const numAnalyses = analyses.length;
  const totalLines = blocks.reduce((sum, b) => sum + b.lines.length, 0);

  const blockStructures: LyricBlockWithAnalyses[] = blocks.map((block, idx) => {
    let label = '';
    if (block.type === 'chorus') label = 'Chorus';
    else if (block.type === 'bridge') label = 'Bridge';
    else if (block.type === 'intro') label = 'Intro';
    else if (block.type === 'outro') label = 'Outro';
    else label = `Verse ${idx + 1}`;
    
    return {
      blockIndex: idx,
      blockType: block.type,
      blockLabel: label,
      analyses: [],
      hasAnalyses: false,
    };
  });

  if (numAnalyses === 0) {
    return blockStructures;
  }

  let analysisIdx = 0;
  let cumulativeLines = 0;
  
  for (let blockIdx = 0; blockIdx < numBlocks && analysisIdx < numAnalyses; blockIdx++) {
    const block = blocks[blockIdx];
    const blockEndRatio = (cumulativeLines + block.lines.length) / totalLines;
    
    while (analysisIdx < numAnalyses) {
      const analysisRatio = (analysisIdx + 0.5) / numAnalyses;
      
      if (analysisRatio <= blockEndRatio || blockIdx === numBlocks - 1) {
        blockStructures[blockIdx].analyses.push({
          ...analyses[analysisIdx],
          originalIndex: analysisIdx,
          blockIndex: blockIdx,
          blockType: block.type,
          isBlockStart: blockStructures[blockIdx].analyses.length === 0,
        });
        blockStructures[blockIdx].hasAnalyses = true;
        analysisIdx++;
      } else {
        break;
      }
    }
    
    cumulativeLines += block.lines.length;
  }

  return blockStructures;
}

export function getDisplayBlocks(
  blockStructures: LyricBlockWithAnalyses[],
  youWereHereIndex: number,
  initialCount: number,
  showAll: boolean
): { blocks: LyricBlockWithAnalyses[]; totalAnalyses: number; youWereHereBlockIndex: number } {
  const totalAnalyses = blockStructures.reduce((sum, b) => sum + b.analyses.length, 0);
  
  let youWereHereBlockIndex = 0;
  for (const block of blockStructures) {
    if (block.analyses.some(a => a.originalIndex === youWereHereIndex)) {
      youWereHereBlockIndex = block.blockIndex;
      break;
    }
  }

  if (showAll || totalAnalyses <= initialCount) {
    return { blocks: blockStructures, totalAnalyses, youWereHereBlockIndex };
  }

  const result: LyricBlockWithAnalyses[] = [];
  let count = 0;
  let includedYouWereHereBlock = false;

  for (const block of blockStructures) {
    if (count >= initialCount && includedYouWereHereBlock) break;

    if (block.blockIndex === youWereHereBlockIndex) {
      result.push(block);
      count += block.analyses.length;
      includedYouWereHereBlock = true;
    } else if (count < initialCount) {
      const remaining = initialCount - count;
      if (block.analyses.length <= remaining) {
        result.push(block);
        count += block.analyses.length;
      } else {
        result.push({
          ...block,
          analyses: block.analyses.slice(0, remaining),
        });
        count += remaining;
      }
    }
  }

  result.sort((a, b) => a.blockIndex - b.blockIndex);

  return { blocks: result, totalAnalyses, youWereHereBlockIndex };
}
