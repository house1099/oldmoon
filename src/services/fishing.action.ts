"use server";

import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileCacheTag } from "@/lib/supabase/get-cached-profile";
import { findUserIdsInBlockRelation } from "@/lib/repositories/server/chat.repository";
import { insertExpLog } from "@/lib/repositories/server/exp.repository";
import { creditCoins } from "@/lib/repositories/server/coin.repository";
import { insertUserReward } from "@/lib/repositories/server/prize.repository";
import { findShopItemById } from "@/lib/repositories/server/shop.repository";
import {
  countUserRewardsByType,
  deleteUserRewardForOwner,
  findFirstUserRewardIdOfType,
} from "@/lib/repositories/server/rewards.repository";
import {
  findMatchmakerPoolCandidates,
  findProfileById,
} from "@/lib/repositories/server/user.repository";
import {
  buildFishItemJson,
  findFishingLogsForUser,
  findFirstFishingBaitDisplayName,
  findFirstFishingRodDisplayName,
  insertFishingLog,
  pickReward,
} from "@/lib/repositories/server/fishing.repository";
import { findMutualLikeFlags } from "@/lib/repositories/server/like.repository";
import { findSystemSettingByKey } from "@/lib/repositories/server/invitation.repository";
import { getMatchmakerAgeMaxAction } from "@/services/system-settings.action";
import { isAgeMatch, isRegionMatch } from "@/lib/utils/matchmaker-region";
import type { FishType, FishingRewardTier, Json } from "@/types/database.types";
import type { UserRow } from "@/lib/repositories/server/user.repository";

export type FishingPhase = "no_rod" | "no_bait" | "can_cast";

export type FishingStatusDto = {
  phase: FishingPhase;
  rodCount: number;
  baitCount: number;
  /** 今日可拋竿次數（目前等同持有釣餌數） */
  todayRemainingCasts: number;
  equippedRodName: string | null;
  /** 預設選中之釣餌顯示名（單一餌種時） */
  defaultBaitName: string | null;
};

export type FishingStatusResult =
  | { ok: true; data: FishingStatusDto }
  | { ok: false; error: "fishing_disabled" };

export type CollectFishResult =
  | {
      ok: true;
      fishType: "matchmaker";
      matchmakerUser: {
        id: string;
        nickname: string;
        avatar_url: string | null;
      } | null;
      noMatchFound?: boolean;
      fishCoins?: number;
      fishExp?: number;
    }
  | { ok: false; error: string };

export type FishingLogListItemDto = {
  id: string;
  created_at: string;
  fish_type: FishType;
  fish_user_id: string | null;
  no_match_found: boolean | null;
  fish_coins: number | null;
  fish_exp: number | null;
  fish_item: Json | null;
  peer_nickname: string | null;
  peer_avatar_url: string | null;
  peer_region: string | null;
  peer_interests: string[] | null;
  peer_bio: string | null;
  mutual_like: boolean;
};

function clampAgeFields(older: number, younger: number, ageMax: number) {
  return {
    matchmaker_age_older: Math.min(older, ageMax),
    matchmaker_age_younger: Math.min(younger, ageMax),
  };
}

function peerSnapshotFromProfile(p: UserRow | null) {
  if (!p) {
    return {
      peer_nickname: null as string | null,
      peer_avatar_url: null as string | null,
      peer_region: null as string | null,
      peer_interests: null as string[] | null,
      peer_bio: null as string | null,
    };
  }
  const bio =
    [p.bio_village, p.bio].find((b) => typeof b === "string" && b.trim()) ??
    "";
  return {
    peer_nickname: p.nickname,
    peer_avatar_url: p.avatar_url,
    peer_region: p.region,
    peer_interests: p.interests?.length ? p.interests.slice(0, 8) : null,
    peer_bio: bio.trim() ? bio.trim() : null,
  };
}

async function tryInsertMatchmakerLog(
  userId: string,
  payload: {
    fish_user_id: string | null;
    no_match_found: boolean | null;
    fish_coins: number | null;
    fish_exp: number | null;
    peer: UserRow | null;
    fish_item?: Json | null;
  },
) {
  try {
    const snap = peerSnapshotFromProfile(payload.peer);
    await insertFishingLog({
      user_id: userId,
      fish_type: "matchmaker",
      fish_user_id: payload.fish_user_id,
      no_match_found: payload.no_match_found,
      fish_coins: payload.fish_coins,
      fish_exp: payload.fish_exp,
      fish_item: payload.fish_item ?? null,
      ...snap,
    });
  } catch (e) {
    console.error("fishing_logs insert failed", e);
  }
}

function pickTier(): FishingRewardTier {
  const r = Math.random() * 100;
  if (r < 60) return "small";
  if (r < 90) return "medium";
  return "large";
}

async function pickMatchmakerRewardFromTable() {
  const tier = pickTier();
  let reward = await pickReward("matchmaker", tier);
  if (!reward) reward = await pickReward("matchmaker", "medium");
  if (!reward) reward = await pickReward("matchmaker", "small");
  return reward;
}

