import { createAdminClient } from "@/lib/supabase/admin";
import { taipeiCalendarDateKey } from "@/lib/utils/date";
import type { Database } from "@/types/database.types";

type CastRow = Database["public"]["Tables"]["fishing_rod_cast_state"]["Row"];

export async function getRodCastState(
  userId: string,
  rodUserRewardId: string,
): Promise<CastRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fishing_rod_cast_state")
    .select("*")
    .eq("user_id", userId)
    .eq("rod_user_reward_id", rodUserRewardId)
    .maybeSingle();
  if (error) throw error;
  return (data as CastRow) ?? null;
}

function effectiveCastsUsedToday(row: CastRow | null, today: string): number {
  if (!row) return 0;
  return row.taipei_date_key === today ? row.casts_used : 0;
}

/** 可否拋新竿：須無進行中收成、拋竿冷卻已結束、未達每日上限。 */
export function peekCanStartCast(opts: {
  row: CastRow | null;
  maxPerDay: number;
  cooldownAfterCastMinutes: number;
}):
  | { ok: true }
  | {
      ok: false;
      error: "pending_harvest" | "daily_limit" | "cooldown";
      cooldownMinutesLeft?: number;
    } {
  const today = taipeiCalendarDateKey();
  const now = Date.now();

  if (opts.row?.pending_cast_started_at) {
    return { ok: false, error: "pending_harvest" };
  }

  if (opts.row?.last_cast_at && opts.cooldownAfterCastMinutes > 0) {
    const last = new Date(opts.row.last_cast_at).getTime();
    const ms = opts.cooldownAfterCastMinutes * 60_000;
    const elapsed = now - last;
    if (elapsed < ms) {
      return {
        ok: false,
        error: "cooldown",
        cooldownMinutesLeft: Math.ceil((ms - elapsed) / 60_000),
      };
    }
  }

  const castsUsed = effectiveCastsUsedToday(opts.row, today);
  if (castsUsed >= opts.maxPerDay) {
    return { ok: false, error: "daily_limit" };
  }

  return { ok: true };
}

/** 進行中拋竿是否已可收成。 */
export function peekHarvestReady(opts: {
  row: CastRow | null;
  waitUntilHarvestMinutes: number;
}):
  | { ok: true }
  | { ok: false; error: "no_pending" | "too_soon"; remainSec: number } {
  if (!opts.row?.pending_cast_started_at) {
    return { ok: false, error: "no_pending", remainSec: 0 };
  }
  const start = new Date(opts.row.pending_cast_started_at).getTime();
  const ms = opts.waitUntilHarvestMinutes * 60_000;
  const elapsed = Date.now() - start;
  if (elapsed < ms) {
    return {
      ok: false,
      error: "too_soon",
      remainSec: Math.ceil((ms - elapsed) / 1000),
    };
  }
  return { ok: true };
}

/** 僅檢查是否可拋竿（未扣次）。 */
export function peekRodCastAllowed(opts: {
  row: CastRow | null;
  maxPerDay: number;
  cooldownMinutes: number;
}):
  | { ok: true }
  | { ok: false; error: "daily_limit" | "cooldown"; cooldownMinutesLeft?: number } {
  const r = peekCanStartCast({
    row: opts.row,
    maxPerDay: opts.maxPerDay,
    cooldownAfterCastMinutes: opts.cooldownMinutes,
  });
  if (r.ok) return { ok: true };
  if (r.error === "pending_harvest") {
    return { ok: false, error: "cooldown", cooldownMinutesLeft: 1 };
  }
  if (r.error === "cooldown") {
    return {
      ok: false,
      error: "cooldown",
      cooldownMinutesLeft: r.cooldownMinutesLeft,
    };
  }
  return { ok: false, error: "daily_limit" };
}

export type RodCooldownInfo = {
  isOnCooldown: boolean;
  remainMinutes: number;
  nextCastAt: string | null;
};

/** 依 last_cast_at 與拋竿冷卻分鐘計算 UI 用冷卻資訊。 */
export function computeRodCooldownInfo(
  row: CastRow | null,
  cooldownAfterCastMinutes: number,
): RodCooldownInfo | null {
  if (cooldownAfterCastMinutes <= 0) {
    return {
      isOnCooldown: false,
      remainMinutes: 0,
      nextCastAt: null,
    };
  }
  if (!row?.last_cast_at) {
    return {
      isOnCooldown: false,
      remainMinutes: 0,
      nextCastAt: null,
    };
  }
  const last = new Date(row.last_cast_at).getTime();
  const ms = cooldownAfterCastMinutes * 60_000;
  const elapsed = Date.now() - last;
  if (elapsed >= ms) {
    return {
      isOnCooldown: false,
      remainMinutes: 0,
      nextCastAt: null,
    };
  }
  const remainMs = ms - elapsed;
  return {
    isOnCooldown: true,
    remainMinutes: Math.max(1, Math.ceil(remainMs / 60_000)),
    nextCastAt: new Date(last + ms).toISOString(),
  };
}

