"use server";

import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileCacheTag } from "@/lib/supabase/get-cached-profile";
import { findUserIdsInBlockRelation } from "@/lib/repositories/server/chat.repository";
import { insertExpLog } from "@/lib/repositories/server/exp.repository";
import { creditCoins } from "@/lib/repositories/server/coin.repository";
import {
  countUserRewardsByType,
  deleteUserRewardForOwner,
  findFirstUserRewardIdOfType,
} from "@/lib/repositories/server/rewards.repository";
import {
  findMatchmakerPoolCandidates,
  findProfileById,
} from "@/lib/repositories/server/user.repository";
import { getMatchmakerAgeMaxAction } from "@/services/system-settings.action";
import { isAgeMatch, isRegionMatch } from "@/lib/utils/matchmaker-region";

export type FishingPhase = "no_rod" | "no_bait" | "can_cast";

export type FishingStatusDto = {
  phase: FishingPhase;
  rodCount: number;
  baitCount: number;
};

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

function clampAgeFields(older: number, younger: number, ageMax: number) {
  return {
    matchmaker_age_older: Math.min(older, ageMax),
    matchmaker_age_younger: Math.min(younger, ageMax),
  };
}

/** 釣魚列狀態（未登入時視為無釣竿） */
export async function getFishingStatusAction(): Promise<FishingStatusDto> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { phase: "no_rod", rodCount: 0, baitCount: 0 };
  }

  const rodCount = await countUserRewardsByType(user.id, "fishing_rod");
  const baitCount = await countUserRewardsByType(user.id, "fishing_bait");
  if (rodCount < 1) {
    return { phase: "no_rod", rodCount, baitCount };
  }
  if (baitCount < 1) {
    return { phase: "no_bait", rodCount, baitCount };
  }
  return { phase: "can_cast", rodCount, baitCount };
}

export async function collectFishAction(): Promise<CollectFishResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "請先登入。" };

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
    return {
      ok: true,
      fishType: "matchmaker",
      matchmakerUser: null,
      noMatchFound: true,
    };
  }

  const pick = pool[Math.floor(Math.random() * pool.length)]!;
  const fishCoins = 8 + Math.floor(Math.random() * 8);
  const fishExp = 4 + Math.floor(Math.random() * 6);

  const coinResult = await creditCoins({
    userId: user.id,
    coinType: "free",
    amount: fishCoins,
    source: "loot_box",
    note: `月老魚：${pick.nickname}`,
  });
  if (!coinResult.success) {
    revalidateTag(profileCacheTag(user.id));
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

  const expKey = `matchmaker_fish:${user.id}:${Date.now()}:${pick.id}:${Math.random().toString(36).slice(2)}`;
  await insertExpLog({
    user_id: user.id,
    source: "matchmaker_fish",
    unique_key: expKey,
    delta: fishExp,
    delta_exp: fishExp,
  });

  revalidateTag(profileCacheTag(user.id));

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
