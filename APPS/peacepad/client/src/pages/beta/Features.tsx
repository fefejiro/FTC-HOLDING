import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BetaNav } from '@/components/BetaNav';
import { MessageSquare, Radio, Calendar, DollarSign, Sparkles } from 'lucide-react';

export default function BetaFeatures() {
  return (
    <div className="min-h-screen-dvh bg-background p-4 pb-24 lg:pb-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Core Features
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Explore the 4 main features that make PeacePad special
            </p>
          </CardHeader>
        </Card>

        {/* Feature 1: Chat with Tone Analysis */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2 mb-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Chat with Tone Analysis
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Send messages with real-time emotional intelligence
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/30 rounded-lg p-4 border-l-4 border-primary/50">
              <p className="text-sm mb-2">
                <strong>How it works:</strong>
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Type your message naturally</li>
                <li>PeacePad analyzes the emotional tone (calm, frustrated, defensive, etc.)</li>
                <li>Get suggestions to rephrase for better communication</li>
                <li>Send messages that reduce tension and improve understanding</li>
              </ul>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p>
                <strong>Beta tip:</strong> Try sending a frustrated message and see how PeacePad suggests calmer alternatives!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Feature 2: Conch Mode */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2 mb-2">
                  <Radio className="h-5 w-5 text-primary" />
                  Conch Mode - Take Turns Speaking
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Structured conversations where everyone gets heard
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/30 rounded-lg p-4 border-l-4 border-primary/50">
              <p className="text-sm mb-2">
                <strong>How it works:</strong>
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Start a voice/video call with built-in turn-taking</li>
                <li>Each person gets 30 seconds to speak without interruption</li>
                <li>Double-tap to pass your turn early</li>
                <li>Long-press for extra time (partner must approve)</li>
                <li>3-strike system keeps conversations respectful</li>
              </ul>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p>
                <strong>Beta tip:</strong> Perfect for difficult conversations where emotions run high. Everyone gets equal voice!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Feature 3: Calendar */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Shared Custody Calendar
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Coordinate schedules and prevent conflicts
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/30 rounded-lg p-4 border-l-4 border-primary/50">
              <p className="text-sm mb-2">
                <strong>How it works:</strong>
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Create events visible to both parents</li>
                <li>Set recurring patterns for regular custody schedules</li>
                <li>Smart conflict detection alerts you automatically</li>
                <li>Get reminders for upcoming events</li>
              </ul>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p>
                <strong>Beta tip:</strong> Try creating overlapping events to see how smart conflict detection works!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Feature 4: Expenses */}
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Expense Tracking
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track shared costs and simplify reimbursement
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/30 rounded-lg p-4 border-l-4 border-primary/50">
              <p className="text-sm mb-2">
                <strong>How it works:</strong>
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Upload receipts for shared child expenses</li>
                <li>Automatic 50/50 split (or custom percentages)</li>
                <li>Track payment status (pending, paid, disputed)</li>
                <li>See total balances at a glance</li>
              </ul>
            </div>
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p>
                <strong>Beta tip:</strong> Snap a photo of receipts directly in the app for quick expense logging!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Features */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base">More Features to Explore</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Beyond the core 4, you'll also find:
            </p>
            <div className="grid sm:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span>Shared tasks & to-dos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span>Child updates & notes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span>Support directory</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <span>Emotional insights (optional)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <BetaNav
          currentPage={3}
          totalPages={5}
          prevLink="/beta/getting-started"
          nextLink="/beta/feedback-guide"
          nextLabel="Feedback Guide"
        />
      </div>
    </div>
  );
}
