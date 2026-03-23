"use server";

import { createClient } from "@/lib/supabase/server";
import {
  checkMutualLike,
  deleteLike,
  findLike,
  insertLike,
} from "@/lib/repositories/server/like.repository";

export type ToggleLikeResult =
  | { success: true; isMatch: boolean }
  | { success: false; error: string };

/**
 * Layer 3：有緣分按讚（切換）。若本次操作後雙向皆存在，**`isMatch: true`**。
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
      return { success: true, isMatch: false };
    }

    await insertLike(user.id, targetUserId);
    const isMatch = await checkMutualLike(user.id, targetUserId);
    return { success: true, isMatch };
  } catch (error) {
    console.error("toggleLikeAction:", error);
    return { success: false, error: "操作失敗，請稍後再試。" };
  }
}
