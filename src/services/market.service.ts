"use server";

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { profileCacheTag } from "@/lib/supabase/get-cached-profile";
import { createClient } from "@/lib/supabase/server";
import {
  findEquippedAvatarFramesByUserIds,
  findEquippedCardFramesByUserIds,
  findEquippedTitlesByUserIds,
} from "@/lib/repositories/server/rewards.repository";
import { findMarketUsers } from "@/lib/repositories/server/user.repository";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import type { ShopFrameLayout } from "@/lib/utils/avatar-frame-layout";
import type { CardDecorationConfig } from "@/lib/utils/card-decoration";
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

export type MarketUserWithScores = UserRow & {
  _complementScore: number;
  _similarScore: number;
  isPerfectMatch: boolean;
  equippedTitle: string | null;
  equippedTitleImageUrl: string | null;
  equippedAvatarFrameEffectKey: string | null;
  equippedAvatarFrameImageUrl: string | null;
  equippedAvatarFrameLayout: ShopFrameLayout | null;
  equippedCardFrameEffectKey: string | null;
  equippedCardFrameImageUrl: string | null;
  equippedCardFrameLayout: ShopFrameLayout | null;
  cardDecoration: CardDecorationConfig;
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

  const getCachedMarketUsers = unstable_cache(
    async () => {
      const base = await findMarketUsers({ currentUserId: user.id });
      const userIds = base.map((u) => u.id);
      const [frameMap, cardFrameMap, titleMap] = await Promise.all([
        findEquippedAvatarFramesByUserIds(userIds),
        findEquippedCardFramesByUserIds(userIds),
        findEquippedTitlesByUserIds(userIds),
      ]);
      return base.map((u) => {
        const f = frameMap.get(u.id);
        const deco = cardFrameMap.get(u.id);
        const t = titleMap.get(u.id);
        return {
          ...u,
          equippedTitle: t?.equippedTitle ?? null,
          equippedTitleImageUrl: t?.equippedTitleImageUrl ?? null,
          equippedAvatarFrameEffectKey: f?.equippedAvatarFrameEffectKey ?? null,
          equippedAvatarFrameImageUrl: f?.equippedAvatarFrameImageUrl ?? null,
          equippedAvatarFrameLayout: f?.equippedAvatarFrameLayout ?? null,
          equippedCardFrameEffectKey: deco?.cardFrameEffectKey ?? null,
          equippedCardFrameImageUrl: deco?.cardFrameImageUrl ?? null,
          equippedCardFrameLayout: deco?.cardFrameLayout ?? null,
          cardDecoration: deco ?? {},
        };
      });
    },
    [`market-v4-${user.id}`],
    { revalidate: 300 },
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

  const myWant = me?.skills_want ?? [];
  const myOffer = me?.skills_offer ?? [];

  const scored: MarketUserWithScores[] = candidates.map((u) => {
    const { complementScore, similarScore } = calcSkillScore(
      myWant,
      myOffer,
      u.skills_offer ?? [],
      u.skills_want ?? [],
    );
    const isPerfectMatch = complementScore >= 2;
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
    const levelDiff = (b.level ?? 1) - (a.level ?? 1);
    if (levelDiff !== 0) return levelDiff;
    return (b.total_exp ?? 0) - (a.total_exp ?? 0);
  });

  return { ok: true, users: scored };
}
