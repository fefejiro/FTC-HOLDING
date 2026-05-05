export const LISTEN_MODE_PATH = "/?listen=1";

function getCurrentLocationFromWindow(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function isListenModeLocation(location?: string): boolean {
  if (typeof window === "undefined" && !location) {
    return false;
  }

  const baseOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://saywetin.app";
  const resolved = new URL(location || getCurrentLocationFromWindow(), baseOrigin);

  return resolved.pathname === "/" && resolved.searchParams.get("listen") === "1";
}
