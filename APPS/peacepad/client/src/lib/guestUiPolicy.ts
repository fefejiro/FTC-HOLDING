export function isGuestUiEnabled(): boolean {
  return import.meta.env.DEV;
}
