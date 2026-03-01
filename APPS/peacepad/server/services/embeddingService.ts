import OpenAI from 'openai';
import { storage } from '../storage';
import type { InsertRelationshipMemory, RelationshipMemory } from '@shared/schema';

// Use AI_INTEGRATIONS key first (Replit managed), fallback to manual OPENAI_API_KEY
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

const openai = apiKey ? new OpenAI({ 
  apiKey: apiKey,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
}) : null;

const EMBEDDING_MODEL = 'text-embedding-ada-002';
const EMBEDDING_DIMENSIONS = 1536;

export interface MemoryContext {
  partnershipId: string;
  memoryType: 'message' | 'conflict' | 'resolution' | 'pattern' | 'milestone' | 'trigger';
  sourceType: 'chat' | 'conch_session' | 'calendar' | 'expense' | 'agent_insight';
  sourceId?: string;
  content: string;
  emotionalTone?: string;
  conflictScore?: number;
  participants?: string[];
  topics?: string[];
  occurredAt: Date;
  patternTags?: string[];
  importanceScore?: number;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim(),
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('[EmbeddingService] Failed to generate embedding:', error);
    throw error;
  }
}

export async function storeMemory(context: MemoryContext): Promise<RelationshipMemory> {
  const embedding = await generateEmbedding(context.content);
  
  const date = context.occurredAt;
  const weekOfYear = getWeekOfYear(date);
  const dayOfWeek = date.getDay();
  const timeOfDay = getTimeOfDay(date);

  const memory: InsertRelationshipMemory = {
    partnershipId: context.partnershipId,
    memoryType: context.memoryType,
    sourceType: context.sourceType,
    sourceId: context.sourceId,
    content: context.content,
    embedding: embedding,
    emotionalTone: context.emotionalTone,
    conflictScore: context.conflictScore,
    participants: context.participants,
    topics: context.topics,
    occurredAt: date,
    weekOfYear,
    dayOfWeek,
    timeOfDay,
    patternTags: context.patternTags,
    importanceScore: context.importanceScore ?? 50,
  };

  return await storage.createRelationshipMemory(memory);
}

