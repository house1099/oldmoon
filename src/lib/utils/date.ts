/**
 * Layer 4 Utils：公會日曆基準（Asia/Taipei 日界）。
 * 產生 `unique_key`、簽到防重等業務日鍵時應使用此函式，勿用 UTC `toISOString().slice(0, 10)`。
 */
export function taipeiCalendarDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) {
    throw new Error("taipeiCalendarDateKey: missing date parts");
  }
  return `${y}-${m}-${d}`;
}

/**
 * 以台北時區「曆日鍵」推算下一個曆日鍵（台灣無 DST，+24h 自該日正午錨點推算即可）。
 */
export function nextTaipeiCalendarDateAfter(ymdKey: string): string {
  const anchor = new Date(`${ymdKey}T12:00:00+08:00`);
  return taipeiCalendarDateKey(
    new Date(anchor.getTime() + 24 * 60 * 60 * 1000),
  );
}

/** 將 `YYYY-MM-DD`（台北曆日）格式化成繁中可讀日期（用於簽到「下次可簽」提示）。 */
export function formatTaipeiDateKeyForDisplay(ymdKey: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(`${ymdKey}T12:00:00+08:00`));
}
