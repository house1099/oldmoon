"use server";

import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileCacheTag } from "@/lib/supabase/get-cached-profile";
import { findUserIdsInBlockRelation } from "@/lib/repositories/server/chat.repository";
import { insertExpLog } from "@/lib/repositories/server/exp.repository";
import { creditCoins } from "@/lib/repositories/server/coin.repository";
import { insertUserReward } from "@/lib/repositories/server/prize.repository";
import {
  countUserRewardsByType,
  deleteUserRewardForOwner,
  findUserRewardById,
  listFishingRodsAndBaits,
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
import { findTierSettingByFishType } from "@/lib/repositories/server/fishing-tier-settings.repository";
import { pickTierFromSettings } from "@/lib/utils/fishing-tier-pick";
import type { TierPickResult } from "@/lib/utils/fishing-tier-pick";
import {
  getRodCastSnapshot,
  getRodCastState,
  peekCanStartCast,
  peekHarvestReady,
  recordHarvestSuccess,
  setPendingCast,
} from "@/lib/repositories/server/fishing-cast.repository";
import { findShopItemById } from "@/lib/repositories/server/shop.repository";
import {
  baitHasMatchmakerChance,
  parseBaitFishWeights,
  parseRodFishingRules,
  rollFishTypeFromWeights,
} from "@/lib/utils/fishing-shop-metadata";
import { findMutualLikeFlags } from "@/lib/repositories/server/like.repository";
import { findSystemSettingByKey } from "@/lib/repositories/server/invitation.repository";
import { getMatchmakerAgeMaxAction } from "@/services/system-settings.action";
import { isAgeMatch, isRegionMatch } from "@/lib/utils/matchmaker-region";
import type {
  FishType,
  FishingRewardRow,
  FishingRewardTier,
  Json,
} from "@/types/database.types";
import type { UserRow } from "@/lib/repositories/server/user.repository";

export type CastFishResult =
  | { ok: true }
  | { ok: false; error: string };

export type FishingPhase = "no_rod" | "no_bait" | "can_cast";

export type FishingStatusDto = {
  phase: FishingPhase;
  rodCount: number;
  baitCount: number;
  /** min(釣餌數, 當前釣竿今日剩餘額度)；無釣竿時為 0 */
  todayRemainingCasts: number;
  equippedRodName: string | null;
  /** 預設選中之釣餌顯示名（單一餌種時） */
  defaultBaitName: string | null;
  /** 任一支釣竿有進行中拋竿（已消耗魚餌、等待收成） */
  hasPendingHarvest: boolean;
  rods: Array<{
    id: string;
    name: string;
    shopItemId: string | null;
    castsRemainingToday: number;
    /** 收竿後距下次可拋竿的冷卻（秒） */
    cooldownAfterHarvestRemainingSec: number;
    hasPendingCast: boolean;
    /** 拋竿後至可收成剩餘秒（無 pending 為 0） */
    pendingHarvestRemainSec: number;
  }>;
  baits: Array<{ id: string; name: string; shopItemId: string | null }>;
};

export type FishingStatusResult =
  | { ok: true; data: FishingStatusDto }
  | { ok: false; error: "fishing_disabled" };

export type CollectFishResult =
  | {
      ok: true;
      fishType: FishType;
      /** 本次抽中的獎勵階級（供開獎 Lottie）；無表或 fallback 時可能為 null */
      rewardTier?: FishingRewardTier | null;
      matchmakerUser?: {
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

async function pickTierForFishType(fishType: FishType): Promise<TierPickResult> {
  const row = await findTierSettingByFishType(fishType);
  if (!row) {
    return pickTierFromSettings(6000, 3000, 1000, "interval_miss");
  }
  return pickTierFromSettings(
    row.p_small_bp,
    row.p_medium_bp,
    row.p_large_bp,
    row.remainder_mode,
  );
}

/** 月老魚：配對成功後依獎池加權抽選（不依小／中／大 tier）。 */
async function pickMatchmakerRewardFromTable() {
  let reward: FishingRewardRow | null = await pickReward("matchmaker", "large");
  if (!reward) reward = await pickReward("matchmaker", "medium");
  if (!reward) reward = await pickReward("matchmaker", "small");
  return reward;
}

async function pickNonMatchmakerRewardFromTable(
  fishType: FishType,
): Promise<FishingRewardRow | null> {
  if (fishType === "leviathan") {
    let r = await pickReward("leviathan", "large");
    if (!r) r = await pickReward("legendary", "large");
    if (!r) {
      const t = await pickTierForFishType("legendary");
      if (t !== "miss") {
        r = await pickReward("legendary", t);
      }
    }
    if (!r) r = await pickReward("legendary", "medium");
    if (!r) r = await pickReward("legendary", "small");
    return r;
  }
  const tierRoll = await pickTierForFishType(fishType);
  let r: FishingRewardRow | null = null;
  if (tierRoll !== "miss") {
    r = await pickReward(fishType, tierRoll);
  }
  if (!r) r = await pickReward(fishType, "medium");
  if (!r) r = await pickReward(fishType, "small");
  return r;
}

async function resolveMatchmakerRewards(
  userId: string,
  peerNickname: string,
): Promise<{
  fishCoins: number;
  fishExp: number;
  coinFailure: boolean;
  fishItemJson: Json | null;
  rewardTier: FishingRewardTier | null;
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
      return {
        fishCoins: 0,
        fishExp: 0,
        coinFailure: true,
        fishItemJson: null,
        rewardTier: null,
      };
    }
    const expKey = `fishing_fallback:${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    await insertExpLog({
      user_id: userId,
      source: "fishing",
      unique_key: expKey,
      delta: fishExp,
      delta_exp: fishExp,
    });
    return {
      fishCoins,
      fishExp,
      coinFailure: false,
      fishItemJson: null,
      rewardTier: null,
    };
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

  return {
    fishCoins,
    fishExp,
    coinFailure,
    fishItemJson,
    rewardTier: reward.reward_tier,
  };
}

async function resolveNonMatchmakerFishRewards(
  userId: string,
  fishType: FishType,
): Promise<{
  fishCoins: number;
  fishExp: number;
  coinFailure: boolean;
  fishItemJson: Json | null;
  rewardTier: FishingRewardTier | null;
}> {
  const reward = await pickNonMatchmakerRewardFromTable(fishType);
  const note = `釣魚：${fishType}`;

  if (!reward) {
    const fishCoins = 5;
    const fishExp = 3;
    const coinResult = await creditCoins({
      userId,
      coinType: "free",
      amount: fishCoins,
      source: "fishing",
      note,
    });
    if (!coinResult.success) {
      return {
        fishCoins: 0,
        fishExp: 0,
        coinFailure: true,
        fishItemJson: null,
        rewardTier: null,
      };
    }
    const expKey = `fishing_fallback:${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    await insertExpLog({
      user_id: userId,
      source: "fishing",
      unique_key: expKey,
      delta: fishExp,
      delta_exp: fishExp,
    });
    return {
      fishCoins,
      fishExp,
      coinFailure: false,
      fishItemJson: null,
      rewardTier: null,
    };
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

  return {
    fishCoins,
    fishExp,
    coinFailure,
    fishItemJson,
    rewardTier: reward.reward_tier,
  };
}

async function tryInsertStandardFishLog(
  userId: string,
  fishType: FishType,
  payload: {
    fish_coins: number | null;
    fish_exp: number | null;
    fish_item: Json | null;
  },
) {
  try {
    await insertFishingLog({
      user_id: userId,
      fish_type: fishType,
      fish_user_id: null,
      no_match_found: null,
      fish_coins: payload.fish_coins,
      fish_exp: payload.fish_exp,
      fish_item: payload.fish_item ?? null,
      peer_nickname: null,
      peer_avatar_url: null,
      peer_region: null,
      peer_interests: null,
      peer_bio: null,
    });
  } catch (e) {
    console.error("fishing_logs insert failed", e);
  }
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
        hasPendingHarvest: false,
        rods: [],
        baits: [],
      },
    };
  }

  const enabledRaw = await findSystemSettingByKey("fishing_enabled");
  if (enabledRaw === "false") {
    return { ok: false, error: "fishing_disabled" };
  }

  const rodCount = await countUserRewardsByType(user.id, "fishing_rod");
  const baitCount = await countUserRewardsByType(user.id, "fishing_bait");
  const [equippedRodName, defaultBaitName, bundle] = await Promise.all([
    findFirstFishingRodDisplayName(user.id),
    findFirstFishingBaitDisplayName(user.id),
    listFishingRodsAndBaits(user.id),
  ]);

  const rodsOut: FishingStatusDto["rods"] = [];
  for (const r of bundle.rods) {
    let castsRemainingToday = 0;
    let cooldownAfterHarvestRemainingSec = 0;
    let hasPendingCast = false;
    let pendingHarvestRemainSec = 0;
    if (r.shop_item_id) {
      const si = await findShopItemById(r.shop_item_id);
      const rules = parseRodFishingRules(si?.metadata ?? null);
      if (rules) {
        const snap = await getRodCastSnapshot({
          userId: user.id,
          rodUserRewardId: r.id,
          maxPerDay: rules.maxPerDay,
          waitUntilHarvestMinutes: rules.waitUntilHarvestMinutes,
          cooldownAfterHarvestMinutes: rules.cooldownAfterHarvestMinutes,
        });
        castsRemainingToday = snap.castsRemainingToday;
        cooldownAfterHarvestRemainingSec = snap.cooldownAfterHarvestRemainingSec;
        hasPendingCast = snap.hasPendingCast;
        pendingHarvestRemainSec = snap.pendingHarvestRemainSec;
      }
    }
    rodsOut.push({
      id: r.id,
      name: r.displayName,
      shopItemId: r.shop_item_id,
      castsRemainingToday,
      cooldownAfterHarvestRemainingSec,
      hasPendingCast,
      pendingHarvestRemainSec,
    });
  }

  const baitsOut = bundle.baits.map((b) => ({
    id: b.id,
    name: b.displayName,
    shopItemId: b.shop_item_id,
  }));

  const hasPendingHarvest = rodsOut.some((r) => r.hasPendingCast);
  const firstRod = rodsOut[0];
  const canStartNewCastOnFirst =
    firstRod != null &&
    !firstRod.hasPendingCast &&
    firstRod.castsRemainingToday > 0 &&
    firstRod.cooldownAfterHarvestRemainingSec === 0;
  const todayRemainingCasts =
    canStartNewCastOnFirst && !hasPendingHarvest
      ? Math.min(baitCount, firstRod.castsRemainingToday)
      : 0;

  if (rodCount < 1) {
    return {
      ok: true,
      data: {
        phase: "no_rod",
        rodCount,
        baitCount,
        todayRemainingCasts: 0,
        equippedRodName,
        defaultBaitName,
        hasPendingHarvest: false,
        rods: rodsOut,
        baits: baitsOut,
      },
    };
  }
  if (baitCount < 1 && !hasPendingHarvest) {
    return {
      ok: true,
      data: {
        phase: "no_bait",
        rodCount,
        baitCount,
        todayRemainingCasts: 0,
        equippedRodName,
        defaultBaitName,
        hasPendingHarvest,
        rods: rodsOut,
        baits: baitsOut,
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
      hasPendingHarvest,
      rods: rodsOut,
      baits: baitsOut,
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

/** 拋竿：消耗魚餌並記錄等待收成（魚種於收成時抽選）。 */
export async function castFishAction(opts?: {
  baitUserRewardId?: string | null;
  rodUserRewardId?: string | null;
}): Promise<CastFishResult> {
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

  const bundle = await listFishingRodsAndBaits(user.id);
  const rodId =
    opts?.rodUserRewardId?.trim() || bundle.rods[0]?.id || null;
  const baitId =
    opts?.baitUserRewardId?.trim() || bundle.baits[0]?.id || null;

  if (!rodId) return { ok: false, error: "需要釣竿才能釣魚。" };
  if (!baitId) return { ok: false, error: "需要釣餌才能釣魚。" };

  const rodRow = await findUserRewardById(rodId);
  if (!rodRow || rodRow.user_id !== user.id || rodRow.reward_type !== "fishing_rod") {
    return { ok: false, error: "釣竿資料無效。" };
  }
  const baitRow = await findUserRewardById(baitId);
  if (!baitRow || baitRow.user_id !== user.id || baitRow.reward_type !== "fishing_bait") {
    return { ok: false, error: "釣餌資料無效。" };
  }

  const rodShop = rodRow.shop_item_id
    ? await findShopItemById(rodRow.shop_item_id)
    : null;
  const rodRules = parseRodFishingRules(rodShop?.metadata ?? null);
  if (!rodRules) {
    return {
      ok: false,
      error:
        "此釣竿尚未設定 rod_max_casts_per_day／rod_wait_until_harvest_minutes 等，請洽管理員。",
    };
  }

  const baitShop = baitRow.shop_item_id
    ? await findShopItemById(baitRow.shop_item_id)
    : null;
  if (baitHasMatchmakerChance(baitShop?.metadata ?? null) && fisher.birth_year == null) {
    return {
      ok: false,
      error: "此魚餌有機會釣到月老魚，請先在個人資料設定出生年份。",
    };
  }

  const castRow = await getRodCastState(user.id, rodId);
  const peek = peekCanStartCast({
    row: castRow,
    maxPerDay: rodRules.maxPerDay,
    cooldownAfterHarvestMinutes: rodRules.cooldownAfterHarvestMinutes,
  });
  if (!peek.ok) {
    if (peek.error === "pending_harvest") {
      return { ok: false, error: "請先收成上一輪拋竿，或稍後再試。" };
    }
    if (peek.error === "cooldown") {
      const m = peek.cooldownMinutesLeft ?? 1;
      return {
        ok: false,
        error: `釣竿冷卻中，約 ${m} 分鐘後可再拋竿。`,
      };
    }
    return { ok: false, error: "今日此釣竿拋竿次數已用完。" };
  }

  if (!baitRow.shop_item_id) {
    return { ok: false, error: "魚餌缺少商城商品關聯，無法拋竿。" };
  }

  const consumed = await deleteUserRewardForOwner(baitId, user.id);
  if (!consumed) {
    return { ok: false, error: "消耗釣餌失敗，請稍後再試。" };
  }

  await setPendingCast({
    userId: user.id,
    rodUserRewardId: rodId,
    baitShopItemId: baitRow.shop_item_id,
  });

  return { ok: true };
}

async function runFishingHarvestCore(
  userId: string,
  rodId: string,
  baitShopMetadata: Json | null,
  fisher: UserRow,
): Promise<CollectFishResult> {
  const weights = parseBaitFishWeights(baitShopMetadata);
  const rolledFish = rollFishTypeFromWeights(weights);

  if (rolledFish === "matchmaker" && fisher.birth_year == null) {
    return {
      ok: false,
      error: "請先在個人資料設定出生年份，才能釣到月老魚。",
    };
  }

  const finishRod = async () => {
    await recordHarvestSuccess({
      userId,
      rodUserRewardId: rodId,
    });
  };

  if (rolledFish !== "matchmaker") {
    const { fishCoins, fishExp, coinFailure, fishItemJson, rewardTier } =
      await resolveNonMatchmakerFishRewards(userId, rolledFish);
    revalidateTag(profileCacheTag(userId));
    await tryInsertStandardFishLog(userId, rolledFish, {
      fish_coins: coinFailure ? 0 : fishCoins,
      fish_exp: fishExp,
      fish_item: fishItemJson,
    });
    await finishRod();
    return {
      ok: true,
      fishType: rolledFish,
      rewardTier,
      fishCoins: coinFailure ? 0 : fishCoins,
      fishExp,
    };
  }

  const ageMax = await getMatchmakerAgeMaxAction();
  const blocked = new Set(await findUserIdsInBlockRelation(userId));
  const candidatesRaw = await findMatchmakerPoolCandidates(userId);

  const fisherBirthYear = fisher.birth_year!;
  const fisherAge = clampAgeFields(
    fisher.matchmaker_age_older,
    fisher.matchmaker_age_younger,
    ageMax,
  );
  const fisherForMatch = {
    birth_year: fisherBirthYear,
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
    revalidateTag(profileCacheTag(userId));
    await tryInsertMatchmakerLog(userId, {
      fish_user_id: null,
      no_match_found: true,
      fish_coins: null,
      fish_exp: null,
      peer: null,
    });
    await finishRod();
    return {
      ok: true,
      fishType: "matchmaker",
      rewardTier: null,
      matchmakerUser: null,
      noMatchFound: true,
    };
  }

  const pick = pool[Math.floor(Math.random() * pool.length)]!;

  const { fishCoins, fishExp, coinFailure, fishItemJson, rewardTier } =
    await resolveMatchmakerRewards(userId, pick.nickname);

  if (coinFailure) {
    revalidateTag(profileCacheTag(userId));
    const peerFull = await findProfileById(pick.id);
    await tryInsertMatchmakerLog(userId, {
      fish_user_id: pick.id,
      no_match_found: false,
      fish_coins: 0,
      fish_exp: 0,
      peer: peerFull,
      fish_item: fishItemJson,
    });
    await finishRod();
    return {
      ok: true,
      fishType: "matchmaker",
      rewardTier,
      matchmakerUser: {
        id: pick.id,
        nickname: pick.nickname,
        avatar_url: pick.avatar_url,
      },
      fishCoins: 0,
      fishExp: 0,
    };
  }

  revalidateTag(profileCacheTag(userId));

  const peerFull = await findProfileById(pick.id);
  await tryInsertMatchmakerLog(userId, {
    fish_user_id: pick.id,
    no_match_found: false,
    fish_coins: fishCoins,
    fish_exp: fishExp,
    peer: peerFull,
    fish_item: fishItemJson,
  });
  await finishRod();

  return {
    ok: true,
    fishType: "matchmaker",
    rewardTier,
    matchmakerUser: {
      id: pick.id,
      nickname: pick.nickname,
      avatar_url: pick.avatar_url,
    },
    fishCoins,
    fishExp,
  };
}

/** 收竿：結算上一輪拋竿（須已達等待時間）。 */
export async function harvestFishAction(opts?: {
  rodUserRewardId?: string | null;
}): Promise<CollectFishResult> {
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

  const bundle = await listFishingRodsAndBaits(user.id);
  const rodId = opts?.rodUserRewardId?.trim() || bundle.rods[0]?.id || null;
  if (!rodId) return { ok: false, error: "需要釣竿才能釣魚。" };

  const rodRow = await findUserRewardById(rodId);
  if (!rodRow || rodRow.user_id !== user.id || rodRow.reward_type !== "fishing_rod") {
    return { ok: false, error: "釣竿資料無效。" };
  }

  const rodShop = rodRow.shop_item_id
    ? await findShopItemById(rodRow.shop_item_id)
    : null;
  const rodRules = parseRodFishingRules(rodShop?.metadata ?? null);
  if (!rodRules) {
    return {
      ok: false,
      error:
        "此釣竿尚未設定 rod_max_casts_per_day／rod_wait_until_harvest_minutes 等，請洽管理員。",
    };
  }

  const castRow = await getRodCastState(user.id, rodId);
  const ready = peekHarvestReady({
    row: castRow,
    waitUntilHarvestMinutes: rodRules.waitUntilHarvestMinutes,
  });
  if (!ready.ok) {
    if (ready.error === "no_pending") {
      return { ok: false, error: "請先拋竿，或上一輪已收成。" };
    }
    const m = Math.max(1, Math.ceil(ready.remainSec / 60));
    return {
      ok: false,
      error: `還需等待約 ${m} 分鐘才能收竿。`,
    };
  }

  const baitShopId = castRow?.pending_bait_shop_item_id;
  if (!baitShopId) {
    return { ok: false, error: "收成資料異常，請聯絡管理員。" };
  }

  const baitShop = await findShopItemById(baitShopId);
  return runFishingHarvestCore(
    user.id,
    rodId,
    baitShop?.metadata ?? null,
    fisher,
  );
}

