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

/** 可否拋新竿：須無進行中收成、未達每日上限、收竿後冷卻已結束。 */
export function peekCanStartCast(opts: {
  row: CastRow | null;
  maxPerDay: number;
  cooldownAfterHarvestMinutes: number;
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

  if (opts.row?.last_cast_at && opts.cooldownAfterHarvestMinutes > 0) {
    const last = new Date(opts.row.last_cast_at).getTime();
    const ms = opts.cooldownAfterHarvestMinutes * 60_000;
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

/** 僅檢查是否可拋竿（未扣次）。舊 API：收竿後冷卻語意。 */
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
    cooldownAfterHarvestMinutes: opts.cooldownMinutes,
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
    const { error } = await admin
      .from("fishing_rod_cast_state")
      .update({
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
    casts_used: 0,
    last_cast_at: null,
    pending_cast_started_at: nowIso,
    pending_bait_shop_item_id: opts.baitShopItemId,
    updated_at: nowIso,
  });
  if (error) throw error;
}

/** 收成成功：清 pending、累計當日次數、更新最後收竿時間。 */
export async function recordHarvestSuccess(opts: {
  userId: string;
  rodUserRewardId: string;
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
        pending_cast_started_at: null,
        pending_bait_shop_item_id: null,
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
    pending_cast_started_at: null,
    pending_bait_shop_item_id: null,
    updated_at: nowIso,
  });
  if (error) throw error;
}

/** @deprecated 使用 recordHarvestSuccess */
export async function recordRodCastSuccess(opts: {
  userId: string;
  rodUserRewardId: string;
}): Promise<void> {
  await recordHarvestSuccess(opts);
}

/** 供 UI：今日剩餘拋竿、收竿後冷卻秒、進行中收成剩餘秒。 */
export async function getRodCastSnapshot(opts: {
  userId: string;
  rodUserRewardId: string;
  maxPerDay: number;
  waitUntilHarvestMinutes: number;
  cooldownAfterHarvestMinutes: number;
}): Promise<{
  castsUsedToday: number;
  castsRemainingToday: number;
  cooldownAfterHarvestRemainingSec: number;
  pendingHarvestRemainSec: number;
  hasPendingCast: boolean;
}> {
  const today = taipeiCalendarDateKey();
  const now = Date.now();
  const row = await getRodCastState(opts.userId, opts.rodUserRewardId);

  const castsUsed = effectiveCastsUsedToday(row, today);
  let cooldownAfterHarvestRemainingSec = 0;
  if (row?.last_cast_at && opts.cooldownAfterHarvestMinutes > 0) {
    const last = new Date(row.last_cast_at).getTime();
    const ms = opts.cooldownAfterHarvestMinutes * 60_000;
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
  };
}
