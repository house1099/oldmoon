"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateTag, unstable_cache } from "next/cache";
import { profileCacheTag } from "@/lib/supabase/get-cached-profile";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import {
  findMyRewards,
  equipReward,
  unequipReward,
  unequipAllOfType,
  markUserRewardConsumed,
  clearUserRewardUsedAt,
  insertBroadcast,
  findEarliestUnusedRenameCard,
  findActiveBroadcasts,
  findUserRewardById,
  type UserRewardWithEffect,
} from "@/lib/repositories/server/rewards.repository";

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
};

export async function getMyRewardsAction(): Promise<MyRewardsPayload | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [rows, profile] = await Promise.all([
      findMyRewards(user.id),
      findProfileById(user.id),
    ]);
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
  if (!trimmed || trimmed.length < 1 || trimmed.length > 30) {
    return { ok: false, error: "廣播訊息須為 1〜30 字" };
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
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { nicknameSchema } = await import("@/lib/validation/nickname");
  const { updateProfile } = await import(
    "@/lib/repositories/server/user.repository"
  );

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
    return { ok: false, error: parsed.error.issues[0]?.message ?? "暱稱格式錯誤" };
  }

  await updateProfile(user.id, { nickname: parsed.data });
  await markUserRewardConsumed(card.id);
  revalidateTag(profileCacheTag(user.id));
  return { ok: true };
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
      }));
    },
    ["active-broadcasts-v1"],
    { revalidate: 60, tags: ["broadcasts"] },
  );
  return cached();
}
