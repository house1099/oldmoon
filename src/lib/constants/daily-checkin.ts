/**
 * 與 `claimDailyCheckin` 回傳 **`error`** 比對之機讀 slug（今日台北曆日已簽）。
 * UI 應改顯示友善文案（如「今日已經簽到過了喵！」），勿直接對使用者顯示本字串。
 */
export const DAILY_CHECKIN_ALREADY_TODAY = "DAILY_CHECKIN_ALREADY_TODAY" as const;
