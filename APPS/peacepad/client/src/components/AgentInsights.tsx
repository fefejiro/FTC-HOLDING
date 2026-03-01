import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Shield, Info, Lightbulb, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface AgentDecision {
  shouldIntervene: boolean;
  interventionType: 'none' | 'nudge' | 'suggestion' | 'warning' | 'escalation_prevention';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message?: string;
  suggestedAction?: string;
  triggerReason?: string;
  confidence: number;
}

interface CrossFeatureInsight {
  type: 'schedule_expense_conflict' | 'pattern_detected' | 'upcoming_trigger' | 'relationship_trend';
  description: string;
  relatedFeatures: string[];
  actionSuggestion?: string;
  severity: 'info' | 'warning' | 'alert';
}

interface PredictedConflict {
  predictedAt: string;
  expectedTime: string;
  triggerType: string;
  confidence: number;
  description: string;
  preventionSuggestion: string;
  relatedPatterns: string[];
}

interface EscalationNudge {
  type: 'breathing' | 'pause' | 'reframe' | 'empathy';
  message: string;
  actionLabel: string;
  urgency: 'gentle' | 'moderate' | 'strong';
}

interface AgentRecommendations {
  decision: AgentDecision;
  insights: CrossFeatureInsight[];
  predictions: PredictedConflict[];
  nudge: EscalationNudge | null;
  context: any;
}

export function AgentInsights({ compact = false }: { compact?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());

  const { data, isLoading, error } = useQuery<AgentRecommendations>({
    queryKey: ['/api/agent/recommendations'],
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (insightType: string) => {
      setDismissedInsights(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.add(insightType);
        return newSet;
      });
    },
  });

  if (isLoading || error || !data) return null;

  const { decision, insights, nudge, predictions } = data;
  const hasIntervention = decision.shouldIntervene && decision.interventionType !== 'none';
  const visibleInsights = insights.filter(i => !dismissedInsights.has(i.type));
  const hasContent = hasIntervention || visibleInsights.length > 0 || nudge || (predictions && predictions.length > 0);

  if (!hasContent) return null;

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case 'medium':
        return <Lightbulb className="h-4 w-4 text-blue-500 dark:text-blue-400" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityBadgeVariant = (priority: string): 'destructive' | 'secondary' | 'default' => {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'alert':
        return 'border-blue-400/50 bg-blue-50/50 dark:border-blue-700/50 dark:bg-blue-950/20';
      case 'warning':
        return 'border-sky-400/50 bg-sky-50/50 dark:border-sky-700/50 dark:bg-sky-950/20';
      default:
        return 'border-border bg-muted/30';
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {hasIntervention && (
          <div
            className={cn(
              'flex items-center gap-2 p-2 rounded-lg border',
              decision.priority === 'critical' || decision.priority === 'high'
                ? 'border-indigo-400/50 bg-indigo-50/50 dark:border-indigo-700/50 dark:bg-indigo-950/20'
                : 'border-sky-400/50 bg-sky-50/50 dark:border-sky-700/50 dark:bg-sky-950/20'
            )}
            data-testid="agent-intervention-compact"
          >
            {getPriorityIcon(decision.priority)}
            <span className="text-sm flex-1 truncate">{decision.message}</span>
          </div>
        )}
        {visibleInsights.slice(0, 2).map((insight) => (
          <div
            key={insight.type}
            className={cn('flex items-center gap-2 p-2 rounded-lg border', getSeverityColor(insight.severity))}
            data-testid={`agent-insight-${insight.type}`}
          >
            <Sparkles className="h-3 w-3 text-primary shrink-0" />
            <span className="text-xs flex-1 truncate">{insight.description}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className="border-primary/20" data-testid="agent-insights-card">
      <CardHeader
        className="cursor-pointer pb-2"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="button-toggle-insights"
      >
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>AI Coach Insights</span>
            {hasIntervention && (
              <Badge variant={getPriorityBadgeVariant(decision.priority)}>
                {decision.priority}
              </Badge>
            )}
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3 pt-0">
          {hasIntervention && (
            <div
              className={cn(
                'p-3 rounded-lg border',
                decision.priority === 'critical' || decision.priority === 'high'
                  ? 'border-indigo-400/50 bg-indigo-50/50 dark:border-indigo-700/50 dark:bg-indigo-950/20'
                  : 'border-sky-400/50 bg-sky-50/50 dark:border-sky-700/50 dark:bg-sky-950/20'
              )}
              data-testid="agent-intervention-full"
            >
              <div className="flex items-start gap-3">
                {getPriorityIcon(decision.priority)}
                <div className="flex-1 space-y-2">
                  <p className="text-sm">{decision.message}</p>
                  {decision.suggestedAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      data-testid="button-suggested-action"
                    >
                      {decision.suggestedAction}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {visibleInsights.map((insight) => (
            <div
              key={insight.type}
              className={cn('p-3 rounded-lg border', getSeverityColor(insight.severity))}
              data-testid={`agent-insight-card-${insight.type}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-1">
                  <p className="text-sm">{insight.description}</p>
                  {insight.actionSuggestion && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" />
                      {insight.actionSuggestion}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {insight.relatedFeatures.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => dismissMutation.mutate(insight.type)}
                  data-testid={`button-dismiss-${insight.type}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {visibleInsights.length === 0 && !hasIntervention && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <Check className="h-5 w-5 mx-auto mb-2 text-green-500" />
              All insights reviewed
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
