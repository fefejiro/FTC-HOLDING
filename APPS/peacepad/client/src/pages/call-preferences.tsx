import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Clock, Moon, AlertCircle, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SEOHead } from "@/components/SEOHead";

interface CallPreference {
  id: string;
  userId: string;
  acceptCallsStartHour: string | null;
  acceptCallsEndHour: string | null;
  doNotDisturb: boolean;
  allowEmergencyOverride: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function CallPreferencesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Form state
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("20:00");
  const [emergencyOverride, setEmergencyOverride] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current preferences
  const { data: preferences, isLoading } = useQuery<CallPreference>({
    queryKey: ["/api/call-preferences"],
    enabled: !!user,
  });

  // Load preferences into form when data arrives
  useEffect(() => {
    if (preferences) {
      setDoNotDisturb(preferences.doNotDisturb);
      // Convert hour to time format (e.g., "8" -> "08:00")
      const startHour = preferences.acceptCallsStartHour || "8";
      const endHour = preferences.acceptCallsEndHour || "21";
      setStartTime(`${startHour.padStart(2, '0')}:00`);
      setEndTime(`${endHour.padStart(2, '0')}:00`);
      setEmergencyOverride(preferences.allowEmergencyOverride);
      setHasChanges(false);
    }
  }, [preferences]);

  // Track changes
  useEffect(() => {
    if (preferences) {
      const startHour = preferences.acceptCallsStartHour || "8";
      const endHour = preferences.acceptCallsEndHour || "21";
      const changed = 
        doNotDisturb !== preferences.doNotDisturb ||
        startTime !== `${startHour.padStart(2, '0')}:00` ||
        endTime !== `${endHour.padStart(2, '0')}:00` ||
        emergencyOverride !== preferences.allowEmergencyOverride;
      setHasChanges(changed);
    }
  }, [doNotDisturb, startTime, endTime, emergencyOverride, preferences]);

  const updatePreferences = useMutation({
    mutationFn: async () => {
      // Convert time format to hour (e.g., "08:00" -> "8")
      const startHour = startTime.split(':')[0].replace(/^0/, '');
      const endHour = endTime.split(':')[0].replace(/^0/, '');
      
      const response = await apiRequest("POST", "/api/call-preferences", {
        acceptCallsStartHour: startHour,
        acceptCallsEndHour: endHour,
        doNotDisturb,
        allowEmergencyOverride: emergencyOverride,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/call-preferences"] });
      toast({
        title: "Preferences saved",
        description: "Your call preferences have been updated",
      });
      setHasChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save preferences",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate time range
    if (startTime >= endTime) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }
    
    updatePreferences.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <SEOHead title="Call Preferences" description="Manage your calling preferences and boundaries" noindex />
      <div className="flex flex-col pb-20">
      {/* Header */}
      <div className="p-4 border-b">
        <h1 className="text-3xl font-bold" data-testid="text-preferences-title">Call Preferences</h1>
        <p className="text-sm text-muted-foreground">
          Set your availability and call boundaries
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Do Not Disturb Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                Do Not Disturb
              </CardTitle>
              <CardDescription>
                Block all incoming calls except emergencies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="dnd-switch" className="text-base font-medium">
                    Enable Do Not Disturb
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    You won't receive any call notifications when DND is on
                  </p>
                </div>
                <Switch
                  id="dnd-switch"
                  checked={doNotDisturb}
                  onCheckedChange={setDoNotDisturb}
                  data-testid="switch-dnd"
                />
              </div>

              {doNotDisturb && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="emergency-override" className="text-base font-medium">
                        Allow Emergency Calls
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Emergency calls will still come through even with DND on
                      </p>
                    </div>
                    <Switch
                      id="emergency-override"
                      checked={emergencyOverride}
                      onCheckedChange={setEmergencyOverride}
                      data-testid="switch-emergency-override"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Call Hours Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Acceptable Call Hours
              </CardTitle>
              <CardDescription>
                Set the times you're available to receive calls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    data-testid="input-start-time"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    data-testid="input-end-time"
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Calls outside these hours will show a warning to the caller. Emergency calls can still be made at any time.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Emergency Calls Info */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <AlertCircle className="h-5 w-5" />
                About Emergency Calls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <strong>Emergency calls</strong> are a special type of call that:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                <li>Can be made at any time, even outside your call hours</li>
                <li>Bypass Do Not Disturb settings (if you allow emergency override)</li>
                <li>Show a prominent red badge to indicate urgency</li>
                <li>Send special push notifications with emergency alerts</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Your co-parent can mark a call as emergency when initiating it using the Quick Call button.
              </p>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-2 sticky bottom-0 bg-background py-4">
            {hasChanges && (
              <Button
                variant="outline"
                onClick={() => {
                  // Reset to saved values
                  if (preferences) {
                    setDoNotDisturb(preferences.doNotDisturb);
                    const startHour = preferences.acceptCallsStartHour || "8";
                    const endHour = preferences.acceptCallsEndHour || "21";
                    setStartTime(`${startHour.padStart(2, '0')}:00`);
                    setEndTime(`${endHour.padStart(2, '0')}:00`);
                    setEmergencyOverride(preferences.allowEmergencyOverride);
                  }
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!hasChanges || updatePreferences.isPending}
              data-testid="button-save"
            >
              {updatePreferences.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Preferences
            </Button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
