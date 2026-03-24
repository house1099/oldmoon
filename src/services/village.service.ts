"use server";

import { createClient } from "@/lib/supabase/server";
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

  const candidates = await findVillageUsers({
    currentUserId: user.id,
    region: me.region,
  });

  const filtered = candidates.filter((u) =>
    isOrientationMatch(
      me.gender ?? "",
      me.orientation ?? "",
      u.gender ?? "",
      u.orientation ?? "",
    ),
  );

  const scored: VillageUserWithScore[] = filtered.map((u) => ({
    ...u,
    _score: calcInterestScore(me.interests ?? [], u.interests ?? []),
  }));
  scored.sort((a, b) => b._score - a._score);

  return { ok: true, users: scored };
}
