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
  findProfileById,
} from "@/lib/repositories/server/user.repository";
import { creditCoins } from "@/lib/repositories/server/coin.repository";
import { findStreakByUserId, upsertStreak } from "@/lib/repositories/server/streak.repository";
import { drawFromPool, type DrawResult } from "@/services/prize-engine";
import { notifyUserMailboxSilent } from "@/services/notification.action";

export type { DrawResult };

const COOLDOWN_MS = 24 * 60 * 60 * 1000;
const STREAK_BREAK_MS = 48 * 60 * 60 * 1000;

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
  | {
      ok: true;
      streakDay: number;
      currentStreak: number;
      expEarned: number;
      coinsEarned: number;
      lootBox?: DrawResult;
    }
  | {
      ok: false;
      error: string;
      remainHours?: number;
      remainMins?: number;
    };

function resolveCheckinRewards(streakDay: number): {
  exp: number;
  coins: number;
  triggerLootBox: boolean;
} {
  if (streakDay === 0) {
    return { exp: 5, coins: 10, triggerLootBox: true };
  }
  if (streakDay === 1 || streakDay === 2) {
    return { exp: 1, coins: 1, triggerLootBox: false };
  }
  if (streakDay === 3 || streakDay === 4) {
    const coins = Math.random() < 0.5 ? 2 : 3;
    return { exp: 2, coins, triggerLootBox: false };
  }
  if (streakDay === 5 || streakDay === 6) {
    return { exp: 3, coins: 5, triggerLootBox: false };
  }
  return { exp: 1, coins: 1, triggerLootBox: false };
}

/**
 * Layer 3：每日簽到。冷卻以 **`users.last_checkin_at`** 為 SSOT（滾動 24h）。
 * 連續天數見 **`login_streaks`**；第 7 天觸發公會盲盒（**`drawFromPool('loot_box')`**）。
 */
export async function claimDailyCheckin(): Promise<ClaimDailyCheckinResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "請先登入。" };
  }

  const profile = await findProfileById(user.id);
  if (!profile) {
    return { ok: false, error: "找不到冒險者資料。" };
  }

  const lastCheckin = profile.last_checkin_at
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

  const streakRow = await findStreakByUserId(user.id);
  const prevStreak = streakRow?.current_streak ?? 0;
  const longestBefore = streakRow?.longest_streak ?? 0;
  const lastClaimMs = streakRow?.last_claim_at
    ? new Date(streakRow.last_claim_at).getTime()
    : null;

  const elapsed =
    lastClaimMs === null ? Number.POSITIVE_INFINITY : now - lastClaimMs;

  let newStreak: number;
  if (lastClaimMs === null || elapsed > STREAK_BREAK_MS) {
    newStreak = 1;
  } else {
    newStreak = prevStreak + 1;
  }

  const streakDay = newStreak % 7;
  const { exp: expEarned, coins: coinsEarned, triggerLootBox } =
    resolveCheckinRewards(streakDay);

  const unique_key = `daily_checkin:${user.id}:${now}`;

  try {
    await insertExpLog({
      user_id: user.id,
      source: "daily_checkin",
      unique_key,
      delta: expEarned,
      delta_exp: expEarned,
    });
  } catch (error) {
    if (
      error instanceof DuplicateExpRewardError ||
      isUniqueConstraintError(error)
    ) {
      const again = await findProfileById(user.id);
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
    if (coinsEarned > 0) {
      const coinResult = await creditCoins({
        userId: user.id,
        coinType: "free",
        amount: coinsEarned,
        source: "checkin",
        note: "每日簽到獎勵",
      });
      if (!coinResult.success) {
        console.error("checkin creditCoins:", coinResult.error);
      }
    }
  } catch (e) {
    console.error("checkin coins:", e);
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

  const longestStreak = Math.max(newStreak, longestBefore);
  const lastClaimIso = new Date(now).toISOString();
  try {
    await upsertStreak(user.id, {
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_claim_at: lastClaimIso,
    });
  } catch (e) {
    logCheckinRawError(e);
    return { ok: false, error: formatCheckinErrorForClient(e) };
  }

  let lootBox: DrawResult | undefined;
  if (triggerLootBox) {
    try {
      lootBox = await drawFromPool("loot_box", user.id);
      const extra =
        lootBox.value != null
          ? `（${lootBox.rewardType} +${lootBox.value}）`
          : `（${lootBox.rewardType}）`;
      await notifyUserMailboxSilent({
        user_id: user.id,
        type: "system",
        from_user_id: null,
        message: `🎁 公會盲盒開出：${lootBox.label}${extra}`,
        is_read: false,
      });
    } catch (e) {
      console.error("loot_box draw:", e);
    }
  }

  revalidatePath("/");
  return {
    ok: true,
    streakDay: streakDay === 0 ? 7 : streakDay,
    currentStreak: newStreak,
    expEarned,
    coinsEarned,
    lootBox,
  };
}

export async function getMyStreakAction(): Promise<
  | {
      ok: true;
      currentStreak: number;
      longestStreak: number;
      lastClaimAt: string | null;
    }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "請先登入。" };
  }
  const row = await findStreakByUserId(user.id);
  return {
    ok: true,
    currentStreak: row?.current_streak ?? 0,
    longestStreak: row?.longest_streak ?? 0,
    lastClaimAt: row?.last_claim_at ?? null,
  };
}
