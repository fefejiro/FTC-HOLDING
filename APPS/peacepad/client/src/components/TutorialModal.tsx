import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Lightbulb, X } from "lucide-react";

interface TutorialStep {
  title: string;
  description: string;
}

interface TutorialModalProps {
  open: boolean;
  onClose: (persist?: boolean) => void;
  title: string;
  steps: TutorialStep[];
  storageKey: string;
  icon?: React.ReactNode;
}

export function TutorialModal({ open, onClose, title, steps, storageKey, icon }: TutorialModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(true); // Default to checked for one-time dismissal
  
  const handleClose = () => {
    // Pass persist parameter based on checkbox state
    onClose(dontShowAgain);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon || <Lightbulb className="h-5 w-5 text-amber-500" />}
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto">
          {steps.map((step, index) => (
            <div key={index}>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs">
                  {index + 1}
                </span>
                {step.title}
              </h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
        
        {/* Don't show again checkbox */}
        <div className="flex items-center space-x-2 pt-2 pb-2">
          <Checkbox
            id={`${storageKey}-checkbox`}
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            data-testid="checkbox-dont-show-again"
          />
          <label
            htmlFor={`${storageKey}-checkbox`}
            className="text-sm text-muted-foreground cursor-pointer select-none"
          >
            Don't show this again
          </label>
        </div>
        
        <Button onClick={handleClose} className="w-full" data-testid="button-close-tutorial">
          Got it!
        </Button>
      </DialogContent>
    </Dialog>
  );
}
