import { storage } from '../storage';
import { getRelationshipSummary } from './embeddingService';

export interface DailySummary {
  date: string;
  partnershipId: string;
  messageCount: number;
  positiveInteractions: number;
  tenseMoments: number;
  keyTopics: string[];
  overallTone: 'positive' | 'neutral' | 'tense';
  highlights: string[];
  suggestions: string[];
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  partnershipId: string;
  totalMessages: number;
  averageConflictScore: number;
  conflictTrend: 'improving' | 'stable' | 'worsening';
  topConflictTopics: string[];
  successfulResolutions: number;
  pendingIssues: string[];
  relationshipHealthScore: number;
  recommendations: string[];
}

export interface CourtReadyLog {
  generatedAt: string;
  partnershipId: string;
  userId: string;
  dateRange: { start: string; end: string };
  incidents: Array<{
    date: string;
    time: string;
    type: 'hostile_message' | 'missed_handoff' | 'expense_dispute' | 'pattern_violation';
    description: string;
    evidenceReference?: string;
  }>;
  summary: string;
  disclaimer: string;
}

export async function generateDailySummary(partnershipId: string): Promise<DailySummary> {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  
  const summary = await getRelationshipSummary(partnershipId);
  
  const messageCount = summary.totalMemories || 0;
  const avgScore = summary.averageConflictScore || 30;
  
  let overallTone: 'positive' | 'neutral' | 'tense' = 'neutral';
  if (avgScore < 30) overallTone = 'positive';
  else if (avgScore > 60) overallTone = 'tense';

  const positiveInteractions = Math.round(messageCount * (1 - avgScore / 100));
  const tenseMoments = Math.round(messageCount * (avgScore / 100));

  const highlights: string[] = [];
  const suggestions: string[] = [];

  if (overallTone === 'positive') {
    highlights.push('Communication remained calm throughout the day');
    suggestions.push('Keep up the positive communication patterns');
  } else if (overallTone === 'tense') {
    highlights.push('Some challenging moments were navigated');
    suggestions.push('Consider using Prep Chat before difficult conversations');
    suggestions.push('Take breaks when tension rises');
  } else {
    highlights.push('Neutral communication maintained');
    suggestions.push('Continue focusing on child-centered discussions');
  }

  return {
    date: today.toISOString().split('T')[0],
    partnershipId,
    messageCount,
    positiveInteractions,
    tenseMoments,
    keyTopics: summary.topTopics || [],
    overallTone,
    highlights,
    suggestions,
  };
}

export async function generateWeeklyReport(partnershipId: string): Promise<WeeklyReport> {
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const summary = await getRelationshipSummary(partnershipId);
  const patterns = await storage.getConflictPatterns(partnershipId);
  
  const avgScore = summary.averageConflictScore || 30;
  
  let conflictTrend: 'improving' | 'stable' | 'worsening' = 'stable';
  if (summary.recentTrend === 'improving') conflictTrend = 'improving';
  else if (summary.recentTrend === 'concerning') conflictTrend = 'worsening';

  const healthScore = Math.max(0, Math.min(100, 100 - avgScore));

  const recommendations: string[] = [];
  if (conflictTrend === 'worsening') {
    recommendations.push('Consider scheduling a calm conversation about communication patterns');
    recommendations.push('Use Prep Chat before discussing sensitive topics');
  } else if (conflictTrend === 'improving') {
    recommendations.push('Your communication is improving - keep up the positive patterns');
  }

  if (patterns.length > 0) {
    recommendations.push(`Be mindful of recurring pattern: "${patterns[0].patternName}"`);
  }

  return {
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: now.toISOString().split('T')[0],
    partnershipId,
    totalMessages: summary.totalMemories || 0,
    averageConflictScore: avgScore,
    conflictTrend,
    topConflictTopics: summary.topTopics?.slice(0, 3) || [],
    successfulResolutions: summary.resolutionCount || 0,
    pendingIssues: [],
    relationshipHealthScore: healthScore,
    recommendations,
  };
}

