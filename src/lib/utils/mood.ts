// 計算距離 mood_at + 24h 還剩多少時間
export function getMoodCountdown(moodAt: string | null): string | null {
  if (!moodAt) return null;
  const expiry = new Date(moodAt).getTime() + 24 * 60 * 60 * 1000;
  const now = Date.now();
  const diff = expiry - now;
  if (diff <= 0) return null; // 已過期
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `還有 ${hours} 小時 ${minutes} 分`;
}

// 判斷心情是否仍在有效期內
export function isMoodActive(moodAt: string | null): boolean {
  if (!moodAt) return false;
  return Date.now() < new Date(moodAt).getTime() + 24 * 60 * 60 * 1000;
}
