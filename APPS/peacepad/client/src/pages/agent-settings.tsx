import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Sparkles, Bell, Shield, Brain, Save } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { SEOHead } from '@/components/SEOHead';

interface AgentSettings {
  id: string;
  userId: string;
  proactiveInsightsEnabled: boolean;
  nudgeFrequency: string;
  conflictThreshold: number;
  summaryFrequency: string;
  pushNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  privacyMode: string;
}

export default function AgentSettingsPage() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<AgentSettings>({
    queryKey: ['/api/agent/settings'],
  });

  const [localSettings, setLocalSettings] = useState<Partial<AgentSettings>>({});

  const updateSettings = useMutation({
    mutationFn: async (data: Partial<AgentSettings>) => {
      const res = await apiRequest('PUT', '/api/agent/settings', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent/settings'] });
      toast({ title: 'Settings saved', duration: 3000 });
    },
    onError: () => {
      toast({ title: 'Failed to save settings', variant: 'destructive', duration: 5000 });
    },
  });

  const mergedSettings = { ...settings, ...localSettings };

  const handleSave = () => {
    updateSettings.mutate(localSettings);
  };

  const updateLocal = (key: keyof AgentSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <SEOHead title="AI Coach Settings" description="Configure your AI coaching preferences" noindex />
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              AI Coach Settings
            </h1>
            <p className="text-muted-foreground">Control how your AI assistant helps you communicate</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Proactive Insights
            </CardTitle>
            <CardDescription>
              Configure when and how the AI coach offers suggestions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Proactive Insights</Label>
                <p className="text-sm text-muted-foreground">
                  Get AI-powered suggestions before potential conflicts
                </p>
              </div>
              <Switch
                checked={mergedSettings.proactiveInsightsEnabled ?? true}
                onCheckedChange={(v) => updateLocal('proactiveInsightsEnabled', v)}
                data-testid="switch-proactive-insights"
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Nudge Frequency</Label>
              <Select
                value={mergedSettings.nudgeFrequency || 'balanced'}
                onValueChange={(v) => updateLocal('nudgeFrequency', v)}
              >
                <SelectTrigger data-testid="select-nudge-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal - Only critical warnings</SelectItem>
                  <SelectItem value="balanced">Balanced - Helpful suggestions</SelectItem>
                  <SelectItem value="proactive">Proactive - All insights</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Conflict Detection Sensitivity</Label>
                <Badge variant="secondary">
                  {mergedSettings.conflictThreshold || 50}%
                </Badge>
              </div>
              <Slider
                value={[mergedSettings.conflictThreshold || 50]}
                onValueChange={([v]) => updateLocal('conflictThreshold', v)}
                min={20}
                max={80}
                step={5}
                data-testid="slider-conflict-threshold"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Less sensitive</span>
                <span>More sensitive</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Choose how you receive AI coach updates
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive nudges on your device
                </p>
              </div>
              <Switch
                checked={mergedSettings.pushNotificationsEnabled ?? false}
                onCheckedChange={(v) => updateLocal('pushNotificationsEnabled', v)}
                data-testid="switch-push-notifications"
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Summaries</Label>
                <p className="text-sm text-muted-foreground">
                  Get weekly communication reports by email
                </p>
              </div>
              <Switch
                checked={mergedSettings.emailNotificationsEnabled ?? false}
                onCheckedChange={(v) => updateLocal('emailNotificationsEnabled', v)}
                data-testid="switch-email-notifications"
              />
            </div>

            <div className="space-y-3">
              <Label>Summary Frequency</Label>
              <Select
                value={mergedSettings.summaryFrequency || 'weekly'}
                onValueChange={(v) => updateLocal('summaryFrequency', v)}
              >
                <SelectTrigger data-testid="select-summary-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Data
            </CardTitle>
            <CardDescription>
              Control how your data is used for AI features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Privacy Mode</Label>
              <Select
                value={mergedSettings.privacyMode || 'standard'}
                onValueChange={(v) => updateLocal('privacyMode', v)}
              >
                <SelectTrigger data-testid="select-privacy-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal - Basic features only</SelectItem>
                  <SelectItem value="standard">Standard - Pattern detection enabled</SelectItem>
                  <SelectItem value="enhanced">Enhanced - Full AI coaching</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {mergedSettings.privacyMode === 'minimal' && 'AI features are limited. No pattern analysis or proactive suggestions.'}
                {mergedSettings.privacyMode === 'standard' && 'AI analyzes patterns to help prevent conflicts. Messages are processed locally.'}
                {mergedSettings.privacyMode === 'enhanced' && 'Full AI coaching with personalized suggestions based on communication history.'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-2">
              <p className="font-medium">Your Data Rights</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>You can request deletion of all AI-processed data at any time</li>
                <li>Pattern analysis data is stored securely and never shared</li>
                <li>AI suggestions are generated in real-time and not permanently stored</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setLocalSettings({})}
            disabled={Object.keys(localSettings).length === 0}
            data-testid="button-reset"
          >
            Reset Changes
          </Button>
          <Button
            onClick={handleSave}
            disabled={Object.keys(localSettings).length === 0 || updateSettings.isPending}
            data-testid="button-save-settings"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </>
  );
}
