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
 * 新增 `public.users` 一列。欄位名稱須與雲端 SQL／Supabase 型別一致（例如 `nickname`）。
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
