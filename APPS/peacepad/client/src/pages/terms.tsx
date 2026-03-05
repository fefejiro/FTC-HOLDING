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
                These terms explain how to use PeacePad responsibly.
              </p>
            </section>

            <section className="border-t pt-6">
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Use PeacePad responsibly and respectfully.</li>
                <li>PeacePad provides AI-assisted communication guidance and is not legal advice.</li>
                <li>You control what you send and are responsible for your messages.</li>
                <li>AI-generated suggestions are optional guidance.</li>
                <li>Service availability is not guaranteed.</li>
                <li>
                  Questions? Contact{" "}
                  <a href="mailto:support@peacepad.ca" className="text-primary hover:underline">
                    support@peacepad.ca
                  </a>
                  .
                </li>
              </ul>
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
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