async function resolveMatchmakerRewards(
  userId: string,
  peerNickname: string,
): Promise<{
  fishCoins: number;
  fishExp: number;
  coinFailure: boolean;
  fishItemJson: Json | null;
}> {
  const reward = await pickMatchmakerRewardFromTable();
  const note = `月老魚：${peerNickname}`;

  if (!reward) {
    const fishCoins = 10;
    const fishExp = 5;
    const coinResult = await creditCoins({
      userId,
      coinType: "free",
      amount: fishCoins,
      source: "fishing",
      note,
    });
    if (!coinResult.success) {
      return { fishCoins: 0, fishExp: 0, coinFailure: true, fishItemJson: null };
    }
    const expKey = `fishing_fallback:${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    await insertExpLog({
      user_id: userId,
      source: "fishing",
      unique_key: expKey,
      delta: fishExp,
      delta_exp: fishExp,
    });
    return { fishCoins, fishExp, coinFailure: false, fishItemJson: null };
  }

  let fishCoins = 0;
  let fishExp = 0;
  let coinFailure = false;
  let fishItemJson: Json | null = null;

  switch (reward.reward_type) {
    case "coins_free": {
      const amt = reward.coins_amount ?? 0;
      if (amt > 0) {
        const r = await creditCoins({
          userId,
          coinType: "free",
          amount: amt,
          source: "fishing",
          note,
        });
        coinFailure = !r.success;
        if (r.success) fishCoins = amt;
      }
      break;
    }
    case "coins_premium": {
      const amt = reward.coins_amount ?? 0;
      if (amt > 0) {
        const r = await creditCoins({
          userId,
          coinType: "premium",
          amount: amt,
          source: "fishing",
          note,
        });
        coinFailure = !r.success;
        if (r.success) fishCoins = amt;
      }
      break;
    }
    case "exp": {
      const exp = reward.exp_amount ?? 0;
      if (exp > 0) {
        const expKey = `fishing:${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        await insertExpLog({
          user_id: userId,
          source: "fishing",
          unique_key: expKey,
          delta: exp,
          delta_exp: exp,
        });
        fishExp = exp;
      }
      break;
    }
    case "shop_item": {
      if (reward.shop_item_id) {
        const item = await findShopItemById(reward.shop_item_id);
        if (item) {
          await insertUserReward({
            user_id: userId,
            reward_type: item.item_type,
            shop_item_id: item.id,
            label: item.name,
            is_equipped: false,
          });
          fishItemJson = buildFishItemJson({ name: item.name });
        }
      }
      break;
    }
    default:
      break;
  }

  return { fishCoins, fishExp, coinFailure, fishItemJson };
}

/** 釣魚列狀態（未登入時視為無釣竿） */
export async function getFishingStatusAction(): Promise<FishingStatusResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: true,
      data: {
        phase: "no_rod",
        rodCount: 0,
        baitCount: 0,
        todayRemainingCasts: 0,
        equippedRodName: null,
        defaultBaitName: null,
      },
    };
  }

  const enabledRaw = await findSystemSettingByKey("fishing_enabled");
  if (enabledRaw === "false") {
    return { ok: false, error: "fishing_disabled" };
  }

  const rodCount = await countUserRewardsByType(user.id, "fishing_rod");
  const baitCount = await countUserRewardsByType(user.id, "fishing_bait");
  const [equippedRodName, defaultBaitName] = await Promise.all([
    findFirstFishingRodDisplayName(user.id),
    findFirstFishingBaitDisplayName(user.id),
  ]);
  const todayRemainingCasts = baitCount;

  if (rodCount < 1) {
    return {
      ok: true,
      data: {
        phase: "no_rod",
        rodCount,
        baitCount,
        todayRemainingCasts,
        equippedRodName,
        defaultBaitName,
      },
    };
  }
  if (baitCount < 1) {
    return {
      ok: true,
      data: {
        phase: "no_bait",
        rodCount,
        baitCount,
        todayRemainingCasts,
        equippedRodName,
        defaultBaitName,
      },
    };
  }
  return {
    ok: true,
    data: {
      phase: "can_cast",
      rodCount,
      baitCount,
      todayRemainingCasts,
      equippedRodName,
      defaultBaitName,
    },
  };
}

/** Layer 3：釣魚日誌列表（含互有緣分標記）。 */
export async function getFishingLogsAction(): Promise<
  { ok: true; logs: FishingLogListItemDto[] } | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "請先登入。" };

  const rows = await findFishingLogsForUser(user.id);
  const peerIds = rows
    .map((r) => r.fish_user_id)
    .filter((id): id is string => Boolean(id));
  const mutualMap = await findMutualLikeFlags(user.id, peerIds);

  const logs: FishingLogListItemDto[] = rows.map((r) => ({
    id: r.id,
    created_at: r.created_at,
    fish_type: r.fish_type,
    fish_user_id: r.fish_user_id,
    no_match_found: r.no_match_found,
    fish_coins: r.fish_coins,
    fish_exp: r.fish_exp,
    fish_item: r.fish_item,
    peer_nickname: r.peer_nickname,
    peer_avatar_url: r.peer_avatar_url,
    peer_region: r.peer_region,
    peer_interests: r.peer_interests,
    peer_bio: r.peer_bio,
    mutual_like: r.fish_user_id
      ? (mutualMap.get(r.fish_user_id) ?? false)
      : false,
  }));

  return { ok: true, logs };
}

