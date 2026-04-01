export const ATEAM_BRAND_LOGO_PATH = "/images/brand/ateam-logo.png";
export const ATEAM_MISSION_CONTROL_PREVIEW_PATH = "/images/brand/ateam-mission-control.png";
export const ATEAM_PRODUCT_PREVIEW_ASSET = {
  // Enable once the real screen recording assets are added to /public/media.
  hasVideo: false,
  webmSrc: "/media/ateam-preview.webm",
  mp4Src: "/media/ateam-preview.mp4",
  posterSrc: "/media/ateam-preview-poster.png"
} as const;

const ateamLocalSurfaceMap = {
  office: {
    key: "office",
    label: "Office",
    route: "/office",
    href: "/ateam",
    summary:
      "Office is the operator routing desk where conversations, priorities, and the next move get assigned.",
    detail:
      "The Office control plane stays readable inside Una Labs without leaking private controls into the public flow."
  },
  memory: {
    key: "memory",
    label: "Memory",
    route: "/memory",
    href: "/ateam/memory",
    summary:
      "Memory keeps the brief, signal, and history visible before work gets routed or promoted into delivery.",
    detail:
      "This is the private Memory surface from ATEAM, framed inside the Una Labs operator route."
  },
  team: {
    key: "team",
    label: "Team",
    route: "/team",
    href: "/ateam/team",
    summary:
      "Team shows the live crew, who is present, and where ownership currently sits.",
    detail:
      "The Team surface stays intact so ownership remains visible as runs evolve into projects."
  },
  factory: {
    key: "factory",
    label: "Factory",
    route: "/factory",
    href: "/ateam/factory",
    summary:
      "Factory exposes the delivery floor with build, QA, review, and ship movement.",
    detail:
      "The Factory route keeps delivery movement visible from inside the ATEAM operator shell."
  },
  pipeline: {
    key: "pipeline",
    label: "Pipeline",
    route: "/pipeline",
    href: "/ateam/pipeline",
    summary:
      "Pipeline keeps the current flow legible when you want the big-picture movement across the system.",
    detail:
      "It stays aligned with the same public runs, jobs, artifacts, and approvals."
  }
} as const;

export type AteamLocalSurfaceKey = keyof typeof ateamLocalSurfaceMap;

export const ateamLocalSurfaceKeys = Object.keys(ateamLocalSurfaceMap) as AteamLocalSurfaceKey[];
export const ateamLocalSurfaces = ateamLocalSurfaceKeys.map((key) => ateamLocalSurfaceMap[key]);

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
