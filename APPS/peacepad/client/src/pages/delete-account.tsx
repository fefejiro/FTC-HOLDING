import { useState } from "react";
import { AlertTriangle, ArrowLeft, LockKeyhole, Mail, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queryClient } from "@/lib/queryClient";
import { purgePeacePadBrowserCaches } from "@/lib/privacyCache";
import { useAuth } from "@/hooks/useAuth";

export default function DeleteAccountPage() {
  const { user, isLoading } = useAuth();
  const [confirmation, setConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAccount = async (confirmedValue = confirmation) => {
    if (confirmedValue !== "DELETE") {
      setError('Enter "DELETE" exactly to confirm.');
      return;
    }

    setError(null);
    setIsDeleting(true);
    try {
      const response = await fetch("/api/user/account", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: confirmedValue }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(data?.message || "PeacePad could not delete this account.");
      }

      const hasSeenIntro = localStorage.getItem("hasSeenIntro");
      localStorage.clear();
      if (hasSeenIntro === "true") {
        localStorage.setItem("hasSeenIntro", "true");
      }
      queryClient.clear();
      await purgePeacePadBrowserCaches().catch(() => undefined);
      window.location.href = "/";
    } catch (deletionError) {
      setError(
        deletionError instanceof Error
          ? deletionError.message
          : "PeacePad could not delete this account.",
      );
      setIsDeleting(false);
    }
  };

  const renderAction = () => {
    if (isLoading) {
      return <p className="text-sm text-muted-foreground">Checking your account…</p>;
    }

    if (!user) {
      return (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Sign in to the account you want to delete. PeacePad must verify the active session
            before deleting account data.
          </p>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/account-access">
              <LockKeyhole className="mr-2 h-4 w-4" />
              Open account access
            </Link>
          </Button>
        </div>
      );
    }

    if (user.isGuest) {
      return (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            This is a temporary guest session, not a registered account. Deleting it immediately
            removes its server-side guest data and signs this installation out.
          </p>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={() => void deleteAccount("DELETE")}
            data-testid="button-delete-guest-data"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? "Deleting guest data…" : "Delete guest data"}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
          <p className="font-medium">This cannot be undone.</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            PeacePad will immediately remove your account, profile, private records, sessions,
            tokens, and uploaded files. Shared messages and workspace history that your co-parent
            must still be able to access are retained without your identity and linked only to a
            permanently disabled “Deleted PeacePad user” record. You cannot recover the account by
            signing in again.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="delete-confirmation">
            Enter <strong>DELETE</strong> to confirm
          </Label>
          <Input
            id="delete-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            data-testid="input-delete-confirmation"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            data-testid="delete-account-error"
          >
            {error}
          </p>
        )}

        <Button
          type="button"
          variant="destructive"
          disabled={confirmation !== "DELETE" || isDeleting}
          onClick={() => void deleteAccount()}
          data-testid="button-delete-account-permanently"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {isDeleting ? "Deleting account…" : "Permanently delete my account"}
        </Button>
      </div>
    );
  };

  return (
    <>
      <SEOHead
        title="Delete Account — PeacePad"
        description="Permanently delete a PeacePad account and associated account data."
      />
      <div className="flex min-h-screen-dvh flex-col bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center gap-4 px-4">
            <Button asChild variant="ghost" size="sm">
              <Link href={user ? "/settings" : "/"}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <h1 className="text-lg font-semibold">Delete account</h1>
          </div>
        </header>

        <main className="mx-auto w-full max-w-2xl flex-1 p-5 sm:p-8">
          <Card className="border-destructive/20 shadow-lg">
            <CardHeader>
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
              <CardTitle className="text-2xl">Delete your PeacePad account</CardTitle>
              <CardDescription>
                Review the impact and confirm directly in the app. Emailing support is not required.
              </CardDescription>
            </CardHeader>
            <CardContent>{renderAction()}</CardContent>
          </Card>

          <div className="mt-6 text-center">
            <a
              href="mailto:peacepad@peacepad.ca?subject=PeacePad account deletion question"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground underline"
            >
              <Mail className="h-4 w-4" />
              Ask a deletion question
            </a>
          </div>
        </main>
      </div>
    </>
  );
}
