export const PWA_INSTALL_ENGAGED_KEY = "pwa_install_engaged";

const ENGAGED_EVENT = "pwa-install-engaged";

export function markPwaInstallEngaged(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PWA_INSTALL_ENGAGED_KEY, "1");
    window.dispatchEvent(new Event(ENGAGED_EVENT));
  } catch {
    /* ignore */
  }
}

export function hasPwaInstallEngaged(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(PWA_INSTALL_ENGAGED_KEY) === "1";
  } catch {
    return false;
  }
}

export function subscribePwaInstallEngaged(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(ENGAGED_EVENT, handler);
  return () => window.removeEventListener(ENGAGED_EVENT, handler);
}
