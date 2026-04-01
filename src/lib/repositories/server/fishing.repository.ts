import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database.types";

export type FishingLogInsert = Database["public"]["Tables"]["fishing_logs"]["Insert"];
export type FishingLogRow = Database["public"]["Tables"]["fishing_logs"]["Row"];

export async function insertFishingLog(
  row: FishingLogInsert,
): Promise<FishingLogRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fishing_logs")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as FishingLogRow;
}

export async function findFishingLogsForUser(
  userId: string,
  limit = 200,
): Promise<FishingLogRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("fishing_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FishingLogRow[];
}

/** 第一支釣竿顯示名：優先 `shop_items.name`，否則 `prize_items.label`。 */
export async function findFirstFishingRodDisplayName(
  userId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select("shop_items(name), prize_items(label)")
    .eq("user_id", userId)
    .eq("reward_type", "fishing_rod")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as {
    shop_items: { name: string } | { name: string }[] | null;
    prize_items: { label: string } | { label: string }[] | null;
  };
  const shop = Array.isArray(row.shop_items)
    ? row.shop_items[0]
    : row.shop_items;
  const prize = Array.isArray(row.prize_items)
    ? row.prize_items[0]
    : row.prize_items;
  if (shop?.name) return shop.name;
  if (prize?.label) return prize.label;
  return null;
}

/** 第一個釣餌顯示名（同上邏輯）。 */
export async function findFirstFishingBaitDisplayName(
  userId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select("shop_items(name), prize_items(label)")
    .eq("user_id", userId)
    .eq("reward_type", "fishing_bait")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as {
    shop_items: { name: string } | { name: string }[] | null;
    prize_items: { label: string } | { label: string }[] | null;
  };
  const shop = Array.isArray(row.shop_items)
    ? row.shop_items[0]
    : row.shop_items;
  const prize = Array.isArray(row.prize_items)
    ? row.prize_items[0]
    : row.prize_items;
  if (shop?.name) return shop.name;
  if (prize?.label) return prize.label;
  return null;
}

export type FishItemSnapshot = {
  name: string;
} | null;

export function buildFishItemJson(f: FishItemSnapshot): Json | null {
  if (!f) return null;
  return { name: f.name } as unknown as Json;
}
