import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BetaNav } from '@/components/BetaNav';
import { PartyPopper, CheckCircle, Lock, Users, Circle } from 'lucide-react';

export default function BetaWelcome() {
  return (
    <div className="min-h-screen-dvh bg-background p-4 pb-24 lg:pb-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Hero Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardHeader className="text-center space-y-4 pb-4">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <PartyPopper className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl sm:text-3xl mb-2">
                Welcome to PeacePad Beta!
              </CardTitle>
              <p className="text-muted-foreground text-sm sm:text-base">
                You're one of 100 early users helping shape the future of co-parenting communication
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm sm:text-base leading-relaxed">
                Thank you for joining us on this journey! Your feedback and experience will directly influence how PeacePad helps families communicate better.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What to Expect */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-primary" />
              What to Expect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Circle className="h-3 w-3 text-primary fill-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Test Real Features</h4>
                <p className="text-sm text-muted-foreground">
                  Use PeacePad with your co-parent just like the final product. Everything you see is real and functional.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Circle className="h-3 w-3 text-primary fill-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Share Honest Feedback</h4>
                <p className="text-sm text-muted-foreground">
                  Tell us what works, what doesn't, and what could be better. No filter needed!
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Circle className="h-3 w-3 text-primary fill-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Help Us Improve</h4>
                <p className="text-sm text-muted-foreground">
                  Your input shapes every update. You're building this with us!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Matters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-primary" />
              Your Privacy Matters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All conversations and data in PeacePad are private and encrypted. As a beta tester, you've agreed to our NDA. We take your trust seriously and will never share your personal information or conversations.
            </p>
          </CardContent>
        </Card>

        {/* Beta Community */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium mb-1">You're Part of Something Special</h4>
                <p className="text-sm text-muted-foreground">
                  As one of 100 beta testers, you're helping create a tool that will support thousands of families. Thank you for being here!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <BetaNav
          currentPage={1}
          totalPages={5}
          nextLink="/beta/getting-started"
          nextLabel="Getting Started"
        />
      </div>
    </div>
  );
}
