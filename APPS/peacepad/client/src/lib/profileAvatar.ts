export interface ProfileAvatarDescriptor {
  kind: "image" | "emoji" | "theme" | "fallback";
  value?: string;
  initials: string;
  themeClassName?: string;
}

const AVATAR_THEME_CLASSES: Record<string, string> = {
  "calm-purple": "bg-gradient-to-br from-purple-400 to-purple-600 text-white",
  "calm-blue": "bg-gradient-to-br from-blue-400 to-blue-600 text-white",
  "calm-green": "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white",
  "calm-orange": "bg-gradient-to-br from-orange-400 to-orange-600 text-white",
  "calm-pink": "bg-gradient-to-br from-pink-400 to-pink-600 text-white",
  "calm-teal": "bg-gradient-to-br from-teal-400 to-teal-600 text-white",
};

function getInitials(displayName?: string | null): string {
  const parts = (displayName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "PP";
  }

  return parts.map((part) => part[0]?.toUpperCase() || "").join("") || "PP";
}

export function getProfileAvatarDescriptor(
  profileImageUrl?: string | null,
  displayName?: string | null,
): ProfileAvatarDescriptor {
  const trimmed = profileImageUrl?.trim();
  const initials = getInitials(displayName);

  if (!trimmed) {
    return { kind: "fallback", initials };
  }

  if (trimmed.startsWith("emoji:")) {
    return {
      kind: "emoji",
      value: trimmed.replace("emoji:", ""),
      initials,
    };
  }

  if (trimmed.startsWith("avatar:")) {
    const themeId = trimmed.replace("avatar:", "");
    return {
      kind: "theme",
      value: themeId,
      initials,
      themeClassName: AVATAR_THEME_CLASSES[themeId] || "bg-primary text-primary-foreground",
    };
  }

  return {
    kind: "image",
    value: trimmed,
    initials,
  };
}
