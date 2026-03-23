"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DuplicateExpRewardError,
  insertExpLog,
} from "@/lib/repositories/server/exp.repository";
import { taipeiCalendarDateKey } from "@/lib/utils/date";

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
