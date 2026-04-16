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
    wrapper: "h-[24rem] w-[24rem] sm:h-[28rem] sm:w-[28rem] lg:h-[34rem] lg:w-[34rem]",
    core: "h-28 w-28 sm:h-32 sm:w-32",
    icon: "h-14 w-14 sm:h-16 sm:w-16",
  },
  hero: {
    wrapper: "h-[26rem] w-[26rem] sm:h-[30rem] sm:w-[30rem]",
    core: "h-32 w-32 sm:h-36 sm:w-36",
    icon: "h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]",
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
    rippleCount: 7,
    rippleScale: 1.74,
    rippleDuration: 2.6,
    glowDuration: 3.2,
    hazeScale: [0.88, 1.28, 0.92],
    hazeOpacity: [0.36, 0.82, 0.42],
    shellScale: [0.94, 1.18, 0.98],
    shellDuration: 2.15,
    particleDrift: 40,
    particleOpacity: [0.22, 0.56, 0.26],
    particleScale: [0.76, 1.22, 0.8],
    particleCount: 7,
  },
  matching: {
    rippleCount: 6,
    rippleScale: 1.54,
    rippleDuration: 1.65,
    glowDuration: 1.95,
    hazeScale: [0.94, 1.16, 0.97],
    hazeOpacity: [0.34, 0.62, 0.38],
    shellScale: [0.97, 1.1, 0.995],
    shellDuration: 1.25,
    particleDrift: 18,
    particleOpacity: [0.18, 0.34, 0.2],
    particleScale: [0.84, 1.08, 0.88],
    particleCount: 5,
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

  return "from-orange-500/24 via-amber-300/22 to-green-400/18";
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
  const rippleClass =
    mode === "listening"
      ? "border-white/18 bg-white/[0.04] shadow-[0_0_44px_rgba(249,115,22,0.1)]"
      : mode === "matching"
        ? "border-white/16 bg-white/[0.035] shadow-[0_0_34px_rgba(249,115,22,0.1)]"
        : "border-white/12 bg-white/[0.02]";

  return (
    <div className={`relative isolate ${classes.wrapper}`}>
      <motion.div
        className={`absolute inset-[-24%] rounded-full bg-gradient-to-br ${fieldTint} blur-3xl`}
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
        className="absolute inset-[-12%] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.16)_0%,rgba(249,115,22,0.08)_22%,rgba(163,230,53,0.05)_38%,transparent_68%)] blur-2xl"
        animate={{
          scale: mode === "matching" ? [0.92, 1.04, 0.96] : [0.88, 1.12, 0.92],
          opacity: mode === "matching" ? [0.32, 0.5, 0.36] : [0.28, 0.62, 0.34],
        }}
        transition={{
          duration: mode === "matching" ? 1.8 : 2.4,
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
          className={`absolute inset-0 rounded-full ${rippleClass}`}
          animate={{
            scale: [0.54, config.rippleScale - index * 0.045, config.rippleScale + 0.14 - index * 0.045],
            opacity: [0, Math.max(0.12, 0.42 - index * 0.045), 0],
          }}
          transition={{
            duration: config.rippleDuration,
            repeat: Infinity,
            ease: "easeOut",
            delay: index * (mode === "matching" ? 0.14 : 0.2),
          }}
        />
      ))}

      {mode === "listening" || mode === "matching" ? (
        Array.from({ length: mode === "listening" ? 3 : 2 }).map((_, index) => (
          <motion.div
            key={`${mode}-field-wave-${index}`}
            className="absolute inset-[-28%] rounded-full bg-[radial-gradient(circle,transparent_53%,rgba(255,255,255,0.06)_56%,rgba(253,186,116,0.22)_58%,rgba(250,204,21,0.2)_60%,transparent_64%)] mix-blend-screen"
            animate={{
              scale: mode === "matching" ? [0.7, 1.1, 1.36] : [0.62, 1.24, 1.56],
              opacity: mode === "matching" ? [0, 0.18, 0] : [0, 0.24, 0],
            }}
            transition={{
              duration: mode === "matching" ? 2.1 : 2.5,
              repeat: Infinity,
              ease: "easeOut",
              delay: index * (mode === "matching" ? 0.26 : 0.34),
            }}
          />
        ))
      ) : null}

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
