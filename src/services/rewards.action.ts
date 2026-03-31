"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateTag, unstable_cache } from "next/cache";
import { profileCacheTag } from "@/lib/supabase/get-cached-profile";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import { updateMyProfile } from "@/services/profile-update.action";
import {
  BROADCAST_MESSAGE_LENGTH_ERROR,
  BROADCAST_MESSAGE_MAX_LENGTH,
} from "@/lib/constants/broadcast";
import { nicknameSchema } from "@/lib/validation/nickname";
import { findAllianceBetween } from "@/lib/repositories/server/alliance.repository";
import {
  findMyRewards,
  equipReward,
  unequipReward,
  unequipAllOfType,
  markUserRewardConsumed,
  clearUserRewardUsedAt,
  insertBroadcast,
  expireBroadcast,
  findEarliestUnusedRenameCard,
  findActiveBroadcasts,
  findUserRewardById,
  deleteUserRewardForOwner,
  deleteUserRewardsForOwner,
  transferUserRewardToUser,
  type UserRewardWithEffect,
} from "@/lib/repositories/server/rewards.repository";
import { findShopItemById } from "@/lib/repositories/server/shop.repository";
import type { UserRewardRow } from "@/types/database.types";
import { creditCoins } from "@/lib/repositories/server/coin.repository";
import { drawFromPool, type DrawResult } from "@/services/prize-engine";
import { formatGiftBatchMailboxMessage } from "@/lib/utils/gift-mailbox-message";
import { notifyUserMailboxSilent } from "@/services/notification.action";

export type MyRewardsPayload = {
  titles: UserRewardWithEffect[];
  avatarFrames: UserRewardWithEffect[];
  cardFrames: UserRewardWithEffect[];
  broadcasts: UserRewardWithEffect[];
  broadcastUnusedCount: number;
  /** 未使用的改名卡數量 */
  renameCardUnusedCount: number;
  /** 背包開放格數（總格 48） */
  inventorySlots: number;
  /** 全部持有道具（背包堆疊用） */
  allRewards: UserRewardWithEffect[];
};

export type ActiveBroadcastDto = {
  id: string;
  message: string;
  nickname: string;
  createdAt: string;
  expiresAt: string;
  userId: string;
};

const LEGACY_GIFT_DELETE_REWARD_TYPES = new Set([
  "avatar_frame",
  "card_frame",
  "title",
]);

async function assertRewardDeletable(
  row: UserRewardRow,
): Promise<string | null> {
  if (row.is_equipped) return "請先卸下再刪除";
  if (row.shop_item_id) {
    const shop = await findShopItemById(row.shop_item_id);
    if (shop?.allow_delete === false) return "此道具不可刪除";
    return null;
  }
  if (!LEGACY_GIFT_DELETE_REWARD_TYPES.has(row.reward_type)) {
    return "此類型道具無法刪除";
  }
  return null;
}

async function assertRewardGiftable(
  row: UserRewardRow,
): Promise<string | null> {
  if (row.shop_item_id) {
    const shop = await findShopItemById(row.shop_item_id);
    if (shop?.allow_gift === false) return "此道具不開放贈送";
    return null;
  }
  return null;
}

const MAX_LOOT_BOX_OPEN_BATCH = 50;

/** 背包內未開封公會盲盒：抽獎後刪除對應列。 */
export async function openLootBoxRewardsAction(
  rewardIds: string[],
): Promise<
  { ok: true; draws: DrawResult[] } | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未登入" };

  const unique = Array.from(new Set(rewardIds.filter(Boolean)));
  if (unique.length === 0) return { ok: false, error: "未選擇盲盒" };
  if (unique.length > MAX_LOOT_BOX_OPEN_BATCH) {
    return { ok: false, error: `單次最多開啟 ${MAX_LOOT_BOX_OPEN_BATCH} 個` };
  }

  const draws: DrawResult[] = [];

  for (const id of unique) {
    const row = await findUserRewardById(id);
    if (!row || row.user_id !== user.id) {
      return { ok: false, error: "找不到盲盒" };
    }
    if (row.reward_type !== "loot_box") {
      return { ok: false, error: "不是未開封的公會盲盒" };
    }
    if (row.used_at != null) {
      return { ok: false, error: "此盲盒已無法開啟" };
    }
    if (row.is_equipped) {
      return { ok: false, error: "請先卸下再開啟" };
    }

    try {
      draws.push(await drawFromPool("loot_box", user.id));
    } catch (e) {
      console.error("openLootBoxRewardsAction draw:", e);
      return {
        ok: false,
        error: e instanceof Error ? e.message : "開啟失敗，請稍後再試",
      };
    }

    try {
      const deleted = await deleteUserRewardForOwner(id, user.id);
      if (!deleted) {
        return { ok: false, error: "移除盲盒道具失敗" };
      }
    } catch (e) {
      console.error("openLootBoxRewardsAction delete:", e);
      return { ok: false, error: "移除盲盒道具失敗" };
    }
  }

  revalidateTag(profileCacheTag(user.id));
  return { ok: true, draws };
}

