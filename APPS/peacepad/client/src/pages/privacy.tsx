import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const POLICY_VERSION = "1.0";
const EFFECTIVE_DATE = "July 25, 2026";

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t pt-6">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  );
}

function PolicyList({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}

export default function PrivacyPolicy() {
  return (
    <>
      <SEOHead
        title="Privacy Policy | PeacePad"
        description="How PeacePad collects, uses, shares, and protects information in its mobile app and website."
        canonical="https://peacepad.ca/privacy"
      />
      <div className="min-h-screen-dvh bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center gap-4 px-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back-home">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to PeacePad
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Privacy Policy</h1>
          </div>
        </header>

        <main className="mx-auto w-full max-w-4xl space-y-6 p-6 pb-16">
          <div className="space-y-3 py-4">
            <p className="text-sm font-medium text-primary">PeacePad mobile app and website</p>
            <h1 className="text-3xl font-bold tracking-tight">PeacePad Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">
              Effective {EFFECTIVE_DATE} · Version {POLICY_VERSION}
            </p>
            <p className="max-w-3xl leading-7 text-muted-foreground">
              PeacePad is a communication and organization service for adults managing shared
              parenting responsibilities. This policy explains what information the current
              PeacePad mobile app and website handle, why it is used, and the choices available to
              you.
            </p>
          </div>

          <PolicySection title="1. Who operates PeacePad">
            <p>
              PeacePad is operated by Fejiro Technology Consultancy Inc. References to
              “PeacePad,” “we,” “us,” and “our” in this policy refer to that operator.
            </p>
            <p>
              Questions or privacy requests can be sent to{" "}
              <a className="font-medium text-primary hover:underline" href="mailto:peacepad@peacepad.ca">
                peacepad@peacepad.ca
              </a>
              .
            </p>
          </PolicySection>

          <PolicySection title="2. Information PeacePad may collect">
            <PolicyList>
              <li>
                <strong>Account and profile information:</strong> name, email address, phone number,
                authentication identifiers, profile details, communication preferences, and
                consent choices.
              </li>
              <li>
                <strong>Shared-family information:</strong> information an adult chooses to enter
                about a co-parenting relationship, children, schedules, tasks, notes, events,
                expenses, receipts, safety plans, or other organization records.
              </li>
              <li>
                <strong>Messages and other content:</strong> messages, drafts, tone-check inputs,
                support requests, attachments, photos, video, audio, voice notes, and any
                transcripts or AI suggestions produced at your request.
              </li>
              <li>
                <strong>Call information:</strong> call participants, time, duration, status, and,
                only when a recording or AI listening feature is deliberately used, related audio,
                recording, transcript, or analysis.
              </li>
              <li>
                <strong>Location:</strong> location you type or choose and, after device permission,
                precise coordinates used for nearby resources, maps, weather, or reverse
                geocoding.
              </li>
              <li>
                <strong>Device and service information:</strong> session and user identifiers,
                push-notification tokens, security and audit events, app version, request metadata,
                and limited diagnostic information needed to operate and protect the service.
              </li>
            </PolicyList>
            <p>
              PeacePad does not require every category above for basic use. The information handled
              depends on the features you choose.
            </p>
          </PolicySection>

          <PolicySection title="3. How information is used">
            <PolicyList>
              <li>Provide accounts, messaging, shared organization, calls, and notifications.</li>
              <li>Save and display the content and records you choose to create.</li>
              <li>Authenticate users, prevent abuse, troubleshoot failures, and secure the service.</li>
              <li>Respond to support, privacy, export, and account-deletion requests.</li>
              <li>
                Provide optional AI-assisted tone, transcription, and coaching only when the
                relevant stored consent is enabled.
              </li>
            </PolicyList>
          </PolicySection>

          <PolicySection title="4. AI-assisted features">
            <p>
              PeacePad includes rule-based tone guidance that can operate without sending message
              text to an external AI provider. Separate AI-assisted message features are optional.
              When AI message consent is enabled, message text may be sent to OpenAI for tone or
              rewrite assistance when you send a message. Prep Chat may send the topic, prompts,
              message history, and personality-style selection needed for a coaching or drafting
              request. Audio or a voice note you deliberately submit for transcription may also be
              sent to OpenAI.
            </p>
            <p>
              External AI processing for live calls and Conch summaries, court-log generation,
              event suggestions, location enhancement, the version 2 AI routes, and pattern
              learning is disabled or unavailable in this release. Those flows do not send their
              content to OpenAI in the current release.
            </p>
            <p>
              AI suggestions are advisory. You decide whether to use, edit, send, or ignore them.
              Disabling AI consent does not prevent you from sending messages or using the
              rule-based message preview.
            </p>
          </PolicySection>

          <PolicySection title="5. Analytics in this release">
            <p>
              The current iOS release does not load Google Analytics and does not transmit product
              events to PostHog. Operational security logs and limited service diagnostics may
              still be created when needed to run, protect, and troubleshoot PeacePad.
            </p>
          </PolicySection>

          <PolicySection title="6. Location and device permissions">
            <p>
              Camera, microphone, photo-library, notification, and location permissions are
              requested only when a feature needs them. You can deny or later change a permission
              in device settings. Core message drafting and rule-based tone guidance do not require
              every optional permission.
            </p>
            <p>
              Reverse geocoding may send coordinates to OpenStreetMap’s Nominatim service. Other
              location-based features may contact mapping or weather providers with the location
              needed to answer your request. PeacePad does not use an external IP-address
              geolocation fallback in this release.
            </p>
          </PolicySection>

          <PolicySection title="7. Service providers and disclosures">
            <p>
              We use service providers to operate PeacePad. Depending on the feature used, these may
              include Cloudflare for web delivery and security, Railway and database infrastructure
              for application hosting and storage, OpenAI for the consented message, Prep Chat, and
              transcription requests described above, OpenStreetMap Nominatim and other mapping or
              weather providers for user-initiated location requests, Mailjet for service email,
              Firebase, Apple, and Web Push infrastructure for notifications, and WebRTC
              connectivity providers for calls.
            </p>
            <p>
              The public interface in this release does not offer Google, Supabase, or another
              social sign-in option. It advertises only PeacePad's isolated account-access path.
              Legacy OIDC and Supabase-compatible authentication routes remain in the code for
              compatibility and may process authentication identifiers only if they are separately
              configured and deliberately invoked; they are not used by the guest or isolated
              reviewer-account paths.
            </p>
            <p>
              Providers receive only the information reasonably needed to perform their service.
              We may also disclose information when required by law, to protect users or the
              service, or as part of a business transfer subject to appropriate safeguards. We do
              not sell personal information or use PeacePad content for cross-app targeted
              advertising.
            </p>
          </PolicySection>

          <PolicySection title="8. Retention, export, and deletion">
            <p>
              We retain account information and user-created content while needed to provide the
              service, meet security and legal obligations, resolve disputes, and maintain limited
              backups. Different records may have different retention periods.
            </p>
            <p>
              You can use <strong>Settings → Privacy, data, and help</strong> to export available
              account data or permanently delete your account in the app. Account deletion
              immediately removes your profile, private records, sessions, tokens, and owned
              uploads. Shared messages and workspace history that a co-parent must still be able
              to access are retained only when they cannot safely be removed, with your identity
              replaced by a permanently disabled deleted-user record.
            </p>
            <p>
              You may also contact{" "}
              <a className="font-medium text-primary hover:underline" href="mailto:peacepad@peacepad.ca">
                peacepad@peacepad.ca
              </a>
              {" "}with a deletion question. We may retain limited information when legally
              required or for security and fraud prevention, and backup copies may expire on
              their normal protected schedule.
            </p>
          </PolicySection>

          <PolicySection title="9. Security">
            <p>
              PeacePad uses transport encryption, access controls, authenticated requests, and
              operational safeguards designed to protect information. No online service can
              guarantee absolute security. Unless a feature expressly says otherwise, PeacePad
              content is not end-to-end encrypted and should not be treated as accessible only from
              your device.
            </p>
          </PolicySection>

          <PolicySection title="10. Children">
            <p>
              PeacePad is intended for adults and is not directed to children under 13. Adults may
              enter information about children when organizing shared parenting responsibilities.
              Do not create an account for a child or provide more child information than the
              selected feature requires.
            </p>
          </PolicySection>

          <PolicySection title="11. Your choices and rights">
            <PolicyList>
              <li>Review and update available profile and consent settings.</li>
              <li>Decline optional device permissions or disable them in device settings.</li>
              <li>Disable AI consent and continue using non-AI features.</li>
              <li>Export available account data or request account deletion.</li>
              <li>Contact us to ask a privacy question or exercise rights available where you live.</li>
            </PolicyList>
            <p>
              Information may be processed in Canada, the United States, or another location where
              a service provider operates, subject to applicable safeguards.
            </p>
          </PolicySection>

          <PolicySection title="12. Changes to this policy">
            <p>
              We may update this policy as PeacePad changes. The effective date and version at the
              top identify the policy currently in effect. Material changes will be communicated in
              the app or through another appropriate channel.
            </p>
          </PolicySection>
        </main>
      </div>
    </>
  );
}
