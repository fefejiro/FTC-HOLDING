import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function TermsPage() {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    setLocation("/settings");
  };

  return (
    <>
      <SEOHead
        title="Terms of Use | PeacePad Co-Parenting App"
        description="PeacePad Terms of Use: Understand the terms governing your use of PeacePad, including acceptable use, confidentiality, and service policies."
        canonical="https://peacepad.ca/terms"
      />
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pb-20 overflow-x-hidden">
        <Button 
          variant="ghost" 
          onClick={handleBack}
          className="gap-2 mb-4"
          data-testid="button-back-to-settings"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Settings
        </Button>
        
        <h1 className="sr-only">Terms & Conditions</h1>
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Terms & Conditions</h2>
        <p className="text-muted-foreground mb-6">
          Please read these terms carefully before using PeacePad
        </p>
        
        <div className="space-y-6 text-sm md:text-base">
          {/* Introduction */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to PeacePad. By accessing or using our co-parenting communication platform, 
              you agree to be bound by these Terms and Conditions, including the Confidentiality 
              Agreement outlined below. If you do not agree to these terms, please do not 
              use our services.
            </p>
          </section>

          {/* Confidentiality Section */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold mb-3">2. Confidentiality Agreement</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">2.1 Confidential Information</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All communications, messages, notes, tasks, schedules, and any other content 
                  shared through PeacePad ("Confidential Information") are considered private 
                  and confidential between you and your co-parent(s).
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">2.2 User Obligations</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  You agree to:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Keep all information shared on PeacePad strictly confidential</li>
                  <li>Not disclose, share, or distribute any content without explicit consent from all parties involved</li>
                  <li>Use information obtained through PeacePad solely for co-parenting purposes</li>
                  <li>Not use screenshots, recordings, or any other means to share content outside the platform without permission</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">2.3 Exceptions</h3>
                <p className="text-muted-foreground leading-relaxed">
                  This confidentiality agreement does not apply to information that: (a) is required to be disclosed 
                  by law or court order; (b) relates to child safety or welfare concerns that 
                  must be reported to appropriate authorities; or (c) is necessary for legal 
                  proceedings directly related to custody or co-parenting arrangements.
                </p>
              </div>
            </div>
          </section>

          {/* Privacy & Data */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold mb-3">3. Privacy & Data Protection</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We take your privacy seriously. Your data is protected using industry-standard 
              encryption and security measures. For complete details, please read our{" "}
              <a href="/privacy" className="text-primary hover:underline" data-testid="link-privacy-policy">
                Privacy Policy
              </a>.
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>We will never sell your personal information to third parties</li>
              <li>Your messages and content are encrypted in transit and at rest</li>
              <li>Tone analysis is performed securely and privately</li>
              <li>You can request deletion of your data at any time</li>
            </ul>
          </section>

          {/* Account Security */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold mb-3">4. Account Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials 
              and for all activities that occur under your account. Please use strong 
              authentication methods and do not share your login information.
            </p>
          </section>

          {/* Acceptable Use */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold mb-3">5. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">
              You agree not to use PeacePad to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Harass, threaten, or intimidate other users</li>
              <li>Share illegal, harmful, or inappropriate content</li>
              <li>Attempt to gain unauthorized access to the platform or other users' accounts</li>
              <li>Impersonate others or misrepresent your identity</li>
              <li>Use the platform for any purpose other than co-parenting communication</li>
            </ul>
          </section>

          {/* AI Features */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold mb-3">6. AI Features & Proactive Coach</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">6.1 AI Tone Analysis</h3>
                <p className="text-muted-foreground leading-relaxed">
                  PeacePad uses AI to analyze message tone and suggest improvements. This feature 
                  is designed to promote constructive communication. AI suggestions are optional, 
                  and you maintain full control over your messages.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">6.2 Proactive AI Coach</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  PeacePad includes a proactive AI coaching system that:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li>Observes communication patterns over time to provide personalized insights</li>
                  <li>Predicts potential conflicts 24-48 hours in advance based on historical patterns</li>
                  <li>Offers gentle nudges and suggestions to prevent escalation</li>
                  <li>Generates optional daily and weekly summaries of co-parenting activities</li>
                  <li>Provides court-ready documentation logs when requested</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">6.3 AI Behavior Principles</h3>
                <p className="text-muted-foreground leading-relaxed mb-2">
                  Our AI operates under these core principles:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                  <li><strong>Non-intrusive:</strong> AI observes and suggests, never blocks or forces actions</li>
                  <li><strong>User autonomy:</strong> You can always dismiss suggestions and send messages as written</li>
                  <li><strong>Privacy-first:</strong> AI analysis is performed securely; data is not shared with third parties</li>
                  <li><strong>Configurable:</strong> All AI features can be adjusted or disabled in Settings</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">6.4 AI Limitations</h3>
                <p className="text-muted-foreground leading-relaxed">
                  AI suggestions are not professional advice. The AI may occasionally misinterpret 
                  context or provide imperfect suggestions. Always use your own judgment when 
                  communicating with your co-parent. For serious conflicts or safety concerns, 
                  please consult qualified professionals.
                </p>
              </div>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold mb-3">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              PeacePad is a communication tool and does not provide legal, therapeutic, or 
              professional advice. We are not responsible for decisions made based on 
              communications through our platform. For legal matters, custody issues, or 
              mental health support, please consult qualified professionals.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold mb-3">8. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms and Conditions from time to time. Continued use of 
              PeacePad after changes are posted constitutes your acceptance of the revised terms. 
              We will notify you of significant changes via email or in-app notification.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold mb-3">9. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your account if you violate these 
              terms. You may also delete your account at any time through the Settings page.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-lg md:text-xl font-semibold mb-3">10. Contact Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms and Conditions, please contact 
              us through the Settings page or email <a href="mailto:peacepad@peacepad.ca" className="text-primary hover:underline">peacepad@peacepad.ca</a>.
            </p>
          </section>

          {/* Effective Date */}
          <section className="pt-4 border-t">
            <p className="text-sm text-muted-foreground italic">
              Last Updated: January 31, 2026
            </p>
            <p className="text-sm text-muted-foreground italic mt-1">
              Effective Date: January 31, 2026
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
