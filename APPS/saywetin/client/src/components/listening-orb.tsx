import { useEffect, useState } from "react";
import { Loader2, Mic, Music2 } from "lucide-react";
import { motion } from "framer-motion";

export type ListeningOrbMode = "requesting" | "listening" | "matching" | "success" | "error";
type ListeningOrbSize = "compact" | "immersive" | "hero";
type OrbRuntimeProfile = "full" | "mobile";
type OrbMotionConfig = {
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
};

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

const MODE_CONFIG: Record<ListeningOrbMode, OrbMotionConfig> = {
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

function detectMobileOrbRuntime(): boolean {
  if (typeof window === "undefined") return false;

  const native =
    typeof document !== "undefined" &&
    document.body.classList.contains("capacitor-native");

  const narrowViewport = window.innerWidth < 768;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;

  return native || narrowViewport || coarsePointer;
}

function useOrbRuntimeProfile(): OrbRuntimeProfile {
  const [profile, setProfile] = useState<OrbRuntimeProfile>(() =>
    detectMobileOrbRuntime() ? "mobile" : "full",
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const updateProfile = () => {
      setProfile(detectMobileOrbRuntime() ? "mobile" : "full");
    };

    updateProfile();
    window.addEventListener("resize", updateProfile);
    mediaQuery.addEventListener?.("change", updateProfile);

    return () => {
      window.removeEventListener("resize", updateProfile);
      mediaQuery.removeEventListener?.("change", updateProfile);
    };
  }, []);

  return profile;
}

function getRuntimeConfig(mode: ListeningOrbMode, profile: OrbRuntimeProfile): OrbMotionConfig {
  const base = MODE_CONFIG[mode];

  if (profile === "full") {
    return base;
  }

  switch (mode) {
    case "listening":
      return {
        ...base,
        rippleCount: 5,
        rippleScale: 1.62,
        rippleDuration: 2.45,
        hazeScale: [0.92, 1.18, 0.95],
        hazeOpacity: [0.34, 0.68, 0.4],
        shellScale: [0.97, 1.12, 0.995],
        shellDuration: 2.2,
        particleDrift: 0,
        particleOpacity: [0, 0, 0],
        particleScale: [1, 1, 1],
        particleCount: 0,
      };
    case "matching":
      return {
        ...base,
        rippleCount: 4,
        rippleScale: 1.44,
        rippleDuration: 1.55,
        hazeScale: [0.96, 1.12, 0.98],
        hazeOpacity: [0.3, 0.52, 0.34],
        shellScale: [0.98, 1.08, 1],
        shellDuration: 1.18,
        particleDrift: 0,
        particleOpacity: [0, 0, 0],
        particleScale: [1, 1, 1],
        particleCount: 0,
      };
    case "requesting":
      return {
        ...base,
        particleCount: 0,
        particleDrift: 0,
      };
    case "error":
      return {
        ...base,
        rippleCount: 3,
        particleCount: 0,
        particleDrift: 0,
        hazeOpacity: [0.16, 0.24, 0.18],
      };
    case "success":
      return {
        ...base,
        particleCount: 0,
        particleDrift: 0,
      };
    default:
      return base;
  }
}

function getFieldWaveCount(mode: ListeningOrbMode, profile: OrbRuntimeProfile): number {
  if (mode !== "listening" && mode !== "matching") {
    return 0;
  }

  if (profile === "mobile") {
    return mode === "listening" ? 3 : 2;
  }

  return mode === "listening" ? 3 : 2;
}

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

