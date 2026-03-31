"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateTag } from "next/cache";
import { profileCacheTag } from "@/lib/supabase/get-cached-profile";
import {
  clearUserRewardUsedAt,
  findUserRewardGiftMeta,
  findUsersByNickname,
  markUserRewardConsumed,
  unequipReward,
  type GiftRecipientSearchRow,
} from "@/lib/repositories/server/rewards.repository";
import { insertUserReward } from "@/lib/repositories/server/prize.repository";
import { insertAdminAction } from "@/lib/repositories/server/admin.repository";
import { notifyUserMailboxSilent } from "@/services/notification.action";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import { formatGiftBatchMailboxMessage } from "@/lib/utils/gift-mailbox-message";

function assertGiftEligibility(meta: NonNullable<
  Awaited<ReturnType<typeof findUserRewardGiftMeta>>
>): string | null {
  const { row, allowGift } = meta;
  if (row.used_at != null) return "此道具已無法贈送";
  if (row.shop_item_id != null && !allowGift) return "此道具不開放贈送";
  return null;
}

export async function giftItemToUserAction(params: {
  rewardId: string;
  recipientNickname: string;
}): Promise<
  | { ok: true; candidates: GiftRecipientSearchRow[] }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "請先登入" };

  const nick = params.recipientNickname.trim();
  if (nick.length < 1) return { ok: false, error: "請至少輸入 1 個字再搜尋" };

  const meta = await findUserRewardGiftMeta(params.rewardId);
  if (!meta || meta.row.user_id !== user.id) {
    return { ok: false, error: "找不到道具" };
  }
  const deny = assertGiftEligibility(meta);
  if (deny) return { ok: false, error: deny };

  try {
    const candidates = await findUsersByNickname(nick, user.id);
    return { ok: true, candidates };
  } catch (e) {
    console.error("giftItemToUserAction findUsersByNickname:", e);
    return { ok: false, error: "搜尋失敗，請稍後再試" };
  }
}

/** 商城「先選收禮者」流程用：僅暱稱搜尋，不驗證道具（購買前尚無 reward）。 */
export async function searchGiftRecipientCandidatesAction(
  nickname: string,
): Promise<
  | { ok: true; candidates: GiftRecipientSearchRow[] }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "請先登入" };

  const nick = nickname.trim();
  if (nick.length < 1) return { ok: false, error: "請至少輸入 1 個字再搜尋" };

  try {
    const candidates = await findUsersByNickname(nick, user.id);
    return { ok: true, candidates };
  } catch (e) {
    console.error("searchGiftRecipientCandidatesAction:", e);
    return { ok: false, error: "搜尋失敗，請稍後再試" };
  }
}

export async function confirmGiftAction(
  rewardId: string,
  recipientId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "請先登入" };
  if (user.id === recipientId) return { ok: false, error: "無法贈送給自己" };

  const meta = await findUserRewardGiftMeta(rewardId);
  if (!meta || meta.row.user_id !== user.id) {
    return { ok: false, error: "找不到道具" };
  }
  const deny = assertGiftEligibility(meta);
  if (deny) return { ok: false, error: deny };

  const senderProfile = await findProfileById(user.id);
  const senderNickname = senderProfile?.nickname?.trim() || "某位冒險者";
  const rewardLabel = meta.row.label?.trim() || "道具";
  const { row } = meta;

  try {
    if (row.is_equipped) {
      await unequipReward(rewardId);
    }
    await markUserRewardConsumed(rewardId);
  } catch (e) {
    console.error("confirmGiftAction mark consumed:", e);
    return { ok: false, error: "贈送失敗，請稍後再試" };
  }

  try {
    await insertUserReward({
      user_id: recipientId,
      reward_type: row.reward_type,
      item_ref_id: row.item_ref_id,
      shop_item_id: row.shop_item_id,
      label: row.label,
      is_equipped: false,
      used_at: null,
    });
  } catch (e) {
    console.error("confirmGiftAction insert recipient:", e);
    await clearUserRewardUsedAt(rewardId).catch(() => {});
    return { ok: false, error: "贈送失敗，請稍後再試" };
  }

  await notifyUserMailboxSilent({
    user_id: recipientId,
    type: "system",
    from_user_id: user.id,
    message: `🎁 ${senderNickname} 送給你一個「${rewardLabel}」！已放入你的背包。`,
    is_read: false,
  });

  try {
    await insertAdminAction({
      admin_id: user.id,
      target_user_id: recipientId,
      action_type: "gift_item",
      action_label: `玩家贈禮：${senderNickname} → ${rewardLabel}`,
      metadata: {
        from_user_id: user.id,
        to_user_id: recipientId,
        rewardType: row.reward_type,
        label: rewardLabel,
        reward_id: rewardId,
      },
    });
  } catch (e) {
    console.error("confirmGiftAction insertAdminAction:", e);
  }

  revalidateTag(profileCacheTag(user.id));
  revalidateTag(profileCacheTag(recipientId));
  return { ok: true };
}

