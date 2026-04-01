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

/**
 * 僅檢查是否可拋竿（未扣次）。
 */
export function peekRodCastAllowed(opts: {
  row: CastRow | null;
  maxPerDay: number;
  cooldownMinutes: number;
}):
  | { ok: true }
  | { ok: false; error: "daily_limit" | "cooldown"; cooldownMinutesLeft?: number } {
  const today = taipeiCalendarDateKey();
  const now = Date.now();
  const castsUsed = effectiveCastsUsedToday(opts.row, today);

  if (opts.row?.last_cast_at) {
    const last = new Date(opts.row.last_cast_at).getTime();
    const ms = opts.cooldownMinutes * 60_000;
    const elapsed = now - last;
    if (elapsed < ms) {
      return {
        ok: false,
        error: "cooldown",
        cooldownMinutesLeft: Math.ceil((ms - elapsed) / 60_000),
      };
    }
  }

  if (castsUsed >= opts.maxPerDay) {
    return { ok: false, error: "daily_limit" };
  }

  return { ok: true };
}

/** 收竿成功後：增加當日次數並更新最後收竿時間。 */
export async function recordRodCastSuccess(opts: {
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
    updated_at: nowIso,
  });
  if (error) throw error;
}

/** 供 UI：今日剩餘拋竿與冷卻剩餘秒。 */
export async function getRodCastSnapshot(opts: {
  userId: string;
  rodUserRewardId: string;
  maxPerDay: number;
  cooldownMinutes: number;
}): Promise<{
  castsUsedToday: number;
  castsRemainingToday: number;
  cooldownRemainingSec: number;
}> {
  const today = taipeiCalendarDateKey();
  const now = Date.now();
  const row = await getRodCastState(opts.userId, opts.rodUserRewardId);

  const castsUsed = effectiveCastsUsedToday(row, today);
  let cooldownRemainingSec = 0;

  if (row?.last_cast_at) {
    const last = new Date(row.last_cast_at).getTime();
    const ms = opts.cooldownMinutes * 60_000;
    const elapsed = now - last;
    if (elapsed < ms) {
      cooldownRemainingSec = Math.ceil((ms - elapsed) / 1000);
    }
  }

  return {
    castsUsedToday: castsUsed,
    castsRemainingToday: Math.max(0, opts.maxPerDay - castsUsed),
    cooldownRemainingSec,
  };
}
