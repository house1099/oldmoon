"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DuplicateExpRewardError,
  findDailyCheckinForUserOnTaipeiDay,
  insertExpLog,
  isUniqueConstraintError,
} from "@/lib/repositories/server/exp.repository";
import { DAILY_CHECKIN_ALREADY_TODAY } from "@/lib/constants/daily-checkin";
import {
  nextTaipeiCalendarDateAfter,
  taipeiCalendarDateKey,
} from "@/lib/utils/date";

function logCheckinRawError(error: unknown) {
  try {
    console.error("❌ 簽到原始錯誤物件:", JSON.stringify(error, null, 2));
  } catch {
    try {
      console.error(
        "❌ 簽到原始錯誤物件:",
        JSON.stringify(error, Object.getOwnPropertyNames(Object(error)), 2),
      );
    } catch {
      console.error("❌ 簽到原始錯誤物件 (無法 JSON 序列化):", error);
    }
  }
}

function formatCheckinErrorForClient(error: unknown): string {
  if (error instanceof DuplicateExpRewardError) {
    return DAILY_CHECKIN_ALREADY_TODAY;
  }
  if (error && typeof error === "object") {
    const e = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };
    const parts = [e.code, e.message, e.details, e.hint].filter(
      (x): x is string => typeof x === "string" && x.length > 0,
    );
    if (parts.length > 0) return parts.join(" — ");
  }
  if (error instanceof Error && error.message) return error.message;
  return String(error);
}

export type DailyCheckinCooldownResult =
  | {
      ok: true;
      checkedToday: boolean;
      /** 今日已簽到時，下一個可簽到的台北曆日鍵 */
      nextEligibleDateKey: string | null;
    }
  | { ok: false; error: string };

/**
 * Layer 3：讀取今日是否已簽到（**`unique_key`** 對應 **`taipeiCalendarDateKey()`**），供 UI 鎖定按鈕。
 */
export async function getDailyCheckinCooldownInfo(): Promise<DailyCheckinCooldownResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "請先登入。" };
  }

  const dayTaipei = taipeiCalendarDateKey();

  try {
    const existing = await findDailyCheckinForUserOnTaipeiDay(
      user.id,
      dayTaipei,
    );
    if (existing) {
      return {
        ok: true,
        checkedToday: true,
        nextEligibleDateKey: nextTaipeiCalendarDateAfter(dayTaipei),
      };
    }
    return {
      ok: true,
      checkedToday: false,
      nextEligibleDateKey: null,
    };
  } catch (error) {
    logCheckinRawError(error);
    return { ok: false, error: formatCheckinErrorForClient(error) };
  }
}

/**
 * Layer 3：每日簽到 +1 EXP（**`unique_key`** 同日僅一筆）。
 * 簽到前先查當日 **`daily_checkin`** 列；**`insertExpLog`** 明送 **`delta`**／**`delta_exp`**。
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
    const existing = await findDailyCheckinForUserOnTaipeiDay(
      user.id,
      dayTaipei,
    );
    if (existing) {
      return { ok: false, error: DAILY_CHECKIN_ALREADY_TODAY };
    }

    await insertExpLog({
      user_id: user.id,
      source: "daily_checkin",
      unique_key,
      delta: 1,
      delta_exp: 1,
    });
  } catch (error) {
    if (
      error instanceof DuplicateExpRewardError ||
      isUniqueConstraintError(error)
    ) {
      return { ok: false, error: DAILY_CHECKIN_ALREADY_TODAY };
    }
    logCheckinRawError(error);
    return { ok: false, error: formatCheckinErrorForClient(error) };
  }

  revalidatePath("/");
  return { ok: true };
}