/** 商城一次贈送多件：轉移完成後僅一則信件／Web Push。 */
export async function confirmGiftsToUserBatchAction(
  rewardIds: string[],
  recipientId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "請先登入" };
  if (user.id === recipientId) return { ok: false, error: "無法贈送給自己" };

  const unique = Array.from(new Set(rewardIds.filter(Boolean)));
  if (unique.length === 0) return { ok: false, error: "未選擇道具" };

  const metas: NonNullable<
    Awaited<ReturnType<typeof findUserRewardGiftMeta>>
  >[] = [];
  for (const id of unique) {
    const meta = await findUserRewardGiftMeta(id);
    if (!meta || meta.row.user_id !== user.id) {
      return { ok: false, error: "找不到道具" };
    }
    const deny = assertGiftEligibility(meta);
    if (deny) return { ok: false, error: deny };
    metas.push(meta);
  }

  const senderProfile = await findProfileById(user.id);
  const senderNickname = senderProfile?.nickname?.trim() || "某位冒險者";

  for (let i = 0; i < unique.length; i++) {
    const rewardId = unique[i]!;
    const meta = metas[i]!;
    const { row } = meta;
    const rewardLabel = row.label?.trim() || "道具";

    try {
      if (row.is_equipped) {
        await unequipReward(rewardId);
      }
      await markUserRewardConsumed(rewardId);
    } catch (e) {
      console.error("confirmGiftsToUserBatchAction mark consumed:", e);
      return { ok: false, error: "贈送失敗，請稍後再試" };
    }

    try {
      await insertUserReward({
        user_id: recipientId,
        reward_type: row.reward_type,
        item_ref_id: row.item_ref_id,
        shop_item_id: row.shop_item_id,
        label: row.label,
        is_equipped: false,
        used_at: null,
      });
    } catch (e) {
      console.error("confirmGiftsToUserBatchAction insert recipient:", e);
      await clearUserRewardUsedAt(rewardId).catch(() => {});
      return { ok: false, error: "贈送失敗，請稍後再試" };
    }

    try {
      await insertAdminAction({
        admin_id: user.id,
        target_user_id: recipientId,
        action_type: "gift_item",
        action_label: `玩家贈禮：${senderNickname} → ${rewardLabel}`,
        metadata: {
          from_user_id: user.id,
          to_user_id: recipientId,
          rewardType: row.reward_type,
          label: rewardLabel,
          reward_id: rewardId,
          batch: true,
        },
      });
    } catch (e) {
      console.error("confirmGiftsToUserBatchAction insertAdminAction:", e);
    }
  }

  const message = formatGiftBatchMailboxMessage(
    senderNickname,
    metas.map((m) => m.row.label?.trim() || "道具"),
  );

  await notifyUserMailboxSilent({
    user_id: recipientId,
    type: "system",
    from_user_id: user.id,
    message,
    is_read: false,
  });

  revalidateTag(profileCacheTag(user.id));
  revalidateTag(profileCacheTag(recipientId));
  return { ok: true };
}
