import { storage } from '../storage';
import { findSimilarMemories, storeMemory, detectRecurringPatterns, getRelationshipSummary, type MemoryContext } from './embeddingService';
import OpenAI from 'openai';

// Use AI_INTEGRATIONS key first (Replit managed), fallback to manual OPENAI_API_KEY
const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

const openai = apiKey ? new OpenAI({ 
  apiKey: apiKey,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
}) : null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    throw new Error('OpenAI client is not configured');
  }
  return openai;
}

export interface AgentContext {
  partnershipId: string;
  userId: string;
  coParentId?: string;
  userPersonality?: string;
  coParentPersonality?: string;
  recentMessages: Array<{ content: string; senderId: string; createdAt: Date; conflictScore?: number }>;
  upcomingEvents: Array<{ title: string; startTime: Date; eventType: string }>;
  pendingExpenses: Array<{ description: string; amount: number; status: string }>;
  conflictPatterns: Array<{ patternName: string; occurrenceCount: number; lastOccurredAt: Date }>;
  relationshipSummary: {
    averageConflictScore: number;
    totalInteractions: number;
    commonTopics: string[];
    peakConflictTimes: string[];
  };
}

export interface AgentDecision {
  shouldIntervene: boolean;
  interventionType: 'none' | 'nudge' | 'suggestion' | 'warning' | 'escalation_prevention';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
  suggestedAction?: string;
  triggerReason?: string;
  confidence: number;
}

export interface CrossFeatureInsight {
  type: 'schedule_expense_conflict' | 'pattern_detected' | 'upcoming_trigger' | 'relationship_trend';
  description: string;
  relatedFeatures: string[];
  actionSuggestion?: string;
  severity: 'info' | 'warning' | 'alert';
}

export async function buildAgentContext(partnershipId: string, userId: string): Promise<AgentContext> {
  const partnership = await storage.getPartnership(partnershipId);
  if (!partnership) {
    throw new Error('Partnership not found');
  }

  const coParentId = partnership.user1Id === userId ? partnership.user2Id : partnership.user1Id;
  const user = await storage.getUser(userId);
  const coParent = coParentId ? await storage.getUser(coParentId) : null;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [patterns, summary] = await Promise.all([
    storage.getConflictPatterns(partnershipId),
    getRelationshipSummary(partnershipId),
  ]);

  const conflictPatterns = patterns.map((p: any) => ({
    patternName: p.patternName || 'Unknown',
    occurrenceCount: p.occurrenceCount || 0,
    lastOccurredAt: new Date(p.lastOccurredAt || p.createdAt),
  }));

  const relationshipSummary = {
    averageConflictScore: summary.averageConflictScore || 30,
    totalInteractions: summary.totalMemories || 0,
    commonTopics: summary.topTopics || [],
    peakConflictTimes: ['evening'],
  };

  return {
    partnershipId,
    userId,
    coParentId: coParentId || undefined,
    userPersonality: user?.personalityType || undefined,
    coParentPersonality: coParent?.personalityType || undefined,
    recentMessages: [],
    upcomingEvents: [],
    pendingExpenses: [],
    conflictPatterns,
    relationshipSummary,
  };
}

