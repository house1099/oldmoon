import { createAdminClient } from "@/lib/supabase/admin";
import type { FishType } from "@/types/database.types";
import type { TierRemainderMode } from "@/lib/utils/fishing-tier-pick";

export type FishingTierSettingsRow = {
  fish_type: FishType;
  p_small_bp: number;
  p_medium_bp: number;
  p_large_bp: number;
  remainder_mode: TierRemainderMode;
  updated_at: string;
};

export async function findAllTierSettings(): Promise<FishingTierSettingsRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fishing_tier_settings")
    .select("*")
    .order("fish_type", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FishingTierSettingsRow[];
}

export async function findTierSettingByFishType(
  fishType: FishType,
): Promise<FishingTierSettingsRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fishing_tier_settings")
    .select("*")
    .eq("fish_type", fishType)
    .maybeSingle();
  if (error) throw error;
  return (data as FishingTierSettingsRow) ?? null;
}

export async function upsertTierSetting(row: {
  fish_type: FishType;
  p_small_bp: number;
  p_medium_bp: number;
  p_large_bp: number;
  remainder_mode: TierRemainderMode;
}): Promise<FishingTierSettingsRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fishing_tier_settings")
    .upsert(
      {
        fish_type: row.fish_type,
        p_small_bp: row.p_small_bp,
        p_medium_bp: row.p_medium_bp,
        p_large_bp: row.p_large_bp,
        remainder_mode: row.remainder_mode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "fish_type" },
    )
    .select()
    .single();
  if (error) throw error;
  return data as FishingTierSettingsRow;
}
