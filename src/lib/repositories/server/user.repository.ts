import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type UserRow = Database["public"]["Tables"]["users"]["Row"];

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
 * 新增 `public.users` 一列。欄位須與雲端一致（`nickname`、`gender`、`region`、`orientation`、`offline_ok` 等，勿使用不存在的 `bio`）。
 * 累積經驗值欄位名為 **`total_exp`**（勿傳 `exp`）。
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
