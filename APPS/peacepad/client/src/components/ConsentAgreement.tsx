import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Shield, CheckCircle2, ExternalLink, AlertCircle } from "lucide-react";
import { PageWrapper } from "@/components/PageWrapper";

interface ConsentAgreementProps {
  onAccept: (consents: {
    privacyAccepted: boolean;
    aiMessageConsent: boolean;
    ndaAccepted: boolean;
  }) => void;
}

export default function ConsentAgreement({ onAccept }: ConsentAgreementProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [aiMessageConsent, setAiMessageConsent] = useState(false);
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  
  const allRequiredAccepted = hasAcceptedTerms && privacyAccepted && ndaAccepted; // AI consent is optional

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasScrolledToBottom(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    if (allRequiredAccepted && hasScrolledToBottom) {
      onAccept({
        privacyAccepted,
        aiMessageConsent,
        ndaAccepted
      });
    }
  };

  return (
    <PageWrapper 
      variant="gradient" 
      maxWidth="md"
      aria-label="Terms of Service and Privacy Agreement"
      className="flex flex-col"
    >
      <Card className="rounded-3xl shadow-lg flex flex-col max-h-[90vh]">
        <CardContent className="p-4 sm:p-6 md:p-8 space-y-4 overflow-y-auto flex-1">
          <header className="text-center space-y-2">
            <div className="flex justify-center">
              <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">Terms of Service & Privacy</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Please review and accept our terms to continue
            </p>
          </header>

          {/* Secure Authentication Notice */}
          <div 
            className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-800 rounded-lg"
            role="note"
            aria-label="Authentication information"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100 text-sm sm:text-base">
                  Secure Sign-In
                </p>
                <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                  PeacePad uses secure authentication. You can sign in with Google, GitHub, or email - your credentials are always protected.
                </p>
              </div>
            </div>
          </div>

          {/* Key Points Summary */}
          <section 
            className="bg-muted/50 p-3 sm:p-4 rounded-lg space-y-2"
            aria-labelledby="key-points-heading"
          >
            <h2 id="key-points-heading" className="text-base sm:text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
              Key Points
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground" role="list">
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0 mt-0.5" aria-hidden="true">•</span>
                <span>All communications are recorded and may be used as evidence in legal proceedings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0 mt-0.5" aria-hidden="true">•</span>
                <span>Tone analysis helps improve communication quality</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0 mt-0.5" aria-hidden="true">•</span>
                <span>Communications are private between family members but may be subject to legal discovery</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0 mt-0.5" aria-hidden="true">•</span>
                <span>Proactive AI coach predicts conflicts and offers gentle suggestions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0 mt-0.5" aria-hidden="true">•</span>
                <span>AI suggestions are informational only - not professional legal or medical advice</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0 mt-0.5" aria-hidden="true">•</span>
                <span>Co-parent communications are confidential between you and your co-parent</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary shrink-0 mt-0.5" aria-hidden="true">•</span>
                <span>Service provided "as is" with limitation of liability</span>
              </li>
            </ul>
          </section>

          {/* Expand/Collapse All Agreements */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const allSections = ["recording", "ai", "privacy", "legal", "liability", "nda", "other"];
                if (expandedSections.length === allSections.length) {
                  setExpandedSections([]);
                } else {
                  setExpandedSections(allSections);
                }
              }}
              className="text-xs"
              data-testid="button-toggle-all-agreements"
              aria-expanded={expandedSections.length > 0}
              aria-controls="terms-accordion"
            >
              {expandedSections.length === 7 ? "Collapse All" : "Expand All"}
            </Button>
          </div>

          {/* Expandable Sections */}
          <Accordion 
            id="terms-accordion"
            type="multiple" 
            value={expandedSections}
            onValueChange={setExpandedSections}
            className="space-y-2"
          >
            <AccordionItem value="recording" className="border rounded-lg px-3">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline py-2">
                1. Communication Recording & Storage
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-muted-foreground space-y-2 pb-2">
                <p>All communications (messages and files) are recorded and stored. Recordings are used for family coordination, legal evidence, and service improvement. You must comply with recording consent laws in your jurisdiction.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ai" className="border rounded-lg px-3">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline py-2">
                2. AI Analysis & Proactive Coach
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-muted-foreground space-y-2 pb-2">
                <p><strong>Tone Analysis:</strong> AI analyzes message tone and suggests calmer alternatives to improve communication.</p>
                <p><strong>Proactive Coaching:</strong> The AI observes communication patterns over time, predicts potential conflicts 24-48 hours ahead, and offers gentle suggestions to prevent escalation.</p>
                <p><strong>Summaries & Reports:</strong> AI can generate daily parenting summaries, weekly relationship health reports, and court-ready documentation logs when requested.</p>
                <p><strong>Limitations:</strong> AI is not perfect and may be inaccurate. AI-generated content is informational only and NOT professional advice. You can adjust or disable AI features anytime in Settings.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="privacy" className="border rounded-lg px-3">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline py-2">
                3. Privacy & Data Security
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-muted-foreground space-y-2 pb-2">
                <p>1:1 communications are private between family members. Data is retained indefinitely unless you request deletion. We implement security measures but cannot guarantee absolute security. Data may be stored on third-party servers.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="legal" className="border rounded-lg px-3">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline py-2">
                4. Legal Use & Exported Data
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-muted-foreground space-y-2 pb-2">
                <p>You can export communications for legal proceedings. We make no guarantees about admissibility in court. You're responsible for establishing authenticity. Communications may be subject to discovery or court orders.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="liability" className="border rounded-lg px-3">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline py-2">
                5. Limitation of Liability
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-muted-foreground space-y-2 pb-2">
                <p>Service provided "AS IS" without warranties. We're not liable for indirect damages, technical issues, data loss, or legal outcomes. Maximum liability limited to $100 or fees paid in last 12 months, whichever is greater.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="nda" className="border rounded-lg px-3">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline py-2">
                6. Confidentiality Agreement
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-muted-foreground space-y-2 pb-2">
                <p><strong>Confidential Information:</strong> Communications between you and your co-parent are confidential. Do not disclose to third parties except as required by law, court order, or with consent.</p>
                <p><strong>Exceptions:</strong> You may use data in legal proceedings, share with professional advisors, or disclose for safety concerns.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="other" className="border rounded-lg px-3">
              <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline py-2">
                7. Other Terms
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-muted-foreground space-y-2 pb-2">
                <p><strong>Indemnification:</strong> You agree to indemnify PeacePad from claims arising from your use of the service.</p>
                <p><strong>Dispute Resolution:</strong> Disputes resolved by binding arbitration. No class actions allowed.</p>
                <p><strong>Modifications:</strong> We may update terms with notice. Continued use constitutes acceptance.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 py-3" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6, 7].map((dot) => (
              <div
                key={dot}
                className="h-1.5 w-1.5 rounded-full bg-primary/30"
              />
            ))}
          </div>

          {/* Full Terms Link */}
          <div className="text-center">
            <Link href="/terms" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              Read full Terms
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>

          {/* Consent Checkboxes */}
          <fieldset 
            className="space-y-3 bg-muted/30 p-3 sm:p-4 rounded-lg"
            aria-describedby="consent-description"
          >
            <legend className="sr-only">Required consents</legend>
            <p id="consent-description" className="sr-only">
              Check all required boxes to continue with PeacePad
            </p>
            
            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={hasAcceptedTerms}
                onCheckedChange={(checked) => setHasAcceptedTerms(checked as boolean)}
                disabled={!hasScrolledToBottom}
                data-testid="checkbox-accept-terms"
                className="mt-1"
                aria-describedby="terms-label"
              />
              <label
                id="terms-label"
                htmlFor="terms"
                className="text-sm leading-tight cursor-pointer select-none"
              >
                I have read and accept the <Link href="/terms" className="text-primary hover:underline">Terms</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy</Link> (required)
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="privacy"
                checked={privacyAccepted}
                onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
                disabled={!hasScrolledToBottom}
                data-testid="checkbox-accept-privacy"
                className="mt-1"
                aria-describedby="privacy-label"
              />
              <label
                id="privacy-label"
                htmlFor="privacy"
                className="text-sm leading-tight cursor-pointer select-none"
              >
                I understand my communications will be recorded and may be used in legal proceedings (required)
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="ai-message"
                checked={aiMessageConsent}
                onCheckedChange={(checked) => setAiMessageConsent(checked as boolean)}
                disabled={!hasScrolledToBottom}
                data-testid="checkbox-ai-message-consent"
                className="mt-1"
                aria-describedby="ai-message-label"
              />
              <label
                id="ai-message-label"
                htmlFor="ai-message"
                className="text-sm leading-tight cursor-pointer select-none"
              >
                I consent to AI coaching features including tone analysis, conflict prediction, and personalized suggestions <span className="text-muted-foreground">(optional - can be disabled in Settings)</span>
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="nda"
                checked={ndaAccepted}
                onCheckedChange={(checked) => setNdaAccepted(checked as boolean)}
                disabled={!hasScrolledToBottom}
                data-testid="checkbox-accept-nda"
                className="mt-1"
                aria-describedby="nda-label"
              />
              <label
                id="nda-label"
                htmlFor="nda"
                className="text-sm leading-tight cursor-pointer select-none"
              >
                I agree to keep co-parent communications confidential (required)
              </label>
            </div>

          </fieldset>

        </CardContent>
        
        {/* Sticky Footer with Accept Button */}
        <div className="border-t bg-card p-4 sm:p-6 md:p-8 space-y-3 flex-shrink-0">
          <Button
            onClick={handleAccept}
            disabled={!allRequiredAccepted || !hasScrolledToBottom}
            className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold transition-all duration-150 active:scale-[0.98]"
            size="lg"
            data-testid="button-accept-terms"
            aria-describedby={!allRequiredAccepted ? "accept-hint" : undefined}
          >
            {allRequiredAccepted && hasScrolledToBottom ? "Accept & Continue" : "Accept & Continue"}
          </Button>
          {!allRequiredAccepted && (
            <p id="accept-hint" className="text-xs text-center text-muted-foreground">
              Please check all required boxes to continue
            </p>
          )}
        </div>
      </Card>
    </PageWrapper>
  );
}
