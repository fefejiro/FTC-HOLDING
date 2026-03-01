import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Sparkles, ArrowRight, RotateCcw, Flame, Trophy } from "lucide-react";

interface ValidationResult {
  isValid: boolean;
  score: number;
  capturedPoints: string[];
  missedPoints: string[];
  feedback: string;
  encouragement: string;
}

interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
}

interface Achievement {
  code: string;
  name: string;
  description: string;
  icon: string;
  tier: string;
}

interface ListeningFeedbackProps {
  result: ValidationResult;
  onContinue: () => void;
  onTryAgain?: () => void;
  streak?: StreakInfo | null;
  newAchievements?: Achievement[];
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

function getProgressColor(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-muted-foreground";
}

export function ListeningFeedback({
  result,
  onContinue,
  onTryAgain,
  streak,
  newAchievements = []
}: ListeningFeedbackProps) {
  const { score, capturedPoints, missedPoints, feedback, encouragement, isValid } = result;

  return (
    <Card data-testid="card-listening-feedback">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-full ${isValid ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
            {isValid ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <CardTitle className="text-lg" data-testid="text-feedback-title">
            {isValid ? "Great listening!" : "Almost there"}
          </CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">Understanding Score</span>
            <span className={`text-lg font-semibold ${getScoreColor(score)}`} data-testid="text-score">
              {score}%
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              className={`h-full transition-all ${getProgressColor(score)}`}
              style={{ width: `${score}%` }}
              data-testid="progress-score"
            />
          </div>
        </div>

        {capturedPoints.length > 0 && (
          <div className="space-y-2" data-testid="section-captured-points">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              What you captured
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground pl-5">
              {capturedPoints.map((point, index) => (
                <li key={index} className="list-disc" data-testid={`text-captured-point-${index}`}>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {missedPoints.length > 0 && (
          <div className="space-y-2" data-testid="section-missed-points">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Consider also
            </h4>
            <ul className="space-y-1 text-sm text-muted-foreground pl-5">
              {missedPoints.map((point, index) => (
                <li key={index} className="list-disc" data-testid={`text-missed-point-${index}`}>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

        {feedback && (
          <div className="p-3 rounded-md bg-muted/50 text-sm" data-testid="text-feedback">
            {feedback}
          </div>
        )}

        {encouragement && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 text-sm" data-testid="text-encouragement">
            <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>{encouragement}</span>
          </div>
        )}

        {streak && streak.currentStreak > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-orange-50 dark:bg-orange-900/20" data-testid="section-streak">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <span className="font-medium text-sm" data-testid="text-streak-count">
                {streak.currentStreak} day listening streak
              </span>
              {streak.longestStreak > streak.currentStreak && (
                <span className="text-xs text-muted-foreground ml-2">
                  (Best: {streak.longestStreak} days)
                </span>
              )}
            </div>
          </div>
        )}

        {newAchievements.length > 0 && (
          <div className="space-y-2" data-testid="section-new-achievements">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <Trophy className="h-4 w-4 text-amber-500" />
              New Achievement{newAchievements.length > 1 ? 's' : ''} Earned
            </h4>
            <div className="flex flex-wrap gap-2">
              {newAchievements.map((achievement) => (
                <Badge 
                  key={achievement.code}
                  variant="secondary"
                  className="flex items-center gap-1"
                  data-testid={`badge-achievement-${achievement.code}`}
                >
                  <span>{achievement.name}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 justify-end pt-2">
          {!isValid && onTryAgain && (
            <Button
              variant="outline"
              onClick={onTryAgain}
              data-testid="button-try-again"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Try again
            </Button>
          )}
          <Button
            onClick={onContinue}
            data-testid="button-continue"
          >
            <ArrowRight className="h-4 w-4 mr-1" />
            {isValid ? "Continue" : "Continue anyway"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
