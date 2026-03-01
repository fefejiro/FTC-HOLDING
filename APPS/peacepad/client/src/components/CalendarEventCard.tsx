import { format } from "date-fns";
import { Calendar, Cake, Users, Zap } from "lucide-react";
import type { Event } from "@shared/schema";

interface CalendarEventCardProps {
  event: Event;
  onClick?: () => void;
}

const getTypeIcon = (type?: string) => {
  switch (type) {
    case "birthday":
      return <Cake className="w-3 h-3" />;
    case "shared_event":
      return <Users className="w-3 h-3" />;
    case "custody":
      return <Calendar className="w-3 h-3" />;
    default:
      return <Zap className="w-3 h-3" />;
  }
};

const getTypeColor = (type?: string) => {
  switch (type) {
    case "birthday":
      return "bg-[#A78BFE]/10 border-l-2 border-[#A78BFE]";
    case "shared_event":
      return "bg-[#70E09E]/10 border-l-2 border-[#70E09E]";
    case "custody":
      return "bg-[#00D2A8]/10 border-l-2 border-[#00D2A8]";
    default:
      return "bg-[#64BAFF]/10 border-l-2 border-[#64BAFF]";
  }
};

export function CalendarEventCard({ event, onClick }: CalendarEventCardProps) {
  const timeStr = format(new Date(event.startDate), "MMM d");
  const isMultiDay = event.endDate && new Date(event.endDate) > new Date(event.startDate);

  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-xs font-medium truncate cursor-pointer transition-all hover-elevate ${getTypeColor(event.type)} ${
        onClick ? "cursor-pointer" : ""
      }`}
      data-testid={`calendar-event-${event.id}`}
      title={event.title}
    >
      <div className="flex items-center gap-1.5">
        <div className="flex-shrink-0 opacity-80">
          {getTypeIcon(event.type)}
        </div>
        <span className="truncate flex-1">{event.title}</span>
      </div>
      {isMultiDay && (
        <div className="text-[10px] opacity-70 mt-0.5">{timeStr}</div>
      )}
    </div>
  );
}
