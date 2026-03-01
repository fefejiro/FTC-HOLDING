import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wind } from "lucide-react";

interface CalmBreathModalProps {
  isOpen: boolean;
  onContinue: () => void;
}

export default function CalmBreathModal({ isOpen, onContinue }: CalmBreathModalProps) {
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  useEffect(() => {
    if (!isOpen) return;

    const phases: Array<'inhale' | 'hold' | 'exhale'> = ['inhale', 'hold', 'exhale'];
    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % phases.length;
      setBreathPhase(phases[currentIndex]);
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const breathText = {
    inhale: "Breathe in...",
    hold: "Hold...",
    exhale: "Breathe out..."
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ 
        background: "linear-gradient(180deg, hsl(220, 50%, 15%) 0%, hsl(220, 45%, 20%) 100%)",
        minHeight: '100dvh'
      }}
    >
      <div className="text-center text-white space-y-8 px-6 max-w-md animate-in fade-in duration-1000">
        <div className="relative">
          <div 
            className={`w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-purple-400/30 to-indigo-500/30 border border-white/10 flex items-center justify-center transition-transform ease-in-out ${
              breathPhase === 'inhale' ? 'scale-125' : 
              breathPhase === 'hold' ? 'scale-125' : 
              'scale-100'
            }`}
            style={{ transitionDuration: '2000ms' }}
          >
            <Wind className="w-12 h-12 text-white/60" />
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-lg text-white/70 font-medium transition-opacity duration-500">
            {breathText[breathPhase]}
          </p>
          
          <h2 className="text-2xl sm:text-3xl font-semibold leading-relaxed">
            Take a breath.
          </h2>
          
          <p className="text-lg text-white/80 leading-relaxed">
            This space is designed for clear communication.
          </p>
        </div>

        <div className="pt-4">
          <button 
            type="button"
            onClick={onContinue}
            onTouchEnd={(e) => {
              e.preventDefault();
              onContinue();
            }}
            className="bg-white/15 hover:bg-white/25 border border-white/20 text-white font-medium px-8 py-4 rounded-xl backdrop-blur-sm shadow-xl active:scale-95 transition-transform touch-manipulation select-none"
            data-testid="button-continue-to-practice"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
