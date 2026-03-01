import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getRandomReflectionPrompt, getMoodResponse } from "@/data/empathetic-prompts";

type MoodOption = "positive" | "neutral" | "negative";

const MOOD_OPTIONS: { value: MoodOption; emoji: string; label: string }[] = [
  { value: "positive", emoji: "😊", label: "Good" },
  { value: "neutral", emoji: "😐", label: "Okay" },
  { value: "negative", emoji: "😞", label: "Difficult" },
];

interface MoodCheckInProps {
  isDormant?: boolean;
}

export default function MoodCheckIn({ isDormant = false }: MoodCheckInProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodOption | null>(null);
  const [note, setNote] = useState("");
  const [showResponse, setShowResponse] = useState(false);
  
  // Get random empathetic prompt
  const prompt = useMemo(() => getRandomReflectionPrompt(), []);

  useEffect(() => {
    // Check if mood check-in has been shown today
    const lastCheckIn = localStorage.getItem("last_mood_checkin");
    const today = new Date().toDateString();
    
    if (lastCheckIn === today) return;

    // Smart timing: wait for dormant period before showing
    // Check every 30 seconds if user becomes dormant
    const checkInterval = setInterval(() => {
      const activityState = localStorage.getItem("peacepad_activity_state");
      const isDormantNow = activityState === "dormant";
      
      if (isDormantNow) {
        setIsOpen(true);
        clearInterval(checkInterval);
      }
    }, 30 * 1000); // Check every 30 seconds

    return () => {
      clearInterval(checkInterval);
    };
  }, []);

  const handleSubmit = () => {
    if (!selectedMood) return;

    const sessionId = localStorage.getItem("peacepad_session_id") || "unknown";
    const moodData = {
      sessionId,
      mood: selectedMood,
      note: note.trim(),
      timestamp: new Date().toISOString(),
    };

    // Store mood data locally (could be sent to server in future)
    const storedMoods = JSON.parse(localStorage.getItem("mood_history") || "[]");
    storedMoods.push(moodData);
    localStorage.setItem("mood_history", JSON.stringify(storedMoods));
    
    // Mark as completed for today
    localStorage.setItem("last_mood_checkin", new Date().toDateString());
    
    // Show supportive response before closing
    setShowResponse(true);
    
    // Close after showing response
    setTimeout(() => {
      setIsOpen(false);
      resetForm();
    }, 3000);
  };

  const handleSkip = () => {
    localStorage.setItem("last_mood_checkin", new Date().toDateString());
    setIsOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedMood(null);
    setNote("");
    setShowResponse(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md max-h-[80dvh] flex flex-col" data-testid="mood-checkin-dialog">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">{prompt.title}</DialogTitle>
          <DialogDescription>
            {prompt.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4 flex-1 overflow-y-auto pr-1">
          {!showResponse ? (
            <>
              {/* Mood Options */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Your mood right now</Label>
                <div className="grid grid-cols-3 gap-3">
                  {MOOD_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={selectedMood === option.value ? "default" : "outline"}
                      className="h-24 flex flex-col gap-2 text-center"
                      onClick={() => setSelectedMood(option.value)}
                      data-testid={`button-mood-${option.value}`}
                    >
                      <span className="text-3xl">{option.emoji}</span>
                      <span className="text-sm">{option.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Optional Note */}
              <div className="space-y-2">
                <Label htmlFor="mood-note" className="text-sm font-medium">
                  Anything you'd like to note? (Optional)
                </Label>
                <Textarea
                  id="mood-note"
                  placeholder="What made you feel this way..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="resize-none h-20"
                  data-testid="textarea-mood-note"
                />
              </div>
            </>
          ) : (
            /* Supportive Response */
            <div className="py-6 px-4 bg-muted/50 rounded-lg text-center space-y-3" data-testid="mood-support-response">
              <p className="text-lg font-medium text-foreground" data-testid="text-mood-response">
                {selectedMood && getMoodResponse(selectedMood)}
              </p>
              <p className="text-sm text-muted-foreground">
                Thank you for taking time to reflect
              </p>
            </div>
          )}
        </div>
        {!showResponse && (
          <div className="flex-shrink-0 pt-4 border-t mt-4 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleSkip}
              data-testid="button-skip-checkin"
            >
              Skip
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!selectedMood}
              data-testid="button-submit-checkin"
            >
              Submit
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
