import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BetaNav } from '@/components/BetaNav';
import { MessageSquare, Bug, Lightbulb, Heart, HelpCircle, Star, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { FeedbackWidget } from '@/components/FeedbackWidget';

export default function BetaFeedbackGuide() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className="min-h-screen-dvh bg-background p-4 pb-24 lg:pb-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              How to Give Feedback
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Your input is incredibly valuable! Here's how to share it effectively
            </p>
          </CardHeader>
        </Card>

        {/* Step 1: Click Button */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Circle className="h-3 w-3 fill-primary-foreground" />
              </div>
              Click the Feedback Button
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Look for the blue circular button in the bottom-right corner of your screen:
            </p>
            <div className="bg-muted/50 rounded-lg p-6 flex justify-center">
              <div className="relative">
                <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <MessageSquare className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="absolute -top-2 -right-2 animate-ping h-4 w-4 rounded-full bg-primary/50" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Available on every page for quick access
            </p>
          </CardContent>
        </Card>

        {/* Step 2: Choose Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Circle className="h-3 w-3 fill-primary-foreground" />
              </div>
              Choose Your Feedback Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground mb-3">
              Select the type that best matches your feedback:
            </p>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <Bug className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Bug Report</p>
                  <p className="text-xs text-muted-foreground">Something's broken or not working as expected</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Suggestion</p>
                  <p className="text-xs text-muted-foreground">Ideas for new features or improvements</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <Heart className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Praise</p>
                  <p className="text-xs text-muted-foreground">Something you love! We want to hear about wins too</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                <HelpCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Other</p>
                  <p className="text-xs text-muted-foreground">General questions or comments</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Be Specific */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Circle className="h-3 w-3 fill-primary-foreground" />
              </div>
              Be Specific
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground mb-3">
              The more detail you provide, the better we can help:
            </p>
            <div className="space-y-3">
              <div className="border-l-4 border-green-500 pl-3 py-2 bg-green-500/5">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-green-700 dark:bg-green-400 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-background" />
                  </div>
                  GOOD EXAMPLE:
                </p>
                <p className="text-sm">"When I clicked 'Start Conch Mode' on the Calendar page, the app froze for 5 seconds. I'm using an iPhone 13."</p>
              </div>
              <div className="border-l-4 border-destructive pl-3 py-2 bg-destructive/5">
                <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-destructive flex items-center justify-center">
                    <div className="h-2 w-0.5 bg-background rotate-45" />
                    <div className="h-2 w-0.5 bg-background -rotate-45 -ml-0.5" />
                  </div>
                  NOT AS HELPFUL:
                </p>
                <p className="text-sm">"Conch Mode doesn't work"</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Include what you were trying to do, what happened instead, and any error messages you saw
            </p>
          </CardContent>
        </Card>

        {/* What We Want to Hear */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              What We Want to Hear About
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                <span>Things that confused you</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                <span>Features you love or hate</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                <span>Bugs, crashes, or errors</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                <span>Ideas for improvement</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                <span>Slow or laggy experiences</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                <span>Missing features you need</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Try It Now */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Ready to share your thoughts?
              </p>
              <Button
                onClick={() => setFeedbackOpen(true)}
                size="lg"
                className="gap-2"
                data-testid="button-try-feedback-now"
              >
                <MessageSquare className="h-5 w-5" />
                Try the Feedback Widget Now
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <BetaNav
          currentPage={4}
          totalPages={5}
          prevLink="/beta/features"
          nextLink="/beta/faq"
          nextLabel="FAQ"
        />
      </div>

      {/* Feedback Widget */}
      <FeedbackWidget open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  );
}
