"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DuplicateExpRewardError,
  insertExpLog,
} from "@/lib/repositories/server/exp.repository";

/** 以台灣日界產生 `YYYY-MM-DD`（勿用 UTC `toISOString()`，否則重置時間會偏移） */
function taipeiCalendarDateKey(date: Date = new Date()): string {
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
 * Layer 3：每日簽到 +1 EXP（`exp_logs.unique_key` 同日僅能領一次）。
 */
export async function claimDailyCheckin(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "請先登入。" };
  }

  const dayTaipei = taipeiCalendarDateKey();
  const unique_key = `daily_checkin:${dayTaipei}:${user.id}`;

  try {
    await insertExpLog({
      user_id: user.id,
      delta_exp: 1,
      source: "daily_checkin",
      unique_key,
    });
  } catch (error) {
    if (error instanceof DuplicateExpRewardError) {
      return { ok: false, error: error.message };
    }
    console.error("❌ 每日簽到失敗:", error);
    return { ok: false, error: "簽到失敗，請稍後再試。" };
  }

  revalidatePath("/");
  return { ok: true };
}
