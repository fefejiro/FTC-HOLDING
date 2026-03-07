import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { Shield, Lock, MessageSquare, ExternalLink, AlertCircle } from "lucide-react";
import { Link } from "wouter";

interface TermsAcceptanceDialogProps {
  open: boolean;
  userId: string;
}

export function TermsAcceptanceDialog({ open, userId }: TermsAcceptanceDialogProps) {
  const [agreed, setAgreed] = useState(false);
  const { toast } = useToast();

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/users/accept-terms");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Terms Accepted",
        description: "Welcome to PeacePad!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to accept terms. Please try again.",
        variant: "destructive",
      });
      console.error("Error accepting terms:", error);
    },
  });

  const handleAccept = () => {
    if (!agreed) {
      toast({
        title: "Agreement Required",
        description: "Please check the box to agree to the terms.",
        variant: "destructive",
      });
      return;
    }
    acceptTermsMutation.mutate();
  };

  return (
    <Dialog open={open} modal>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto mb-3 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">Terms of Service & Privacy</DialogTitle>
          <DialogDescription className="text-center">
            Please review and accept our terms to continue
          </DialogDescription>
        </DialogHeader>

        {/* Key Points Summary */}
        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Secure Sign-In</p>
              <p className="text-xs text-muted-foreground mt-1">
                PeacePad uses secure account protection.
                Private beta account access is currently managed internally while rollout expands.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Lock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Confidentiality</p>
              <p className="text-xs text-muted-foreground mt-1">
                Communications are confidential between you and your co-parent.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">AI-Powered Communication</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tone analysis helps promote constructive dialogue.
              </p>
            </div>
          </div>
        </div>

        {/* Checkbox Agreement */}
        <div className="flex items-start gap-3 pt-2 border-t">
          <Checkbox
            id="agree-terms"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked as boolean)}
            className="mt-1"
            data-testid="checkbox-agree-terms"
          />
          <Label 
            htmlFor="agree-terms" 
            className="text-sm leading-relaxed cursor-pointer"
          >
            I agree to the{" "}
            <Link 
              href="/terms" 
              className="text-primary hover:underline inline-flex items-center gap-1"
              data-testid="link-view-terms"
            >
              Terms & Conditions
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Label>
        </div>

        <DialogFooter className="pt-2">
          <Button
            onClick={handleAccept}
            disabled={!agreed || acceptTermsMutation.isPending}
            className="w-full"
            data-testid="button-accept-terms"
          >
            {acceptTermsMutation.isPending ? "Accepting..." : "Accept & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
