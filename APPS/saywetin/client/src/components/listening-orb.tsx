import { Loader2, Mic, Music2 } from "lucide-react";
import { motion } from "framer-motion";

export type ListeningOrbMode = "requesting" | "listening" | "matching" | "success" | "error";
type ListeningOrbSize = "compact" | "immersive" | "hero";

const SIZE_CLASSES: Record<ListeningOrbSize, { wrapper: string; core: string; icon: string }> = {
  compact: {
    wrapper: "h-36 w-36",
    core: "h-20 w-20",
    icon: "h-10 w-10",
  },
  immersive: {
    wrapper: "h-52 w-52",
    core: "h-28 w-28",
    icon: "h-14 w-14",
  },
  hero: {
    wrapper: "h-52 w-52",
    core: "h-28 w-28",
    icon: "h-14 w-14",
  },
};

function getAccent(mode: ListeningOrbMode): string {
  if (mode === "success") {
    return "from-emerald-500 via-green-500 to-lime-500";
  }

  if (mode === "error") {
    return "from-slate-500 via-slate-400 to-slate-500";
  }

  return "from-orange-500 via-amber-500 to-green-500";
}

export function ListeningOrb({
  mode,
  size = "compact",
}: {
  mode: ListeningOrbMode;
  size?: ListeningOrbSize;
}) {
  const classes = SIZE_CLASSES[size];
  const accent = getAccent(mode);
  const rippleDuration = mode === "matching" ? 2 : mode === "requesting" ? 2.4 : 2.8;
  const rippleScale = mode === "matching" ? 1.22 : 1.28;

  return (
    <div className={`relative ${classes.wrapper}`}>
      {[0, 1, 2, 3].map((index) => (
        <motion.div
          key={`${mode}-ripple-${index}`}
          className="absolute inset-0 rounded-full border border-primary/18 bg-primary/5"
          animate={{
            scale: [0.76, rippleScale, rippleScale + 0.08],
            opacity: [0, 0.28 - index * 0.04, 0],
          }}
          transition={{
            duration: rippleDuration,
            ease: "easeOut",
            repeat: Infinity,
            delay: index * 0.22,
          }}
        />
      ))}

      <motion.div
        className="absolute inset-4 rounded-full bg-gradient-to-br from-orange-500/12 via-amber-500/12 to-green-500/12 blur-3xl"
        animate={{
          scale: mode === "matching" ? [0.94, 1.08, 0.96] : [0.92, 1.1, 0.95],
          opacity: mode === "matching" ? [0.26, 0.46, 0.28] : [0.18, 0.4, 0.22],
        }}
        transition={{
          duration: mode === "matching" ? 1.8 : 2.9,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {[0, 1, 2].map((index) => (
        <motion.div
          key={`${mode}-field-${index}`}
          className="absolute left-1/2 top-1/2 h-3 w-3 rounded-full bg-white/35"
          animate={{
            x: [-22 + index * 10, -12 + index * 24, -18 + index * 14],
            y: [-30 + index * 10, -44 + index * 3, -26 + index * 12],
            opacity: mode === "error" ? [0.12, 0.22, 0.12] : [0.15, 0.55, 0.12],
            scale: mode === "matching" ? [0.9, 1.12, 0.94] : [0.86, 1.02, 0.9],
          }}
          transition={{
            duration: 3.2 + index * 0.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: index * 0.24,
          }}
        />
      ))}

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className={`${classes.core} rounded-full bg-gradient-to-br ${accent} flex items-center justify-center shadow-2xl shadow-orange-500/20`}
          animate={
            mode === "success"
              ? { scale: [0.97, 1.03, 1] }
              : mode === "error"
                ? { scale: [1, 0.985, 1] }
                : { scale: [0.97, 1.05, 0.99] }
          }
          transition={{
            duration: mode === "matching" ? 1.7 : 2.6,
            repeat: mode === "success" ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            animate={mode === "matching" ? { y: [0, -2, 0], scale: [1, 1.03, 1] } : { y: [0, -1, 0] }}
            transition={{
              duration: mode === "matching" ? 1.2 : 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {mode === "requesting" ? (
              <Loader2 className={`${classes.icon} text-white animate-spin`} />
            ) : mode === "success" ? (
              <Music2 className={`${classes.icon} text-white`} />
            ) : (
              <Mic className={`${classes.icon} ${mode === "error" ? "text-white/70" : "text-white"}`} />
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