export async function getMyRewardsAction(): Promise<MyRewardsPayload | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [rawRows, profile] = await Promise.all([
      findMyRewards(user.id),
      findProfileById(user.id),
    ]);
    const rows = rawRows.filter((r) => r.used_at == null);
    const titles = rows.filter((r) => r.reward_type === "title");
    const avatarFrames = rows.filter((r) => r.reward_type === "avatar_frame");
    const cardFrames = rows.filter((r) => r.reward_type === "card_frame");
    const broadcasts = rows.filter((r) => r.reward_type === "broadcast");
    const broadcastUnusedCount = broadcasts.filter((r) => r.used_at == null).length;
    const renameCardUnusedCount = rows.filter(
      (r) => r.reward_type === "rename_card" && r.used_at == null,
    ).length;
    const inventorySlots =
      profile && typeof profile.inventory_slots === "number"
        ? Math.min(48, Math.max(0, profile.inventory_slots))
        : 16;

    return {
      titles,
      avatarFrames,
      cardFrames,
      broadcasts,
      broadcastUnusedCount,
      renameCardUnusedCount,
      inventorySlots,
      allRewards: rows,
    };
  } catch (error) {
    console.error("getMyRewardsAction 失敗:", JSON.stringify(error, null, 2));
    return null;
  }
}

export async function equipRewardAction(
  rewardId: string,
  rewardType: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未登入" };

  const row = await findUserRewardById(rewardId);
  if (!row || row.user_id !== user.id) {
    return { ok: false, error: "找不到獎勵" };
  }
  if (row.reward_type !== rewardType) {
    return { ok: false, error: "獎勵類型不符" };
  }

  await unequipAllOfType(user.id, rewardType);
  await equipReward(rewardId);
  revalidateTag(profileCacheTag(user.id));
  return { ok: true };
}

export async function unequipRewardAction(
  rewardId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未登入" };

  const row = await findUserRewardById(rewardId);
  if (!row || row.user_id !== user.id) {
    return { ok: false, error: "找不到獎勵" };
  }

  await unequipReward(rewardId);
  revalidateTag(profileCacheTag(user.id));
  return { ok: true };
}

export async function useBroadcastAction(
  rewardId: string,
  message: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未登入" };

  const row = await findUserRewardById(rewardId);
  if (!row || row.user_id !== user.id) {
    return { ok: false, error: "找不到廣播券" };
  }
  if (row.reward_type !== "broadcast") {
    return { ok: false, error: "不是廣播券" };
  }
  if (row.used_at != null) {
    return { ok: false, error: "此廣播券已使用" };
  }

  const trimmed = message.trim();
  if (
    !trimmed ||
    trimmed.length < 1 ||
    trimmed.length > BROADCAST_MESSAGE_MAX_LENGTH
  ) {
    return { ok: false, error: BROADCAST_MESSAGE_LENGTH_ERROR };
  }

  try {
    await markUserRewardConsumed(rewardId);
  } catch (err) {
    console.error("useBroadcastAction 標記廣播券失敗:", err);
    return {
      ok: false,
      error:
        err instanceof Error ? err.message : "無法使用此廣播券，請稍後再試",
    };
  }
  try {
    await insertBroadcast({
      user_id: user.id,
      reward_ref_id: rewardId,
      message: trimmed,
    });
  } catch (err) {
    await clearUserRewardUsedAt(rewardId).catch(() => {});
    console.error("useBroadcastAction 寫入廣播失敗:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "廣播發送失敗，請稍後再試",
    };
  }
  revalidateTag("broadcasts");
  return { ok: true };
}

