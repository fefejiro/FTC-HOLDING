export const ATEAM_BRAND_LOGO_PATH = "/images/brand/ateam-logo.png";
export const ATEAM_MISSION_CONTROL_PREVIEW_PATH = "/images/brand/ateam-mission-control.png";

const ateamLocalSurfaceMap = {
  office: {
    key: "office",
    label: "Office",
    route: "/office",
    href: "/ateam",
    summary:
      "Office is the live routing desk where conversations, priorities, and the next move get assigned.",
    detail:
      "The real Office surface stays readable inside Una Labs instead of being flattened into a fake stage card."
  },
  memory: {
    key: "memory",
    label: "Memory",
    route: "/memory",
    href: "/ateam/memory",
    summary:
      "Memory keeps the brief, signal, and history visible before work gets routed or handed off.",
    detail:
      "This is the actual Memory surface from ATEAM, embedded through the Una Labs route."
  },
  team: {
    key: "team",
    label: "Team",
    route: "/team",
    href: "/ateam/team",
    summary:
      "Team shows the live crew, who is present, and where ownership currently sits.",
    detail:
      "The real Team surface stays intact so the product still feels like ATEAM, not a brochure."
  },
  factory: {
    key: "factory",
    label: "Factory",
    route: "/factory",
    href: "/ateam/factory",
    summary:
      "Factory exposes the actual work floor with build, QA, review, and ship movement.",
    detail:
      "The embedded Factory surface keeps the real ATEAM floor visible from inside Una Labs."
  },
  pipeline: {
    key: "pipeline",
    label: "Pipeline",
    route: "/pipeline",
    href: "/ateam/pipeline",
    summary:
      "Pipeline keeps the current flow legible when you want the big-picture movement across the system.",
    detail:
      "It is still the live ATEAM runtime, just framed inside the Una Labs product shell."
  }
} as const;

export type AteamLocalSurfaceKey = keyof typeof ateamLocalSurfaceMap;

export const ateamLocalSurfaceKeys = Object.keys(ateamLocalSurfaceMap) as AteamLocalSurfaceKey[];
export const ateamLocalSurfaces = ateamLocalSurfaceKeys.map((key) => ateamLocalSurfaceMap[key]);

export const ATEAM_LOCAL_EMBED_ORIGINS = ["http://127.0.0.1:3000", "http://localhost:3000"] as const;

export function resolveAteamLocalSurface(rawValue?: string | null): AteamLocalSurfaceKey {
  const normalized = String(rawValue || "").trim().toLowerCase();
  if (normalized in ateamLocalSurfaceMap) {
    return normalized as AteamLocalSurfaceKey;
  }
  return "office";
}

export function getAteamLocalSurface(rawValue?: string | null) {
  return ateamLocalSurfaceMap[resolveAteamLocalSurface(rawValue)];
}
