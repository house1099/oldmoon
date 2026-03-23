import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export type LikeInsert = Database["public"]["Tables"]["likes"]["Insert"];
export type LikeRow = Database["public"]["Tables"]["likes"]["Row"];

/**
 * Layer 2：寫入 **`likes`**（伺服端 admin client）。
 */
export async function insertLike(
  fromUserId: string,
  toUserId: string,
): Promise<LikeRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("likes")
    .insert({ from_user_id: fromUserId, to_user_id: toUserId })
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
    .eq("from_user_id", fromUserId)
    .eq("to_user_id", toUserId)
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
    .eq("from_user_id", fromUserId)
    .eq("to_user_id", toUserId);

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
    .eq("from_user_id", userA)
    .eq("to_user_id", userB)
    .maybeSingle();

  if (errAb) {
    throw errAb;
  }

  const { data: ba, error: errBa } = await admin
    .from("likes")
    .select("id")
    .eq("from_user_id", userB)
    .eq("to_user_id", userA)
    .maybeSingle();

  if (errBa) {
    throw errBa;
  }

  return Boolean(ab && ba);
}
