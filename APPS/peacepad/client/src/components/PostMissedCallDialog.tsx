import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface PostMissedCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  callId: string;
  receiverId?: string; // Optional - not sent to backend (derived from call record)
  receiverName?: string; // Optional - for display only
  callReason?: string; // Optional - for pre-filling message
}

export function PostMissedCallDialog({
  isOpen,
  onClose,
  callId,
  receiverId,
  receiverName,
  callReason,
}: PostMissedCallDialogProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState(
    callReason ? `About my call: ${callReason}` : ""
  );

  const sendFollowupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/calls/${callId}/followup`, {
        message: message.trim(),
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Message sent",
        description: receiverName ? `Your message was sent to ${receiverName}` : "Your message was sent",
      });
      onClose();
      setMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a message",
        variant: "destructive",
      });
      return;
    }
    sendFollowupMutation.mutate();
  };

  const handleSkip = () => {
    onClose();
    setMessage("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent data-testid="dialog-missed-call-followup">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>They didn't answer</DialogTitle>
            <DialogDescription>
              Would you like to send {receiverName} a message about why you called?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="followup-message">
                Your message <span className="text-muted-foreground text-sm">(optional)</span>
              </Label>
              <Textarea
                id="followup-message"
                placeholder="e.g., Calling about pickup time tomorrow"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={300}
                data-testid="input-followup-message"
              />
              <p className="text-xs text-muted-foreground">
                This helps {receiverName} know what the call was about
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              disabled={sendFollowupMutation.isPending}
              data-testid="button-skip-followup"
            >
              Skip
            </Button>
            <Button
              type="submit"
              disabled={!message.trim() || sendFollowupMutation.isPending}
              data-testid="button-send-followup"
            >
              {sendFollowupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Message
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
