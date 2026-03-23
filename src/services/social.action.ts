"use server";

import { createClient } from "@/lib/supabase/server";
import {
  checkMutualLike,
  deleteLike,
  findLike,
  insertLike,
  mapLikeRepositoryError,
} from "@/lib/repositories/server/like.repository";

export type ToggleLikeResult =
  | { success: true; isMatch: boolean; liked: boolean }
  | { success: false; error: string };

/**
 * Layer 3：讀取目前使用者是否已對目標送出有緣分（供 Modal 初始狀態）。
 */
export async function getLikeStatusForTargetAction(
  targetUserId: string,
): Promise<
  { success: true; liked: boolean } | { success: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "請先登入。" };
  }

  if (user.id === targetUserId) {
    return { success: true, liked: false };
  }

  try {
    const row = await findLike(user.id, targetUserId);
    return { success: true, liked: Boolean(row) };
  } catch (error) {
    console.error("getLikeStatusForTargetAction:", error);
    return { success: false, error: mapLikeRepositoryError(error) };
  }
}

/**
 * Layer 3：有緣分按讚（切換）。若本次操作後雙向皆存在，**`isMatch: true`**。
 * **`liked`**：操作完成後，目前使用者是否仍對目標保留一筆有緣分。
 */
export async function toggleLikeAction(
  targetUserId: string,
): Promise<ToggleLikeResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "請先登入。" };
  }

  if (user.id === targetUserId) {
    return { success: false, error: "無法對自己送出有緣分。" };
  }

  try {
    const existing = await findLike(user.id, targetUserId);

    if (existing) {
      await deleteLike(user.id, targetUserId);
      return { success: true, isMatch: false, liked: false };
    }

    await insertLike(user.id, targetUserId);
    const isMatch = await checkMutualLike(user.id, targetUserId);
    return { success: true, isMatch, liked: true };
  } catch (error) {
    console.error("toggleLikeAction:", error);
    return { success: false, error: mapLikeRepositoryError(error) };
  }
}
