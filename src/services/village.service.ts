"use server";

import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  findEquippedAvatarFramesByUserIds,
  findEquippedCardFramesByUserIds,
  findEquippedTitlesByUserIds,
} from "@/lib/repositories/server/rewards.repository";
import {
  findVillageStaffUsersGlobally,
  findVillageUsers,
} from "@/lib/repositories/server/user.repository";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import type { CardDecorationConfig } from "@/lib/utils/card-decoration";
import type { ShopFrameLayout } from "@/lib/utils/avatar-frame-layout";
import { calcInterestScore, isOrientationMatch } from "@/lib/utils/matching";

export type VillageUserWithScore = UserRow & {
  _score: number;
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

export async function getVillageUsersAction(): Promise<{
  ok: boolean;
  users: VillageUserWithScore[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, users: [] };

  const { data: me } = await supabase
    .from("users")
    .select("gender, orientation, region, interests")
    .eq("id", user.id)
    .single();

  const regionKey = me?.region ?? "__no_region__";

  const getCachedVillageUsers = unstable_cache(
    async () => {
      const [localRows, staffRows] = await Promise.all([
        me?.region
          ? findVillageUsers({
              currentUserId: user.id,
              region: me.region,
            })
          : Promise.resolve([]),
        findVillageStaffUsersGlobally({ currentUserId: user.id }),
      ]);
      const byId = new Map<string, UserRow>();
      for (const u of localRows) byId.set(u.id, u);
      for (const u of staffRows) byId.set(u.id, u);
      const candidates = Array.from(byId.values());
      const userIds = candidates.map((u) => u.id);
      const [frameMap, cardFrameMap, titleMap] = await Promise.all([
        findEquippedAvatarFramesByUserIds(userIds),
        findEquippedCardFramesByUserIds(userIds),
        findEquippedTitlesByUserIds(userIds),
      ]);
      const withFrames = candidates.map((u) => {
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
      // Layer 3：`master`／`moderator` 略過性向篩選（全站可見、方便聯絡）；其餘雙向 isOrientationMatch
      const filtered = withFrames.filter((u) => {
        if (u.role === "master" || u.role === "moderator") return true;
        return isOrientationMatch(
          me?.gender ?? "",
          me?.orientation ?? "",
          u.gender ?? "",
          u.orientation ?? "",
        );
      });
      const myInterests = me?.interests ?? [];
      const scored: VillageUserWithScore[] = filtered.map((u) => ({
        ...u,
        _score: calcInterestScore(myInterests, u.interests ?? []),
      }));
      const roleTier = (role: string | null | undefined) =>
        role === "master" ? 0 : role === "moderator" ? 1 : 2;
      scored.sort((a, b) => {
        const ta = roleTier(a.role);
        const tb = roleTier(b.role);
        if (ta !== tb) return ta - tb;
        // 營運不比興趣分：領袖／管理員內依 level，再以 id 穩定次序
        if (ta <= 1) {
          const lv = (b.level ?? 1) - (a.level ?? 1);
          if (lv !== 0) return lv;
          return a.id.localeCompare(b.id);
        }
        if (b._score !== a._score) return b._score - a._score;
        return (b.level ?? 1) - (a.level ?? 1);
      });
      return scored;
    },
    // 版本後綴：欄位（如 offline_ok）變更時使舊快取失效
    [`village-v6-${user.id}-${regionKey}`],
    { revalidate: 300 },
  );

  const users = await getCachedVillageUsers();
  return { ok: true, users };
}