export async function analyzeCurrentState(context: AgentContext): Promise<AgentDecision> {
  const riskFactors: string[] = [];
  let riskScore = 0;

  if (context.relationshipSummary.averageConflictScore > 60) {
    riskFactors.push('High average conflict score');
    riskScore += 25;
  }

  const highConflictMessages = context.recentMessages.filter(m => (m.conflictScore || 0) > 70);
  if (highConflictMessages.length >= 3) {
    riskFactors.push(`${highConflictMessages.length} high-conflict messages in past week`);
    riskScore += 20;
  }

  const disputedExpenses = context.pendingExpenses.filter(e => e.status === 'disputed');
  if (disputedExpenses.length > 0) {
    riskFactors.push(`${disputedExpenses.length} disputed expenses`);
    riskScore += 15;
  }

  const activePatterns = context.conflictPatterns.filter(p => {
    const daysSinceOccurrence = (Date.now() - p.lastOccurredAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceOccurrence < 14;
  });
  if (activePatterns.length > 0) {
    riskFactors.push(`${activePatterns.length} active conflict patterns`);
    riskScore += 15 * activePatterns.length;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const isHighRiskTime = context.relationshipSummary.peakConflictTimes.some(time => {
    if (time === 'evening' && currentHour >= 18 && currentHour < 22) return true;
    if (time === 'morning' && currentHour >= 6 && currentHour < 10) return true;
    if (time === 'night' && (currentHour >= 22 || currentHour < 6)) return true;
    return false;
  });
  if (isHighRiskTime) {
    riskFactors.push('Currently in peak conflict time window');
    riskScore += 10;
  }

  let decision: AgentDecision;

  if (riskScore >= 70) {
    decision = {
      shouldIntervene: true,
      interventionType: 'escalation_prevention',
      priority: 'critical',
      triggerReason: riskFactors.join('; '),
      confidence: Math.min(0.95, riskScore / 100),
    };
  } else if (riskScore >= 50) {
    decision = {
      shouldIntervene: true,
      interventionType: 'warning',
      priority: 'high',
      triggerReason: riskFactors.join('; '),
      confidence: Math.min(0.85, riskScore / 100),
    };
  } else if (riskScore >= 30) {
    decision = {
      shouldIntervene: true,
      interventionType: 'suggestion',
      priority: 'medium',
      triggerReason: riskFactors.join('; '),
      confidence: Math.min(0.75, riskScore / 100),
    };
  } else if (riskScore >= 15) {
    decision = {
      shouldIntervene: true,
      interventionType: 'nudge',
      priority: 'low',
      triggerReason: riskFactors.join('; '),
      confidence: Math.min(0.65, riskScore / 100),
    };
  } else {
    decision = {
      shouldIntervene: false,
      interventionType: 'none',
      priority: 'low',
      confidence: 0.9,
    };
  }

  if (decision.shouldIntervene && decision.interventionType !== 'none') {
    decision.message = await generateInterventionMessage(context, decision);
    decision.suggestedAction = generateSuggestedAction(context, decision);
  }

  return decision;
}

async function generateInterventionMessage(context: AgentContext, decision: AgentDecision): Promise<string> {
  const systemPrompt = `You are a calm, supportive AI assistant helping co-parents communicate peacefully.
Generate a brief, gentle intervention message based on the current situation.
The message should be:
- Non-judgmental and supportive
- Focus on the children's wellbeing
- Suggest positive alternatives
- Maximum 2-3 sentences

Priority level: ${decision.priority}
Trigger reason: ${decision.triggerReason}`;

  const contextSummary = `
Recent conflict score average: ${context.relationshipSummary.averageConflictScore.toFixed(0)}
Pending disputed expenses: ${context.pendingExpenses.filter(e => e.status === 'disputed').length}
Upcoming events this week: ${context.upcomingEvents.length}
Active conflict patterns: ${context.conflictPatterns.length}`;

  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate an intervention message for this context:\n${contextSummary}` },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return response.choices[0].message.content || 'Take a moment to breathe before responding.';
  } catch (error) {
    console.error('[AgentOrchestrator] Failed to generate intervention message:', error);
    return 'Consider taking a brief pause before your next message.';
  }
}

function generateSuggestedAction(context: AgentContext, decision: AgentDecision): string {
  if (decision.priority === 'critical') {
    return 'Use Prep Chat to draft your next message';
  }
  if (context.pendingExpenses.filter(e => e.status === 'disputed').length > 0) {
    return 'Review disputed expenses with calm discussion';
  }
  if (context.upcomingEvents.length > 0) {
    return 'Focus on upcoming schedule coordination';
  }
  return 'Take a moment to reflect before responding';
}

export interface PredictedConflict {
  predictedAt: Date;
  expectedTime: Date;
  triggerType: 'schedule_handoff' | 'expense_deadline' | 'recurring_pattern' | 'high_tension_period';
  confidence: number;
  description: string;
  preventionSuggestion: string;
  relatedPatterns: string[];
}

export async function predictUpcomingConflicts(context: AgentContext): Promise<PredictedConflict[]> {
  const predictions: PredictedConflict[] = [];
  const now = new Date();
  const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // Check for schedule handoffs in next 24-48 hours (common conflict trigger)
  const handoffEvents = context.upcomingEvents.filter(e => {
    const eventTime = new Date(e.startTime);
    return eventTime > now && eventTime < next48Hours &&
      (e.eventType === 'handoff' || e.eventType === 'pickup' || e.eventType === 'dropoff' ||
       e.title.toLowerCase().includes('pickup') || e.title.toLowerCase().includes('drop'));
  });

  for (const event of handoffEvents) {
    const hasRecentConflict = context.conflictPatterns.some(p =>
      p.patternName.toLowerCase().includes('handoff') ||
      p.patternName.toLowerCase().includes('pickup') ||
      p.patternName.toLowerCase().includes('schedule')
    );

    if (hasRecentConflict || context.relationshipSummary.averageConflictScore > 50) {
      predictions.push({
        predictedAt: now,
        expectedTime: new Date(event.startTime),
        triggerType: 'schedule_handoff',
        confidence: hasRecentConflict ? 0.75 : 0.55,
        description: `Upcoming ${event.title} may be tense based on past patterns`,
        preventionSuggestion: 'Use Prep Chat to plan communication before the handoff',
        relatedPatterns: context.conflictPatterns.map(p => p.patternName).slice(0, 2),
      });
    }
  }

  // Check for expense-related tensions
  const disputedExpenses = context.pendingExpenses.filter(e => e.status === 'disputed');
  if (disputedExpenses.length > 0) {
    const expensePatterns = context.conflictPatterns.filter(p =>
      p.patternName.toLowerCase().includes('money') ||
      p.patternName.toLowerCase().includes('expense') ||
      p.patternName.toLowerCase().includes('payment')
    );

    if (expensePatterns.length > 0 || context.relationshipSummary.averageConflictScore > 40) {
      predictions.push({
        predictedAt: now,
        expectedTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        triggerType: 'expense_deadline',
        confidence: 0.65,
        description: `${disputedExpenses.length} disputed expense(s) may escalate tension`,
        preventionSuggestion: 'Consider addressing expenses during a calm moment',
        relatedPatterns: expensePatterns.map(p => p.patternName),
      });
    }
  }

  // Check for recurring conflict patterns
  const activePatterns = context.conflictPatterns.filter(p => {
    const daysSince = (now.getTime() - p.lastOccurredAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince < 7 && p.occurrenceCount >= 3;
  });

  for (const pattern of activePatterns.slice(0, 2)) {
    predictions.push({
      predictedAt: now,
      expectedTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      triggerType: 'recurring_pattern',
      confidence: Math.min(0.85, 0.5 + (pattern.occurrenceCount * 0.1)),
      description: `"${pattern.patternName}" pattern is active and may resurface`,
      preventionSuggestion: 'Take a breath before discussing this topic',
      relatedPatterns: [pattern.patternName],
    });
  }

  // Check for high-tension time periods
  if (context.relationshipSummary.averageConflictScore > 60) {
    const currentHour = now.getHours();
    const isEvening = currentHour >= 17 && currentHour < 22;
    
    if (isEvening && context.relationshipSummary.peakConflictTimes.includes('evening')) {
      predictions.push({
        predictedAt: now,
        expectedTime: now,
        triggerType: 'high_tension_period',
        confidence: 0.6,
        description: 'Evening hours tend to be more tense - be extra mindful',
        preventionSuggestion: 'Consider postponing difficult conversations until tomorrow',
        relatedPatterns: [],
      });
    }
  }

  return predictions.sort((a, b) => b.confidence - a.confidence);
}

export async function detectCrossFeatureInsights(context: AgentContext): Promise<CrossFeatureInsight[]> {
  const insights: CrossFeatureInsight[] = [];

  // Add predictions as insights
  const predictions = await predictUpcomingConflicts(context);
  for (const pred of predictions.slice(0, 2)) {
    insights.push({
      type: 'upcoming_trigger',
      description: pred.description,
      relatedFeatures: ['patterns', pred.triggerType === 'expense_deadline' ? 'expenses' : 'calendar'],
      actionSuggestion: pred.preventionSuggestion,
      severity: pred.confidence > 0.7 ? 'alert' : 'warning',
    });
  }

  const upcomingExpenseEvents = context.upcomingEvents.filter(e => 
    e.title.toLowerCase().includes('school') ||
    e.title.toLowerCase().includes('doctor') ||
    e.title.toLowerCase().includes('activity')
  );
  if (upcomingExpenseEvents.length > 0 && context.pendingExpenses.length > 0) {
    insights.push({
      type: 'schedule_expense_conflict',
      description: `You have ${upcomingExpenseEvents.length} upcoming events that may require expense coordination`,
      relatedFeatures: ['calendar', 'expenses'],
      actionSuggestion: 'Consider discussing expense sharing before the event',
      severity: 'warning',
    });
  }

  const recentHighConflict = context.recentMessages.filter(m => (m.conflictScore || 0) > 60);
  if (recentHighConflict.length >= 3) {
    const topics = context.relationshipSummary.commonTopics.slice(0, 2);
    insights.push({
      type: 'pattern_detected',
      description: `Recurring tension detected around: ${topics.join(', ') || 'various topics'}`,
      relatedFeatures: ['messaging', 'patterns'],
      actionSuggestion: 'Use Prep Chat before discussing these topics',
      severity: 'alert',
    });
  }

  if (context.conflictPatterns.length > 0) {
    const recentPattern = context.conflictPatterns[0];
    insights.push({
      type: 'upcoming_trigger',
      description: `Pattern "${recentPattern.patternName}" has occurred ${recentPattern.occurrenceCount} times`,
      relatedFeatures: ['patterns', 'messaging'],
      actionSuggestion: 'Be mindful of this pattern in upcoming conversations',
      severity: 'info',
    });
  }

  const avgScore = context.relationshipSummary.averageConflictScore;
  if (avgScore < 30) {
    insights.push({
      type: 'relationship_trend',
      description: 'Communication has been positive recently',
      relatedFeatures: ['messaging'],
      severity: 'info',
    });
  } else if (avgScore > 60) {
    insights.push({
      type: 'relationship_trend',
      description: 'Communication has been tense recently',
      relatedFeatures: ['messaging'],
      actionSuggestion: 'Consider using structured communication tools',
      severity: 'warning',
    });
  }

  return insights;
}

export async function recordAgentIntervention(
  partnershipId: string,
  userId: string,
  decision: AgentDecision,
  feature: string
): Promise<void> {
  try {
    await storage.createAgentIntervention({
      partnershipId,
      triggeredBy: 'agent_orchestrator',
      interventionType: decision.interventionType,
      targetUserId: userId,
      title: `${decision.priority} priority intervention`,
      message: decision.message || '',
      suggestedAction: decision.suggestedAction,
      deliveredAt: new Date(),
    });
  } catch (error) {
    console.error('[AgentOrchestrator] Failed to record intervention:', error);
  }
}

export async function processMessageForMemory(
  partnershipId: string,
  messageId: string,
  content: string,
  senderId: string,
  conflictScore?: number
): Promise<void> {
  try {
    const memoryContext: MemoryContext = {
      partnershipId,
      memoryType: conflictScore && conflictScore > 50 ? 'conflict' : 'message' as any,
      sourceType: 'chat',
      sourceId: messageId,
      content,
      emotionalTone: conflictScore && conflictScore > 50 ? 'tense' : 'neutral',
      conflictScore,
      participants: [senderId],
      topics: [],
      occurredAt: new Date(),
    };

    await storeMemory(memoryContext);
  } catch (error) {
    console.error('[AgentOrchestrator] Failed to process message for memory:', error);
  }
}

export interface EscalationNudge {
  type: 'breathing' | 'pause' | 'reframe' | 'empathy';
  message: string;
  actionLabel: string;
  urgency: 'gentle' | 'moderate' | 'strong';
}

export function generateEscalationNudge(context: AgentContext, decision: AgentDecision): EscalationNudge | null {
  if (!decision.shouldIntervene || decision.interventionType === 'none') {
    return null;
  }

  const nudges: EscalationNudge[] = [
    {
      type: 'breathing',
      message: 'Take three slow breaths before continuing.',
      actionLabel: 'Start breathing exercise',
      urgency: 'gentle',
    },
    {
      type: 'pause',
      message: 'Consider stepping away for 5 minutes before responding.',
      actionLabel: 'Set a timer',
      urgency: 'moderate',
    },
    {
      type: 'reframe',
      message: 'Try to see this from your co-parent\'s perspective.',
      actionLabel: 'Open Prep Chat',
      urgency: 'moderate',
    },
    {
      type: 'empathy',
      message: 'Remember, you both want what\'s best for your children.',
      actionLabel: 'Focus on shared goals',
      urgency: 'gentle',
    },
  ];

  if (decision.priority === 'critical') {
    return {
      type: 'pause',
      message: 'This conversation may escalate. Consider taking a break and using Prep Chat to plan your response.',
      actionLabel: 'Use Prep Chat',
      urgency: 'strong',
    };
  }

  if (decision.priority === 'high') {
    return nudges.find(n => n.type === 'reframe') || nudges[0];
  }

  if (decision.priority === 'medium') {
    return nudges.find(n => n.type === 'breathing') || nudges[0];
  }

  return nudges.find(n => n.type === 'empathy') || null;
}

export async function getAgentRecommendations(partnershipId: string, userId: string): Promise<{
  decision: AgentDecision;
  insights: CrossFeatureInsight[];
  predictions: PredictedConflict[];
  nudge: EscalationNudge | null;
  context: AgentContext;
}> {
  const context = await buildAgentContext(partnershipId, userId);
  const decision = await analyzeCurrentState(context);
  const insights = await detectCrossFeatureInsights(context);
  const predictions = await predictUpcomingConflicts(context);
  const nudge = generateEscalationNudge(context, decision);

  if (decision.shouldIntervene) {
    await recordAgentIntervention(partnershipId, userId, decision, 'dashboard');
  }

  return { decision, insights, predictions, nudge, context };
}

// Phase 2E: Trigger Rule Engine - Configurable thresholds
export interface TriggerRule {
  id: string;
  name: string;
  condition: 'conflict_score_above' | 'pattern_recurrence' | 'expense_disputed' | 'handoff_approaching';
  threshold: number;
  action: 'nudge' | 'suggestion' | 'warning' | 'notification';
  enabled: boolean;
}

export const DEFAULT_TRIGGER_RULES: TriggerRule[] = [
  {
    id: 'high_conflict',
    name: 'High Conflict Score',
    condition: 'conflict_score_above',
    threshold: 70,
    action: 'warning',
    enabled: true,
  },
  {
    id: 'moderate_conflict',
    name: 'Moderate Conflict Score',
    condition: 'conflict_score_above',
    threshold: 50,
    action: 'suggestion',
    enabled: true,
  },
  {
    id: 'pattern_repeat',
    name: 'Recurring Pattern',
    condition: 'pattern_recurrence',
    threshold: 3,
    action: 'nudge',
    enabled: true,
  },
  {
    id: 'expense_dispute',
    name: 'Expense Disputed',
    condition: 'expense_disputed',
    threshold: 1,
    action: 'suggestion',
    enabled: true,
  },
  {
    id: 'handoff_soon',
    name: 'Handoff Approaching',
    condition: 'handoff_approaching',
    threshold: 24,
    action: 'nudge',
    enabled: true,
  },
];

export function evaluateTriggerRules(context: AgentContext, rules: TriggerRule[]): TriggerRule[] {
  const triggeredRules: TriggerRule[] = [];

  for (const rule of rules.filter(r => r.enabled)) {
    let triggered = false;

    switch (rule.condition) {
      case 'conflict_score_above':
        triggered = context.relationshipSummary.averageConflictScore >= rule.threshold;
        break;
      case 'pattern_recurrence':
        triggered = context.conflictPatterns.some(p => p.occurrenceCount >= rule.threshold);
        break;
      case 'expense_disputed':
        triggered = context.pendingExpenses.filter(e => e.status === 'disputed').length >= rule.threshold;
        break;
      case 'handoff_approaching':
        const hoursThreshold = rule.threshold;
        const now = Date.now();
        triggered = context.upcomingEvents.some(e => {
          const hoursUntil = (new Date(e.startTime).getTime() - now) / (1000 * 60 * 60);
          return hoursUntil > 0 && hoursUntil <= hoursThreshold &&
            (e.eventType === 'handoff' || e.title.toLowerCase().includes('pickup'));
        });
        break;
    }

    if (triggered) {
      triggeredRules.push(rule);
    }
  }

  return triggeredRules;
}
