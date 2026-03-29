"use server";

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileCacheTag } from "@/lib/supabase/get-cached-profile";
import { createClient } from "@/lib/supabase/server";
import {
  findEquippedAvatarFramesByUserIds,
  findEquippedCardFramesByUserIds,
} from "@/lib/repositories/server/rewards.repository";
import { findMarketUsers } from "@/lib/repositories/server/user.repository";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import { calcSkillScore } from "@/lib/utils/matching";

type MySkillsRow = Pick<UserRow, "skills_offer" | "skills_want">;

/** 快取自己的技能資料（跟著 profile cache 一起失效） */
async function getCachedMySkills(userId: string): Promise<MySkillsRow | null> {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("users")
        .select("skills_offer, skills_want")
        .eq("id", userId)
        .single();
      return data as MySkillsRow | null;
    },
    [`my-skills-${userId}`],
    {
      revalidate: 60,
      tags: [profileCacheTag(userId)],
    },
  )();
}

function normalizeTags(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return [];
  return Array.from(new Set(raw.filter(Boolean)));
}

function marketOffersFromUser(user: UserRow): string[] {
  return normalizeTags(user.skills_offer);
}

function marketWantsFromUser(user: UserRow): string[] {
  return normalizeTags(user.skills_want);
}

function intersectNonEmpty(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const setB = new Set(b);
  return a.some((x) => setB.has(x));
}

/**
 * 完美匹配：(**我想要的** ∩ **他提供的**) 與 (**他想要的** ∩ **我提供的**) 皆不為空。
 */
function evaluatePerfectMatch(
  currentUser: UserRow,
  targetUser: UserRow,
): { isPerfectMatch: boolean } {
  const myWants = marketWantsFromUser(currentUser);
  const myOffers = marketOffersFromUser(currentUser);
  const theirWants = marketWantsFromUser(targetUser);
  const theirOffers = marketOffersFromUser(targetUser);

  const isPerfectMatch =
    intersectNonEmpty(myWants, theirOffers) &&
    intersectNonEmpty(theirWants, myOffers);

  return { isPerfectMatch };
}

export type MarketUserWithScores = UserRow & {
  _complementScore: number;
  _similarScore: number;
  isPerfectMatch: boolean;
};

export async function getMarketUsersAction(
  searchQuery?: string,
): Promise<{ ok: boolean; users: MarketUserWithScores[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, users: [] };

  const me = await getCachedMySkills(user.id);
  const meForPerfect = (me ?? {
    skills_offer: [],
    skills_want: [],
  }) as UserRow;

  const getCachedMarketUsers = unstable_cache(
    async () => {
      const base = await findMarketUsers({ currentUserId: user.id });
      const userIds = base.map((u) => u.id);
      const [frameMap, cardFrameMap] = await Promise.all([
        findEquippedAvatarFramesByUserIds(userIds),
        findEquippedCardFramesByUserIds(userIds),
      ]);
      return base.map((u) => {
        const f = frameMap.get(u.id);
        const cf = cardFrameMap.get(u.id);
        return {
          ...u,
          equippedAvatarFrameEffectKey: f?.equippedAvatarFrameEffectKey ?? null,
          equippedAvatarFrameImageUrl: f?.equippedAvatarFrameImageUrl ?? null,
          equippedAvatarFrameLayout: f?.equippedAvatarFrameLayout ?? null,
          equippedCardFrameEffectKey: cf?.equippedCardFrameEffectKey ?? null,
          equippedCardFrameImageUrl: cf?.equippedCardFrameImageUrl ?? null,
          equippedCardFrameLayout: cf?.equippedCardFrameLayout ?? null,
        };
      });
    },
    [`market-${user.id}`],
    { revalidate: 60 },
  );

  let candidates = await getCachedMarketUsers();

  if (searchQuery?.trim()) {
    const q = searchQuery.trim().toLowerCase();
    candidates = candidates.filter(
      (u) =>
        u.nickname?.toLowerCase().includes(q) ||
        u.skills_offer?.some((s) => s.toLowerCase().includes(q)) ||
        u.skills_want?.some((s) => s.toLowerCase().includes(q)),
    );
  }

  const scored: MarketUserWithScores[] = candidates.map((u) => {
    const { complementScore, similarScore } = calcSkillScore(
      me?.skills_want ?? [],
      me?.skills_offer ?? [],
      u.skills_offer ?? [],
      u.skills_want ?? [],
    );
    const { isPerfectMatch } = evaluatePerfectMatch(meForPerfect, u);
    return {
      ...u,
      _complementScore: complementScore,
      _similarScore: similarScore,
      isPerfectMatch,
    };
  });

  scored.sort((a, b) => {
    if (a.isPerfectMatch !== b.isPerfectMatch) {
      return a.isPerfectMatch ? -1 : 1;
    }
    if (b._complementScore !== a._complementScore) {
      return b._complementScore - a._complementScore;
    }
    if (b._similarScore !== a._similarScore) {
      return b._similarScore - a._similarScore;
    }
    return (b.level ?? 1) - (a.level ?? 1);
  });

  return { ok: true, users: scored };
}
