import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, AlertTriangle, Mail, Shield, LogIn } from "lucide-react";
import { Link } from "wouter";

export default function DeleteAccountPage() {
  return (
    <>
      <SEOHead
        title="Delete Account — PeacePad"
        description="Learn how to delete your PeacePad account and all associated data. Your privacy matters to us."
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
            <h1 className="text-lg font-semibold">Delete Account</h1>
          </div>
        </header>
        
        <main className="flex-1 w-full max-w-4xl mx-auto p-6">
          <div className="space-y-8">
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
                <Trash2 className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Delete Your PeacePad Account</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                We're sorry to see you go. Follow the steps below to permanently delete your account and all associated data.
              </p>
            </div>

            <Card className="border-destructive/20 shadow-lg">
              <CardHeader className="bg-destructive/5 border-b border-destructive/10 pb-6">
                <CardTitle className="text-2xl flex items-center gap-3 text-destructive">
                  <Shield className="w-8 h-8" />
                  30-Day Recovery & Data Retention
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8 space-y-6">
                <div className="grid gap-6">
                  <div className="flex gap-4">
                    <div className="flex-none w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg">Immediate Account Deactivation</h3>
                      <p className="text-muted-foreground leading-relaxed">Your profile, messages, and all active partnership data are hidden from view immediately after you confirm deletion.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-none w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg">30-Day Recovery Period</h3>
                      <p className="text-muted-foreground leading-relaxed">We hold your data in a secure, deactivated state for 30 days. You can cancel the deletion and restore all data simply by signing back in during this time.</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-none w-12 h-12 bg-destructive/10 rounded-2xl flex items-center justify-center">
                      <Trash2 className="w-6 h-6 text-destructive" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg">Permanent Purge</h3>
                      <p className="text-muted-foreground leading-relaxed">After 30 days, all personal data, messages, records, and files are permanently purged from our servers. This action is final and non-reversible.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t">
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Trash2 className="w-6 h-6 text-destructive" />
                    How to delete your account
                  </h3>
                  <div className="space-y-6">
                    <div className="flex gap-4 items-start">
                      <div className="flex-none w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">1</div>
                      <p className="text-muted-foreground pt-1 italic font-medium">Log in to PeacePad at peacepad.ca or via the mobile app.</p>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="flex-none w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">2</div>
                      <p className="text-muted-foreground pt-1 italic font-medium">Navigate to Settings &rarr; Privacy & Data &rarr; Delete Account.</p>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="flex-none w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">3</div>
                      <p className="text-muted-foreground pt-1 italic font-medium">Review the warning and confirm by tapping "Permanently Delete My Data".</p>
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex flex-col sm:flex-row gap-4">
                  <Button asChild className="flex-1 min-h-12 text-lg rounded-xl" size="lg">
                    <Link href="/settings">Open Settings Now</Link>
                  </Button>
                  <Button variant="outline" asChild className="flex-1 min-h-12 text-lg rounded-xl" size="lg">
                    <a href="mailto:peacepad@peacepad.ca">Email Support Request</a>
                  </Button>
                </div>
              </CardContent>
            </Card>


            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                Have questions about data deletion?
              </p>
              <a href="mailto:peacepad@peacepad.ca">
                <Button variant="outline" data-testid="button-contact-support">
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </a>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
