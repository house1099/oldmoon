import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export type PrizePoolRow = Database["public"]["Tables"]["prize_pools"]["Row"];
export type PrizeItemRow = Database["public"]["Tables"]["prize_items"]["Row"];
export type PrizeLogRow = Database["public"]["Tables"]["prize_logs"]["Row"];
type PrizeLogInsert = Database["public"]["Tables"]["prize_logs"]["Insert"];
type UserRewardInsert = Database["public"]["Tables"]["user_rewards"]["Insert"];
type PrizePoolUpdate = Database["public"]["Tables"]["prize_pools"]["Update"];
type PrizeItemUpdate = Database["public"]["Tables"]["prize_items"]["Update"];

export async function findPoolByType(
  poolType: string,
): Promise<PrizePoolRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("prize_pools")
    .select("*")
    .eq("pool_type", poolType)
    .maybeSingle();
  if (error) throw error;
  return (data as PrizePoolRow) ?? null;
}

export async function findActiveItemsByPoolId(
  poolId: string,
): Promise<PrizeItemRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("prize_items")
    .select("*")
    .eq("pool_id", poolId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PrizeItemRow[];
}

export async function findAllPools(): Promise<PrizePoolRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("prize_pools")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PrizePoolRow[];
}

export async function findAllItemsByPoolId(
  poolId: string,
): Promise<PrizeItemRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("prize_items")
    .select("*")
    .eq("pool_id", poolId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PrizeItemRow[];
}

export async function insertPrizeLog(
  data: Omit<PrizeLogInsert, "id" | "created_at">,
): Promise<PrizeLogRow> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("prize_logs")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as PrizeLogRow;
}

export async function insertUserReward(
  data: Omit<UserRewardInsert, "id" | "created_at">,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("user_rewards").insert(data);
  if (error) throw error;
}

export async function updatePrizeItem(
  id: string,
  patch: PrizeItemUpdate,
): Promise<PrizeItemRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("prize_items")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as PrizeItemRow;
}

export async function togglePrizeItem(
  id: string,
  is_active: boolean,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("prize_items")
    .update({ is_active })
    .eq("id", id);
  if (error) throw error;
}

export async function updatePool(
  id: string,
  patch: PrizePoolUpdate,
): Promise<PrizePoolRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("prize_pools")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as PrizePoolRow;
}

export type PrizeLogWithUser = PrizeLogRow & { user_nickname: string };

export async function findPrizeLogs(options?: {
  poolType?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}): Promise<PrizeLogWithUser[]> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const admin = createAdminClient();
  let q = admin
    .from("prize_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (options?.poolType) {
    q = q.eq("pool_type", options.poolType);
  }
  if (options?.userId) {
    q = q.eq("user_id", options.userId);
  }
  const { data: logs, error } = await q;
  if (error) throw error;
  const rows = (logs ?? []) as PrizeLogRow[];
  if (rows.length === 0) return [];

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: users, error: uerr } = await admin
    .from("users")
    .select("id, nickname")
    .in("id", userIds);
  if (uerr) throw uerr;
  const nick = new Map(
    (users ?? []).map((u) => [u.id as string, (u.nickname as string) ?? "—"]),
  );
  return rows.map((r) => ({
    ...r,
    user_nickname: nick.get(r.user_id) ?? "—",
  }));
}
