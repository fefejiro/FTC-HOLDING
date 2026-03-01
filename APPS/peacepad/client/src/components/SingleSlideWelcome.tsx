import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Info, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface SingleSlideWelcomeProps {
  onGetStarted: () => void;
}

export default function SingleSlideWelcome({ onGetStarted }: SingleSlideWelcomeProps) {
  const [showAIInfo, setShowAIInfo] = useState(false);

  return (
    <div 
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-y-auto safe-area-top"
      style={{ 
        background: "linear-gradient(135deg, hsl(262, 70%, 55%) 0%, hsl(280, 65%, 45%) 50%, hsl(262, 70%, 40%) 100%)",
        minHeight: '100dvh'
      }}
    >
      <div className="w-full max-w-lg mx-auto px-6 py-8 text-center text-white">
        <div className="space-y-10 animate-in fade-in zoom-in duration-700">
          
          <div className="relative w-full max-w-[180px] mx-auto">
            <div className="absolute inset-0 bg-white/20 rounded-3xl blur-2xl scale-110" />
            <img 
              src="/icon-512.png" 
              alt="PeacePad"
              className="relative z-10 w-full h-auto rounded-3xl drop-shadow-2xl"
            />
          </div>

          <div className="space-y-6">
            <h1 className="text-2xl font-semibold text-white/95">
              Before you send that message
            </h1>
            <p className="text-lg text-white/80">
              Let me help you make it clearer.
            </p>
          </div>

          <div className="pt-4">
            <Button 
              size="lg"
              onClick={onGetStarted}
              className="w-full bg-white text-purple-700 hover:bg-purple-50 font-bold text-lg py-6 rounded-xl shadow-xl hover:shadow-2xl transition-all"
              data-testid="button-start-conversation"
            >
              <Shield className="w-5 h-5 mr-2" />
              Get Started
            </Button>
          </div>

          <div className="pt-6">
            <button
              onClick={() => setShowAIInfo(true)}
              className="text-xs text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors flex items-center justify-center gap-1 mx-auto"
              data-testid="button-ai-info"
            >
              <Info className="w-3 h-3" />
              How PeacePad uses AI
            </button>
          </div>
        </div>
      </div>

      <Dialog open={showAIInfo} onOpenChange={setShowAIInfo}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>How PeacePad Uses AI</DialogTitle>
            <DialogDescription asChild>
              <div className="text-left space-y-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  PeacePad is a co-parenting app that helps parents communicate clearly and reduce conflict.
                </p>

                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-2">
                    <Check className="w-4 h-4 text-green-600" />
                    What PeacePad AI does
                  </p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground pl-6">
                    <li>Suggests clearer wording for difficult messages</li>
                    <li>Analyzes tone so you know how a message might land</li>
                    <li>Coaches you on approaching hard conversations</li>
                    <li>Provides ready-to-send message alternatives</li>
                    <li>Adapts to your communication style</li>
                    <li>Supports structured turn-based discussions</li>
                  </ul>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5 mb-2">
                    <X className="w-4 h-4 text-red-500" />
                    What PeacePad AI does not do
                  </p>
                  <ul className="space-y-1.5 text-sm text-muted-foreground pl-6">
                    <li>No general knowledge (cooking, homework, weather)</li>
                    <li>No therapy or mental health diagnosis</li>
                    <li>No legal or financial advice</li>
                    <li>No taking sides or making decisions for you</li>
                    <li>No creative writing or content generation</li>
                  </ul>
                </div>

                <div className="border-t pt-3 space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    You are always in control — AI suggests, never blocks. Your messages are processed securely and not stored for AI training.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowAIInfo(false)} className="w-full" data-testid="button-ai-info-close">
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
