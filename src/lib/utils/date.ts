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