export async function setPendingCast(opts: {
  userId: string;
  rodUserRewardId: string;
  baitShopItemId: string;
}): Promise<void> {
  const today = taipeiCalendarDateKey();
  const nowIso = new Date().toISOString();
  const admin = createAdminClient();
  const existing = await getRodCastState(opts.userId, opts.rodUserRewardId);

  if (existing) {
    const castsUsed =
      existing.taipei_date_key === today ? existing.casts_used + 1 : 1;
    const { error } = await admin
      .from("fishing_rod_cast_state")
      .update({
        taipei_date_key: today,
        casts_used: castsUsed,
        last_cast_at: nowIso,
        pending_cast_started_at: nowIso,
        pending_bait_shop_item_id: opts.baitShopItemId,
        updated_at: nowIso,
      })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await admin.from("fishing_rod_cast_state").insert({
    user_id: opts.userId,
    rod_user_reward_id: opts.rodUserRewardId,
    taipei_date_key: today,
    casts_used: 1,
    last_cast_at: nowIso,
    pending_cast_started_at: nowIso,
    pending_bait_shop_item_id: opts.baitShopItemId,
    updated_at: nowIso,
  });
  if (error) throw error;
}

/** 收成成功：僅清除進行中拋竿（冷卻與當日次數已在拋竿時寫入）。 */
export async function recordHarvestSuccess(opts: {
  userId: string;
  rodUserRewardId: string;
}): Promise<void> {
  const nowIso = new Date().toISOString();
  const admin = createAdminClient();
  const existing = await getRodCastState(opts.userId, opts.rodUserRewardId);

  if (!existing) {
    return;
  }

  const { error } = await admin
    .from("fishing_rod_cast_state")
    .update({
      pending_cast_started_at: null,
      pending_bait_shop_item_id: null,
      updated_at: nowIso,
    })
    .eq("id", existing.id);
  if (error) throw error;
}

/** @deprecated 使用 recordHarvestSuccess */
export async function recordRodCastSuccess(opts: {
  userId: string;
  rodUserRewardId: string;
}): Promise<void> {
  await recordHarvestSuccess(opts);
}

/** 供 UI：今日剩餘拋竿、拋竿後冷卻秒、進行中收成剩餘秒。 */
export async function getRodCastSnapshot(opts: {
  userId: string;
  rodUserRewardId: string;
  maxPerDay: number;
  waitUntilHarvestMinutes: number;
  cooldownAfterCastMinutes: number;
}): Promise<{
  castsUsedToday: number;
  castsRemainingToday: number;
  cooldownAfterHarvestRemainingSec: number;
  pendingHarvestRemainSec: number;
  hasPendingCast: boolean;
  /** 本次進行中拋竿所消耗的餌（shop_items.id） */
  pendingBaitShopItemId: string | null;
  cooldownInfo: RodCooldownInfo | null;
}> {
  const today = taipeiCalendarDateKey();
  const now = Date.now();
  const row = await getRodCastState(opts.userId, opts.rodUserRewardId);

  const castsUsed = effectiveCastsUsedToday(row, today);
  let cooldownAfterHarvestRemainingSec = 0;
  if (row?.last_cast_at && opts.cooldownAfterCastMinutes > 0) {
    const last = new Date(row.last_cast_at).getTime();
    const ms = opts.cooldownAfterCastMinutes * 60_000;
    const elapsed = now - last;
    if (elapsed < ms) {
      cooldownAfterHarvestRemainingSec = Math.ceil((ms - elapsed) / 1000);
    }
  }

  let pendingHarvestRemainSec = 0;
  let hasPendingCast = false;
  if (row?.pending_cast_started_at) {
    hasPendingCast = true;
    const start = new Date(row.pending_cast_started_at).getTime();
    const ms = opts.waitUntilHarvestMinutes * 60_000;
    const elapsed = now - start;
    if (elapsed < ms) {
      pendingHarvestRemainSec = Math.ceil((ms - elapsed) / 1000);
    }
  }

  return {
    castsUsedToday: castsUsed,
    castsRemainingToday: Math.max(0, opts.maxPerDay - castsUsed),
    cooldownAfterHarvestRemainingSec,
    pendingHarvestRemainSec,
    hasPendingCast,
    pendingBaitShopItemId: row?.pending_bait_shop_item_id ?? null,
    cooldownInfo: computeRodCooldownInfo(row, opts.cooldownAfterCastMinutes),
  };
}
