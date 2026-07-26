import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BetaNav } from '@/components/BetaNav';
import { HelpCircle, AlertTriangle, Mail, MessageSquare, BookOpen } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

export default function BetaFAQ() {
  return (
    <div className="min-h-screen-dvh bg-background p-4 pb-24 lg:pb-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <HelpCircle className="h-6 w-6 text-primary" />
              FAQ & Known Issues
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Common questions and current limitations
            </p>
          </CardHeader>
        </Card>

        {/* Common Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Common Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="invite">
                <AccordionTrigger className="text-left text-sm">
                  How do I invite my co-parent?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Go to Settings → Partnerships → "Create New Partnership". You'll get a QR code and a text code. Share either one with your co-parent, and they can accept it in their Settings → Partnerships → "Accept Invite".
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="security">
                <AccordionTrigger className="text-left text-sm">
                  Is my data secure?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  PeacePad uses transport encryption and authenticated, partnership-scoped access
                  controls. Messages are not end-to-end encrypted. See the Privacy Policy for how
                  service providers process information and the limited circumstances in which it
                  may be disclosed.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="desktop">
                <AccordionTrigger className="text-left text-sm">
                  Can I use PeacePad on desktop?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes! PeacePad works on any device with a web browser. However, it's optimized for mobile phones and tablets. Some features like Conch Mode work best on mobile devices with camera/microphone access.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="after-beta">
                <AccordionTrigger className="text-left text-sm">
                  What happens after the beta?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Your account and all your data will carry over to the full release. As an early beta tester, you'll receive special benefits and early access to new features. We'll keep you updated throughout the process!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="multiple-partners">
                <AccordionTrigger className="text-left text-sm">
                  Can I have multiple partnerships?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Yes! PeacePad supports multiple co-parenting partnerships. This is helpful if you have children with different partners or if you need to coordinate with step-parents.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ai-privacy">
                <AccordionTrigger className="text-left text-sm">
                  Does PeacePad analyze all my messages?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Tone analysis only analyzes messages you choose to check before sending. Your sent messages are not analyzed unless you opt-in. Listening during Conch Mode is completely optional and must be enabled by both partners.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="offline">
                <AccordionTrigger className="text-left text-sm">
                  Does PeacePad work offline?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Limited offline support is available. You can view previously loaded messages and calendar events. New messages and real-time features require an internet connection. We're working on improving offline capabilities!
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cost">
                <AccordionTrigger className="text-left text-sm">
                  Will PeacePad cost money?
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  Pricing hasn't been finalized yet. As a beta tester, you'll get preferential pricing when we launch. Your feedback will help us determine the right pricing model that works for families.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Known Issues */}
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              Known Issues & Limitations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground mb-2">
              We're actively working on these items:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Calendar sync:</strong> External calendar integration (Google Calendar, Apple Calendar) is coming soon
                </p>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Push notifications:</strong> May be delayed on some devices. Working on improvements
                </p>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Image quality:</strong> Receipt photos may appear compressed on slower connections
                </p>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p>
                  <strong>Browser compatibility:</strong> Works best on Chrome, Safari, and Edge. Firefox support is in progress
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              If you encounter any issues not listed here, please report them using the feedback widget!
            </p>
          </CardContent>
        </Card>

        {/* Need Help */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Still Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We're here to support you during the beta:
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <MessageSquare className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm mb-1">Use the Feedback Widget</p>
                  <p className="text-xs text-muted-foreground">
                    Fastest way to get help - available on every page
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <BookOpen className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm mb-1">Review the Beta Guide</p>
                  <p className="text-xs text-muted-foreground">
                    Re-read the getting started and feature tour sections
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Start */}
        <div className="text-center">
          <Link href="/beta/welcome">
            <Button variant="outline" data-testid="button-back-to-welcome">
              ← Back to Welcome
            </Button>
          </Link>
        </div>

        {/* Navigation */}
        <BetaNav
          currentPage={5}
          totalPages={5}
          prevLink="/beta/feedback-guide"
          prevLabel="Feedback Guide"
        />
      </div>
    </div>
  );
}