export async function consumeRenameCardAction(
  newNickname: string,
): Promise<
  { ok: true; newNickname: string } | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未登入" };

  const card = await findEarliestUnusedRenameCard(user.id);
  if (!card) {
    return { ok: false, error: "沒有可用的改名卡" };
  }

  const parsed = nicknameSchema.safeParse(newNickname);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "暱稱格式錯誤",
    };
  }

  const upd = await updateMyProfile({ nickname: parsed.data });
  if (!upd.ok) {
    return { ok: false, error: upd.error };
  }

  await markUserRewardConsumed(card.id);
  revalidateTag(profileCacheTag(user.id));
  return { ok: true, newNickname: parsed.data };
}

export async function getActiveBroadcastsAction(): Promise<ActiveBroadcastDto[]> {
  const cached = unstable_cache(
    async () => {
      const rows = await findActiveBroadcasts();
      return rows.map((r) => ({
        id: r.id,
        message: r.message,
        nickname: r.nickname,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        userId: r.user_id,
      }));
    },
    ["active-broadcasts-v1"],
    { revalidate: 60, tags: ["broadcasts"] },
  );
  return cached();
}

export async function expireBroadcastAction(
  broadcastId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未登入" };

  const [profile, broadcasts] = await Promise.all([
    findProfileById(user.id),
    findActiveBroadcasts(),
  ]);
  if (!profile) return { ok: false, error: "找不到用戶資料" };

  const target = broadcasts.find((b) => b.id === broadcastId);
  if (!target) return { ok: false, error: "找不到進行中的廣播" };

  const isOwner = target.user_id === user.id;
  const isModerator =
    profile.role === "master" || profile.role === "moderator";
  if (!isOwner && !isModerator) {
    return { ok: false, error: "權限不足" };
  }

  await expireBroadcast(broadcastId);
  revalidateTag("broadcasts");
  return { ok: true };
}

export async function deleteUserRewardAction(
  rewardId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未登入" };

  const row = await findUserRewardById(rewardId);
  if (!row || row.user_id !== user.id) {
    return { ok: false, error: "找不到道具" };
  }
  const deny = await assertRewardDeletable(row);
  if (deny) return { ok: false, error: deny };

  try {
    const ok = await deleteUserRewardForOwner(rewardId, user.id);
    if (!ok) {
      return { ok: false, error: "刪除失敗" };
    }
  } catch (e) {
    console.error("deleteUserRewardAction:", e);
    return { ok: false, error: "刪除失敗，請稍後再試" };
  }
  revalidateTag(profileCacheTag(user.id));
  return { ok: true };
}

export async function deleteUserRewardsBatchAction(
  rewardIds: string[],
): Promise<{ ok: true; deleted: number } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未登入" };

  const unique = Array.from(new Set(rewardIds.filter(Boolean)));
  if (unique.length === 0) return { ok: false, error: "未選擇道具" };

  for (const id of unique) {
    const row = await findUserRewardById(id);
    if (!row || row.user_id !== user.id) {
      return { ok: false, error: "找不到道具" };
    }
    const deny = await assertRewardDeletable(row);
    if (deny) return { ok: false, error: deny };
  }

  try {
    const n = await deleteUserRewardsForOwner(unique, user.id);
    if (n !== unique.length) {
      return { ok: false, error: "刪除失敗" };
    }
  } catch (e) {
    console.error("deleteUserRewardsBatchAction:", e);
    return { ok: false, error: "刪除失敗，請稍後再試" };
  }
  revalidateTag(profileCacheTag(user.id));
  return { ok: true, deleted: unique.length };
}

export async function giftUserRewardToAlliancePartnerAction(
  rewardId: string,
  partnerUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const r = await giftUserRewardsToAlliancePartnerBatchAction(
    [rewardId],
    partnerUserId,
  );
  if (!r.ok) return r;
  return { ok: true };
}

