import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, ShieldAlert, Trash2 } from "lucide-react";
import { Link } from "wouter";

export default function DeleteData() {
  const supportEmail = "support@saywetin.app";
  const subject = encodeURIComponent("Saywetin account deletion request");
  const body = encodeURIComponent(
    [
      "Hello Saywetin team,",
      "",
      "I want to permanently delete my Saywetin account and personal data.",
      "",
      "Account email:",
      "Username (if known):",
      "Any extra context:",
      "",
      "I understand this request may take up to 30 days to complete.",
    ].join("\n"),
  );
  const mailtoHref = `mailto:${supportEmail}?subject=${subject}&body=${body}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Link href="/">
            <button className="p-2 -ml-2 hover:bg-muted rounded-lg" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-lg font-semibold">Delete My Data</h1>
        </div>
      </header>

      <div className="p-4 max-w-md mx-auto space-y-6">
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete Account and Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              If you created a Saywetin account, you can request permanent deletion of your
              account and personal data by emailing our support team. This page is public so
              Google Play reviewers and users can access it without signing in.
            </p>

            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <h2 className="font-medium">How to request deletion</h2>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Email <span className="font-medium text-foreground">{supportEmail}</span> from the email address tied to your Saywetin account.</li>
                <li>Use the subject line <span className="font-medium text-foreground">Saywetin account deletion request</span>.</li>
                <li>Include your Saywetin username if you know it, so we can match the right account quickly.</li>
              </ol>
              <a href={mailtoHref}>
                <Button className="w-full" data-testid="button-email-delete-request">
                  <Mail className="w-4 h-4 mr-2" />
                  Email deletion request
                </Button>
              </a>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <h2 className="font-medium">What we delete</h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Your account profile details</li>
                <li>Saved songs and favorites linked to your account</li>
                <li>Listening history stored against your account</li>
                <li>User-submitted content tied to your account where deletion is allowed</li>
              </ul>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <h2 className="font-medium">What may be retained</h2>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Minimal operational or security logs for up to 30 days</li>
                <li>Anonymous aggregate analytics that no longer identify you</li>
                <li>Records we must retain to prevent fraud or comply with legal obligations</li>
              </ul>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm text-destructive flex gap-2">
                <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Account deletion is permanent after processing. We aim to complete verified
                  deletion requests within 30 days.
                </span>
              </p>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                Need more detail first? Read our{" "}
                <Link href="/privacy" className="text-primary underline">
                  Privacy Policy
                </Link>.
              </p>
              <p>
                Public deletion page for Google Play:{" "}
                <a href="/account-deletion/" className="text-primary underline">
                  https://saywetin.app/account-deletion/
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">No account yet?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              If you never created a Saywetin account, we do not keep an account profile to delete.
              Short audio clips used for music recognition are processed for song matching and are not
              stored as permanent raw recordings.
            </p>
            <p>
              If you still want us to review any data concern manually, email{" "}
              <span className="font-medium text-foreground">{supportEmail}</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
