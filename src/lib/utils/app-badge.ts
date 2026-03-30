/** PWA 主畫面圖示角標（Badging API）；不支援或失敗時靜默略過。 */

/** 登出等情境明確清除圖示角標；不支援或失敗時靜默略過。 */
export async function clearPwaAppBadge(): Promise<void> {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & {
    clearAppBadge?: () => Promise<void>;
  };
  if (typeof nav.clearAppBadge !== "function") return;
  try {
    await nav.clearAppBadge();
  } catch {
    /* iOS／部分瀏覽器可能 reject */
  }
}

export async function setPwaAppBadgeFromUnreadChatCount(count: number): Promise<void> {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  if (typeof nav.setAppBadge !== "function") return;

  const capped = Math.min(Math.max(0, Math.floor(count)), 99);

  try {
    if (capped <= 0) {
      await nav.clearAppBadge?.();
    } else {
      await nav.setAppBadge(capped);
    }
  } catch {
    /* iOS／部分瀏覽器可能 reject */
  }
}
