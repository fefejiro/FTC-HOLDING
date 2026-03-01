import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarHeaderProps {
  onAddEvent?: () => void;
}

export function CalendarHeader({ onAddEvent }: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Schedule</h1>
      </div>
      {onAddEvent && (
        <Button size="sm" onClick={onAddEvent} data-testid="button-add-event-header">
          <Plus className="h-4 w-4 mr-1" />
          Add Event
        </Button>
      )}
    </div>
  );
}
