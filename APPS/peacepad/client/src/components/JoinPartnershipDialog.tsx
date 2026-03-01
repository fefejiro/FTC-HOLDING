import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Loader2, Info, Scan } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { QRScanner } from "@/components/QRScanner";

interface JoinPartnershipDialogProps {
  trigger?: React.ReactNode;
}

export function JoinPartnershipDialog({ trigger }: JoinPartnershipDialogProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const { toast } = useToast();

  const joinPartnershipMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/partnerships/join", {
        inviteCode: code.toUpperCase(),
      });
      return await res.json();
    },
    onSuccess: (response: any) => {
      console.log("[JoinPartnershipDialog] Success response:", response);
      
      // Update local storage to trigger WelcomeFlow on the next page
      localStorage.setItem("just_joined_partnership", JSON.stringify({
        timestamp: Date.now(),
        coParentName: response.partnerName || "your co-parent"
      }));

      // Use the updated user data returned from the backend
      if (response.user) {
        // Set the user data directly in cache to ensure immediate update
        queryClient.setQueryData(["/api/auth/user"], response.user);
      }
      
      // CRITICAL: Invalidate and immediately refetch queries to show new partnership/conversation
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/partnerships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      
      // Ensure queries actually refetch with fresh data
      Promise.all([
        queryClient.refetchQueries({ queryKey: ["/api/auth/user"] }),
        queryClient.refetchQueries({ queryKey: ["/api/partnerships"] }),
        queryClient.refetchQueries({ queryKey: ["/api/conversations"] }),
      ]).then(() => {
        toast({
          title: "Partnership created",
          description: "You're now connected with your co-parent",
          duration: 3000,
        });
        setInviteCode("");
        setIsOpen(false);
        
        // Force a window reload after a small delay to ensure all state is correctly synced
        // This is a safety measure to guarantee the UI updates correctly
        setTimeout(() => {
          window.location.href = "/chat";
        }, 500);
      });
    },
    onError: (error: any) => {
      const message = error.message || "Failed to join partnership";
      const isInvalidCode = message.includes("Invalid invite code");
      const isOwnCode = message.includes("your own invite code");
      
      toast({
        title: isOwnCode ? "Can't use your own code" : (isInvalidCode ? "Code not found" : "Error"),
        description: message,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteCode.trim().length === 6) {
      joinPartnershipMutation.mutate(inviteCode.trim());
    } else {
      toast({
        title: "Invalid code",
        description: "Invite code must be 6 characters",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleScan = (code: string) => {
    console.log("[JoinPartnershipDialog] handleScan called with code:", code);
    setInviteCode(code);
    setShowScanner(false);
    console.log("[JoinPartnershipDialog] Calling mutation to join partnership");
    joinPartnershipMutation.mutate(code);
  };

  return (
    <>
      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            className="gap-2"
            data-testid="button-join-partnership"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Co-Parent</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] max-h-[80dvh] flex flex-col" data-testid="dialog-join-partnership" aria-describedby="join-partnership-description">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Add Your Co-Parent</DialogTitle>
          <DialogDescription id="join-partnership-description">
            Enter your co-parent's 6-character invite code to connect
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1 flex flex-col">
          <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 mb-4">
            <div className="flex gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">How invite codes work:</p>
                <p className="text-blue-800 dark:text-blue-200">
                  Ask your co-parent to go to <span className="font-semibold">Settings</span>, copy <strong>their invite code</strong>, and share it with you. Then enter it below to connect.
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-code">Your Co-Parent's Invite Code</Label>
            <Input
              id="invite-code"
              placeholder="ABC123"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="text-center text-lg tracking-widest font-mono"
              data-testid="input-invite-code"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Enter the 6-character code your co-parent shared with you
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

        </form>
        <div className="flex-shrink-0 pt-4 border-t mt-4 space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2"
            onClick={() => setShowScanner(true)}
            data-testid="button-scan-qr"
          >
            <Scan className="h-4 w-4" />
            Scan QR Code
          </Button>

          <Button
            type="submit"
            className="w-full"
            disabled={inviteCode.length !== 6 || joinPartnershipMutation.isPending}
            onClick={handleSubmit}
            data-testid="button-submit-invite-code"
          >
            {joinPartnershipMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              "Connect"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}