import { calculateConflictEscalationScore, type CESResult } from "../../aiHelper";
import { analyzeConflict, type ConflictAnalysis } from "../../emotionAnalyzer";
import type { ConflictCheckRequest, ConflictCheckResponse } from "../schemas/conflictCheck";
import { detectSafetyFlagsFromText, hasCrisisSafetyFlag } from "./safetySignals";

type AnalyzeConflictFn = (
  message: string,
  conversationHistory?: string[],
  detectedLanguage?: string,
) => Promise<ConflictAnalysis>;
type CalculateCESFn = (
  currentMessage: string,
  conversationHistory: Array<{
    content: string;
    senderId: string;
    createdAt: string | Date;
    tone?: string | null;
  }>,
  userId: string,
) => CESResult;

export interface ConflictServiceDependencies {
  analyzeConflictFn?: AnalyzeConflictFn;
  calculateCESFn?: CalculateCESFn;
}

function mapSeverityToLevel(severity: ConflictAnalysis["severity"], hasConflict: boolean): number {
  if (!hasConflict) {
    return 0;
  }
  if (severity === "high") {
    return 3;
  }
  if (severity === "medium") {
    return 2;
  }
  return 1;
}

function mapCESScoreToLevel(score: number): number {
  if (score >= 80) {
    return 4;
  }
  if (score >= 60) {
    return 3;
  }
  if (score >= 35) {
    return 2;
  }
  if (score >= 15) {
    return 1;
  }
  return 0;
}

function toCESHistory(messages: string[] | undefined) {
  const history = messages ?? [];
  return history.map((content, index) => ({
    content,
    senderId: index % 2 === 0 ? "co-parent" : "user",
    createdAt: new Date(Date.now() - (history.length - index) * 60_000),
  }));
}

function buildDoNotSayList(analysis: ConflictAnalysis): string[] {
  const staticList = [
    "You always do this.",
    "You never listen.",
    "It's your fault.",
    "If you do not do this, I will take legal action.",
  ];

  const triggerBased = analysis.triggerPhrases.slice(0, 3).map((phrase) => `"${phrase}"`);
  return Array.from(new Set([...staticList, ...triggerBased])).slice(0, 10);
}

function buildRecommendedActions(
  level: number,
  hasCrisisFlag: boolean,
  analysis: ConflictAnalysis,
): string[] {
  if (hasCrisisFlag || level >= 4) {
    return [
      "Pause sending and prioritize immediate safety planning.",
      "Use Support Discovery for crisis-first resources.",
      "If there is immediate danger, contact local emergency services.",
    ];
  }

  if (level >= 3) {
    return [
      "Use Rewrite Message before sending.",
      "Keep requests specific and avoid blame language.",
      `Immediate mediator tip: ${analysis.resolution.immediate || "Take a short pause before replying."}`,
    ];
  }

  if (level >= 2) {
    return [
      "Clarify the request in one sentence.",
      "Replace absolute language with concrete examples.",
      "Use calm or neutral rewrite before sending.",
    ];
  }

  if (level >= 1) {
    return [
      "Keep tone factual and concise.",
      "Confirm shared goal before discussing disagreement.",
    ];
  }

  return ["Message appears low-risk. Keep language clear and specific."];
}

function buildSignals(
  analysis: ConflictAnalysis,
  cesResult: CESResult,
): ConflictCheckResponse["signals"] {
  const modelSignals: ConflictCheckResponse["signals"] = [];

  if (analysis.hasConflict) {
    modelSignals.push({
      type: "model",
      key: `conflict_type_${analysis.conflictType}`,
      description: analysis.rootCause || "Conflict pattern detected by model.",
      weight: analysis.severity === "high" ? 18 : analysis.severity === "medium" ? 12 : 6,
    });
  }

  for (const phrase of analysis.triggerPhrases.slice(0, 5)) {
    modelSignals.push({
      type: "linguistic",
      key: "trigger_phrase",
      description: `Trigger phrase detected: ${phrase}`,
      weight: 6,
    });
  }

  const cesSignals: ConflictCheckResponse["signals"] = cesResult.signals.map((signal) => ({
    type: signal.type,
    key: signal.signal,
    description: signal.description,
    weight: signal.weight,
  }));

  return [...modelSignals, ...cesSignals].slice(0, 20);
}

export async function runConflictCheck(
  input: ConflictCheckRequest,
  deps: ConflictServiceDependencies = {},
): Promise<ConflictCheckResponse> {
  const analyzeConflictFn = deps.analyzeConflictFn ?? analyzeConflict;
  const calculateCESFn = deps.calculateCESFn ?? calculateConflictEscalationScore;
  const conversationHistory = input.conversation_history;
  const cesHistory = toCESHistory(conversationHistory);
  const userId = input.context?.user_id ?? "v2-user";

  const [analysis, cesResult] = await Promise.all([
    analyzeConflictFn(input.text, conversationHistory),
    Promise.resolve(calculateCESFn(input.text, cesHistory, userId)),
  ]);

  const baseLevel = mapSeverityToLevel(analysis.severity, analysis.hasConflict);
  const cesLevel = mapCESScoreToLevel(cesResult.score);
  let conflictLevel = Math.max(baseLevel, cesLevel);

  const safetyFlags = detectSafetyFlagsFromText(input.text, { conflictLevel });
  const crisisFlag = hasCrisisSafetyFlag(safetyFlags);

  if (crisisFlag) {
    conflictLevel = 4;
  }

  return {
    conflict_level: conflictLevel,
    signals: buildSignals(analysis, cesResult),
    safety_flags: safetyFlags,
    recommended_next_actions: buildRecommendedActions(conflictLevel, crisisFlag, analysis),
    do_not_say: buildDoNotSayList(analysis),
  };
}
