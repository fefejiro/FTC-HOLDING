import { Loader2, Mic, Music2 } from "lucide-react";
import { motion } from "framer-motion";

export type ListeningOrbMode = "requesting" | "listening" | "matching" | "success" | "error";
type ListeningOrbSize = "compact" | "immersive" | "hero";

const SIZE_CLASSES: Record<ListeningOrbSize, { wrapper: string; core: string; icon: string }> = {
  compact: {
    wrapper: "h-40 w-40",
    core: "h-20 w-20",
    icon: "h-9 w-9",
  },
  immersive: {
    wrapper: "h-56 w-56",
    core: "h-28 w-28",
    icon: "h-14 w-14",
  },
  hero: {
    wrapper: "h-60 w-60",
    core: "h-32 w-32",
    icon: "h-16 w-16",
  },
};

const MODE_CONFIG: Record<
  ListeningOrbMode,
  {
    rippleScale: number;
    rippleDuration: number;
    glowDuration: number;
    hazeScale: number[];
    hazeOpacity: number[];
    shellScale: number[];
    shellDuration: number;
    particleDrift: number;
    particleOpacity: number[];
    particleScale: number[];
    particleCount: number;
  }
> = {
  requesting: {
    rippleScale: 1.22,
    rippleDuration: 2.5,
    glowDuration: 2.8,
    hazeScale: [0.94, 1.06, 0.96],
    hazeOpacity: [0.2, 0.34, 0.22],
    shellScale: [0.98, 1.03, 1],
    shellDuration: 2.6,
    particleDrift: 14,
    particleOpacity: [0.1, 0.24, 0.12],
    particleScale: [0.88, 1, 0.9],
    particleCount: 4,
  },
  listening: {
    rippleScale: 1.34,
    rippleDuration: 3.4,
    glowDuration: 3.8,
    hazeScale: [0.92, 1.12, 0.95],
    hazeOpacity: [0.24, 0.48, 0.28],
    shellScale: [0.97, 1.08, 0.99],
    shellDuration: 3.1,
    particleDrift: 20,
    particleOpacity: [0.14, 0.42, 0.16],
    particleScale: [0.86, 1.08, 0.88],
    particleCount: 5,
  },
  matching: {
    rippleScale: 1.2,
    rippleDuration: 2.2,
    glowDuration: 2.4,
    hazeScale: [0.96, 1.05, 0.98],
    hazeOpacity: [0.28, 0.42, 0.3],
    shellScale: [0.99, 1.04, 1],
    shellDuration: 1.9,
    particleDrift: 10,
    particleOpacity: [0.16, 0.34, 0.18],
    particleScale: [0.9, 1.02, 0.92],
    particleCount: 4,
  },
  success: {
    rippleScale: 1.12,
    rippleDuration: 2,
    glowDuration: 2.2,
    hazeScale: [0.96, 1.04, 1],
    hazeOpacity: [0.24, 0.4, 0.28],
    shellScale: [0.99, 1.02, 1],
    shellDuration: 1.7,
    particleDrift: 8,
    particleOpacity: [0.12, 0.24, 0.14],
    particleScale: [0.92, 1, 0.94],
    particleCount: 3,
  },
  error: {
    rippleScale: 1.1,
    rippleDuration: 2.4,
    glowDuration: 2.6,
    hazeScale: [0.97, 1.02, 0.99],
    hazeOpacity: [0.12, 0.2, 0.14],
    shellScale: [1, 0.985, 1],
    shellDuration: 2.2,
    particleDrift: 8,
    particleOpacity: [0.08, 0.16, 0.1],
    particleScale: [0.94, 0.98, 0.95],
    particleCount: 3,
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

function getFieldTint(mode: ListeningOrbMode): string {
  if (mode === "success") {
    return "from-emerald-500/18 via-green-400/14 to-lime-400/12";
  }

  if (mode === "error") {
    return "from-slate-500/14 via-slate-300/10 to-slate-500/10";
  }

  if (mode === "matching") {
    return "from-orange-500/20 via-amber-400/18 to-green-400/16";
  }

  return "from-orange-500/18 via-amber-400/16 to-green-400/14";
}

function getShellTint(mode: ListeningOrbMode): string {
  if (mode === "success") {
    return "border-white/20 bg-white/8";
  }

  if (mode === "error") {
    return "border-white/10 bg-white/5";
  }

  if (mode === "matching") {
    return "border-white/18 bg-white/10";
  }

  return "border-white/14 bg-white/8";
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
  const fieldTint = getFieldTint(mode);
  const shellTint = getShellTint(mode);
  const config = MODE_CONFIG[mode];

  return (
    <div className={`relative isolate ${classes.wrapper}`}>
      <motion.div
        className={`absolute inset-[-16%] rounded-full bg-gradient-to-br ${fieldTint} blur-3xl`}
        animate={{
          scale: config.hazeScale,
          opacity: config.hazeOpacity,
          rotate: mode === "matching" ? [0, 8, 0] : [-4, 6, -2],
        }}
        transition={{
          duration: config.glowDuration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute inset-[8%] rounded-full border border-white/8 bg-white/[0.03] blur-2xl"
        animate={{
          scale: mode === "matching" ? [0.98, 1.03, 1] : [0.96, 1.07, 0.99],
          opacity: mode === "matching" ? [0.2, 0.3, 0.22] : [0.16, 0.28, 0.18],
        }}
        transition={{
          duration: config.glowDuration - 0.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {Array.from({ length: 5 }).map((_, index) => (
        <motion.div
          key={`${mode}-ripple-${index}`}
          className="absolute inset-0 rounded-full border border-white/12 bg-white/[0.02]"
          animate={{
            scale: [0.7, config.rippleScale - index * 0.02, config.rippleScale + 0.08 - index * 0.02],
            opacity: [0, Math.max(0.14, 0.26 - index * 0.04), 0],
          }}
          transition={{
            duration: config.rippleDuration,
            repeat: Infinity,
            ease: "easeOut",
            delay: index * (mode === "matching" ? 0.18 : 0.26),
          }}
        />
      ))}

      {Array.from({ length: config.particleCount }).map((_, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        const baseX = -20 + index * 10;
        const baseY = -32 + index * 11;

        return (
          <motion.div
            key={`${mode}-particle-${index}`}
            className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full bg-white/55 shadow-[0_0_16px_rgba(255,255,255,0.2)]"
            animate={{
              x: [
                baseX,
                baseX + config.particleDrift * direction,
                baseX + config.particleDrift * 0.45 * direction,
              ],
              y: [
                baseY,
                baseY - config.particleDrift * 0.55,
                baseY + config.particleDrift * 0.35,
              ],
              opacity: config.particleOpacity,
              scale: config.particleScale,
            }}
            transition={{
              duration: 3 + index * 0.24,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.18,
            }}
          />
        );
      })}

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className={`absolute rounded-full border ${shellTint} shadow-[0_18px_60px_rgba(249,115,22,0.16)] ${classes.core}`}
          animate={{
            scale: config.shellScale,
            opacity: mode === "matching" ? [0.88, 1, 0.9] : [0.8, 0.96, 0.84],
          }}
          transition={{
            duration: config.shellDuration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className={`${classes.core} relative overflow-hidden rounded-full bg-gradient-to-br ${accent} flex items-center justify-center shadow-[0_24px_80px_rgba(249,115,22,0.24)]`}
          animate={
            mode === "success"
              ? { scale: [0.98, 1.03, 1] }
              : mode === "error"
                ? { scale: [1, 0.985, 1] }
                : mode === "matching"
                  ? { scale: [0.99, 1.045, 1], rotate: [0, 2, 0] }
                  : { scale: [0.97, 1.06, 0.99], rotate: [0, -2, 0] }
          }
          transition={{
            duration: mode === "matching" ? 1.8 : 2.8,
            repeat: mode === "success" ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            className="absolute inset-[10%] rounded-full border border-white/18 bg-white/10"
            animate={{
              scale: mode === "matching" ? [0.96, 1.02, 0.98] : [0.94, 1.04, 0.97],
              opacity: mode === "matching" ? [0.24, 0.38, 0.28] : [0.18, 0.34, 0.22],
            }}
            transition={{
              duration: mode === "matching" ? 1.6 : 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.42),transparent_34%),radial-gradient(circle_at_68%_72%,rgba(255,255,255,0.16),transparent_40%)]"
            animate={{
              opacity: mode === "matching" ? [0.42, 0.58, 0.46] : [0.36, 0.54, 0.4],
            }}
            transition={{
              duration: mode === "matching" ? 1.4 : 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            className="relative z-10"
            animate={
              mode === "matching"
                ? { y: [0, -1.5, 0], scale: [1, 1.03, 1] }
                : mode === "requesting"
                  ? { y: [0, -0.5, 0] }
                  : { y: [0, -1, 0], scale: [1, 1.02, 1] }
            }
            transition={{
              duration: mode === "matching" ? 1.3 : 2.1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {mode === "requesting" ? (
              <Loader2 className={`${classes.icon} text-white animate-spin`} />
            ) : mode === "success" ? (
              <Music2 className={`${classes.icon} text-white`} />
            ) : (
              <Mic className={`${classes.icon} ${mode === "error" ? "text-white/75" : "text-white"}`} />
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
