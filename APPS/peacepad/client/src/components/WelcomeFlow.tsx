import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Sparkles, Lightbulb, ArrowRight } from "lucide-react";

interface WelcomeFlowProps {
  coParentName?: string;
  onComplete: () => void;
}

export function WelcomeFlow({ coParentName, onComplete }: WelcomeFlowProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const justJoinedData = localStorage.getItem("just_joined_partnership");
    if (justJoinedData) {
      try {
        const { timestamp } = JSON.parse(justJoinedData);
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
        if (timestamp > twoMinutesAgo) {
          setTimeout(() => setOpen(true), 500);
        }
      } catch (e) {
        localStorage.removeItem("just_joined_partnership");
      }
    }
  }, []);

  const handleComplete = () => {
    localStorage.removeItem("just_joined_partnership");
    setOpen(false);
    onComplete();
  };

  const handleNext = () => {
    if (step < 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleComplete(); }}>
      <DialogContent className="max-w-md" data-testid="dialog-welcome-flow">
        {step === 0 && (
          <>
            <DialogHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-primary/10 p-4">
                  <Heart className="h-8 w-8 text-primary" />
                </div>
              </div>
              <DialogTitle className="text-xl">Welcome to PeacePad!</DialogTitle>
            </DialogHeader>
            <div className="text-center space-y-4 py-4">
              <p className="text-muted-foreground">
                You're now connected with <span className="font-semibold text-foreground">{coParentName || "your co-parent"}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                PeacePad helps you communicate more effectively with AI-powered insights and structured conversations.
              </p>
            </div>
            <Button onClick={handleNext} className="w-full" data-testid="button-welcome-next">
              See How It Works
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </>
        )}

        {step === 1 && (
          <>
            <DialogHeader className="pb-2">
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                How Messaging Works
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm py-2">
              <div className="flex gap-3">
                <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs">
                  1
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Send a Message</h3>
                  <p className="text-muted-foreground">Type your message and hit send. Your co-parent receives it instantly.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs">
                  2
                </div>
                <div>
                  <h3 className="font-semibold mb-1">AI Tone Analysis</h3>
                  <p className="text-muted-foreground">PeacePad analyzes the tone of your message to help you communicate respectfully.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs">
                  3
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Get Suggestions</h3>
                  <p className="text-muted-foreground">If the tone is tense, get alternative wordings that are more constructive.</p>
                </div>
              </div>
            </div>
            <Button onClick={handleComplete} className="w-full mt-2" data-testid="button-welcome-done">
              Got it, let's start!
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
