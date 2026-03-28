import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export type StreakRewardSettingsRow =
  Database["public"]["Tables"]["streak_reward_settings"]["Row"];

/**
 * Layer 2：七日簽到獎勵設定（`streak_reward_settings`）。
 */
export async function findAllStreakRewards(): Promise<StreakRewardSettingsRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("streak_reward_settings")
    .select("*")
    .order("day", { ascending: true });

  if (error) throw error;
  return (data ?? []) as StreakRewardSettingsRow[];
}

export async function findStreakRewardByDay(
  day: number,
): Promise<StreakRewardSettingsRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("streak_reward_settings")
    .select("*")
    .eq("day", day)
    .maybeSingle();

  if (error) throw error;
  return (data as StreakRewardSettingsRow) ?? null;
}

export async function updateStreakRewardRow(
  day: number,
  patch: Database["public"]["Tables"]["streak_reward_settings"]["Update"],
): Promise<StreakRewardSettingsRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("streak_reward_settings")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("day", day)
    .select()
    .single();

  if (error) throw error;
  return data as StreakRewardSettingsRow;
}
