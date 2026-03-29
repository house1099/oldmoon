"use server";

import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { findEquippedAvatarFramesByUserIds } from "@/lib/repositories/server/rewards.repository";
import { findVillageUsers } from "@/lib/repositories/server/user.repository";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import { calcInterestScore, isOrientationMatch } from "@/lib/utils/matching";

export type VillageUserWithScore = UserRow & { _score: number };

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

  if (!me?.region) return { ok: true, users: [] };

  const getCachedVillageUsers = unstable_cache(
    async () => {
      const candidates = await findVillageUsers({
        currentUserId: user.id,
        region: me.region,
      });
      const frameMap = await findEquippedAvatarFramesByUserIds(
        candidates.map((u) => u.id),
      );
      const withFrames = candidates.map((u) => {
        const f = frameMap.get(u.id);
        return {
          ...u,
          equippedAvatarFrameEffectKey: f?.equippedAvatarFrameEffectKey ?? null,
          equippedAvatarFrameImageUrl: f?.equippedAvatarFrameImageUrl ?? null,
          equippedAvatarFrameLayout: f?.equippedAvatarFrameLayout ?? null,
        };
      });
      const filtered = withFrames.filter((u) =>
        isOrientationMatch(
          me.gender ?? "",
          me.orientation ?? "",
          u.gender ?? "",
          u.orientation ?? "",
        ),
      );
      const myInterests = me.interests ?? [];
      const scored: VillageUserWithScore[] = filtered.map((u) => ({
        ...u,
        _score: calcInterestScore(myInterests, u.interests ?? []),
      }));
      scored.sort((a, b) => {
        const aIsStaff = a.role === "master" || a.role === "moderator";
        const bIsStaff = b.role === "master" || b.role === "moderator";
        if (aIsStaff && !bIsStaff) return -1;
        if (!aIsStaff && bIsStaff) return 1;
        if (b._score !== a._score) return b._score - a._score;
        return (b.level ?? 1) - (a.level ?? 1);
      });
      return scored;
    },
    [`village-${user.id}-${me.region}`],
    { revalidate: 30 },
  );

  const users = await getCachedVillageUsers();
  return { ok: true, users };
}
