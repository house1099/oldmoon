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
  decrementBaitOrDeleteForCast,
  findFishingBaitUserRewardIdForShopItem,
  findUserRewardById,
  listFishingRodsAndBaits,
  sumFishingBaitQuantity,
  upsertFishingBaitStack,
} from "@/lib/repositories/server/rewards.repository";
import {
  findMatchmakerPoolCandidates,
  findProfileById,
  type MatchmakerPoolCandidateRow,
} from "@/lib/repositories/server/user.repository";
import {
  buildFishItemJson,
  findFishingLogsForUser,
  findFirstFishingBaitDisplayName,
  findFirstFishingRodDisplayName,
  findMatchmakerKeptPeerIds,
  insertFishingLog,
  pickReward,
} from "@/lib/repositories/server/fishing.repository";
import { findTierSettingByFishType } from "@/lib/repositories/server/fishing-tier-settings.repository";
import { pickTierFromSettings } from "@/lib/utils/fishing-tier-pick";
import type { TierPickResult } from "@/lib/utils/fishing-tier-pick";
import {
  getRodCastSnapshot,
  getRodCastState,
  markBiteNotified,
  peekCanStartCast,
  peekHarvestReady,
  recordHarvestSuccess,
  setPendingCast,
  setPendingHarvestPreview,
} from "@/lib/repositories/server/fishing-cast.repository";
import { findShopItemById } from "@/lib/repositories/server/shop.repository";
import {
  detectBaitType,
  parseBaitFishWeightsForHarvest,
  parseRodFishingRules,
  type RodTierCooldownDefaults,
  rollFishTypeFromWeights,
} from "@/lib/utils/fishing-shop-metadata";
import { findMutualLikeFlags } from "@/lib/repositories/server/like.repository";
import { findSystemSettingByKey } from "@/lib/repositories/server/invitation.repository";
import { getMatchmakerAgeMaxAction } from "@/services/system-settings.action";
import { notifyUserMailboxSilent } from "@/services/notification.action";
import { isAgeMatch, isRegionMatch } from "@/lib/utils/matchmaker-region";
import {
  checkAllMatchmakerLocks,
  type MatchmakerLockSettings,
  type MatchmakerProfile,
} from "@/lib/utils/matchmaker-locks";
import type {
  FishType,
  FishingRewardRow,
  FishingRewardTier,
  Json,
} from "@/types/database.types";
import type { UserRow } from "@/lib/repositories/server/user.repository";

export type CastFishResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      remainMinutes?: number;
      nextCastAt?: string;
    };

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
    /** 釣竿商城圖（快選列用） */
    imageUrl: string | null;
    castsRemainingToday: number;
    /** 拋竿後距下次可再拋竿的冷卻（秒） */
    cooldownAfterHarvestRemainingSec: number;
    hasPendingCast: boolean;
    /** 拋竿後至可收成剩餘秒（無 pending 為 0） */
    pendingHarvestRemainSec: number;
    /** 可收竿的絕對時間（ISO），前端收竿倒數用 */
    pendingHarvestReadyAtIso: string | null;
    cooldownInfo: {
      isOnCooldown: boolean;
      remainMinutes: number;
      nextCastAt: string | null;
    } | null;
    /** 本次進行中拋竿實際消耗的餌名稱（與背包選取無關） */
    pendingBaitName: string | null;
    /** 同上，供魚種標籤顯示 */
    pendingBaitMetadata: Json | null;
  }>;
  baits: Array<{
    id: string;
    name: string;
    shopItemId: string | null;
    metadata: Json | null;
    quantity: number;
  }>;
};

export type FishingStatusResult =
  | { ok: true; data: FishingStatusDto }
  | { ok: false; error: "fishing_disabled" };

/** 月老魚開獎／預覽：有緣人摘要（IG 為月老情境強制帶出，不依 ig_public） */
export type MatchmakerCollectPeer = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  region: string | null;
  interests: string[] | null;
  bioVillage: string | null;
  instagramHandle: string | null;
};