export async function giftUserRewardsToAlliancePartnerBatchAction(
  rewardIds: string[],
  partnerUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未登入" };
  if (user.id === partnerUserId) {
    return { ok: false, error: "無法贈送給自己" };
  }

  const unique = Array.from(new Set(rewardIds.filter(Boolean)));
  if (unique.length === 0) return { ok: false, error: "未選擇道具" };

  try {
    const alliance = await findAllianceBetween(user.id, partnerUserId);
    if (!alliance || alliance.status !== "accepted") {
      return { ok: false, error: "僅能贈送給已成立的血盟夥伴" };
    }
  } catch (e) {
    console.error("giftUserRewardsToAlliancePartnerBatchAction alliance:", e);
    return { ok: false, error: "贈送失敗，請稍後再試" };
  }

  const giftLabels: string[] = [];
  for (const id of unique) {
    const row = await findUserRewardById(id);
    if (!row || row.user_id !== user.id) {
      return { ok: false, error: "找不到道具" };
    }
    const deny = await assertRewardGiftable(row);
    if (deny) return { ok: false, error: deny };
    giftLabels.push(row.label?.trim() || "道具");
  }

  try {
    for (const id of unique) {
      await transferUserRewardToUser(id, user.id, partnerUserId);
    }
  } catch (e) {
    console.error("giftUserRewardsToAlliancePartnerBatchAction:", e);
    return { ok: false, error: "贈送失敗，請稍後再試" };
  }

  const senderProfile = await findProfileById(user.id);
  const senderNickname = senderProfile?.nickname?.trim() || "某位冒險者";
  await notifyUserMailboxSilent({
    user_id: partnerUserId,
    type: "system",
    from_user_id: user.id,
    message: formatGiftBatchMailboxMessage(senderNickname, giftLabels),
    is_read: false,
  });

  revalidateTag(profileCacheTag(user.id));
  revalidateTag(profileCacheTag(partnerUserId));
  return { ok: true };
}

export async function resellUserRewardsBatchAction(
  rewardIds: string[],
): Promise<
  | { ok: true; totalCredited: number; currencyLabel: string }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未登入" };

  const unique = Array.from(new Set(rewardIds.filter(Boolean)));
  if (unique.length === 0) return { ok: false, error: "未選擇道具" };

  const rows: UserRewardRow[] = [];
  for (const id of unique) {
    const row = await findUserRewardById(id);
    if (!row || row.user_id !== user.id) {
      return { ok: false, error: "找不到道具" };
    }
    if (row.is_equipped) {
      return { ok: false, error: "請先卸下再回賣" };
    }
    rows.push(row);
  }

  const sid = rows[0]!.shop_item_id;
  if (!sid || rows.some((r) => r.shop_item_id !== sid)) {
    return { ok: false, error: "僅能批次回賣同一商城商品" };
  }

  const shop = await findShopItemById(sid);
  if (!shop) return { ok: false, error: "找不到商品設定" };
  if (!shop.allow_resell) {
    return { ok: false, error: "此道具不可回賣" };
  }
  const unit =
    shop.resell_price != null && Number.isFinite(Number(shop.resell_price))
      ? Number(shop.resell_price)
      : null;
  if (unit == null || unit < 0) {
    return { ok: false, error: "此商品未設定回收金額" };
  }

  const currencyRaw =
    shop.resell_currency_type?.trim() || shop.currency_type || "free_coins";
  const coinType = currencyRaw === "premium_coins" ? "premium" : "free";
  const total = unit * unique.length;
  const currencyLabel =
    currencyRaw === "premium_coins" ? "純金" : "探險幣";

  try {
    const n = await deleteUserRewardsForOwner(unique, user.id);
    if (n !== unique.length) {
      return { ok: false, error: "回賣失敗" };
    }
  } catch (e) {
    console.error("resellUserRewardsBatchAction delete:", e);
    return { ok: false, error: "回賣失敗，請稍後再試" };
  }

  const credit = await creditCoins({
    userId: user.id,
    coinType,
    amount: total,
    source: "shop_resell",
    note: `商城回收：${shop.name} x${unique.length}`,
  });
  if (!credit.success) {
    console.error("resellUserRewardsBatchAction credit:", credit.error);
    return { ok: false, error: "發放回收金失敗，請洽管理員" };
  }

  revalidateTag(profileCacheTag(user.id));
  return { ok: true, totalCredited: total, currencyLabel };
}
