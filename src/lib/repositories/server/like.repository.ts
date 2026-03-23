import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export type LikeInsert = Database["public"]["Tables"]["likes"]["Insert"];
export type LikeRow = Database["public"]["Tables"]["likes"]["Row"];

/** 將 PostgREST／Postgres 錯誤轉成使用者可讀文案（Layer 3 可再包裝）。 */
export function mapLikeRepositoryError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "有緣分操作失敗，請稍後再試。";
  }
  const e = error as { code?: string; message?: string };
  const msg = typeof e.message === "string" ? e.message : "";
  if (
    e.code === "23505" ||
    msg.includes("23505") ||
    (msg.includes("duplicate") && msg.includes("unique"))
  ) {
    return "你已經對這位冒險者送出有緣分了喵！";
  }
  if (e.code === "23503" || msg.toLowerCase().includes("foreign key")) {
    return "找不到對應的冒險者資料。";
  }
  if (
    e.code === "42501" ||
    msg.toLowerCase().includes("permission denied") ||
    msg.toLowerCase().includes("row-level security")
  ) {
    return "目前無法送出有緣分，請稍後再試。";
  }
  return "有緣分操作失敗，請稍後再試。";
}

/**
 * Layer 2：寫入 **`likes`**（伺服端 admin client）。
 * **`from_user`**＝按讚者（目前使用者），**`to_user`**＝被按讚者；與 Supabase 雲端欄名一致。
 */
export async function insertLike(
  fromUserId: string,
  toUserId: string,
): Promise<LikeRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("likes")
    .insert({ from_user: fromUserId, to_user: toUserId })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as LikeRow;
}

export async function findLike(
  fromUserId: string,
  toUserId: string,
): Promise<LikeRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("likes")
    .select("*")
    .eq("from_user", fromUserId)
    .eq("to_user", toUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as LikeRow | null;
}

export async function deleteLike(
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("likes")
    .delete()
    .eq("from_user", fromUserId)
    .eq("to_user", toUserId);

  if (error) {
    throw error;
  }
}

/**
 * 是否 **A → B** 與 **B → A** 皆有按讚紀錄。
 */
export async function checkMutualLike(
  userA: string,
  userB: string,
): Promise<boolean> {
  const admin = createAdminClient();

  const { data: ab, error: errAb } = await admin
    .from("likes")
    .select("id")
    .eq("from_user", userA)
    .eq("to_user", userB)
    .maybeSingle();

  if (errAb) {
    throw errAb;
  }

  const { data: ba, error: errBa } = await admin
    .from("likes")
    .select("id")
    .eq("from_user", userB)
    .eq("to_user", userA)
    .maybeSingle();

  if (errBa) {
    throw errBa;
  }

  return Boolean(ab && ba);
}
