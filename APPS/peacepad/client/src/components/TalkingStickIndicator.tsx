
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft } from "lucide-react";

interface TalkingStickIndicatorProps {
  currentSpeaker: "me" | "partner";
  myName: string;
  partnerName: string;
  onPassTurn: () => void;
  isMyTurn: boolean;
  disabled?: boolean;
}

export function TalkingStickIndicator({
  currentSpeaker,
  myName,
  partnerName,
  onPassTurn,
  isMyTurn,
  disabled = false,
}: TalkingStickIndicatorProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
      <div className="flex items-center gap-3">
        <span className={`text-2xl transition-all ${isMyTurn ? 'animate-pulse scale-110' : 'opacity-50'}`}>
          🐚
        </span>
        <div>
          <p className="text-sm font-medium">
            {isMyTurn ? "You have the conch" : `${partnerName} has the conch`}
          </p>
          <p className="text-xs text-muted-foreground">
            {isMyTurn 
              ? "Take your time. Pass the conch when you're done."
              : "Listen with empathy. Your turn will come."}
          </p>
        </div>
      </div>
      
      {isMyTurn && (
        <Button
          size="sm"
          variant="outline"
          onClick={onPassTurn}
          disabled={disabled}
          className="gap-2"
          data-testid="button-pass-turn"
        >
          <ArrowRightLeft className="h-4 w-4" />
          Pass Conch
        </Button>
      )}
    </div>
  );
}
