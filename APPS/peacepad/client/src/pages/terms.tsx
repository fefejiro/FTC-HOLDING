import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function TermsPage() {
  return (
    <>
      <SEOHead
        title="PeacePad Terms of Service"
        description="PeacePad Terms of Service for responsible use, AI guidance, and availability. Plain language summary for everyday use."
        canonical="https://peacepad.ca/terms"
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
            <h1 className="text-lg font-semibold">PeacePad Terms of Service</h1>
          </div>
        </header>

        <main className="flex-1 w-full max-w-3xl mx-auto p-6">
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-bold mb-2">PeacePad Terms of Service</h2>
              <p className="text-muted-foreground">
                These terms explain simple rules for using PeacePad responsibly.
              </p>
            </section>

            <section className="border-t pt-6 space-y-3">
              <h3 className="text-lg font-semibold">Core terms</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Use PeacePad responsibly and respectfully.</li>
                <li>Keep your account secure and do not share passwords or access credentials.</li>
                <li>PeacePad provides AI-assisted communication guidance and is not legal advice.</li>
                <li>You control what you send and are responsible for your messages and decisions.</li>
                <li>AI-generated suggestions are optional guidance and may not fit every situation.</li>
                <li>Service availability is not guaranteed, and features may change over time.</li>
                <li>To the extent allowed by law, PeacePad is not liable for indirect losses from app use.</li>
                <li>
                  Questions or support requests:{" "}
                  <a href="mailto:support@peacepad.ca" className="text-primary hover:underline">
                    support@peacepad.ca
                  </a>
                  . We typically reply within two business days.
                </li>
              </ul>
            </section>

            <section className="border-t pt-6 space-y-3">
              <h3 className="text-lg font-semibold">Privacy reference</h3>
              <p className="text-muted-foreground">
                Please also review our{" "}
                <a href="/privacy" className="text-primary hover:underline" data-testid="link-privacy">
                  Privacy Policy
                </a>{" "}
                for details on data handling and protection.
              </p>
            </section>

            <section className="border-t pt-6 text-sm text-muted-foreground">
              <p>Last updated: 2026-03-05</p>
            </section>

            <section className="border-t pt-6 text-sm text-muted-foreground">
              <div className="flex flex-wrap gap-4">
                <a href="/" className="text-primary hover:underline" data-testid="link-home">
                  Home
                </a>
                <a href="/support" className="text-primary hover:underline" data-testid="link-support">
                  Support
                </a>
                <a href="/privacy" className="text-primary hover:underline" data-testid="link-privacy-footer">
                  Privacy Policy
                </a>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