function MobileListeningOrb({
  mode,
  classes,
  accent,
  fieldTint,
  shellTint,
  config,
  fieldWaveCount,
}: {
  mode: ListeningOrbMode;
  classes: { wrapper: string; core: string; icon: string };
  accent: string;
  fieldTint: string;
  shellTint: string;
  config: OrbMotionConfig;
  fieldWaveCount: number;
}) {
  const coreAnimate =
    mode === "success"
      ? { scale: [0.99, 1.025, 1] }
      : mode === "matching"
        ? { scale: [0.985, 1.045, 1] }
        : mode === "error"
          ? { scale: [0.995, 1.012, 1] }
          : { scale: [0.97, 1.07, 0.99] };

  const iconAnimate =
    mode === "matching"
      ? { scale: [1, 1.02, 1] }
      : mode === "requesting"
        ? { opacity: [0.88, 1, 0.9] }
        : mode === "error"
          ? { opacity: [0.9, 0.98, 0.92] }
          : { scale: [1, 1.015, 1] };

  const ripplePeakOpacity =
    mode === "listening" ? 0.34 : mode === "matching" ? 0.28 : 0.18;

  return (
    <div className={`relative isolate ${classes.wrapper}`}>
      <motion.div
        className={`absolute inset-[-14%] rounded-full bg-gradient-to-br ${fieldTint} blur-[42px]`}
        animate={{
          scale: mode === "matching" ? [0.96, 1.04, 0.98] : [0.94, 1.1, 0.97],
          opacity: mode === "error" ? [0.16, 0.26, 0.18] : [0.22, 0.42, 0.26],
        }}
        transition={{
          duration: mode === "matching" ? 1.9 : 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="absolute inset-[-6%] rounded-full border border-white/8 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_38%,transparent_72%)]"
        animate={{
          scale: mode === "matching" ? [0.98, 1.02, 1] : [0.96, 1.05, 0.98],
          opacity: mode === "error" ? [0.12, 0.18, 0.14] : [0.14, 0.24, 0.16],
        }}
        transition={{
          duration: mode === "matching" ? 1.7 : 2.2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {Array.from({ length: Math.max(4, config.rippleCount) }).map((_, index) => (
        <motion.div
          key={`${mode}-mobile-ripple-${index}`}
          className="absolute inset-0 rounded-full border border-white/16 bg-white/[0.03]"
          animate={{
            scale: [
              0.58,
              config.rippleScale - index * 0.055,
              config.rippleScale + 0.08 - index * 0.055,
            ],
            opacity: [0, Math.max(0.1, ripplePeakOpacity - index * 0.04), 0],
          }}
          transition={{
            duration: config.rippleDuration,
            repeat: Infinity,
            ease: "easeOut",
            delay: index * (mode === "matching" ? 0.16 : 0.22),
          }}
        />
      ))}

      {Array.from({ length: Math.max(3, fieldWaveCount) }).map((_, index) => (
        <motion.div
          key={`${mode}-mobile-wave-${index}`}
          className="absolute inset-[-12%] rounded-full border border-amber-100/12 bg-[radial-gradient(circle,transparent_54%,rgba(253,186,116,0.14)_59%,rgba(132,204,22,0.1)_63%,transparent_70%)]"
          animate={{
            scale:
              mode === "matching"
                ? [0.78, 1.02, 1.18]
                : [0.68, 1.14, 1.3],
            opacity:
              mode === "matching"
                ? [0, 0.16, 0]
                : [0, 0.22, 0],
          }}
          transition={{
            duration: mode === "matching" ? 1.8 : 2.2,
            repeat: Infinity,
            ease: "easeOut",
            delay: index * (mode === "matching" ? 0.2 : 0.26),
          }}
        />
      ))}

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className={`absolute rounded-full border ${shellTint} ${classes.core}`}
          animate={{
            scale: config.shellScale,
            opacity:
              mode === "matching"
                ? [0.84, 0.96, 0.88]
                : mode === "error"
                  ? [0.7, 0.8, 0.72]
                  : [0.78, 0.94, 0.82],
          }}
          transition={{
            duration: config.shellDuration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className={`${classes.core} relative overflow-hidden rounded-full bg-gradient-to-br ${accent} flex items-center justify-center shadow-[0_20px_48px_rgba(249,115,22,0.22)]`}
          animate={coreAnimate}
          transition={{
            duration: mode === "matching" ? 1.35 : mode === "error" ? 2 : 2.1,
            repeat: mode === "success" ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            className="absolute inset-[11%] rounded-full border border-white/18 bg-white/10"
            animate={{
              scale:
                mode === "matching"
                  ? [0.97, 1.025, 0.985]
                  : mode === "error"
                    ? [0.985, 1.01, 0.99]
                    : [0.94, 1.05, 0.96],
              opacity:
                mode === "matching"
                  ? [0.22, 0.34, 0.24]
                  : mode === "error"
                    ? [0.14, 0.22, 0.16]
                    : [0.18, 0.32, 0.2],
            }}
            transition={{
              duration: mode === "matching" ? 1.2 : mode === "error" ? 1.8 : 1.95,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_32%_26%,rgba(255,255,255,0.36),transparent_36%),radial-gradient(circle_at_66%_72%,rgba(255,255,255,0.14),transparent_44%)]" />

          <motion.div
            className="relative z-10"
            animate={iconAnimate}
            transition={{
              duration: mode === "matching" ? 1.05 : mode === "error" ? 1.7 : 1.55,
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

export function ListeningOrb({
  mode,
  size = "compact",
}: {
  mode: ListeningOrbMode;
  size?: ListeningOrbSize;
}) {
  const runtimeProfile = useOrbRuntimeProfile();
  const classes = SIZE_CLASSES[size];
  const accent = getAccent(mode);
  const fieldTint = getFieldTint(mode);
  const shellTint = getShellTint(mode);
  const config = getRuntimeConfig(mode, runtimeProfile);
  const isMobileProfile = runtimeProfile === "mobile";
  const fieldWaveCount = getFieldWaveCount(mode, runtimeProfile);

  if (isMobileProfile) {
    return (
      <MobileListeningOrb
        mode={mode}
        classes={classes}
        accent={accent}
        fieldTint={fieldTint}
        shellTint={shellTint}
        config={config}
        fieldWaveCount={fieldWaveCount}
      />
    );
  }

  const rippleClass =
    mode === "listening"
      ? "border-white/18 bg-white/[0.04] shadow-[0_0_44px_rgba(249,115,22,0.1)]"
      : mode === "matching"
        ? "border-white/16 bg-white/[0.035] shadow-[0_0_34px_rgba(249,115,22,0.1)]"
        : "border-white/12 bg-white/[0.02]";
  const coreAnimate =
    mode === "success"
      ? { scale: [0.98, 1.03, 1] }
      : mode === "error"
        ? isMobileProfile
          ? { scale: [0.995, 1.01, 1] }
          : { scale: [0.99, 1.015, 1], rotate: [0, 0.5, 0] }
        : mode === "matching"
          ? isMobileProfile
            ? { scale: [0.99, 1.045, 1] }
            : { scale: [0.98, 1.07, 1], rotate: [0, 1.5, 0] }
          : isMobileProfile
            ? { scale: [0.97, 1.08, 0.99] }
            : { scale: [0.95, 1.12, 0.97], rotate: [0, -2.6, 0] };
  const iconAnimate =
    mode === "matching"
      ? isMobileProfile
        ? { y: [0, -1.1, 0], scale: [1, 1.03, 1] }
        : { y: [0, -2, 0], scale: [1, 1.045, 1] }
      : mode === "requesting"
        ? { y: [0, -0.5, 0] }
        : mode === "error"
          ? isMobileProfile
            ? { y: [0, -0.4, 0], scale: [1, 1.005, 1] }
            : { y: [0, -0.6, 0], scale: [1, 1.01, 1] }
          : isMobileProfile
            ? { y: [0, -0.9, 0], scale: [1, 1.025, 1] }
            : { y: [0, -1.6, 0], scale: [1, 1.05, 1] };

  return (
    <div className={`relative isolate transform-gpu ${classes.wrapper}`}>
      <motion.div
        className={`absolute rounded-full bg-gradient-to-br ${fieldTint} transform-gpu ${
          isMobileProfile ? "inset-[-18%] blur-2xl" : "inset-[-24%] blur-3xl"
        }`}
        animate={{
          scale: config.hazeScale,
          opacity: config.hazeOpacity,
          rotate: isMobileProfile ? 0 : mode === "matching" ? [0, 8, 0] : [-4, 6, -2],
        }}
        transition={{
          duration: config.glowDuration,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className={`absolute rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.16)_0%,rgba(249,115,22,0.08)_22%,rgba(163,230,53,0.05)_38%,transparent_68%)] transform-gpu ${
          isMobileProfile ? "inset-[-8%] blur-xl" : "inset-[-12%] blur-2xl"
        }`}
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
        className={`absolute inset-[8%] rounded-full border border-white/8 bg-white/[0.03] transform-gpu ${
          isMobileProfile ? "blur-xl" : "blur-2xl"
        }`}
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
          className={`absolute inset-0 rounded-full transform-gpu ${rippleClass}`}
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

      {fieldWaveCount > 0 ? (
        Array.from({ length: fieldWaveCount }).map((_, index) => (
          <motion.div
            key={`${mode}-field-wave-${index}`}
            className={`absolute rounded-full transform-gpu ${
              isMobileProfile
                ? "inset-[-18%] border border-white/12 bg-[radial-gradient(circle,transparent_55%,rgba(253,186,116,0.18)_60%,rgba(250,204,21,0.16)_63%,transparent_69%)]"
                : "inset-[-28%] bg-[radial-gradient(circle,transparent_53%,rgba(255,255,255,0.06)_56%,rgba(253,186,116,0.22)_58%,rgba(250,204,21,0.2)_60%,transparent_64%)] mix-blend-screen"
            }`}
            animate={{
              scale: isMobileProfile
                ? mode === "matching"
                  ? [0.76, 1.04, 1.22]
                  : [0.68, 1.18, 1.38]
                : mode === "matching"
                  ? [0.7, 1.1, 1.36]
                  : [0.62, 1.24, 1.56],
              opacity: isMobileProfile
                ? mode === "matching"
                  ? [0, 0.18, 0]
                  : [0, 0.24, 0]
                : mode === "matching"
                  ? [0, 0.18, 0]
                  : [0, 0.24, 0],
            }}
            transition={{
              duration: isMobileProfile ? (mode === "matching" ? 1.85 : 2.2) : mode === "matching" ? 2.1 : 2.5,
              repeat: Infinity,
              ease: "easeOut",
              delay: index * (isMobileProfile ? (mode === "matching" ? 0.22 : 0.28) : mode === "matching" ? 0.26 : 0.34),
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
            className={`absolute left-1/2 top-1/2 rounded-full bg-white/55 shadow-[0_0_16px_rgba(255,255,255,0.2)] transform-gpu ${
              isMobileProfile ? "h-2 w-2" : "h-2.5 w-2.5"
            }`}
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
          className={`absolute rounded-full border ${shellTint} shadow-[0_18px_60px_rgba(249,115,22,0.16)] transform-gpu ${classes.core}`}
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
          className={`${classes.core} relative overflow-hidden rounded-full bg-gradient-to-br ${accent} flex items-center justify-center shadow-[0_24px_80px_rgba(249,115,22,0.24)] transform-gpu`}
          animate={coreAnimate}
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
            animate={iconAnimate}
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
