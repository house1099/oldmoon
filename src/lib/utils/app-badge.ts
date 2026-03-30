/** PWA 主畫面圖示角標（Badging API）；不支援或失敗時靜默略過。 */
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
