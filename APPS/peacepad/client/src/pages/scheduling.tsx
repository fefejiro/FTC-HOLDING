import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ExternalLink } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/SEOHead";
import { useAuth } from "@/hooks/useAuth";

type EventItem = {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
  childName?: string | null;
  createdBy: string;
};

function sameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export default function SchedulingPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: events = [] } = useQuery<EventItem[]>({
    queryKey: ["/api/events"],
  });

  const ownDays = useMemo(
    () => events.filter((event) => event.createdBy === user?.id).map((event) => new Date(event.startDate)),
    [events, user?.id],
  );

  const coParentDays = useMemo(
    () => events.filter((event) => event.createdBy !== user?.id).map((event) => new Date(event.startDate)),
    [events, user?.id],
  );

  const selectedDayEvents = useMemo(
    () => events.filter((event) => sameDay(new Date(event.startDate), selectedDate)),
    [events, selectedDate],
  );

  return (
    <>
      <SEOHead
        title="Calendar - PeacePad"
        description="See the custody schedule and conversation context at a glance."
        noindex
      />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4">
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Calendar</CardTitle>
                <CardDescription>
                  Shared schedule context for co-parenting conversations. Display only in this MVP.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-300">
                  You
                </Badge>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
                  Your co-parent
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {events.length === 0 ? (
          <Card className="border-dashed border-border/70">
            <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-lg font-medium">No schedule set up yet</p>
                <p className="text-sm text-muted-foreground">
                  PeacePad can still help with messages and Prep Chat while you keep scheduling simple for now.
                </p>
              </div>
              <Button asChild variant="outline">
                <a
                  href="https://www.custodyxchange.com/topics/schedules/creating-a-parenting-plan.php"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  External custody schedule guide
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
            <Card className="border-border/60">
              <CardContent className="p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  modifiers={{
                    mine: ownDays,
                    coparent: coParentDays,
                  }}
                  modifiersClassNames={{
                    mine: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100 rounded-md",
                    coparent: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100 rounded-md",
                  }}
                  className="mx-auto"
                />
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </CardTitle>
                <CardDescription>Tap a day to see the custody context and schedule details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedDayEvents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                    Nothing is scheduled for this day.
                  </div>
                ) : (
                  selectedDayEvents.map((event) => (
                    <div key={event.id} className="rounded-2xl border border-border/70 bg-background p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="font-medium">{event.title}</p>
                        <Badge
                          variant="outline"
                          className={
                            event.createdBy === user?.id
                              ? "bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-300"
                          }
                        >
                          {event.createdBy === user?.id ? "You" : "Your co-parent"}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          {new Date(event.startDate).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                          {event.endDate
                            ? ` to ${new Date(event.endDate).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}`
                            : ""}
                        </p>
                        <p className="capitalize">{event.type.replaceAll("_", " ")}</p>
                        {event.childName && <p>For {event.childName}</p>}
                        {event.description && <p>{event.description}</p>}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}