export async function collectFishAction(): Promise<CollectFishResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "請先登入。" };

  const fishingEnabled = await findSystemSettingByKey("fishing_enabled");
  if (fishingEnabled === "false") {
    return { ok: false, error: "fishing_disabled" };
  }

  const fisher = await findProfileById(user.id);
  if (!fisher) return { ok: false, error: "找不到冒險者資料。" };

  const rodCount = await countUserRewardsByType(user.id, "fishing_rod");
  const baitId = await findFirstUserRewardIdOfType(user.id, "fishing_bait");
  if (rodCount < 1) return { ok: false, error: "需要釣竿才能釣魚。" };
  if (!baitId) return { ok: false, error: "需要釣餌才能釣魚。" };

  if (fisher.birth_year == null) {
    return {
      ok: false,
      error: "請先在個人資料設定出生年份，才能參與月老魚配對。",
    };
  }

  const ageMax = await getMatchmakerAgeMaxAction();
  const consumed = await deleteUserRewardForOwner(baitId, user.id);
  if (!consumed) {
    return { ok: false, error: "消耗釣餌失敗，請稍後再試。" };
  }

  const blocked = new Set(await findUserIdsInBlockRelation(user.id));
  const candidatesRaw = await findMatchmakerPoolCandidates(user.id);

  const fisherAge = clampAgeFields(
    fisher.matchmaker_age_older,
    fisher.matchmaker_age_younger,
    ageMax,
  );
  const fisherForMatch = {
    birth_year: fisher.birth_year,
    matchmaker_age_mode: fisher.matchmaker_age_mode,
    matchmaker_age_older: fisherAge.matchmaker_age_older,
    matchmaker_age_younger: fisherAge.matchmaker_age_younger,
  };

  const pool: typeof candidatesRaw = [];
  for (const c of candidatesRaw) {
    if (blocked.has(c.id)) continue;
    if (
      !c.region ||
      !isRegionMatch(c.region, fisher.matchmaker_region_pref ?? '["all"]')
    ) {
      continue;
    }
    if (
      !isRegionMatch(
        fisher.region ?? "",
        c.matchmaker_region_pref ?? '["all"]',
      )
    ) {
      continue;
    }
    if (c.birth_year == null) continue;
    const cAge = clampAgeFields(
      c.matchmaker_age_older,
      c.matchmaker_age_younger,
      ageMax,
    );
    const candForMatch = {
      birth_year: c.birth_year,
      matchmaker_age_mode: c.matchmaker_age_mode,
      matchmaker_age_older: cAge.matchmaker_age_older,
      matchmaker_age_younger: cAge.matchmaker_age_younger,
    };
    if (!isAgeMatch(fisherForMatch, candForMatch)) continue;
    pool.push(c);
  }

  if (pool.length === 0) {
    revalidateTag(profileCacheTag(user.id));
    await tryInsertMatchmakerLog(user.id, {
      fish_user_id: null,
      no_match_found: true,
      fish_coins: null,
      fish_exp: null,
      peer: null,
    });
    return {
      ok: true,
      fishType: "matchmaker",
      matchmakerUser: null,
      noMatchFound: true,
    };
  }

  const pick = pool[Math.floor(Math.random() * pool.length)]!;

  const { fishCoins, fishExp, coinFailure, fishItemJson } =
    await resolveMatchmakerRewards(user.id, pick.nickname);

  if (coinFailure) {
    revalidateTag(profileCacheTag(user.id));
    const peerFull = await findProfileById(pick.id);
    await tryInsertMatchmakerLog(user.id, {
      fish_user_id: pick.id,
      no_match_found: false,
      fish_coins: 0,
      fish_exp: 0,
      peer: peerFull,
      fish_item: fishItemJson,
    });
    return {
      ok: true,
      fishType: "matchmaker",
      matchmakerUser: {
        id: pick.id,
        nickname: pick.nickname,
        avatar_url: pick.avatar_url,
      },
      fishCoins: 0,
      fishExp: 0,
    };
  }

  revalidateTag(profileCacheTag(user.id));

  const peerFull = await findProfileById(pick.id);
  await tryInsertMatchmakerLog(user.id, {
    fish_user_id: pick.id,
    no_match_found: false,
    fish_coins: fishCoins,
    fish_exp: fishExp,
    peer: peerFull,
    fish_item: fishItemJson,
  });

  return {
    ok: true,
    fishType: "matchmaker",
    matchmakerUser: {
      id: pick.id,
      nickname: pick.nickname,
      avatar_url: pick.avatar_url,
    },
    fishCoins,
    fishExp,
  };
}
