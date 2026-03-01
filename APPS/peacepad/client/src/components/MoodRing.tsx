import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

export type MoodEmotion = 'calm' | 'cooperative' | 'neutral' | 'frustrated' | 'tense' | 'defensive';

interface MoodRingProps {
  emotion: MoodEmotion;
  confidence: number; // 0-100
  isActive?: boolean;
  showLabel?: boolean;
}

const EMOTION_COLORS: Record<MoodEmotion, { bg: string; glow: string; text: string }> = {
  calm: {
    bg: 'bg-blue-500/20',
    glow: 'shadow-blue-500/50',
    text: 'text-blue-600 dark:text-blue-400',
  },
  cooperative: {
    bg: 'bg-green-500/20',
    glow: 'shadow-green-500/50',
    text: 'text-green-600 dark:text-green-400',
  },
  neutral: {
    bg: 'bg-gray-500/20',
    glow: 'shadow-gray-500/50',
    text: 'text-gray-600 dark:text-gray-400',
  },
  frustrated: {
    bg: 'bg-orange-500/20',
    glow: 'shadow-orange-500/50',
    text: 'text-orange-600 dark:text-orange-400',
  },
  tense: {
    bg: 'bg-amber-500/20',
    glow: 'shadow-amber-500/50',
    text: 'text-amber-600 dark:text-amber-400',
  },
  defensive: {
    bg: 'bg-red-500/20',
    glow: 'shadow-red-500/50',
    text: 'text-red-600 dark:text-red-400',
  },
};

const EMOTION_LABELS: Record<MoodEmotion, string> = {
  calm: 'Calm',
  cooperative: 'Cooperative',
  neutral: 'Neutral',
  frustrated: 'Frustrated',
  tense: 'Tense',
  defensive: 'Defensive',
};

export function MoodRing({ emotion, confidence, isActive = true, showLabel = true }: MoodRingProps) {
  const colors = EMOTION_COLORS[emotion];
  const label = EMOTION_LABELS[emotion];

  if (!isActive) {
    return null;
  }

  // Show sparkle animation when mood improves (calm or cooperative)
  const showSparkle = emotion === 'calm' || emotion === 'cooperative';

  return (
    <div className="flex items-center gap-2" data-testid="mood-ring-indicator">
      <div className="relative">
        {/* Pulsing ring */}
        <motion.div
          className={`w-8 h-8 rounded-full ${colors.bg} ${colors.glow} shadow-lg`}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          data-testid={`mood-ring-${emotion}`}
        />

        {/* Inner dot */}
        <motion.div
          className={`absolute inset-0 m-auto w-4 h-4 rounded-full ${colors.bg.replace('/20', '/60')}`}
          animate={{
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />

        {/* Sparkle effect for positive emotions */}
        <AnimatePresence>
          {showSparkle && (
            <motion.div
              className={`absolute -top-1 -right-1 ${colors.text}`}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Sparkles className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {showLabel && (
        <motion.div
          className="flex flex-col"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className={`text-sm font-medium ${colors.text}`} data-testid="mood-ring-label">
            {label}
          </span>
          <span className="text-xs text-muted-foreground" data-testid="mood-ring-confidence">
            {confidence}% confident
          </span>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Compact version for display in call controls
 */
export function MoodRingCompact({ emotion, isActive = true }: Pick<MoodRingProps, 'emotion' | 'isActive'>) {
  const colors = EMOTION_COLORS[emotion];

  if (!isActive) {
    return null;
  }

  return (
    <motion.div
      className={`w-3 h-3 rounded-full ${colors.bg.replace('/20', '/60')} ${colors.glow} shadow`}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.6, 1, 0.6],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      data-testid={`mood-ring-compact-${emotion}`}
    />
  );
}
