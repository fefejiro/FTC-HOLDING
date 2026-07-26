import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageCircle, Sparkles, Shield, AlertCircle, Lightbulb, Bell } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { WhatsNewModal } from "@/components/WhatsNewModal";

export default function HelpPage() {
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  
  return (
    <div className="min-h-screen-dvh bg-background w-full pb-20">
      <SEOHead
        title="Help & FAQ | How to Use PeacePad Co-Parenting App"
        description="Get help with PeacePad: learn how to use messaging with tone analysis, shared custody calendar, expense tracking, and Conch Mode for structured conversations. Quick start guides for co-parents."
        keywords="PeacePad help, co-parenting app tutorial, how to use PeacePad, tone analysis help, shared calendar guide"
        canonical="https://peacepad.ca/help"
      />
      
      {/* What's New Modal */}
      <WhatsNewModal open={whatsNewOpen} onOpenChange={setWhatsNewOpen} />
      
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="text-help-title">
              Help & Getting Started
            </h1>
            <p className="text-muted-foreground">
              Learn how to use PeacePad's features to improve your family communication
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setWhatsNewOpen(true)}
            className="flex items-center gap-2 self-start"
            data-testid="button-whats-new"
          >
            <Bell className="h-4 w-4" />
            What's New
          </Button>
        </div>

        {/* Onboarding Checklist */}
        <OnboardingChecklist />

        {/* Chat Features Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <CardTitle>Chat & Messaging</CardTitle>
            </div>
            <CardDescription>
              Send messages, share updates, and communicate with your family
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="send-message">
                <AccordionTrigger data-testid="accordion-send-message">
                  How do I send a message?
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p>Sending messages in PeacePad is easy:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Navigate to the Chat page (home screen)</li>
                      <li>Type your message in the text box at the bottom</li>
                      <li>Click the send button or press Enter</li>
                      <li>Your message will appear instantly</li>
                    </ol>
                    <p className="text-muted-foreground mt-2 flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Tip: Press Shift+Enter to add a new line without sending</span>
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="voice-note">
                <AccordionTrigger data-testid="accordion-voice-note">
                  How do voice notes work?
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p>Send voice messages when typing isn't convenient:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Click the microphone icon in the message input</li>
                      <li>Allow microphone access when prompted</li>
                      <li>Speak your message (max 2 minutes)</li>
                      <li>Click Stop when finished</li>
                      <li>Preview your recording and click Send</li>
                    </ol>
                    <p className="text-muted-foreground mt-2 flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>You can delete and re-record if you're not happy with the result</span>
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="message-not-sending">
                <AccordionTrigger data-testid="accordion-message-not-sending">
                  Why isn't my message sending?
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p>If messages aren't sending, try these steps:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Check your internet connection</li>
                      <li>Refresh the page</li>
                      <li>Make sure you're still logged in</li>
                      <li>Ensure you have an active partnership</li>
                    </ol>
                    <p className="text-muted-foreground mt-2">
                      Still having issues? Contact support or check the error logs at /admin/errors
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="conversation-privacy">
                <AccordionTrigger data-testid="accordion-conversation-privacy">
                  Is my conversation private?
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p>
                      PeacePad limits in-app message access to authenticated conversation
                      participants. Authorized service providers may process information only as
                      described in the Privacy Policy.
                    </p>
                    <p>Security features:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Transport encryption for data in transit</li>
                      <li>Secure authentication</li>
                      <li>Partnership-scoped conversations</li>
                      <li>Authenticated, record-aware access controls</li>
                    </ul>
                    <p className="text-muted-foreground mt-2">
                      PeacePad messages are not end-to-end encrypted. Optional AI processing stays
                      off unless you choose it.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Tone Analysis Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Tone Analysis</CardTitle>
            </div>
            <CardDescription>
              Smart communication assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="what-is-tone-analysis">
                <AccordionTrigger data-testid="accordion-what-is-tone-analysis">
                  What is tone analysis?
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p>
                      Tone analysis helps you communicate more effectively by analyzing the emotional
                      tone of your messages before you send them.
                    </p>
                    <p className="font-medium mt-2">How it works:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Type your message as normal</li>
                      <li>PeacePad analyzes the tone automatically</li>
                      <li>You'll see a tone badge (calm, frustrated, etc.)</li>
                      <li>Get suggestions for rewording if needed</li>
                    </ol>
                    <p className="text-muted-foreground mt-2">
                      This feature is opt-in and can be disabled in Settings at any time
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tone-colors">
                <AccordionTrigger data-testid="accordion-tone-colors">
                  What do the different tone colors mean?
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 text-sm">
                    <p>Each tone is represented by a different color badge:</p>
                    <div className="space-y-2 ml-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-500">Calm</Badge>
                        <span>Peaceful, measured, constructive communication</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-blue-500">Cooperative</Badge>
                        <span>Collaborative, solution-focused, teamwork-oriented</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-gray-500">Neutral</Badge>
                        <span>Factual, informational, matter-of-fact</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-yellow-500">Frustrated</Badge>
                        <span>Signs of frustration or impatience</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-orange-500">Defensive</Badge>
                        <span>Protective or justifying language</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">Hostile</Badge>
                        <span>Aggressive, confrontational, or inflammatory</span>
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-2 flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Aim for calm, cooperative, or neutral tones for best results</span>
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="reword-suggestion">
                <AccordionTrigger data-testid="accordion-reword-suggestion">
                  How do I use reword suggestions?
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p>When PeacePad detects a potentially problematic tone, you'll see reword suggestions:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Look for the "Reword Suggestion" button</li>
                      <li>Click to see suggested alternative phrasing</li>
                      <li>Review the suggested message</li>
                      <li>Click "Use This" to replace your message</li>
                      <li>Or edit further before sending</li>
                    </ol>
                    <p className="font-medium mt-2">Example:</p>
                    <div className="bg-muted p-3 rounded space-y-2 mt-2">
                      <p>
                        <strong>Original:</strong> "You never listen to what I say about the kids"
                      </p>
                      <p>
                        <strong>Reworded:</strong> "I'd like to discuss the kids' schedule. Can we find
                        a time to talk?"
                      </p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="ai-accuracy">
                <AccordionTrigger data-testid="accordion-ai-accuracy">
                  How accurate is the analysis?
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p>
                      Our analysis is powered by advanced language models and is generally accurate, but
                      it's not perfect. Consider it a helpful assistant, not an absolute authority.
                    </p>
                    <p className="font-medium mt-2">Important notes:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Analysis may occasionally misinterpret sarcasm or humor</li>
                      <li>Cultural context and personal communication styles vary</li>
                      <li>You always have the final say on what to send</li>
                      <li>Use your judgment alongside the feedback</li>
                    </ul>
                    <p className="text-muted-foreground mt-2">
                      The goal is to promote reflection, not to censor communication
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="disable-ai">
                <AccordionTrigger data-testid="accordion-disable-ai">
                  Can I disable tone analysis?
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Yes!</strong> Tone analysis is completely optional and can be toggled
                      on/off at any time.
                    </p>
                    <p>To disable tone analysis:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Go to Settings</li>
                      <li>Find "Optional AI processing"</li>
                      <li>Turn off "Allow third-party AI message processing"</li>
                    </ol>
                    <p className="text-muted-foreground mt-2">
                      The change is saved immediately. Rule-based message guidance remains
                      available while third-party AI processing is off.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Troubleshooting Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              <CardTitle>Troubleshooting</CardTitle>
            </div>
            <CardDescription>
              Common issues and how to fix them
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="app-slow">
                <AccordionTrigger data-testid="accordion-app-slow">
                  The app is running slowly
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p>Try these steps to improve performance:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Clear your browser cache</li>
                      <li>Close unnecessary browser tabs</li>
                      <li>Check your internet connection speed</li>
                      <li>Try a different browser</li>
                      <li>Restart your device</li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="logged-out">
                <AccordionTrigger data-testid="accordion-logged-out">
                  I keep getting logged out
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p>This can happen for a few reasons:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Session timeout after inactivity</li>
                      <li>Browser clearing cookies automatically</li>
                      <li>Using private/incognito mode</li>
                    </ul>
                    <p className="mt-2">To prevent this:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Enable cookies for PeacePad</li>
                      <li>Use a standard browser window (not private mode)</li>
                      <li>Save your password for quick re-login</li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="error-occurred">
                <AccordionTrigger data-testid="accordion-error-occurred">
                  I saw an error message
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 text-sm">
                    <p>Error messages help us identify and fix issues:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Note the error message text</li>
                      <li>Try refreshing the page</li>
                      <li>If the error persists, check /admin/errors for details</li>
                      <li>Contact support with the error details</li>
                    </ol>
                    <p className="text-muted-foreground mt-2">
                      All errors are logged automatically to help improve the app
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Best Practices Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <CardTitle>Best Practices</CardTitle>
            </div>
            <CardDescription>
              Tips for effective family communication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2 text-green-600 dark:text-green-400">Do:</h4>
                <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
                  <li>Focus on the children's needs</li>
                  <li>Keep messages brief and to the point</li>
                  <li>Use "I" statements instead of "you" accusations</li>
                  <li>Suggest solutions, not just problems</li>
                  <li>Take a breath before sending emotional messages</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2 text-destructive">Avoid:</h4>
                <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
                  <li>Bringing up past conflicts</li>
                  <li>Using ALL CAPS (it reads as shouting)</li>
                  <li>Sending messages late at night</li>
                  <li>Making assumptions about intent</li>
                  <li>Responding immediately when angry</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Still Need Help?</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              If you can't find the answer you're looking for, we're here to help:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-muted-foreground">
              <li>Check the error logs at /admin/errors for technical issues</li>
              <li>Review our Privacy Policy and Terms for legal questions</li>
              <li>Contact support for account-specific help</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
