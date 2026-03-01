import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar, CalendarDays, Home, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import type { Partnership } from "@shared/schema";

interface CustodyScheduleBuilderProps {
  open: boolean;
  onClose: () => void;
  partnership: Partnership;
  currentUserId: string;
  onSave: (config: CustodyConfig) => Promise<void>;
}

export interface CustodyConfig {
  custodyEnabled: boolean;
  custodyPattern: string;
  custodyStartDate: string;
  custodyPrimaryParent: string;
}

const PATTERNS = [
  {
    id: "week_on_off",
    name: "Week On / Week Off",
    description: "Alternating weeks with each parent. Simple and consistent.",
    Icon: CalendarDays,
  },
  {
    id: "every_other_weekend",
    name: "Every Other Weekend",
    description: "One parent has weekdays, the other has alternating weekends.",
    Icon: Home,
  },
  {
    id: "two_two_three",
    name: "2-2-3 Schedule",
    description: "Mon-Tue with Parent A, Wed-Thu with Parent B, Fri-Sun alternates.",
    Icon: RefreshCw,
  },
];

export function CustodyScheduleBuilder({
  open,
  onClose,
  partnership,
  currentUserId,
  onSave,
}: CustodyScheduleBuilderProps) {
  if (!partnership) return null;

  const [pattern, setPattern] = useState(partnership.custodyPattern || "week_on_off");
  const [startDate, setStartDate] = useState(
    partnership.custodyStartDate 
      ? format(new Date(partnership.custodyStartDate), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd")
  );
  const [primaryParent, setPrimaryParent] = useState(
    partnership.custodyPrimaryParent || "user1"
  );
  const [isSaving, setIsSaving] = useState(false);

  const isUser1 = currentUserId === partnership.user1Id;
  const isUser2 = currentUserId === partnership.user2Id;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        custodyEnabled: true,
        custodyPattern: pattern,
        custodyStartDate: startDate,
        custodyPrimaryParent: primaryParent,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save custody schedule:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80dvh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Set Up Custody Schedule
          </DialogTitle>
          <DialogDescription>
            Choose a pattern that matches your custody arrangement. This will color-code your calendar to show which parent has the child each day.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 flex-1 overflow-y-auto pr-1">
          {/* Pattern Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Custody Pattern</Label>
            <div className="grid gap-3">
              {PATTERNS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPattern(p.id)}
                  className={`p-4 border-2 rounded-lg text-left transition-all hover-elevate ${
                    pattern === p.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                  data-testid={`button-pattern-${p.id}`}
                >
                  <div className="flex items-start gap-3">
                    <p.Icon className="h-6 w-6 shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold mb-1">{p.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {p.description}
                      </div>
                    </div>
                    <div
                      className={`shrink-0 w-5 h-5 rounded-full border-2 transition-all ${
                        pattern === p.id
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      }`}
                    >
                      {pattern === p.id && (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs">
                          ✓
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start-date" className="text-base font-semibold">
              Start Date
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              When does this schedule begin?
            </p>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              data-testid="input-start-date"
            />
          </div>

          {/* Primary Parent Selection */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Who has custody first?</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Select which parent will have the child on the start date.
            </p>
            <RadioGroup value={primaryParent} onValueChange={setPrimaryParent}>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover-elevate">
                <RadioGroupItem value="user1" id="user1" data-testid="radio-user1" />
                <Label htmlFor="user1" className="flex-1 cursor-pointer">
                  {isUser1 ? "You (Parent A)" : "Your Co-Parent (Parent A)"}
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-md hover-elevate">
                <RadioGroupItem value="user2" id="user2" data-testid="radio-user2" />
                <Label htmlFor="user2" className="flex-1 cursor-pointer">
                  {isUser2 ? "You (Parent B)" : "Your Co-Parent (Parent B)"}
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-schedule">
            {isSaving ? "Saving..." : "Save Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
