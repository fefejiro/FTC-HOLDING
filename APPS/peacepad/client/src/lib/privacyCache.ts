export async function purgePeacePadBrowserCaches(): Promise<void> {
  if (typeof window === "undefined" || !("caches" in window)) {
    return;
  }

  const cacheNames = await window.caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.startsWith("peacepad-"))
      .map((cacheName) => window.caches.delete(cacheName)),
  );
}