export async function findSimilarMemories(
  partnershipId: string,
  queryText: string,
  limit: number = 10,
  minSimilarity: number = 0.7
): Promise<Array<RelationshipMemory & { similarity: number }>> {
  const queryEmbedding = await generateEmbedding(queryText);
  const allMemories = await storage.getRelationshipMemories(partnershipId);

  const memoriesWithSimilarity = allMemories
    .filter(m => m.embedding)
    .map(memory => ({
      ...memory,
      similarity: cosineSimilarity(queryEmbedding, memory.embedding as number[]),
    }))
    .filter(m => m.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  for (const memory of memoriesWithSimilarity) {
    await storage.updateRelationshipMemoryRetrieval(memory.id);
  }

  return memoriesWithSimilarity;
}

export async function findMemoriesByTimePattern(
  partnershipId: string,
  options: {
    dayOfWeek?: number;
    timeOfDay?: string;
    weekOfYear?: number;
    memoryType?: string;
    minConflictScore?: number;
  }
): Promise<RelationshipMemory[]> {
  return await storage.getRelationshipMemoriesByPattern(partnershipId, options);
}

export async function detectRecurringPatterns(
  partnershipId: string
): Promise<Array<{
  pattern: string;
  occurrences: number;
  averageSeverity: number;
  triggers: string[];
  timePatterns: string[];
}>> {
  const memories = await storage.getRelationshipMemories(partnershipId);
  const conflicts = memories.filter(m => m.memoryType === 'conflict' || (m.conflictScore && m.conflictScore > 50));

  const topicGroups: Record<string, RelationshipMemory[]> = {};
  for (const conflict of conflicts) {
    for (const topic of conflict.topics || []) {
      if (!topicGroups[topic]) topicGroups[topic] = [];
      topicGroups[topic].push(conflict);
    }
  }

  const patterns = [];
  for (const [topic, group] of Object.entries(topicGroups)) {
    if (group.length >= 2) {
      const avgSeverity = group.reduce((sum, m) => sum + (m.conflictScore || 0), 0) / group.length;
      const dayPatterns = analyzeDayPatterns(group);
      const timePatterns = analyzeTimePatterns(group);
      
      const triggerPhrases = new Set<string>();
      for (const m of group) {
        for (const tag of m.patternTags || []) {
          triggerPhrases.add(tag);
        }
      }

      patterns.push({
        pattern: `${topic}_conflicts`,
        occurrences: group.length,
        averageSeverity: Math.round(avgSeverity),
        triggers: Array.from(triggerPhrases),
        timePatterns: [...dayPatterns, ...timePatterns],
      });
    }
  }

  return patterns.sort((a, b) => b.occurrences - a.occurrences);
}

export async function getRelationshipSummary(partnershipId: string): Promise<{
  totalMemories: number;
  conflictCount: number;
  resolutionCount: number;
  averageConflictScore: number;
  topTopics: string[];
  recentTrend: 'improving' | 'stable' | 'concerning';
}> {
  const memories = await storage.getRelationshipMemories(partnershipId);
  
  const conflicts = memories.filter(m => m.memoryType === 'conflict');
  const resolutions = memories.filter(m => m.memoryType === 'resolution');
  
  const avgConflictScore = conflicts.length > 0
    ? conflicts.reduce((sum, m) => sum + (m.conflictScore || 0), 0) / conflicts.length
    : 0;

  const topicCounts: Record<string, number> = {};
  for (const m of memories) {
    for (const topic of m.topics || []) {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }
  }
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  const recentMemories = memories
    .filter(m => m.occurredAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .filter(m => m.conflictScore !== null);
  
  const olderMemories = memories
    .filter(m => m.occurredAt <= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && 
                 m.occurredAt > new Date(Date.now() - 14 * 24 * 60 * 60 * 1000))
    .filter(m => m.conflictScore !== null);

  let recentTrend: 'improving' | 'stable' | 'concerning' = 'stable';
  if (recentMemories.length > 0 && olderMemories.length > 0) {
    const recentAvg = recentMemories.reduce((s, m) => s + (m.conflictScore || 0), 0) / recentMemories.length;
    const olderAvg = olderMemories.reduce((s, m) => s + (m.conflictScore || 0), 0) / olderMemories.length;
    
    if (recentAvg < olderAvg - 10) recentTrend = 'improving';
    else if (recentAvg > olderAvg + 10) recentTrend = 'concerning';
  }

  return {
    totalMemories: memories.length,
    conflictCount: conflicts.length,
    resolutionCount: resolutions.length,
    averageConflictScore: Math.round(avgConflictScore),
    topTopics,
    recentTrend,
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function getWeekOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.floor(diff / oneWeek) + 1;
}

function getTimeOfDay(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function analyzeDayPatterns(memories: RelationshipMemory[]): string[] {
  const dayCounts: Record<number, number> = {};
  for (const m of memories) {
    const day = m.dayOfWeek ?? new Date(m.occurredAt).getDay();
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  }
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const patterns: string[] = [];
  
  for (const [day, count] of Object.entries(dayCounts)) {
    if (count >= 2) {
      patterns.push(`${dayNames[parseInt(day)]}_pattern`);
    }
  }
  
  return patterns;
}

function analyzeTimePatterns(memories: RelationshipMemory[]): string[] {
  const timeCounts: Record<string, number> = {};
  for (const m of memories) {
    const time = m.timeOfDay ?? getTimeOfDay(new Date(m.occurredAt));
    timeCounts[time] = (timeCounts[time] || 0) + 1;
  }
  
  const patterns: string[] = [];
  for (const [time, count] of Object.entries(timeCounts)) {
    if (count >= 2) {
      patterns.push(`${time}_pattern`);
    }
  }
  
  return patterns;
}

export default {
  generateEmbedding,
  storeMemory,
  findSimilarMemories,
  findMemoriesByTimePattern,
  detectRecurringPatterns,
  getRelationshipSummary,
};