export async function generateCourtReadyLog(
  partnershipId: string,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CourtReadyLog> {
  const patterns = await storage.getConflictPatterns(partnershipId);
  const interventions = await storage.getAgentInterventions(partnershipId, 100);
  
  const incidents: CourtReadyLog['incidents'] = [];

  for (const intervention of interventions) {
    if (intervention.interventionType === 'warning' || intervention.interventionType === 'escalation_prevention') {
      const createdAt = new Date(intervention.createdAt);
      if (createdAt >= startDate && createdAt <= endDate) {
        incidents.push({
          date: createdAt.toISOString().split('T')[0],
          time: createdAt.toTimeString().split(' ')[0],
          type: 'hostile_message',
          description: intervention.message || 'High-conflict interaction detected',
        });
      }
    }
  }

  for (const pattern of patterns) {
    if ((pattern.averageSeverity ?? 0) >= 70 || (pattern.occurrenceCount ?? 0) >= 5) {
      const lastOccurred = new Date(pattern.lastOccurredAt || pattern.createdAt);
      if (lastOccurred >= startDate && lastOccurred <= endDate) {
        incidents.push({
          date: lastOccurred.toISOString().split('T')[0],
          time: lastOccurred.toTimeString().split(' ')[0],
          type: 'pattern_violation',
          description: `Recurring pattern: ${pattern.patternName} (${pattern.occurrenceCount ?? 0} occurrences)`,
        });
      }
    }
  }

  incidents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const typeCounts = incidents.reduce<Record<string, number>>((counts, incident) => {
    counts[incident.type] = (counts[incident.type] || 0) + 1;
    return counts;
  }, {});
  const typeSummary = Object.entries(typeCounts)
    .map(([type, count]) => `${count} ${type.replace(/_/g, " ")}`)
    .join(", ");
  const summaryText =
    incidents.length === 0
      ? `No qualifying incidents were recorded from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}.`
      : `${incidents.length} qualifying incident${incidents.length === 1 ? " was" : "s were"} recorded from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}${typeSummary ? ` (${typeSummary})` : ""}. This summary is generated locally from the system records listed below and does not add conclusions or legal analysis.`;

  return {
    generatedAt: new Date().toISOString(),
    partnershipId,
    userId,
    dateRange: {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0],
    },
    incidents,
    summary: summaryText,
    disclaimer: 'This log is generated from automated system records and should be verified for accuracy before use in legal proceedings. Consult with a legal professional before submitting as evidence.',
  };
}

export interface AutomatedReminder {
  id: string;
  type: 'pickup' | 'dropoff' | 'school_event' | 'medication' | 'appointment';
  title: string;
  scheduledFor: Date;
  recipientId: string;
  message: string;
  sent: boolean;
}

export async function getUpcomingReminders(partnershipId: string, userId: string): Promise<AutomatedReminder[]> {
  const now = new Date();
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  
  const reminders: AutomatedReminder[] = [];

  return reminders;
}

export interface NegotiationTemplate {
  type: 'schedule_change' | 'expense_split' | 'activity_proposal' | 'boundary_request';
  title: string;
  template: string;
  variables: string[];
  tone: 'formal' | 'friendly' | 'neutral';
}

export async function generateNegotiationProposal(
  partnershipId: string,
  userId: string,
  proposalType: NegotiationTemplate['type'],
  details: Record<string, string>
): Promise<string> {
  const partnership = await storage.getPartnership(partnershipId);
  
  if (!partnership) throw new Error('Partnership not found');

  const templates: Record<string, string> = {
    schedule_change: `I'd like to propose a schedule adjustment. ${details.reason || 'I have a scheduling conflict'} and would like to ${details.request || 'swap our time on [date]'}. Would you be open to discussing this? I'm flexible on the details.`,
    expense_split: `I wanted to discuss sharing the cost for ${details.item || 'an upcoming expense'}. The total is ${details.amount || '[amount]'}, and I was thinking we could ${details.proposal || 'split it evenly'}. Let me know your thoughts.`,
    activity_proposal: `I'd like to suggest ${details.activity || 'an activity'} for the kids. ${details.details || 'Here are the details...'}. What do you think? I'm happy to discuss timing that works for both of us.`,
    boundary_request: `I wanted to have a calm conversation about ${details.topic || 'something important'}. ${details.request || 'I have a request'} and I hope we can work together on this for the children's wellbeing.`,
  };

  const baseTemplate = templates[proposalType] || templates.schedule_change;

  return baseTemplate;
}
