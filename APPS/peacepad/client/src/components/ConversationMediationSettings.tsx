
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Brain } from "lucide-react";

interface ConversationMediationSettingsProps {
  talkingStickEnabled: boolean;
  onTalkingStickChange: (enabled: boolean) => void;
}

export function ConversationMediationSettings({
  talkingStickEnabled,
  onTalkingStickChange,
}: ConversationMediationSettingsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">🐚</span>
          Conversation Mediation
        </CardTitle>
        <CardDescription>
          AI-powered features to help conversations flow constructively
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Conch Mode */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="talking-stick" className="font-medium">
                Conch Mode
              </Label>
              <span className="text-lg">🐚</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Take turns speaking - inspired by <em>Lord of the Flies</em> and therapy's "talking stick". 
              Only the person holding the conch can send messages, promoting active listening and reducing interruptions. 
              Pass the conch when you're done speaking.
            </p>
          </div>
          <Switch
            id="talking-stick"
            checked={talkingStickEnabled}
            onCheckedChange={onTalkingStickChange}
            data-testid="switch-talking-stick"
          />
        </div>

        {/* AI Mediation Info */}
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-start gap-2">
            <Brain className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">AI Emotional Monitoring</p>
              <p className="text-xs text-muted-foreground">
                During calls and chats, AI monitors both participants' emotional states in real-time. 
                When tension rises, you'll receive gentle prompts for breathing exercises and constructive reframing.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
