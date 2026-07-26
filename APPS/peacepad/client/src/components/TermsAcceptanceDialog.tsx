import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ExternalLink, MessageSquare, Shield } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { persistStoredConsent } from "@/lib/consentState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface TermsAcceptanceDialogProps {
  open: boolean;
  userId?: string;
  localOnly?: boolean;
  onAccepted?: () => void | Promise<void>;
}

export function TermsAcceptanceDialog({
  open,
  userId,
  localOnly = false,
  onAccepted,
}: TermsAcceptanceDialogProps) {
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [aiMessageConsent, setAiMessageConsent] = useState(false);
  const { toast } = useToast();

  const acceptConsentMutation = useMutation({
    mutationFn: async () => {
      if (localOnly || !userId) {
        return null;
      }

      const res = await apiRequest("PATCH", "/api/user/consent", {
        privacyAccepted: true,
        ndaAccepted: true,
        aiMessageConsent,
        aiCallConsent: false,
      });
      return await res.json();
    },
    onSuccess: async () => {
      persistStoredConsent({
        requiredAccepted: true,
        aiMessageConsent,
        aiCallConsent: false,
      });

      if (!localOnly && userId) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }

      await onAccepted?.();
      toast({
        title: "Preferences saved",
        description: aiMessageConsent
          ? "You can change optional AI processing later in Settings."
          : "Optional AI processing remains off.",
      });
    },
    onError: (error) => {
      toast({
        title: "Could not save your choices",
        description: "Please try again.",
        variant: "destructive",
      });
      console.error("Error saving consent:", error);
    },
  });

  const requiredAccepted = termsAgreed && privacyAcknowledged;

  return (
    <Dialog open={open} modal>
      <DialogContent className="mx-4 max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader className="pb-2 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">Before we save anything</DialogTitle>
          <DialogDescription className="text-center">
            Review the required policies separately. Optional AI processing stays off unless you choose it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-sm text-muted-foreground">
            PeacePad helps you review co-parenting messages. It does not provide legal advice, make decisions,
            or send a message without you choosing to do so.
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border/70 p-3">
            <Checkbox
              id="agree-terms"
              checked={termsAgreed}
              onCheckedChange={(checked) => setTermsAgreed(checked === true)}
              className="mt-0.5"
              data-testid="checkbox-accept-terms"
            />
            <Label htmlFor="agree-terms" className="cursor-pointer text-sm leading-relaxed">
              I agree to the{" "}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                data-testid="link-view-terms"
              >
                Terms of Service
                <ExternalLink className="h-3 w-3" />
              </Link>
              .
            </Label>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border/70 p-3">
            <Checkbox
              id="acknowledge-privacy"
              checked={privacyAcknowledged}
              onCheckedChange={(checked) => setPrivacyAcknowledged(checked === true)}
              className="mt-0.5"
              data-testid="checkbox-acknowledge-privacy"
            />
            <Label htmlFor="acknowledge-privacy" className="cursor-pointer text-sm leading-relaxed">
              I have read and acknowledge the{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                data-testid="link-view-privacy"
              >
                Privacy Policy
                <ExternalLink className="h-3 w-3" />
              </Link>
              .
            </Label>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <Checkbox
              id="allow-ai-message-processing"
              checked={aiMessageConsent}
              onCheckedChange={(checked) => setAiMessageConsent(checked === true)}
              className="mt-0.5"
              data-testid="checkbox-ai-message-consent"
            />
            <Label htmlFor="allow-ai-message-processing" className="cursor-pointer text-sm leading-relaxed">
              <span className="flex items-center gap-1.5 font-medium">
                <MessageSquare className="h-4 w-4 text-primary" />
                Allow optional third-party AI message processing
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                When enabled, message text may be sent to an AI service to generate optional suggestions.
                Leave this unchecked to keep the feature off.
              </span>
            </Label>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            onClick={() => acceptConsentMutation.mutate()}
            disabled={!requiredAccepted || acceptConsentMutation.isPending}
            className="w-full"
            data-testid="button-accept-terms"
          >
            {acceptConsentMutation.isPending ? "Saving..." : "Agree & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
