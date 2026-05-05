import { useState, useRef, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, AlertTriangle, Plus, Download, CalendarDays, Sparkles, ChevronDown, Palette } from "lucide-react";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { ShareToChatButton } from "./ShareToChatButton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getApiUrl, queryClient } from "@/lib/queryClient";
import type { Event, ScheduleTemplate, Partnership } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { LocationAutocomplete } from "./LocationAutocomplete";
import { CustodyScheduleBuilder, type CustodyConfig } from "./CustodyScheduleBuilder";
import { CustodyCalendarView } from "./CustodyCalendarView";
import { useAuth } from "@/hooks/useAuth";
import { SwipeableCard } from "./SwipeableCard";
import { CalendarHeader } from "./CalendarHeader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getDisplayEventTitle,
  normalizeSchedulableEvent,
} from "@shared/peacepad/scheduling";

interface LocationData {
  displayName: string;
  address: string;
  lat: number;
  lng: number;
}

interface ConflictAnalysis {
  hasConflicts: boolean;
  conflicts: string[];
  suggestions: string[];
}

export default function SchedulingDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [custodyScheduleOpen, setCustodyScheduleOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("pickup");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<LocationData | null>(null);
  const [childName, setChildName] = useState("");
  const [recurring, setRecurring] = useState("none");
  const [notes, setNotes] = useState("");
  
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateStartDate, setTemplateStartDate] = useState("");
  const [templateLocation, setTemplateLocation] = useState<LocationData | null>(null);
  const [templateChildName, setTemplateChildName] = useState("");

  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: templates = [] } = useQuery<ScheduleTemplate[]>({
    queryKey: ["/api/schedule-templates"],
  });

  const { data: conflictAnalysis } = useQuery<ConflictAnalysis>({
    queryKey: ["/api/events/analyze"],
    enabled: events.length > 0,
  });

  const { data: partnerships = [] } = useQuery<Partnership[]>({
    queryKey: ["/api/partnerships"],
    enabled: !!user,
  });

  const activePartnership = useMemo(() => {
    if (!user?.activePartnershipId || partnerships.length === 0) return undefined;
    return partnerships.find(p => p.id === user.activePartnershipId);
  }, [partnerships, user?.activePartnershipId]);

  const { data: scheduledCalls = [] } = useQuery<any[]>({
    queryKey: ["/api/scheduled-calls"],
    enabled: !!user,
  });

  const allEvents = useMemo<Event[]>(() => {
    const callEvents: Event[] = scheduledCalls
      .filter((call: any) => call.status === 'pending')
      .map((call: any) => ({
        id: `scheduled-call-${call.id}`,
        title: call.title || `Scheduled ${call.callType === 'video' ? 'Video' : 'Audio'} Call`,
        type: 'other',
        startDate: call.scheduledFor,
        endDate: call.scheduledFor,
        description: `${call.callType === 'video' ? 'Video' : 'Audio'} call with Co-parent${call.notes ? `\n${call.notes}` : ''}`,
        location: null,
        childName: null,
        recurring: null,
        notes: call.notes,
        color: '#10b981',
        createdAt: call.createdAt,
        createdBy: call.schedulerId,
        isUrgent: false,
      }));
    return [...events, ...callEvents];
  }, [events, scheduledCalls]);

  const createEvent = useMutation({
    mutationFn: async (data: any) => {
      console.log('[Calendar] createEvent mutation started');
      const payload = { ...data, location: data.location ? JSON.stringify(data.location) : undefined };
      const res = await apiRequest("POST", "/api/events", payload);
      if (!res) {
        console.log('[Calendar] API returned null response');
        throw new Error("Failed to create event");
      }
      const result = await res.json();
      console.log('[Calendar] Event created successfully:', result.id);
      return result;
    },
    onSuccess: (newEvent: Event) => {
      console.log('[Calendar] createEvent onSuccess - updating cache');
      queryClient.setQueryData(["/api/events"], (old: Event[] = []) => [...old, newEvent].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
      queryClient.invalidateQueries({ queryKey: ["/api/events/analyze"] });
      handleCloseDialog();
      toast({ title: "Event created successfully", duration: 3000 });
    },
    onError: (error: any) => {
      console.log('[Calendar] createEvent onError:', error.message || error);
      toast({ title: "Error", description: error.message || "Failed to create event", variant: "destructive", duration: 5000 });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async (data: any) => {
      const payload = { ...data, location: data.location ? JSON.stringify(data.location) : undefined };
      const res = await apiRequest("PATCH", `/api/events/${data.id}`, payload);
      if (!res) throw new Error("Failed to update event");
      return await res.json();
    },
    onSuccess: (updatedEvent: Event) => {
      queryClient.setQueryData(["/api/events"], (old: Event[] = []) => old.map(e => e.id === updatedEvent.id ? updatedEvent : e).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()));
      queryClient.invalidateQueries({ queryKey: ["/api/events/analyze"] });
      handleCloseDialog();
      toast({ title: "Event updated successfully", duration: 3000 });
    },
    onError: (error: any) => toast({ title: "Error", description: error.message || "Failed to update event", variant: "destructive", duration: 5000 }),
  });

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const res = await apiRequest("DELETE", `/api/events/${eventId}`);
      if (!res) throw new Error("Failed to delete event");
      return await res.json();
    },
    onSuccess: (_, eventId) => {
      queryClient.setQueryData(["/api/events"], (old: Event[] = []) => old.filter(e => e.id !== eventId));
      queryClient.invalidateQueries({ queryKey: ["/api/events/analyze"] });
      toast({ title: "Event deleted successfully", duration: 3000 });
    },
  });

  const handleSaveEvent = () => {
    console.log('[Calendar] handleSaveEvent called - title:', title, 'startDate:', startDate);
    if (!title.trim() || !startDate) {
      console.log('[Calendar] Validation failed - missing title or startDate');
      toast({ title: "Error", description: "Please fill in required fields", variant: "destructive", duration: 5000 });
      return;
    }
    const data = { title, type, startDate, endDate: endDate || undefined, description, location, childName, recurring: recurring !== "none" ? recurring : undefined, notes };
    console.log('[Calendar] Creating event with data:', JSON.stringify(data));
    if (editingEvent) updateEvent.mutate({ id: editingEvent.id, ...data });
    else createEvent.mutate(data);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingEvent(null);
    setTitle("");
    setType("pickup");
    setStartDate("");
    setEndDate("");
    setDescription("");
    setLocation(null);
    setChildName("");
    setRecurring("none");
    setNotes("");
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setTitle(event.title);
    setType(event.type);
    const formatDate = (s: string) => s ? new Date(s).toISOString().slice(0, 16) : "";
    setStartDate(formatDate(event.startDate.toString()));
    setEndDate(formatDate(event.endDate?.toString() || ""));
    setDescription(event.description || "");
    if (event.location) {
      try { setLocation(typeof event.location === 'string' ? JSON.parse(event.location) : event.location); }
      catch { setLocation(null); }
    } else setLocation(null);
    setChildName(event.childName || "");
    setRecurring(event.recurring || "none");
    setNotes(event.notes || "");
    setDialogOpen(true);
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm("Are you sure you want to delete this event?")) deleteEvent.mutate(id);
  };

  const handleApplyTemplate = () => {
    if (!selectedTemplateId || !templateStartDate) {
      toast({ title: "Error", description: "Please select a template and start date", variant: "destructive", duration: 5000 });
      return;
    }
    applyTemplate.mutate({ templateId: selectedTemplateId, startDate: templateStartDate, childName: templateChildName, location: templateLocation });
  };

  const applyTemplate = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/schedule-templates/${data.templateId}/apply`, {
        startDate: data.startDate,
        childName: data.childName,
        location: data.location ? JSON.stringify(data.location) : undefined,
      });
      if (!res) throw new Error("Failed to apply template");
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setTemplateDialogOpen(false);
      toast({ title: "Template applied", description: `Created ${data.events?.length || 0} events`, duration: 3000 });
    },
  });

  const handleSaveCustodySchedule = async (config: CustodyConfig) => {
    if (!activePartnership) return;
    try {
      await apiRequest("PATCH", `/api/partnerships/${activePartnership.id}/custody`, config);
      queryClient.invalidateQueries({ queryKey: ["/api/partnerships"] });
      toast({ title: "Custody schedule saved" });
    } catch (e) { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleDownloadICal = () => {
    window.location.href = getApiUrl('/api/events/export/ical');
    toast({ title: "Downloading calendar..." });
  };

  const handleAddToGoogleCalendar = () => {
    const url = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(getApiUrl('/api/events/export/ical'))}`;
    window.open(url, '_blank');
  };

  const getEventColor = (t: string) => {
    const colors: Record<string, string> = {
      pickup: "bg-primary/10 border-primary/30",
      dropoff: "bg-accent/30 border-accent/50",
      school: "bg-chart-5/10 border-chart-5/30",
      medical: "bg-destructive/10 border-destructive/30",
      activity: "bg-chart-3/10 border-chart-3/30",
      vacation: "bg-chart-4/10 border-chart-4/30",
      holiday: "bg-chart-1/10 border-chart-1/30"
    };
    return colors[t] || "bg-muted/50 border-muted";
  };

  if (isLoading) return <div className="flex items-center justify-center p-20 text-muted-foreground">Loading schedule...</div>;

  const isSoloMode = !activePartnership;

  return (
    <div 
      className="flex flex-col h-full overflow-hidden"
      style={{ overscrollBehavior: 'contain' }}
    >
      <CalendarHeader onAddEvent={() => setDialogOpen(true)} />
      
      <div className="flex-1 min-h-0 overflow-x-hidden" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
        <div className="max-w-7xl mx-auto w-full p-4 pb-4 space-y-3">
          {isSoloMode && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg"><CalendarDays className="h-5 w-5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Personal Calendar</h3>
                  <p className="text-xs text-muted-foreground">Track appointments, pickups, and events. Connect with a co-parent to share schedules.</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Dialog open={custodyScheduleOpen} onOpenChange={setCustodyScheduleOpen}>
              <DialogTrigger asChild><Button variant="outline" size="sm" className="h-8"><Palette className="h-4 w-4 mr-2" />Rules</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Setup Custody Schedule</DialogTitle></DialogHeader>
                {activePartnership && (
                  <CustodyScheduleBuilder 
                    open={custodyScheduleOpen}
                    onClose={() => setCustodyScheduleOpen(false)}
                    partnership={activePartnership}
                    currentUserId={user?.id || ""}
                    onSave={handleSaveCustodySchedule} 
                  />
                )}
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" className="h-8" onClick={() => setTemplateDialogOpen(true)}><Sparkles className="h-4 w-4 mr-2" />Templates</Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8"><Download className="h-4 w-4 mr-2" />Export<ChevronDown className="h-3 w-3 ml-1 opacity-50" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadICal}>Download .ics</DropdownMenuItem>
                <DropdownMenuItem onClick={handleAddToGoogleCalendar}>Google Calendar</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {!isSoloMode && activePartnership && events.length > 0 && (
              <ShareToChatButton 
                itemType="event" 
                itemId={events[0]?.id || ''} 
                itemTitle="Calendar Events" 
              />
            )}
          </div>

          {conflictAnalysis?.hasConflicts && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-destructive" /><h3 className="font-semibold text-sm text-destructive">Conflicts Detected</h3></div>
                <ul className="space-y-1">{conflictAnalysis.conflicts.map((c, i) => <li key={i} className="text-xs text-destructive/80 flex items-start gap-2"><span className="mt-1 block h-1 w-1 rounded-full bg-destructive/40" />{c}</li>)}</ul>
              </CardContent>
            </Card>
          )}

          <CustodyCalendarView
            partnership={activePartnership}
            events={allEvents}
            currentUserId={user?.id || ""}
          />

          <div className="space-y-3 pt-3 border-t">
            <h3 className="font-semibold text-sm px-1">Upcoming Events</h3>
            {allEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
            <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-3"><Calendar className="h-6 w-6 text-muted-foreground/40" /></div>
            <h3 className="font-semibold mb-1 text-foreground text-sm">No Events Yet</h3>
            <p className="text-xs text-muted-foreground max-w-xs mb-4">Keep track of custody schedules, pickups, and important dates.</p>
            <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Add First Event</Button>
          </div>
            ) : (
              <div className="space-y-3">
                {allEvents.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map((event) => (
                  <SwipeableCard key={event.id} onDelete={() => handleDeleteEvent(event.id)} onEdit={() => handleEditEvent(event)}>
                    <Card className={`overflow-hidden border-l-4 ${getEventColor(event.type)}`}>
                      <CardContent className="p-3">
                        {(() => {
                          const normalizedEvent = normalizeSchedulableEvent(event);
                          const timeLabel = normalizedEvent?.isAllDay
                            ? "All day"
                            : new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                          return (
                            <>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-medium text-sm line-clamp-1">{getDisplayEventTitle(event.title)}</h4>
                          <Badge variant="outline" className="text-[10px] h-4 px-1 capitalize">{event.type}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeLabel}</div>
                          {event.location && <div className="flex items-center gap-1 line-clamp-1"><span className="opacity-50">@</span>{typeof event.location === 'string' ? (JSON.parse(event.location) as { displayName?: string })?.displayName || 'Location' : (event.location as { displayName?: string })?.displayName || 'Location'}</div>}
                        </div>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  </SwipeableCard>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingEvent ? "Edit Event" : "Add Event"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Event Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Dental Appointment" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="dropoff">Drop-off</SelectItem>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="activity">Activity</SelectItem>
                    <SelectItem value="vacation">Vacation</SelectItem>
                    <SelectItem value="holiday">Holiday</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Recurring</Label>
                <Select value={recurring} onValueChange={setRecurring}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date & Time</Label>
                <DateTimePicker 
                  value={startDate} 
                  onChange={setStartDate} 
                  placeholder="Pick start date"
                  data-testid="input-start-datetime"
                />
              </div>
              <div className="space-y-2">
                <Label>End Date & Time</Label>
                <DateTimePicker 
                  value={endDate} 
                  onChange={setEndDate} 
                  placeholder="Pick end date"
                  data-testid="input-end-datetime"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <LocationAutocomplete value={location} onChange={setLocation} placeholder="Search for a location..." />
            </div>
            <div className="space-y-2">
              <Label>Child Name</Label>
              <Input value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="e.g., Emma" />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="ghost" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSaveEvent} disabled={createEvent.isPending || updateEvent.isPending}>{editingEvent ? "Save Changes" : "Create Event"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-md w-[95vw]">
          <DialogHeader><DialogTitle>Apply Template</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger>
                <SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id!}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={templateStartDate} onChange={(e) => setTemplateStartDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="ghost" onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApplyTemplate} disabled={applyTemplate.isPending}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