export type CollectFishResult =
  | {
      ok: true;
      fishType: FishType;
      /** 本次抽中的獎勵階級（供開獎 Lottie）；無表或 fallback 時可能為 null */
      rewardTier?: FishingRewardTier | null;
      matchmakerUser?: MatchmakerCollectPeer | null;
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

const MATCHMAKER_PEER_MAILBOX_MESSAGE =
  "🎣 命運之湖有人釣到你了！\n\n有位冒險者透過月老魚池對你感興趣，快去「魚獲」查看吧。";

function matchmakerUserFromPick(
  pick: MatchmakerPoolCandidateRow,
): MatchmakerCollectPeer {
  return {
    id: pick.id,
    nickname: pick.nickname,
    avatar_url: pick.avatar_url,
    region: pick.region,
    interests: pick.interests,
    bioVillage: pick.bio_village,
    instagramHandle: pick.instagram_handle,
  };
}

function notifyMatchmakerPeerCaught(
  fisherUserId: string,
  peerUserId: string,
): Promise<void> {
  return notifyUserMailboxSilent({
    user_id: peerUserId,
    type: "system",
    from_user_id: fisherUserId,
    message: MATCHMAKER_PEER_MAILBOX_MESSAGE,
  });
}

function mergeMatchmakerReleasedIntoFishItem(fishItemJson: Json | null): Json {
  const base =
    fishItemJson &&
    typeof fishItemJson === "object" &&
    !Array.isArray(fishItemJson)
      ? { ...(fishItemJson as Record<string, unknown>) }
      : {};
  return { ...base, matchmakerReleased: true } as Json;
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
  opts?: { dryRun?: boolean },
): Promise<{
  fishCoins: number;
  fishExp: number;
  coinFailure: boolean;
  fishItemJson: Json | null;
  rewardTier: FishingRewardTier | null;
  shopGrantItemId: string | null;
  coinGrantType: "none" | "free" | "premium";
}> {
  const dry = opts?.dryRun === true;
  const reward = await pickMatchmakerRewardFromTable();
  const note = `月老魚：${peerNickname}`;

  if (!reward) {
    const fishCoins = 10;
    const fishExp = 5;
    if (dry) {
      return {
        fishCoins,
        fishExp,
        coinFailure: false,
        fishItemJson: null,
        rewardTier: null,
        shopGrantItemId: null,
        coinGrantType: "free",
      };
    }
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
        shopGrantItemId: null,
        coinGrantType: "free",
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
      shopGrantItemId: null,
      coinGrantType: "free",
    };
  }

  let fishCoins = 0;
  let fishExp = 0;
  let coinFailure = false;
  let fishItemJson: Json | null = null;
  let shopGrantItemId: string | null = null;
  let coinGrantType: "none" | "free" | "premium" = "none";

  switch (reward.reward_type) {
    case "coins_free": {
      coinGrantType = "free";
      const amt = reward.coins_amount ?? 0;
      if (amt > 0) {
        if (dry) {
          fishCoins = amt;
        } else {
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
      }
      break;
    }
    case "coins_premium": {
      coinGrantType = "premium";
      const amt = reward.coins_amount ?? 0;
      if (amt > 0) {
        if (dry) {
          fishCoins = amt;
        } else {
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
      }
      break;
    }
    case "exp": {
      const exp = reward.exp_amount ?? 0;
      if (exp > 0) {
        if (!dry) {
          const expKey = `fishing:${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
          await insertExpLog({
            user_id: userId,
            source: "fishing",
            unique_key: expKey,
            delta: exp,
            delta_exp: exp,
          });
        }
        fishExp = exp;
      }
      break;
    }
    case "shop_item": {
      if (reward.shop_item_id) {
        const item = await findShopItemById(reward.shop_item_id);
        if (item) {
          shopGrantItemId = item.id;
          if (!dry) {
            if (item.item_type === "fishing_bait") {
              await upsertFishingBaitStack(userId, item.id, item.name, 1);
            } else {
              await insertUserReward({
                user_id: userId,
                reward_type: item.item_type,
                shop_item_id: item.id,
                label: item.name,
                is_equipped: false,
                quantity: 1,
              });
            }
          }
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
    shopGrantItemId,
    coinGrantType,
  };
}

async function resolveNonMatchmakerFishRewards(
  userId: string,
  fishType: FishType,
  opts?: { dryRun?: boolean },
): Promise<{
  fishCoins: number;
  fishExp: number;
  coinFailure: boolean;
  fishItemJson: Json | null;
  rewardTier: FishingRewardTier | null;
  shopGrantItemId: string | null;
  coinGrantType: "none" | "free" | "premium";
}> {
  const dry = opts?.dryRun === true;
  const reward = await pickNonMatchmakerRewardFromTable(fishType);
  const note = `釣魚：${fishType}`;

  if (!reward) {
    const fishCoins = 5;
    const fishExp = 3;
    if (dry) {
      return {
        fishCoins,
        fishExp,
        coinFailure: false,
        fishItemJson: null,
        rewardTier: null,
        shopGrantItemId: null,
        coinGrantType: "free",
      };
    }
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
        shopGrantItemId: null,
        coinGrantType: "free",
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
      shopGrantItemId: null,
      coinGrantType: "free",
    };
  }

  let fishCoins = 0;
  let fishExp = 0;
  let coinFailure = false;
  let fishItemJson: Json | null = null;
  let shopGrantItemId: string | null = null;
  let coinGrantType: "none" | "free" | "premium" = "none";

  switch (reward.reward_type) {
    case "coins_free": {
      coinGrantType = "free";
      const amt = reward.coins_amount ?? 0;
      if (amt > 0) {
        if (dry) {
          fishCoins = amt;
        } else {
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
      }
      break;
    }
    case "coins_premium": {
      coinGrantType = "premium";
      const amt = reward.coins_amount ?? 0;
      if (amt > 0) {
        if (dry) {
          fishCoins = amt;
        } else {
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
      }
      break;
    }
    case "exp": {
      const exp = reward.exp_amount ?? 0;
      if (exp > 0) {
        if (!dry) {
          const expKey = `fishing:${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
          await insertExpLog({
            user_id: userId,
            source: "fishing",
            unique_key: expKey,
            delta: exp,
            delta_exp: exp,
          });
        }
        fishExp = exp;
      }
      break;
    }
    case "shop_item": {
      if (reward.shop_item_id) {
        const item = await findShopItemById(reward.shop_item_id);
        if (item) {
          shopGrantItemId = item.id;
          if (!dry) {
            if (item.item_type === "fishing_bait") {
              await upsertFishingBaitStack(userId, item.id, item.name, 1);
            } else {
              await insertUserReward({
                user_id: userId,
                reward_type: item.item_type,
                shop_item_id: item.id,
                label: item.name,
                is_equipped: false,
                quantity: 1,
              });
            }
          }
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
    shopGrantItemId,
    coinGrantType,
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

async function getRodTierCooldownDefaults(): Promise<RodTierCooldownDefaults> {
  const [b, m, h] = await Promise.all([
    findSystemSettingByKey("fishing_rod_cooldown_basic_minutes"),
    findSystemSettingByKey("fishing_rod_cooldown_mid_minutes"),
    findSystemSettingByKey("fishing_rod_cooldown_high_minutes"),
  ]);
  const n = (v: string | null, fb: number) => {
    if (v == null || String(v).trim() === "") return fb;
    const x = Number.parseInt(String(v), 10);
    return Number.isFinite(x) && x >= 0 ? x : fb;
  };
  return {
    basic: n(b, 1440),
    mid: n(m, 720),
    high: n(h, 480),
  };
}

/** 可收竿時間已到且尚未通知：寫入信匣並推播一次。 */
async function maybeNotifyFishingHarvestReady(
  userId: string,
  rodUserRewardId: string,
  waitUntilHarvestMinutes: number,
): Promise<void> {
  const row = await getRodCastState(userId, rodUserRewardId);
  if (!row?.pending_cast_started_at) return;
  if (row.bite_notified_at) return;
  const ready = peekHarvestReady({
    row,
    waitUntilHarvestMinutes,
  });
  if (!ready.ok) return;
  await notifyUserMailboxSilent({
    user_id: userId,
    type: "fishing_bite",
    message: "有魚上鉤了！前往命運之湖收竿吧。",
    from_user_id: null,
    is_read: false,
  });
  await markBiteNotified({ userId, rodUserRewardId });
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

  const tierCooldown = await getRodTierCooldownDefaults();

  const rodCount = await countUserRewardsByType(user.id, "fishing_rod");
  const baitCount = await sumFishingBaitQuantity(user.id);
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
    let pendingHarvestReadyAtIso: string | null = null;
    let cooldownInfo: FishingStatusDto["rods"][number]["cooldownInfo"] = null;
    let pendingBaitName: string | null = null;
    let pendingBaitMetadata: Json | null = null;
    let imageUrl: string | null = null;
    if (r.shop_item_id) {
      const si = await findShopItemById(r.shop_item_id);
      imageUrl = si?.image_url ?? null;
      const rules = parseRodFishingRules(si?.metadata ?? null, {
        tierCooldownMinutes: tierCooldown,
      });
      if (rules) {
        const snap = await getRodCastSnapshot({
          userId: user.id,
          rodUserRewardId: r.id,
          maxPerDay: rules.maxPerDay,
          waitUntilHarvestMinutes: rules.waitUntilHarvestMinutes,
          cooldownAfterCastMinutes: rules.cooldownAfterCastMinutes,
        });
        castsRemainingToday = snap.castsRemainingToday;
        cooldownAfterHarvestRemainingSec = snap.cooldownAfterHarvestRemainingSec;
        hasPendingCast = snap.hasPendingCast;
        pendingHarvestRemainSec = snap.pendingHarvestRemainSec;
        pendingHarvestReadyAtIso = snap.pendingHarvestReadyAtIso;
        cooldownInfo = snap.cooldownInfo;
        if (snap.hasPendingCast && snap.pendingBaitShopItemId) {
          const baitSi = await findShopItemById(snap.pendingBaitShopItemId);
          const bn = baitSi?.name?.trim();
          pendingBaitName = bn || null;
          pendingBaitMetadata = baitSi?.metadata ?? null;
        }
        if (snap.hasPendingCast) {
          await maybeNotifyFishingHarvestReady(
            user.id,
            r.id,
            rules.waitUntilHarvestMinutes,
          );
        }
      }
    }
    rodsOut.push({
      id: r.id,
      name: r.displayName,
      shopItemId: r.shop_item_id,
      imageUrl,
      castsRemainingToday,
      cooldownAfterHarvestRemainingSec,
      hasPendingCast,
      pendingHarvestRemainSec,
      pendingHarvestReadyAtIso,
      cooldownInfo,
      pendingBaitName,
      pendingBaitMetadata,
    });
  }

  const baitsOut = bundle.baits.map((b) => ({
    id: b.id,
    name: b.displayName,
    shopItemId: b.shop_item_id,
    metadata: b.metadata ?? null,
    quantity: b.quantity ?? 1,
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

/** 拋竿：記錄等待收成；釣餌於收成「確認」時才扣（見 confirmHarvestFishAction）。 */
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

  const tierCooldown = await getRodTierCooldownDefaults();
  const rodShop = rodRow.shop_item_id
    ? await findShopItemById(rodRow.shop_item_id)
    : null;
  const rodRules = parseRodFishingRules(rodShop?.metadata ?? null, {
    tierCooldownMinutes: tierCooldown,
  });
  if (!rodRules) {
    return {
      ok: false,
      error:
        "此釣竿 metadata 無效（rod_max_casts_per_day／rod_wait_until_harvest_minutes／rod_cooldown_minutes），請洽管理員。",
    };
  }

  const baitShop = baitRow.shop_item_id
    ? await findShopItemById(baitRow.shop_item_id)
    : null;
  const baitMeta =
    baitShop?.metadata &&
    typeof baitShop.metadata === "object" &&
    !Array.isArray(baitShop.metadata)
      ? (baitShop.metadata as Record<string, unknown>)
      : {};
  if (detectBaitType(baitMeta) === "heart") {
    if (fisher.birth_year == null || fisher.relationship_status !== "single") {
      return { ok: false, error: "need_birth_year" };
    }
  }

  const castRow = await getRodCastState(user.id, rodId);
  const peek = peekCanStartCast({
    row: castRow,
    maxPerDay: rodRules.maxPerDay,
    cooldownAfterCastMinutes: rodRules.cooldownAfterCastMinutes,
  });
  if (!peek.ok) {
    if (peek.error === "pending_harvest") {
      return { ok: false, error: "pending_harvest" };
    }
    if (peek.error === "cooldown") {
      const m = peek.cooldownMinutesLeft ?? 1;
      let nextCastAt: string | undefined;
      if (castRow?.last_cast_at) {
        nextCastAt = new Date(
          new Date(castRow.last_cast_at).getTime() +
            rodRules.cooldownAfterCastMinutes * 60_000,
        ).toISOString();
      }
      return {
        ok: false,
        error: "cooldown_not_ready",
        remainMinutes: m,
        nextCastAt,
      };
    }
    return { ok: false, error: "daily_limit_reached" };
  }

  if (!baitRow.shop_item_id) {
    return { ok: false, error: "魚餌缺少商城商品關聯，無法拋竿。" };
  }

  const baitQty = baitRow.quantity ?? 1;
  if (baitQty < 1) {
    return { ok: false, error: "釣餌數量不足。" };
  }

  /** 與釣竿冷卻對齊：可收竿時間＝拋竿時間＋冷卻分鐘（與再次拋竿解鎖時間相同） */
  const delayMinutes = Math.max(0, rodRules.cooldownAfterCastMinutes);
  const readyIso = new Date(Date.now() + delayMinutes * 60_000).toISOString();

  await setPendingCast({
    userId: user.id,
    rodUserRewardId: rodId,
    baitShopItemId: baitRow.shop_item_id,
    baitUserRewardId: baitId,
    pendingHarvestReadyAtIso: readyIso,
  });

  return { ok: true };
}

type HarvestPreviewPayload = {
  v: 1;
  branch: "standard" | "matchmaker_nomatch" | "matchmaker_peer";
  fishType: FishType;
  rewardTier: FishingRewardTier | null;
  fishCoins: number;
  fishExp: number;
  coinFailure: boolean;
  fishItemJson: Json | null;
  shopGrantItemId: string | null;
  coinGrantType: "none" | "free" | "premium";
  peerUserId: string | null;
  peerNickname: string | null;
  peerAvatarUrl: string | null;
  /** 月老魚預覽用，舊預覽可能無此欄 */
  peerRegion?: string | null;
  peerInterests?: string[] | null;
  peerBioVillage?: string | null;
  peerInstagramHandle?: string | null;
  noMatchFound: boolean;
};

async function runFishingHarvestCore(
  userId: string,
  rodId: string,
  baitShopMetadata: Json | null,
  fisher: UserRow,
  opts?: { previewOnly?: boolean },
): Promise<CollectFishResult> {
  const previewOnly = opts?.previewOnly === true;
  const parsedWeights = parseBaitFishWeightsForHarvest(baitShopMetadata);
  if (!parsedWeights.ok) {
    return { ok: false, error: parsedWeights.error };
  }
  const rolledFish = rollFishTypeFromWeights(parsedWeights.weights);

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
    const {
      fishCoins,
      fishExp,
      coinFailure,
      fishItemJson,
      rewardTier,
      shopGrantItemId,
      coinGrantType,
    } = await resolveNonMatchmakerFishRewards(userId, rolledFish, {
      dryRun: previewOnly,
    });
    revalidateTag(profileCacheTag(userId));
    const collect: CollectFishResult = {
      ok: true,
      fishType: rolledFish,
      rewardTier,
      fishCoins: coinFailure ? 0 : fishCoins,
      fishExp,
    };
    if (previewOnly) {
      const payload: HarvestPreviewPayload = {
        v: 1,
        branch: "standard",
        fishType: rolledFish,
        rewardTier: rewardTier ?? null,
        fishCoins,
        fishExp,
        coinFailure,
        fishItemJson,
        shopGrantItemId,
        coinGrantType,
        peerUserId: null,
        peerNickname: null,
        peerAvatarUrl: null,
        noMatchFound: false,
      };
      await setPendingHarvestPreview({
        userId,
        rodUserRewardId: rodId,
        preview: payload as unknown as Json,
      });
      return collect;
    }
    await tryInsertStandardFishLog(userId, rolledFish, {
      fish_coins: coinFailure ? 0 : fishCoins,
      fish_exp: fishExp,
      fish_item: fishItemJson,
    });
    await finishRod();
    return collect;
  }

  const [ageMax, blocked, keptPeerIds, candidatesRaw, ...lockRaw] =
    await Promise.all([
    getMatchmakerAgeMaxAction(),
    findUserIdsInBlockRelation(userId).then((ids) => new Set(ids)),
    findMatchmakerKeptPeerIds(userId),
    findMatchmakerPoolCandidates(userId),
    findSystemSettingByKey("matchmaker_lock_height"),
    findSystemSettingByKey("matchmaker_height_tall_threshold"),
    findSystemSettingByKey("matchmaker_height_short_threshold"),
    findSystemSettingByKey("matchmaker_lock_diet"),
    findSystemSettingByKey("matchmaker_lock_smoking"),
    findSystemSettingByKey("matchmaker_lock_pets"),
    findSystemSettingByKey("matchmaker_lock_single_parent"),
    findSystemSettingByKey("matchmaker_lock_fertility"),
    findSystemSettingByKey("matchmaker_lock_marriage"),
    findSystemSettingByKey("matchmaker_lock_zodiac"),
    findSystemSettingByKey("matchmaker_lock_v1"),
    findSystemSettingByKey("matchmaker_lock_v3"),
    findSystemSettingByKey("matchmaker_lock_v4"),
    findSystemSettingByKey("matchmaker_v_max_diff"),
  ]);
  const lockSettings: MatchmakerLockSettings = {
    lock_height: lockRaw[0] === "true",
    height_tall_threshold: parseInt(lockRaw[1] ?? "175", 10) || 175,
    height_short_threshold: parseInt(lockRaw[2] ?? "163", 10) || 163,
    lock_diet: lockRaw[3] === "true",
    lock_smoking: lockRaw[4] === "true",
    lock_pets: lockRaw[5] === "true",
    lock_single_parent: lockRaw[6] === "true",
    lock_fertility: lockRaw[7] === "true",
    lock_marriage: lockRaw[8] === "true",
    lock_zodiac: lockRaw[9] === "true",
    lock_v1: lockRaw[10] === "true",
    lock_v3: lockRaw[11] === "true",
    lock_v4: lockRaw[12] === "true",
    v_max_diff: parseInt(lockRaw[13] ?? "2", 10) || 2,
  };

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

  const fisherMP: MatchmakerProfile = {
    gender: fisher.gender,
    orientation: fisher.orientation,
    birth_year: fisher.birth_year,
    region: fisher.region,
    matchmaker_age_mode: fisher.matchmaker_age_mode,
    matchmaker_age_older: fisherAge.matchmaker_age_older,
    matchmaker_age_younger: fisherAge.matchmaker_age_younger,
    matchmaker_region_pref: fisher.matchmaker_region_pref ?? '["all"]',
    diet_type: fisher.diet_type,
    smoking_habit: fisher.smoking_habit,
    accept_smoking: fisher.accept_smoking,
    my_pets: fisher.my_pets,
    accept_pets: fisher.accept_pets,
    has_children: fisher.has_children,
    accept_single_parent: fisher.accept_single_parent,
    fertility_self: fisher.fertility_self,
    fertility_pref: fisher.fertility_pref,
    marriage_view: fisher.marriage_view,
    zodiac: fisher.zodiac,
    exclude_zodiac: fisher.exclude_zodiac,
    v1_money: fisher.v1_money,
    v3_clingy: fisher.v3_clingy,
    v4_conflict: fisher.v4_conflict,
    height_cm: fisher.height_cm,
    pref_height: fisher.pref_height,
  };

  const pool: typeof candidatesRaw = [];
  for (const c of candidatesRaw) {
    if (blocked.has(c.id)) continue;
    if (keptPeerIds.has(c.id)) continue;
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

    const candMP: MatchmakerProfile = {
      gender: c.gender,
      orientation: c.orientation,
      birth_year: c.birth_year,
      region: c.region,
      matchmaker_age_mode: c.matchmaker_age_mode,
      matchmaker_age_older: cAge.matchmaker_age_older,
      matchmaker_age_younger: cAge.matchmaker_age_younger,
      matchmaker_region_pref: c.matchmaker_region_pref ?? '["all"]',
      diet_type: c.diet_type,
      smoking_habit: c.smoking_habit,
      accept_smoking: c.accept_smoking,
      my_pets: c.my_pets,
      accept_pets: c.accept_pets,
      has_children: c.has_children,
      accept_single_parent: c.accept_single_parent,
      fertility_self: c.fertility_self,
      fertility_pref: c.fertility_pref,
      marriage_view: c.marriage_view,
      zodiac: c.zodiac,
      exclude_zodiac: c.exclude_zodiac,
      v1_money: c.v1_money,
      v3_clingy: c.v3_clingy,
      v4_conflict: c.v4_conflict,
      height_cm: c.height_cm,
      pref_height: c.pref_height,
    };
    if (!checkAllMatchmakerLocks(fisherMP, candMP, lockSettings)) continue;

    pool.push(c);
  }

  if (pool.length === 0) {
    revalidateTag(profileCacheTag(userId));
    const collect: CollectFishResult = {
      ok: true,
      fishType: "matchmaker",
      rewardTier: null,
      matchmakerUser: null,
      noMatchFound: true,
    };
    if (previewOnly) {
      const payload: HarvestPreviewPayload = {
        v: 1,
        branch: "matchmaker_nomatch",
        fishType: "matchmaker",
        rewardTier: null,
        fishCoins: 0,
        fishExp: 0,
        coinFailure: false,
        fishItemJson: null,
        shopGrantItemId: null,
        coinGrantType: "none",
        peerUserId: null,
        peerNickname: null,
        peerAvatarUrl: null,
        noMatchFound: true,
      };
      await setPendingHarvestPreview({
        userId,
        rodUserRewardId: rodId,
        preview: payload as unknown as Json,
      });
      return collect;
    }
    await tryInsertMatchmakerLog(userId, {
      fish_user_id: null,
      no_match_found: true,
      fish_coins: null,
      fish_exp: null,
      peer: null,
    });
    await finishRod();
    return collect;
  }

  const pick = pool[Math.floor(Math.random() * pool.length)]!;

  const {
    fishCoins,
    fishExp,
    coinFailure,
    fishItemJson,
    rewardTier,
    shopGrantItemId,
    coinGrantType,
  } = await resolveMatchmakerRewards(userId, pick.nickname, {
    dryRun: previewOnly,
  });

  if (coinFailure) {
    revalidateTag(profileCacheTag(userId));
    const peerFull = await findProfileById(pick.id);
    const collect: CollectFishResult = {
      ok: true,
      fishType: "matchmaker",
      rewardTier,
      matchmakerUser: matchmakerUserFromPick(pick),
      fishCoins: 0,
      fishExp: 0,
    };
    if (previewOnly) {
      const payload: HarvestPreviewPayload = {
        v: 1,
        branch: "matchmaker_peer",
        fishType: "matchmaker",
        rewardTier: rewardTier ?? null,
        fishCoins: 0,
        fishExp: 0,
        coinFailure: true,
        fishItemJson,
        shopGrantItemId,
        coinGrantType,
        peerUserId: pick.id,
        peerNickname: pick.nickname,
        peerAvatarUrl: pick.avatar_url,
        peerRegion: pick.region,
        peerInterests: pick.interests,
        peerBioVillage: pick.bio_village,
        peerInstagramHandle: pick.instagram_handle,
        noMatchFound: false,
      };
      await setPendingHarvestPreview({
        userId,
        rodUserRewardId: rodId,
        preview: payload as unknown as Json,
      });
      return collect;
    }
    await tryInsertMatchmakerLog(userId, {
      fish_user_id: pick.id,
      no_match_found: false,
      fish_coins: 0,
      fish_exp: 0,
      peer: peerFull,
      fish_item: fishItemJson,
    });
    await finishRod();
    return collect;
  }

  revalidateTag(profileCacheTag(userId));

  const peerFull = await findProfileById(pick.id);
  const collect: CollectFishResult = {
    ok: true,
    fishType: "matchmaker",
    rewardTier,
    matchmakerUser: matchmakerUserFromPick(pick),
    fishCoins,
    fishExp,
  };
  if (previewOnly) {
    const payload: HarvestPreviewPayload = {
      v: 1,
      branch: "matchmaker_peer",
      fishType: "matchmaker",
      rewardTier: rewardTier ?? null,
      fishCoins,
      fishExp,
      coinFailure,
      fishItemJson,
      shopGrantItemId,
      coinGrantType,
      peerUserId: pick.id,
      peerNickname: pick.nickname,
      peerAvatarUrl: pick.avatar_url,
      peerRegion: pick.region,
      peerInterests: pick.interests,
      peerBioVillage: pick.bio_village,
      peerInstagramHandle: pick.instagram_handle,
      noMatchFound: false,
    };
    await setPendingHarvestPreview({
      userId,
      rodUserRewardId: rodId,
      preview: payload as unknown as Json,
    });
    return collect;
  }

  await tryInsertMatchmakerLog(userId, {
    fish_user_id: pick.id,
    no_match_found: false,
    fish_coins: fishCoins,
    fish_exp: fishExp,
    peer: peerFull,
    fish_item: fishItemJson,
  });
  await finishRod();

  return collect;
}

async function applyHarvestPreviewPayload(
  userId: string,
  rodId: string,
  p: HarvestPreviewPayload,
  opts?: { matchmakerOutcome?: "collect" | "release" },
): Promise<void> {
  const mmNote = `月老魚：${p.peerNickname ?? ""}`;
  if (p.branch === "standard") {
    const ft = p.fishType;
    const note = `釣魚：${ft}`;
    if (!p.coinFailure && p.fishCoins > 0 && p.coinGrantType === "free") {
      await creditCoins({
        userId,
        coinType: "free",
        amount: p.fishCoins,
        source: "fishing",
        note,
      });
    }
    if (!p.coinFailure && p.fishCoins > 0 && p.coinGrantType === "premium") {
      await creditCoins({
        userId,
        coinType: "premium",
        amount: p.fishCoins,
        source: "fishing",
        note,
      });
    }
    if (p.fishExp > 0) {
      await insertExpLog({
        user_id: userId,
        source: "fishing",
        unique_key: `fishing_commit:${userId}:${rodId}:${Date.now()}`,
        delta: p.fishExp,
        delta_exp: p.fishExp,
      });
    }
    if (p.shopGrantItemId) {
      const item = await findShopItemById(p.shopGrantItemId);
      if (item) {
        if (item.item_type === "fishing_bait") {
          await upsertFishingBaitStack(userId, item.id, item.name, 1);
        } else {
          await insertUserReward({
            user_id: userId,
            reward_type: item.item_type,
            shop_item_id: item.id,
            label: item.name,
            is_equipped: false,
            quantity: 1,
          });
        }
      }
    }
    await tryInsertStandardFishLog(userId, ft, {
      fish_coins: p.coinFailure ? 0 : p.fishCoins,
      fish_exp: p.fishExp,
      fish_item: p.fishItemJson,
    });
    return;
  }
  if (p.branch === "matchmaker_nomatch") {
    await tryInsertMatchmakerLog(userId, {
      fish_user_id: null,
      no_match_found: true,
      fish_coins: null,
      fish_exp: null,
      peer: null,
    });
    return;
  }
  const peerFull = p.peerUserId ? await findProfileById(p.peerUserId) : null;
  if (!p.coinFailure && p.fishCoins > 0 && p.coinGrantType === "free") {
    await creditCoins({
      userId,
      coinType: "free",
      amount: p.fishCoins,
      source: "fishing",
      note: mmNote,
    });
  }
  if (!p.coinFailure && p.fishCoins > 0 && p.coinGrantType === "premium") {
    await creditCoins({
      userId,
      coinType: "premium",
      amount: p.fishCoins,
      source: "fishing",
      note: mmNote,
    });
  }
  if (p.fishExp > 0) {
    await insertExpLog({
      user_id: userId,
      source: "fishing",
      unique_key: `fishing_commit_mm:${userId}:${rodId}:${Date.now()}`,
      delta: p.fishExp,
      delta_exp: p.fishExp,
    });
  }
  if (p.shopGrantItemId) {
    const item = await findShopItemById(p.shopGrantItemId);
    if (item) {
      if (item.item_type === "fishing_bait") {
        await upsertFishingBaitStack(userId, item.id, item.name, 1);
      } else {
        await insertUserReward({
          user_id: userId,
          reward_type: item.item_type,
          shop_item_id: item.id,
          label: item.name,
          is_equipped: false,
          quantity: 1,
        });
      }
    }
  }
  const released = opts?.matchmakerOutcome === "release";
  const fishItemForLog = released
    ? mergeMatchmakerReleasedIntoFishItem(p.fishItemJson)
    : p.fishItemJson;
  await tryInsertMatchmakerLog(userId, {
    fish_user_id: p.peerUserId,
    no_match_found: false,
    fish_coins: p.coinFailure ? 0 : p.fishCoins,
    fish_exp: p.coinFailure ? 0 : p.fishExp,
    peer: peerFull,
    fish_item: fishItemForLog,
  });
  if (p.peerUserId && !released) {
    await notifyMatchmakerPeerCaught(userId, p.peerUserId);
  }
}

async function sharedHarvestGate(
  userId: string,
  rodId: string,
  tierCooldown: RodTierCooldownDefaults,
): Promise<
  | {
      ok: true;
      fisher: UserRow;
      rodRules: NonNullable<ReturnType<typeof parseRodFishingRules>>;
      castRow: NonNullable<Awaited<ReturnType<typeof getRodCastState>>>;
      baitShop: NonNullable<Awaited<ReturnType<typeof findShopItemById>>>;
    }
  | { ok: false; error: string }
> {
  const fisher = await findProfileById(userId);
  if (!fisher) return { ok: false, error: "找不到冒險者資料。" };

  const rodRow = await findUserRewardById(rodId);
  if (!rodRow || rodRow.user_id !== userId || rodRow.reward_type !== "fishing_rod") {
    return { ok: false, error: "釣竿資料無效。" };
  }

  const rodShop = rodRow.shop_item_id
    ? await findShopItemById(rodRow.shop_item_id)
    : null;
  const rodRules = parseRodFishingRules(rodShop?.metadata ?? null, {
    tierCooldownMinutes: tierCooldown,
  });
  if (!rodRules) {
    return {
      ok: false,
      error:
        "此釣竿 metadata 無效（rod_max_casts_per_day／rod_wait_until_harvest_minutes／rod_cooldown_minutes），請洽管理員。",
    };
  }

  const castRow = await getRodCastState(userId, rodId);
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
  if (!baitShop) {
    return { ok: false, error: "魚餌商品資料遺失，請聯絡管理員。" };
  }
  return { ok: true, fisher, rodRules, castRow: castRow!, baitShop };
}

/** 收竿預覽：抽獎結果寫入 pending_harvest_preview，須再呼叫 confirmHarvestFishAction 才入帳。 */
export async function prepareHarvestFishAction(opts?: {
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

  const bundle = await listFishingRodsAndBaits(user.id);
  const rodId = opts?.rodUserRewardId?.trim() || bundle.rods[0]?.id || null;
  if (!rodId) return { ok: false, error: "需要釣竿才能釣魚。" };

  const tierCooldown = await getRodTierCooldownDefaults();
  const gate = await sharedHarvestGate(user.id, rodId, tierCooldown);
  if (!gate.ok) return { ok: false, error: gate.error };

  const previewRow = gate.castRow.pending_harvest_preview;
  if (previewRow != null && typeof previewRow === "object" && !Array.isArray(previewRow)) {
    const prev = previewRow as unknown as HarvestPreviewPayload;
    if (prev.v === 1) {
      return {
        ok: true,
        fishType: prev.fishType,
        rewardTier: prev.rewardTier,
        matchmakerUser:
          prev.peerUserId && prev.peerNickname
            ? {
                id: prev.peerUserId,
                nickname: prev.peerNickname,
                avatar_url: prev.peerAvatarUrl,
                region: prev.peerRegion ?? null,
                interests: prev.peerInterests ?? null,
                bioVillage: prev.peerBioVillage ?? null,
                instagramHandle: prev.peerInstagramHandle ?? null,
              }
            : null,
        noMatchFound: prev.noMatchFound,
        fishCoins: prev.coinFailure ? 0 : prev.fishCoins,
        fishExp: prev.fishExp,
      };
    }
  }

  return runFishingHarvestCore(
    user.id,
    rodId,
    gate.baitShop.metadata ?? null,
    gate.fisher,
    { previewOnly: true },
  );
}

/** 確認收成：依預覽發獎並寫入釣魚日誌。 */
export async function confirmHarvestFishAction(opts?: {
  rodUserRewardId?: string | null;
  /** 月老魚：收入魚獲會通知對方；放生不通知（獎勵相同） */
  matchmakerOutcome?: "collect" | "release";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "請先登入。" };

  const fishingEnabled = await findSystemSettingByKey("fishing_enabled");
  if (fishingEnabled === "false") {
    return { ok: false, error: "fishing_disabled" };
  }

  const bundle = await listFishingRodsAndBaits(user.id);
  const rodId = opts?.rodUserRewardId?.trim() || bundle.rods[0]?.id || null;
  if (!rodId) return { ok: false, error: "需要釣竿才能釣魚。" };

  const castRow = await getRodCastState(user.id, rodId);
  if (!castRow) {
    return { ok: false, error: "沒有待確認的收成，請先收竿預覽。" };
  }
  const raw = castRow.pending_harvest_preview;
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "沒有待確認的收成，請先收竿預覽。" };
  }
  const p = raw as unknown as HarvestPreviewPayload;
  if (p.v !== 1) {
    return { ok: false, error: "收成資料版本異常。" };
  }

  const shopBaitId = castRow.pending_bait_shop_item_id;
  const baitRewardId =
    castRow.pending_bait_user_reward_id ??
    (shopBaitId
      ? await findFishingBaitUserRewardIdForShopItem(user.id, shopBaitId)
      : null);
  if (!baitRewardId) {
    return { ok: false, error: "找不到本次拋竿使用的釣餌，請聯絡管理員。" };
  }

  const baitOwned = await findUserRewardById(baitRewardId);
  if (
    !baitOwned ||
    baitOwned.user_id !== user.id ||
    baitOwned.reward_type !== "fishing_bait" ||
    (baitOwned.quantity ?? 1) < 1
  ) {
    return { ok: false, error: "釣餌不足或已變更，無法確認收成。" };
  }

  const consumed = await decrementBaitOrDeleteForCast(baitRewardId, user.id);
  if (!consumed) {
    return { ok: false, error: "釣餌扣減失敗，請稍後再試。" };
  }

  const baitShopForRefund = shopBaitId
    ? await findShopItemById(shopBaitId)
    : null;

  try {
    await applyHarvestPreviewPayload(user.id, rodId, p, {
      matchmakerOutcome:
        p.branch === "matchmaker_peer"
          ? opts?.matchmakerOutcome ?? "collect"
          : undefined,
    });
    revalidateTag(profileCacheTag(user.id));
    await recordHarvestSuccess({
      userId: user.id,
      rodUserRewardId: rodId,
    });
  } catch (e) {
    console.error("confirmHarvestFishAction:", e);
    if (shopBaitId && baitShopForRefund?.name) {
      try {
        await upsertFishingBaitStack(
          user.id,
          shopBaitId,
          baitShopForRefund.name,
          1,
        );
      } catch (re) {
        console.error("confirmHarvestFishAction bait refund:", re);
      }
    }
    return {
      ok: false,
      error: "收成確認失敗，請稍後再試；若釣餌已還原請重新確認。",
    };
  }

  return { ok: true };
}

/** @deprecated 請改用 prepareHarvestFishAction + confirmHarvestFishAction */
export async function harvestFishAction(opts?: {
  rodUserRewardId?: string | null;
}): Promise<CollectFishResult> {
  return prepareHarvestFishAction(opts);
}

