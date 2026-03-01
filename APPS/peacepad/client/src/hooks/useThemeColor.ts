import { useEffect } from "react";
import { useAuth } from "./useAuth";

// Avatar color ID to theme color mapping with dark mode optimizations
const AVATAR_COLOR_MAP: Record<string, { 
  primary: string; 
  accent: string;
  primaryForeground: { light: string; dark: string };
  accentForeground: { light: string; dark: string };
  name: string;
}> = {
  "calm-purple": {
    primary: "255 97% 77%",    // #A78BFE - Vibrant purple
    accent: "9 100% 70%",      // #FF7F66 - Coral
    primaryForeground: { light: "222 15% 20%", dark: "222 15% 20%" },
    accentForeground: { light: "0 0% 100%", dark: "0 0% 100%" },
    name: "purple",
  },
  "calm-blue": {
    primary: "207 100% 70%",   // #64BAFF - Vibrant blue
    accent: "146 61% 66%",     // #70E09E - Green
    primaryForeground: { light: "222 15% 20%", dark: "222 15% 20%" },
    accentForeground: { light: "0 0% 100%", dark: "0 0% 100%" },
    name: "blue",
  },
  "calm-green": {
    primary: "146 61% 66%",    // #70E09E - Vibrant green
    accent: "43 100% 70%",     // #FFD864 - Yellow
    primaryForeground: { light: "222 15% 20%", dark: "222 15% 20%" },
    accentForeground: { light: "0 0% 0%", dark: "0 0% 0%" },  // Yellow needs dark text
    name: "green",
  },
  "calm-orange": {
    primary: "39 100% 60%",    // #FF9500 - Vibrant orange
    accent: "255 97% 77%",     // #A78BFE - Purple
    primaryForeground: { light: "0 0% 100%", dark: "0 0% 100%" },
    accentForeground: { light: "222 15% 20%", dark: "222 15% 20%" },
    name: "orange",
  },
  "calm-pink": {
    primary: "320 100% 70%",   // #FF4D94 - Vibrant pink
    accent: "207 100% 70%",    // #64BAFF - Blue
    primaryForeground: { light: "0 0% 100%", dark: "0 0% 100%" },
    accentForeground: { light: "222 15% 20%", dark: "222 15% 20%" },
    name: "pink",
  },
  "calm-teal": {
    primary: "180 100% 50%",   // #00D2A8 - Vibrant teal
    accent: "39 100% 60%",     // #FF9500 - Orange
    primaryForeground: { light: "222 15% 20%", dark: "222 15% 20%" },
    accentForeground: { light: "0 0% 100%", dark: "0 0% 100%" },
    name: "teal",
  },
};

function isDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

export function useThemeColor() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.profileImageUrl) return;

    // Extract avatar color from profileImageUrl (format: "avatar:calm-purple")
    const avatarMatch = user.profileImageUrl.match(/avatar:(.+)/);
    if (!avatarMatch) return;

    const avatarId = avatarMatch[1];
    const colorScheme = AVATAR_COLOR_MAP[avatarId];

    if (!colorScheme) return;

    // Add transition class to root for smooth animation
    const root = document.documentElement;
    root.classList.add("transitioning-theme");

    // Smooth transition for color changes (300ms = duration-300)
    setTimeout(() => {
      const darkMode = isDarkMode();
      
      root.style.setProperty("--primary", colorScheme.primary);
      root.style.setProperty("--accent", colorScheme.accent);
      
      // Set appropriate foreground colors for better contrast
      root.style.setProperty(
        "--primary-foreground", 
        darkMode ? colorScheme.primaryForeground.dark : colorScheme.primaryForeground.light
      );
      root.style.setProperty(
        "--accent-foreground", 
        darkMode ? colorScheme.accentForeground.dark : colorScheme.accentForeground.light
      );

      // Update chart colors to use new primary
      root.style.setProperty("--chart-1", colorScheme.primary);

      console.log(`[ThemeColor] Applied ${colorScheme.name} theme (${darkMode ? "dark" : "light"} mode)`);
    }, 10); // Small delay for browser reflow

    // Remove transition class after animation completes
    const timeout = setTimeout(() => {
      root.classList.remove("transitioning-theme");
    }, 350);

    return () => clearTimeout(timeout);
  }, [user?.profileImageUrl]);

  // Re-apply foreground colors when dark mode changes
  useEffect(() => {
    if (!user?.profileImageUrl) return;

    const avatarMatch = user.profileImageUrl.match(/avatar:(.+)/);
    if (!avatarMatch) return;

    const colorScheme = AVATAR_COLOR_MAP[avatarMatch[1]];
    if (!colorScheme) return;

    const root = document.documentElement;
    const darkMode = isDarkMode();
    
    root.style.setProperty(
      "--primary-foreground", 
      darkMode ? colorScheme.primaryForeground.dark : colorScheme.primaryForeground.light
    );
    root.style.setProperty(
      "--accent-foreground", 
      darkMode ? colorScheme.accentForeground.dark : colorScheme.accentForeground.light
    );

    console.log(`[ThemeColor] Updated foreground colors for ${darkMode ? "dark" : "light"} mode`);
  }, [user?.profileImageUrl]);
}

export function getAvatarColorScheme(profileImageUrl?: string | null) {
  if (!profileImageUrl) return AVATAR_COLOR_MAP["calm-purple"];

  const avatarMatch = profileImageUrl.match(/avatar:(.+)/);
  if (!avatarMatch) return AVATAR_COLOR_MAP["calm-purple"];

  return AVATAR_COLOR_MAP[avatarMatch[1]] || AVATAR_COLOR_MAP["calm-purple"];
}
