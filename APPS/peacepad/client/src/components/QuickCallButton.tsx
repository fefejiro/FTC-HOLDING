import { useState, useEffect } from "react";
import { Phone, Video, Loader2, AlertCircle, Moon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import VideoCallDialog from "./VideoCallDialog";
import { useCallContext } from "@/contexts/CallContext";

interface QuickCallButtonProps {
  variant?: "icon" | "default";
  className?: string;
}

export function QuickCallButton({ variant = "icon", className }: QuickCallButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [reason, setReason] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [outgoingCall, setOutgoingCall] = useState<any>(null);
  const callContext = useCallContext();

  // Fetch user's partnerships
  const { data: partnerships = [] } = useQuery<any[]>({
    queryKey: ["/api/partnerships"],
    enabled: !!user,
  });

  // Check call preferences for selected partner
  const { data: callCheck } = useQuery<any>({
    queryKey: ["/api/call-preferences/check", selectedPartner, isEmergency],
    enabled: !!selectedPartner,
    queryFn: async () => {
      const response = await fetch(
        `/api/call-preferences/check/${selectedPartner}?isEmergency=${isEmergency}`
      );
      if (!response.ok) throw new Error("Failed to check preferences");
      return response.json();
    },
  });

  // Auto-select single partner when dialog opens
  useEffect(() => {
    if (isOpen && partnerships.length === 1 && !selectedPartner) {
      setSelectedPartner(partnerships[0].partner?.id || "");
    }
  }, [isOpen, partnerships, selectedPartner]);

  const startCall = useMutation({
    mutationFn: async () => {
      const partnership = partnerships.find((p: any) => p.partner?.id === selectedPartner);
      const response = await apiRequest("POST", "/api/calls", {
        receiverId: selectedPartner,
        callType,
        reason: reason.trim() || undefined,
        isEmergency,
        partnershipId: partnership.id,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
      setIsOpen(false);
      setReason("");
      setIsEmergency(false);

      // Update CallContext FSM for proper role tracking
      callContext.outgoingCall({
        callId: data.id,
        callType,
        calleeId: selectedPartner,
        sessionCode: data.sessionCode,
        callRole: 'caller',
      });

      // Open VideoCallDialog with the call data INCLUDING sessionCode
      setOutgoingCall({
        callId: data.id,
        receiverId: selectedPartner,
        callType,
        sessionCode: data.sessionCode, // Critical: use sessionCode from backend to avoid duplicate session creation
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start call",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) {
      toast({
        title: "Select a co-parent",
        description: "Please choose who to call",
        variant: "destructive",
      });
      return;
    }

    // Check if call is blocked - respect server decision regardless of emergency flag
    if (callCheck && !callCheck.canCall) {
      let description = "Unable to call at this time.";

      if (callCheck.reason === 'dnd_active') {
        if (callCheck.allowEmergencyOverride) {
          description = "Your co-parent has Do Not Disturb enabled. Mark as emergency to override.";
        } else {
          description = "Your co-parent has Do Not Disturb enabled and does not allow emergency overrides.";
        }
      } else if (callCheck.reason === 'outside_hours') {
        if (callCheck.allowEmergencyOverride) {
          description = `Outside acceptable hours (${callCheck.acceptableHours || 'not set'}). Mark as emergency to proceed.`;
        } else {
          description = `Outside acceptable hours (${callCheck.acceptableHours || 'not set'}). Emergency overrides are not allowed.`;
        }
      } else if (callCheck.reason === 'outside_hours_no_override') {
        description = `Outside acceptable hours (${callCheck.acceptableHours || 'not set'}). Emergency overrides are not allowed.`;
      }

      toast({
        title: "Call not available",
        description,
        variant: "destructive",
      });
      return;
    }

    startCall.mutate();
  };

  // Get partner options - partnerships API returns partner object with id and displayName
  const partnerOptions = partnerships.map((p: any) => ({
    id: p.partner?.id || "",
    name: p.partner?.displayName || "Co-parent",
  }));

  // Auto-select single partner when dialog opens
  const singlePartner = partnerOptions.length === 1 ? partnerOptions[0] : null;

  if (!user || partnerships.length === 0) {
    return null; // Don't show if no partnerships
  }

  return (
    <>
      {variant === "icon" ? (
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsOpen(true)}
          className="hover-elevate active-elevate-2"
          data-testid="button-quick-call"
          aria-label="Quick call"
        >
          <Phone className="h-5 w-5" />
        </Button>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          className="hover-elevate active-elevate-2"
          data-testid="button-quick-call"
        >
          <Phone className="h-4 w-4 mr-2" />
          Quick Call
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent data-testid="dialog-quick-call">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Start a Call</DialogTitle>
              <DialogDescription>
                Quick call for time-sensitive coordination. For important discussions, consider scheduling a call.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Partner Selection - Only show dropdown if multiple partners */}
              {partnerOptions.length > 1 ? (
                <div className="space-y-2">
                  <Label htmlFor="partner">Call</Label>
                  <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                    <SelectTrigger id="partner" data-testid="select-partner">
                      <SelectValue placeholder="Select co-parent" />
                    </SelectTrigger>
                    <SelectContent>
                      {partnerOptions.map((partner: any) => (
                        <SelectItem key={partner.id} value={partner.id}>
                          {partner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : singlePartner ? (
                <div className="pb-2">
                  <p className="text-sm text-muted-foreground">
                    Calling <span className="font-medium text-foreground">{singlePartner.name}</span>
                  </p>
                </div>
              ) : null}

              {/* Call Availability Status */}
              {selectedPartner && callCheck && (
                <Alert 
                  variant={callCheck.isDndActive ? "destructive" : !callCheck.isWithinHours ? "default" : "default"}
                  className={callCheck.canCall && !callCheck.reason ? "border-green-500 bg-green-50 dark:bg-green-950" : ""}
                  data-testid="alert-call-status"
                >
                  {callCheck.isDndActive ? (
                    <Moon className="h-4 w-4" />
                  ) : !callCheck.isWithinHours ? (
                    <Clock className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {callCheck.reason === 'dnd_active' && (
                      <span className="text-sm">
                        <strong>Do Not Disturb active.</strong>{' '}
                        {callCheck.allowEmergencyOverride 
                          ? (isEmergency ? 'Emergency override will be applied.' : 'Mark as emergency to override.')
                          : 'Emergency overrides not allowed.'}
                      </span>
                    )}
                    {callCheck.reason === 'outside_hours' && (
                      <span className="text-sm">
                        <strong>Outside acceptable hours</strong> ({callCheck.acceptableHours}).{' '}
                        {callCheck.allowEmergencyOverride 
                          ? (isEmergency ? 'Emergency override will be applied.' : 'Mark as emergency to proceed.')
                          : 'Emergency overrides not allowed.'}
                      </span>
                    )}
                    {callCheck.reason === 'outside_hours_no_override' && (
                      <span className="text-sm">
                        <strong>Outside acceptable hours</strong> ({callCheck.acceptableHours}). Emergency overrides not allowed.
                      </span>
                    )}
                    {callCheck.reason === 'emergency_override' && (
                      <span className="text-sm text-orange-600 dark:text-orange-400">
                        <strong>Emergency call</strong> - Will override Do Not Disturb
                      </span>
                    )}
                    {callCheck.reason === 'emergency_outside_hours' && (
                      <span className="text-sm text-orange-600 dark:text-orange-400">
                        <strong>Emergency call</strong> - Outside normal hours ({callCheck.acceptableHours})
                      </span>
                    )}
                    {callCheck.canCall && !callCheck.reason && (
                      <span className="text-sm text-green-700 dark:text-green-300">
                        ✓ Available to receive calls now
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Call Type */}
              <div className="space-y-2">
                <Label>Call Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={callType === "audio" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setCallType("audio")}
                    data-testid="button-audio-call"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Audio
                  </Button>
                  <Button
                    type="button"
                    variant={callType === "video" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setCallType("video")}
                    data-testid="button-video-call"
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Video
                  </Button>
                </div>
              </div>

              {/* Call Reason (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason <span className="text-muted-foreground text-sm">(optional)</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="e.g., Running late for pickup, Quick question about schedule"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  maxLength={150}
                  data-testid="input-call-reason"
                />
                <p className="text-xs text-muted-foreground">
                  Helps the other person know what the call is about
                </p>
              </div>

              {/* Emergency Flag */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emergency"
                  checked={isEmergency}
                  onCheckedChange={(checked) => setIsEmergency(checked as boolean)}
                  data-testid="checkbox-emergency"
                />
                <Label htmlFor="emergency" className="text-sm font-normal cursor-pointer">
                  This is an emergency (rings even during Do Not Disturb)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={startCall.isPending}
                data-testid="button-cancel-call"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedPartner || startCall.isPending}
                data-testid="button-start-call"
              >
                {startCall.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {callType === "audio" ? "Start Audio Call" : "Start Video Call"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Outgoing Call Dialog */}
      {outgoingCall && (
        <VideoCallDialog
          isOpen={true}
          onClose={() => setOutgoingCall(null)}
          callType={outgoingCall.callType}
          recipientId={outgoingCall.receiverId}
          callId={outgoingCall.callId}
          isIncoming={false}
          sessionCodeProp={outgoingCall.sessionCode}
        />
      )}
    </>
  );
}