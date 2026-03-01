import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyPolicy() {
  const termsfeedUrl = "https://www.termsfeed.com/live/d70738c7-5e03-4fa8-9029-4bb84f042046";
  
  return (
    <>
      <SEOHead
        title="Privacy Policy | PeacePad Co-Parenting App"
        description="PeacePad Privacy Policy: Learn how we protect your family's data, messages, and personal information. We never sell your data to third parties."
        canonical="https://peacepad.ca/privacy"
      />
      <div className="min-h-screen-dvh bg-background flex flex-col">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container flex h-14 items-center gap-4 px-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to PeacePad
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Privacy Policy</h1>
          </div>
        </header>
        
        <main className="flex-1 w-full max-w-4xl mx-auto p-6">
          <div className="space-y-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold mb-4">PeacePad Privacy Policy</h2>
              <p className="text-muted-foreground mb-6">
                Your family's privacy comes first. We take protecting your data seriously.
              </p>
              <a
                href={termsfeedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
                data-testid="link-termsfeed-privacy"
              >
                <Button size="lg">
                  View Full Privacy Policy
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </a>
            </div>
            
            <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-semibold">Privacy Highlights</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  We never sell your personal information to third parties
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Your messages and content are encrypted in transit and at rest
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Tone analysis is performed securely and privately
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  You can request deletion of your data at any time
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  We comply with GDPR and applicable privacy regulations
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <strong>Precise Location:</strong> High-accuracy GPS data is used to find local support. It is cached locally and never shared with co-parents.
                </li>
              </ul>
            </div>
            
            <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-semibold">AI Coach & Location Data</h3>
              <p className="text-muted-foreground text-sm mb-3">
                Our AI systems enhance your experience using the following practices:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <strong>AI Location Enhancement:</strong> Location data may be processed by AI (GPT-4o-mini) to improve precision and validate addresses.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <strong>Pattern Analysis:</strong> The AI observes your communication patterns to provide personalized insights. This data stays within your partnership.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <strong>Memory Retention:</strong> AI memories are stored for up to 90 days to enable pattern recognition. You can delete these anytime in AI Coach Settings.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <strong>Conflict Predictions:</strong> Predictive insights are generated locally and are not shared with third parties or your co-parent.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <strong>Court Logs:</strong> Court-ready documentation is only generated when you explicitly request it and is stored privately in your account.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <strong>Privacy Modes:</strong> You can choose Enhanced privacy mode to limit AI data collection and analysis.
                </li>
              </ul>
            </div>
            
            <div className="border-t pt-6">
              <p className="text-sm text-muted-foreground">
                For questions about our privacy practices, contact us at{" "}
                <a href="mailto:peacepad@peacepad.ca" className="text-primary hover:underline">
                  peacepad@peacepad.ca
                </a>
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
