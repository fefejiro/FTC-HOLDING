import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Calendar as CalendarIcon, Video, Phone } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

interface ScheduleCallDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScheduleCallDialog({ isOpen, onClose }: ScheduleCallDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Form state
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [callType, setCallType] = useState<"audio" | "video">("video");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  
  // Get partnerships
  const { data: partnerships = [] } = useQuery<any[]>({
    queryKey: ["/api/partnerships"],
    enabled: !!user && isOpen,
  });

  const scheduleCallMutation = useMutation({
    mutationFn: async () => {
      if (!date || !time) {
        throw new Error("Date and time are required");
      }
      
      // Combine date and time into ISO string
      const [hours, minutes] = time.split(":").map(Number);
      const scheduledFor = new Date(date);
      scheduledFor.setHours(hours, minutes, 0, 0);
      
      const partnership = partnerships.find((p: any) => p.partnerId === selectedPartner);
      const response = await apiRequest("POST", "/api/scheduled-calls", {
        participantId: selectedPartner,
        callType,
        scheduledFor: scheduledFor.toISOString(),
        title: title.trim() || "Scheduled Call",
        notes: notes.trim() || null,
        partnershipId: partnership?.id,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-calls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
      toast({
        title: "Call scheduled",
        description: `Your call has been scheduled for ${format(date!, "PPP")} at ${time}`,
      });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to schedule call",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedPartner("");
    setCallType("video");
    setDate(undefined);
    setTime("");
    setTitle("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPartner) {
      toast({
        title: "Partner required",
        description: "Please select who you want to call",
        variant: "destructive",
      });
      return;
    }
    
    if (!date || !time) {
      toast({
        title: "Date and time required",
        description: "Please select when you want to schedule the call",
        variant: "destructive",
      });
      return;
    }
    
    // Validate time is in the future
    const [hours, minutes] = time.split(":").map(Number);
    const scheduledFor = new Date(date);
    scheduledFor.setHours(hours, minutes, 0, 0);
    
    if (scheduledFor <= new Date()) {
      toast({
        title: "Invalid time",
        description: "Please select a future date and time",
        variant: "destructive",
      });
      return;
    }
    
    scheduleCallMutation.mutate();
  };

  // Get partner options - partnerships API returns partnerId and partnerName
  const partnerOptions = partnerships.map((p: any) => ({
    id: p.partnerId,
    name: p.partnerName || "Co-parent",
  }));

  if (!user || partnerships.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-schedule-call">
        <DialogHeader>
          <DialogTitle>Schedule a Call</DialogTitle>
          <DialogDescription>
            Plan a call with your co-parent for a specific date and time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Partner Selection */}
          <div className="space-y-2">
            <Label htmlFor="partner">Who do you want to call?</Label>
            <Select value={selectedPartner} onValueChange={setSelectedPartner}>
              <SelectTrigger id="partner" data-testid="select-partner">
                <SelectValue placeholder="Select co-parent" />
              </SelectTrigger>
              <SelectContent>
                {partnerOptions.map((partner: any) => (
                  <SelectItem key={partner.id} value={partner.id} data-testid={`option-partner-${partner.id}`}>
                    {partner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Call Type Toggle */}
          <div className="space-y-2">
            <Label>Call Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={callType === "video" ? "default" : "outline"}
                onClick={() => setCallType("video")}
                className="flex-1 gap-2"
                data-testid="button-type-video"
              >
                <Video className="h-4 w-4" />
                Video
              </Button>
              <Button
                type="button"
                variant={callType === "audio" ? "default" : "outline"}
                onClick={() => setCallType("audio")}
                className="flex-1 gap-2"
                data-testid="button-type-audio"
              >
                <Phone className="h-4 w-4" />
                Audio
              </Button>
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                  data-testid="button-select-date"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              data-testid="input-time"
            />
          </div>

          {/* Title (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-muted-foreground text-sm">(optional)</span>
            </Label>
            <Input
              id="title"
              type="text"
              placeholder="e.g., Weekly check-in"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-title"
            />
          </div>

          {/* Notes (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes <span className="text-muted-foreground text-sm">(optional)</span>
            </Label>
            <Textarea
              id="notes"
              placeholder="Any details you want to discuss..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              data-testid="textarea-notes"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onClose();
                resetForm();
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={scheduleCallMutation.isPending}
              data-testid="button-schedule"
            >
              {scheduleCallMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule Call
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
