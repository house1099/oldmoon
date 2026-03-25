"use server";

import { createClient } from "@/lib/supabase/server";
import {
  findAllianceBetween,
  updateAlliance,
} from "@/lib/repositories/server/alliance.repository";
import {
  checkMutualLike,
  deleteLike,
  findLike,
  insertLike,
  mapLikeRepositoryError,
} from "@/lib/repositories/server/like.repository";
import { insertNotification } from "@/lib/repositories/server/notification.repository";
import { findProfileById } from "@/lib/repositories/server/user.repository";

/** Modal 底部緣分／血盟區塊一次載入用 */
export type ModalSocialStatus = {
  isLiked: boolean;
  isLikedByThem: boolean;
  isMutualLike: boolean;
  allianceStatus: "none" | "pending_sent" | "pending_received" | "accepted";
  allianceId: string | null;
  currentUserId: string | null;
};

const emptyModalSocialStatus = (): ModalSocialStatus => ({
  isLiked: false,
  isLikedByThem: false,
  isMutualLike: false,
  allianceStatus: "none",
  allianceId: null,
  currentUserId: null,
});

/**
 * 一次 **`auth.getUser()`** 後並行查詢：雙向有緣分、雙人血盟列（供 **`UserDetailModal`**）。
 */
export async function getModalSocialStatusAction(
  targetUserId: string,
): Promise<ModalSocialStatus> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return emptyModalSocialStatus();
  }

  if (user.id === targetUserId) {
    return { ...emptyModalSocialStatus(), currentUserId: user.id };
  }

  try {
    const [myLike, theirLike, alliance] = await Promise.all([
      findLike(user.id, targetUserId),
      findLike(targetUserId, user.id),
      findAllianceBetween(user.id, targetUserId),
    ]);

    const isLiked = Boolean(myLike);
    const isLikedByThem = Boolean(theirLike);
    const isMutualLike = isLiked && isLikedByThem;

    let allianceStatus: ModalSocialStatus["allianceStatus"] = "none";
    let allianceId: string | null = null;

    if (
      alliance &&
      alliance.status !== "dissolved" &&
      (alliance.status === "pending" || alliance.status === "accepted")
    ) {
      allianceId = alliance.id;
      if (alliance.status === "accepted") {
        allianceStatus = "accepted";
      } else {
        allianceStatus =
          alliance.initiated_by === user.id
            ? "pending_sent"
            : "pending_received";
      }
    }

    return {
      isLiked,
      isLikedByThem,
      isMutualLike,
      allianceStatus,
      allianceId,
      currentUserId: user.id,
    };
  } catch (error) {
    console.error("getModalSocialStatusAction:", error);
    return { ...emptyModalSocialStatus(), currentUserId: user.id };
  }
}

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

      try {
        const alliance = await findAllianceBetween(user.id, targetUserId);
        if (
          alliance &&
          (alliance.status === "pending" || alliance.status === "accepted")
        ) {
          await updateAlliance(alliance.id, { status: "dissolved" });
        }
      } catch {
        // 血盟撤銷失敗不影響取消愛心
      }

      return { success: true, isMatch: false, liked: false };
    }

    await insertLike(user.id, targetUserId);

    try {
      const liker = await findProfileById(user.id);
      const nickname = liker?.nickname?.trim() || "某位冒險者";
      await insertNotification({
        user_id: targetUserId,
        type: "like",
        from_user_id: user.id,
        message: `${nickname} 對你送出緣分。打開公會探索看看是誰吧！`,
        is_read: false,
      });
    } catch (notifyErr) {
      console.error("toggleLikeAction: notification insert failed", notifyErr);
    }

    const isMatch = await checkMutualLike(user.id, targetUserId);
    return { success: true, isMatch, liked: true };
  } catch (error) {
    console.error("toggleLikeAction:", error);
    return { success: false, error: mapLikeRepositoryError(error) };
  }
}

/** 供 Modal 等：是否與目標雙向互讚（血盟申請前置）。 */
export async function checkMutualLikeWithTargetAction(
  targetUserId: string,
): Promise<
  { success: true; mutual: boolean } | { success: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "請先登入。" };
  }
  if (user.id === targetUserId) {
    return { success: true, mutual: false };
  }

  try {
    const mutual = await checkMutualLike(user.id, targetUserId);
    return { success: true, mutual };
  } catch (error) {
    console.error("checkMutualLikeWithTargetAction:", error);
    return { success: false, error: mapLikeRepositoryError(error) };
  }
}
