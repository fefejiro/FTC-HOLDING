function truthy(value?: string) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function isAteamOperatorEnabled() {
  if (process.env.NODE_ENV === "development") return true;
  return truthy(process.env.NEXT_PUBLIC_ATEAM_OPERATOR_ENABLED) || truthy(process.env.ATEAM_OPERATOR_PROXY_ENABLED);
}
