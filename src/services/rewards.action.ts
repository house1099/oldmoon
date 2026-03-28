"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidateTag, unstable_cache } from "next/cache";
import { profileCacheTag } from "@/lib/supabase/get-cached-profile";
import type { UserRewardRow } from "@/types/database.types";
import {
  findMyRewards,
  equipReward,
  unequipReward,
  unequipAllOfType,
  markBroadcastUsed,
  insertBroadcast,
  findActiveBroadcasts,
  findUserRewardById,
} from "@/lib/repositories/server/rewards.repository";

export type MyRewardsPayload = {
  titles: UserRewardRow[];
  avatarFrames: UserRewardRow[];
  broadcasts: UserRewardRow[];
  broadcastUnusedCount: number;
};

export type ActiveBroadcastDto = {
  id: string;
  message: string;
  nickname: string;
  createdAt: string;
};

export async function getMyRewardsAction(): Promise<MyRewardsPayload | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const rows = await findMyRewards(user.id);
  const titles = rows.filter((r) => r.reward_type === "title");
  const avatarFrames = rows.filter((r) => r.reward_type === "avatar_frame");
  const broadcasts = rows.filter((r) => r.reward_type === "broadcast");
  const broadcastUnusedCount = broadcasts.filter((r) => r.used_at == null).length;

  return {
    titles,
    avatarFrames,
    broadcasts,
    broadcastUnusedCount,
  };
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

  await markBroadcastUsed(rewardId);
  await insertBroadcast({
    user_id: user.id,
    reward_ref_id: rewardId,
    message: trimmed,
  });
  revalidateTag("broadcasts");
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
