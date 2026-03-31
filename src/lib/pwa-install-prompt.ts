const STORAGE_KEY = "pwa_prompt_dismissed";
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function isPwaPromptInCooldown(now: number = Date.now()): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const t = Number(raw);
    if (!Number.isFinite(t)) return false;
    return now - t < THREE_DAYS_MS;
  } catch {
    return true;
  }
}

export function dismissPwaPrompt(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}
