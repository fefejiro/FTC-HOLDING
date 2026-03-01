import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, startOfWeek, endOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustodyForDate, getParentColor, hexToRgba } from "@/lib/custodyUtils";
import type { Partnership, Event } from "@shared/schema";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CalendarFilterTabs } from "./CalendarFilterTabs";
import { CalendarEventCard } from "./CalendarEventCard";

interface CustodyCalendarViewProps {
  partnership: Partnership | undefined;
  events: Event[];
  currentUserId: string;
}

export function CustodyCalendarView({ partnership, events, currentUserId }: CustodyCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterTab, setFilterTab] = useState<"all" | "my-events" | "shared" | "birthdays">("all");

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getDayStyle = (day: Date) => {
    if (!partnership?.custodyEnabled) return {};
    
    const custodyParent = getCustodyForDate(day, partnership, events);
    const color = getParentColor(custodyParent, partnership);
    
    if (color) {
      return {
        backgroundColor: hexToRgba(color, 0.15),
        borderLeft: `3px solid ${color}`,
      };
    }
    
    return {};
  };

  const getParentLabel = (parent: "user1" | "user2" | null) => {
    if (!parent || !partnership) return "";
    
    if (parent === "user1") {
      return currentUserId === partnership.user1Id ? "You" : "Co-Parent";
    } else {
      return currentUserId === partnership.user2Id ? "You" : "Co-Parent";
    }
  };

  const getFilteredEvents = (day: Date) => {
    const dayEvents = events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
      return day >= eventStart && day <= eventEnd;
    });

    // Apply filter tab
    if (filterTab === "birthdays") {
      return dayEvents.filter(e => e.type === "birthday");
    } else if (filterTab === "shared") {
      return dayEvents.filter(e => e.type === "shared_event");
    } else if (filterTab === "my-events") {
      return dayEvents.filter(e => e.type !== "custody");
    }
    // "all" - no filtering

    return dayEvents;
  };

  if (!partnership?.custodyEnabled) {
    return (
      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle>Custody Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center text-sm py-4">
            Custody calendar is not enabled. Set it up from the menu above to see color-coded custody days.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Custody Calendar</CardTitle>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToPreviousMonth}
            data-testid="button-prev-month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium min-w-[140px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </span>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={goToNextMonth}
            data-testid="button-next-month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CalendarFilterTabs activeTab={filterTab} onTabChange={setFilterTab} />
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="text-xs font-semibold text-muted-foreground text-center p-2"
            >
              {day}
            </div>
          ))}
          {days.map((day, index) => {
            const custodyParent = getCustodyForDate(day, partnership, events);
            const dayEvents = getFilteredEvents(day);
            
            return (
              <div
                key={index}
                className={`min-h-[70px] sm:min-h-[90px] border rounded-md p-2 sm:p-3 flex flex-col gap-1.5 ${
                  isSameMonth(day, currentDate)
                    ? "bg-background"
                    : "bg-muted/30 text-muted-foreground"
                }`}
                style={getDayStyle(day)}
                data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
              >
                <div className="text-xs sm:text-sm font-semibold">{format(day, "d")}</div>
                {custodyParent && (
                  <div className="text-[9px] sm:text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary w-fit">
                    {getParentLabel(custodyParent)}
                  </div>
                )}
                {dayEvents.length > 0 && (
                  <div className="mt-auto space-y-1 flex-1 flex flex-col gap-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <CalendarEventCard key={event.id} event={event} />
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[9px] text-muted-foreground font-medium px-2">
                        +{dayEvents.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded border-l-4"
              style={{ 
                backgroundColor: hexToRgba(partnership.user1Color || "#3b82f6", 0.15),
                borderColor: partnership.user1Color || "#3b82f6"
              }}
            />
            <span className="text-sm">
              {currentUserId === partnership.user1Id ? "Your Days" : "Co-Parent's Days"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-4 rounded border-l-4"
              style={{ 
                backgroundColor: hexToRgba(partnership.user2Color || "#10b981", 0.15),
                borderColor: partnership.user2Color || "#10b981"
              }}
            />
            <span className="text-sm">
              {currentUserId === partnership.user2Id ? "Your Days" : "Co-Parent's Days"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
