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
    rippleCount: number;
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
    rippleCount: 4,
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
    rippleCount: 6,
    rippleScale: 1.46,
    rippleDuration: 3.2,
    glowDuration: 3.6,
    hazeScale: [0.9, 1.18, 0.94],
    hazeOpacity: [0.28, 0.62, 0.34],
    shellScale: [0.95, 1.13, 0.98],
    shellDuration: 2.6,
    particleDrift: 28,
    particleOpacity: [0.18, 0.48, 0.22],
    particleScale: [0.8, 1.14, 0.84],
    particleCount: 6,
  },
  matching: {
    rippleCount: 5,
    rippleScale: 1.24,
    rippleDuration: 1.9,
    glowDuration: 2.2,
    hazeScale: [0.95, 1.09, 0.97],
    hazeOpacity: [0.32, 0.5, 0.35],
    shellScale: [0.98, 1.07, 1],
    shellDuration: 1.55,
    particleDrift: 12,
    particleOpacity: [0.16, 0.3, 0.18],
    particleScale: [0.88, 1.04, 0.9],
    particleCount: 4,
  },
  success: {
    rippleCount: 3,
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
    rippleCount: 4,
    rippleScale: 1.16,
    rippleDuration: 2.3,
    glowDuration: 2.5,
    hazeScale: [0.96, 1.05, 0.98],
    hazeOpacity: [0.18, 0.3, 0.2],
    shellScale: [0.99, 1.015, 1],
    shellDuration: 2.3,
    particleDrift: 10,
    particleOpacity: [0.1, 0.18, 0.12],
    particleScale: [0.9, 1, 0.92],
    particleCount: 4,
  },
};

function getAccent(mode: ListeningOrbMode): string {
  if (mode === "success") {
    return "from-emerald-500 via-green-500 to-lime-500";
  }

  if (mode === "error") {
    return "from-amber-500 via-orange-400 to-stone-500";
  }

  return "from-orange-500 via-amber-500 to-green-500";
}

function getFieldTint(mode: ListeningOrbMode): string {
  if (mode === "success") {
    return "from-emerald-500/18 via-green-400/14 to-lime-400/12";
  }

  if (mode === "error") {
    return "from-amber-500/18 via-orange-300/14 to-stone-500/12";
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
    return "border-white/14 bg-white/7";
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

      {Array.from({ length: config.rippleCount }).map((_, index) => (
        <motion.div
          key={`${mode}-ripple-${index}`}
          className="absolute inset-0 rounded-full border border-white/12 bg-white/[0.02]"
          animate={{
            scale: [0.64, config.rippleScale - index * 0.03, config.rippleScale + 0.12 - index * 0.03],
            opacity: [0, Math.max(0.12, 0.34 - index * 0.05), 0],
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
            opacity:
              mode === "matching"
                ? [0.9, 1, 0.92]
                : mode === "error"
                  ? [0.74, 0.84, 0.76]
                  : [0.82, 0.98, 0.86],
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
                ? { scale: [0.99, 1.015, 1], rotate: [0, 0.5, 0] }
                : mode === "matching"
                  ? { scale: [0.98, 1.07, 1], rotate: [0, 1.5, 0] }
                  : { scale: [0.95, 1.12, 0.97], rotate: [0, -2.6, 0] }
          }
          transition={{
            duration: mode === "matching" ? 1.45 : mode === "error" ? 2.2 : 2.35,
            repeat: mode === "success" ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            className="absolute inset-[10%] rounded-full border border-white/18 bg-white/10"
            animate={{
              scale:
                mode === "matching"
                  ? [0.95, 1.035, 0.97]
                  : mode === "error"
                    ? [0.96, 1.01, 0.98]
                    : [0.92, 1.07, 0.95],
              opacity:
                mode === "matching"
                  ? [0.28, 0.44, 0.32]
                  : mode === "error"
                    ? [0.18, 0.28, 0.2]
                    : [0.22, 0.42, 0.26],
            }}
            transition={{
              duration: mode === "matching" ? 1.3 : mode === "error" ? 1.9 : 2.1,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.42),transparent_34%),radial-gradient(circle_at_68%_72%,rgba(255,255,255,0.16),transparent_40%)]"
            animate={{
              opacity:
                mode === "matching"
                  ? [0.46, 0.64, 0.5]
                  : mode === "error"
                    ? [0.3, 0.42, 0.32]
                    : [0.4, 0.64, 0.44],
            }}
            transition={{
              duration: mode === "matching" ? 1.15 : mode === "error" ? 1.9 : 1.95,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            className="relative z-10"
            animate={
              mode === "matching"
                ? { y: [0, -2, 0], scale: [1, 1.045, 1] }
                : mode === "requesting"
                  ? { y: [0, -0.5, 0] }
                  : mode === "error"
                    ? { y: [0, -0.6, 0], scale: [1, 1.01, 1] }
                    : { y: [0, -1.6, 0], scale: [1, 1.05, 1] }
            }
            transition={{
              duration: mode === "matching" ? 1.05 : mode === "error" ? 1.8 : 1.7,
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
