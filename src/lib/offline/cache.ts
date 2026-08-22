const CACHE_KEY = "my-aura-offline-visit";

export function saveOfflineVisit(payload: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), payload }));
}

export function loadOfflineVisit(): unknown | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function clearOfflineVisit(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CACHE_KEY);
}
