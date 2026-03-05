import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function SupportPage() {
  return (
    <>
      <SEOHead
        title="PeacePad Support"
        description="Contact PeacePad support for help with your account, access, or app questions. We typically reply within two business days."
        canonical="https://peacepad.ca/support"
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
            <h1 className="text-lg font-semibold">PeacePad Support</h1>
          </div>
        </header>

        <main className="flex-1 w-full max-w-3xl mx-auto p-6">
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-bold mb-2">PeacePad Support</h2>
              <p className="text-muted-foreground">
                For help with your account or the app, email{" "}
                <a href="mailto:support@peacepad.ca" className="text-primary hover:underline">
                  support@peacepad.ca
                </a>
                . We typically reply within two business days.
              </p>
            </section>

            <section className="border-t pt-6 space-y-3">
              <h3 className="text-lg font-semibold">What to expect</h3>
              <p className="text-muted-foreground">
                PeacePad provides AI-assisted communication guidance and does not provide legal
                advice. You are always in control of what you send.
              </p>
            </section>

            <section className="border-t pt-6 space-y-3">
              <h3 className="text-lg font-semibold">Security and privacy</h3>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Do not share passwords or sensitive credentials in messages.</li>
                <li>Your messages may be processed to generate recommendations.</li>
              </ul>
            </section>

            <section className="border-t pt-6 text-sm text-muted-foreground">
              <div className="flex flex-wrap gap-4">
                <a href="/" className="text-primary hover:underline" data-testid="link-home">
                  Home
                </a>
                <a href="/terms" className="text-primary hover:underline" data-testid="link-terms">
                  Terms of Service
                </a>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
