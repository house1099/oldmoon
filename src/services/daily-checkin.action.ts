"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DuplicateExpRewardError,
  insertExpLog,
  isUniqueConstraintError,
} from "@/lib/repositories/server/exp.repository";
import { DAILY_CHECKIN_ALREADY_CLAIMED } from "@/lib/constants/daily-checkin";
import {
  restoreActivityOnCheckin,
  updateLastCheckinAt,
} from "@/lib/repositories/server/user.repository";

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

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
    return DAILY_CHECKIN_ALREADY_CLAIMED;
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

function remainFromLastCheckin(lastCheckinMs: number): {
  remainHours: number;
  remainMins: number;
} {
  const now = Date.now();
  const remainMs = COOLDOWN_MS - (now - lastCheckinMs);
  return {
    remainHours: Math.floor(remainMs / (1000 * 60 * 60)),
    remainMins: Math.floor((remainMs % (1000 * 60 * 60)) / (1000 * 60)),
  };
}

export type ClaimDailyCheckinResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      remainHours?: number;
      remainMins?: number;
    };

/**
 * Layer 3：每日簽到 +1 EXP。冷卻以 **`users.last_checkin_at`** 為 SSOT（滾動 24h）。
 * **`exp_logs.unique_key`** 格式 **`daily_checkin:{userId}:{timestamp}`** 避免與舊日曆鍵衝突。
 */
export async function claimDailyCheckin(): Promise<ClaimDailyCheckinResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "請先登入。" };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("last_checkin_at")
    .eq("id", user.id)
    .single();

  const lastCheckin = profile?.last_checkin_at
    ? new Date(profile.last_checkin_at).getTime()
    : 0;
  const now = Date.now();

  if (now - lastCheckin < COOLDOWN_MS) {
    const { remainHours, remainMins } = remainFromLastCheckin(lastCheckin);
    return {
      ok: false,
      error: DAILY_CHECKIN_ALREADY_CLAIMED,
      remainHours,
      remainMins,
    };
  }

  const unique_key = `daily_checkin:${user.id}:${now}`;

  try {
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
      const { data: again } = await supabase
        .from("users")
        .select("last_checkin_at")
        .eq("id", user.id)
        .single();
      const lm = again?.last_checkin_at
        ? new Date(again.last_checkin_at).getTime()
        : lastCheckin;
      const { remainHours, remainMins } = remainFromLastCheckin(lm);
      return {
        ok: false,
        error: DAILY_CHECKIN_ALREADY_CLAIMED,
        remainHours,
        remainMins,
      };
    }
    logCheckinRawError(error);
    return { ok: false, error: formatCheckinErrorForClient(error) };
  }

  try {
    await updateLastCheckinAt(user.id);
  } catch (error) {
    logCheckinRawError(error);
    return { ok: false, error: formatCheckinErrorForClient(error) };
  }

  try {
    await restoreActivityOnCheckin(user.id);
  } catch (e) {
    console.error("restoreActivityOnCheckin:", e);
  }

  revalidatePath("/");
  return { ok: true };
}
