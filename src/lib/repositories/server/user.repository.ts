import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

/**
 * Layer 2：users 表存取（伺服端，使用 admin client 以略過 RLS 做管理查詢／建檔）。
 */
export async function findProfileById(id: string): Promise<UserRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as UserRow | null;
}

/**
 * 新增 `public.users` 一列。欄位須與雲端一致（含 **`total_exp`**，勿傳 `exp`）。
 * 若雲端尚無 `bio`／`core_values`，請於 Supabase 補欄後再部署。
 */
export async function createProfile(data: UserInsert): Promise<UserRow> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("users")
    .insert(data)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return row as UserRow;
}

/**
 * 更新既有使用者列（略過 RLS）。用於 Layer 3 個人資料編修等。
 */
export async function updateProfile(
  id: string,
  patch: UserUpdate,
): Promise<UserRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as UserRow;
}

/**
 * 列出 **`status === 'active'`** 且**非目前使用者**的冒險者（村莊列表用）。
 * 排序：**`last_seen_at` 降序**（最活躍在前；未上線 `null` 排在後）。
 */
export async function findActiveUsers(
  currentUserId: string,
): Promise<UserRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("*")
    .eq("status", "active")
    .neq("id", currentUserId)
    .order("last_seen_at", { ascending: false, nullsFirst: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as UserRow[];
}

/**
 * 技能市集：列出其他 **`active`** 冒險者（語意與 **`findActiveUsers`** 相同，便於 Layer 3 分域）。
 */
export async function findMarketUsers(
  currentUserId: string,
): Promise<UserRow[]> {
  return findActiveUsers(currentUserId);
}
