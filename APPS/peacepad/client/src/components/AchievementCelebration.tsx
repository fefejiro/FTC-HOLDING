import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
}

interface AchievementCelebrationProps {
  achievement: Achievement | null;
  onClose: () => void;
}

interface Confetti {
  id: number;
  x: number;
  y: number;
  rotation: number;
  delay: number;
  color: string;
}

const colors = ["#A78BFE", "#64BAFF", "#70E09E", "#FFD864", "#FF7F66"];

export function AchievementCelebration({ achievement, onClose }: AchievementCelebrationProps) {
  const [confetti, setConfetti] = useState<Confetti[]>([]);

  useEffect(() => {
    if (achievement) {
      const particles: Confetti[] = [];
      for (let i = 0; i < 50; i++) {
        particles.push({
          id: i,
          x: Math.random() * 100,
          y: -10,
          rotation: Math.random() * 360,
          delay: Math.random() * 0.5,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
      setConfetti(particles);
    }
  }, [achievement]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "communication":
        return <Sparkles className="w-12 h-12" />;
      case "organization":
        return <Star className="w-12 h-12" />;
      case "financial":
        return <Trophy className="w-12 h-12" />;
      case "participation":
        return <Trophy className="w-12 h-12" />;
      case "milestone":
        return <Trophy className="w-12 h-12" />;
      default:
        return <Trophy className="w-12 h-12" />;
    }
  };

  return (
    <AnimatePresence>
      {achievement && (
        <>
          {/* Confetti Layer */}
          <div className="fixed inset-0 pointer-events-none z-[100]">
            {confetti.map((particle) => (
              <motion.div
                key={particle.id}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  left: `${particle.x}%`,
                  backgroundColor: particle.color,
                }}
                initial={{ y: -20, opacity: 1, rotate: 0 }}
                animate={{
                  y: window.innerHeight + 20,
                  opacity: [1, 1, 0],
                  rotate: particle.rotation,
                }}
                transition={{
                  duration: 3,
                  delay: particle.delay,
                  ease: "easeIn",
                }}
              />
            ))}
          </div>

          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-testid="achievement-celebration-backdrop"
          />

          {/* Achievement Card */}
          <div className="fixed inset-0 flex items-center justify-center z-[100] pointer-events-none p-4">
            <motion.div
              className="bg-card border-2 border-chart-1 rounded-lg shadow-2xl max-w-md w-full p-8 text-center pointer-events-auto relative"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 10 }}
              transition={{ type: "spring", damping: 15, stiffness: 300 }}
              data-testid="achievement-celebration-card"
            >
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={onClose}
                data-testid="button-close-celebration"
              >
                <X className="w-4 h-4" />
              </Button>

              {/* Pulsing Trophy Animation */}
              <motion.div
                className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-chart-1/20 text-chart-1 mb-4"
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {getCategoryIcon(achievement.category)}
              </motion.div>

              {/* Achievement Unlocked Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Achievement Unlocked!
                </p>
                <h2 className="text-3xl font-bold mb-3 text-chart-1">
                  {achievement.title}
                </h2>
                <p className="text-base text-muted-foreground mb-6">
                  {achievement.description}
                </p>
              </motion.div>

              {/* Sparkle Decorations */}
              <motion.div
                className="absolute top-4 left-4 text-chart-3"
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Sparkles className="w-5 h-5" />
              </motion.div>
              <motion.div
                className="absolute top-4 right-4 text-chart-2"
                animate={{
                  rotate: [360, 0],
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
              >
                <Star className="w-5 h-5" />
              </motion.div>

              {/* Continue Button */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  onClick={onClose}
                  className="mt-4 bg-chart-1 hover:bg-chart-1/90 text-white"
                  data-testid="button-continue-celebration"
                >
                  Continue
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
