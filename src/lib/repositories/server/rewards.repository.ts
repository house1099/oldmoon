import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, UserRewardRow } from "@/types/database.types";

type UserRewardUpdate = Database["public"]["Tables"]["user_rewards"]["Update"];
type BroadcastInsert = Database["public"]["Tables"]["broadcasts"]["Insert"];

export type UserRewardWithEffect = UserRewardRow & {
  effect_key: string | null;
};

type UserRewardJoined = UserRewardRow & {
  prize_items: { effect_key: string | null } | null;
};

function flattenUserReward(row: UserRewardJoined): UserRewardWithEffect {
  const { prize_items: pi, ...rest } = row;
  return {
    ...(rest as UserRewardRow),
    effect_key: pi?.effect_key ?? null,
  };
}

export async function findMyRewards(
  userId: string,
): Promise<UserRewardWithEffect[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select(
      `*, prize_items!user_rewards_item_ref_id_fkey ( effect_key )`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => flattenUserReward(r as UserRewardJoined));
}

export async function findUserRewardById(
  rewardId: string,
): Promise<UserRewardRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select("*")
    .eq("id", rewardId)
    .maybeSingle();
  if (error) throw error;
  return (data as UserRewardRow) ?? null;
}

export async function equipReward(rewardId: string): Promise<void> {
  const admin = createAdminClient();
  const patch: UserRewardUpdate = { is_equipped: true };
  const { error } = await admin
    .from("user_rewards")
    .update(patch)
    .eq("id", rewardId);
  if (error) throw error;
}

export async function unequipReward(rewardId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_rewards")
    .update({ is_equipped: false })
    .eq("id", rewardId);
  if (error) throw error;
}

export async function unequipAllOfType(
  userId: string,
  rewardType: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_rewards")
    .update({ is_equipped: false })
    .eq("user_id", userId)
    .eq("reward_type", rewardType);
  if (error) throw error;
}

export async function markBroadcastUsed(rewardId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_rewards")
    .update({ used_at: new Date().toISOString() })
    .eq("id", rewardId);
  if (error) throw error;
}

export async function insertBroadcast(
  data: Omit<BroadcastInsert, "id" | "created_at" | "expires_at"> & {
    expires_at?: string;
  },
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("broadcasts").insert(data);
  if (error) throw error;
}

export type ActiveBroadcastRow = {
  id: string;
  message: string;
  nickname: string;
  created_at: string;
};

export async function findActiveBroadcasts(): Promise<ActiveBroadcastRow[]> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: rows, error } = await admin
    .from("broadcasts")
    .select("id, message, created_at, user_id")
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  const list = rows ?? [];
  if (list.length === 0) return [];

  const userIds = Array.from(
    new Set(list.map((r) => r.user_id as string)),
  );
  const { data: users, error: uerr } = await admin
    .from("users")
    .select("id, nickname")
    .in("id", userIds);
  if (uerr) throw uerr;
  const nick = new Map(
    (users ?? []).map((u) => [
      u.id as string,
      ((u.nickname as string) ?? "—").trim() || "—",
    ]),
  );

  return list.map((r) => ({
    id: r.id as string,
    message: r.message as string,
    created_at: r.created_at as string,
    nickname: nick.get(r.user_id as string) ?? "—",
  }));
}

export async function findEquippedRewardLabels(userId: string): Promise<{
  equippedTitle: string | null;
  equippedFrame: string | null;
  equippedAvatarFrameEffectKey: string | null;
  equippedCardFrameEffectKey: string | null;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select(
      `reward_type, label, prize_items!user_rewards_item_ref_id_fkey ( effect_key )`,
    )
    .eq("user_id", userId)
    .eq("is_equipped", true)
    .in("reward_type", ["title", "avatar_frame", "card_frame"]);
  if (error) throw error;
  let equippedTitle: string | null = null;
  let equippedFrame: string | null = null;
  let equippedAvatarFrameEffectKey: string | null = null;
  let equippedCardFrameEffectKey: string | null = null;
  for (const row of data ?? []) {
    const rt = row.reward_type as string;
    const lb = (row.label as string)?.trim() || null;
    const joined = row as {
      prize_items?: { effect_key: string | null } | null;
    };
    const ek = joined.prize_items?.effect_key?.trim() || null;
    if (rt === "title" && lb) equippedTitle = lb;
    if (rt === "avatar_frame" && lb) {
      equippedFrame = lb;
      equippedAvatarFrameEffectKey = ek;
    }
    if (rt === "card_frame" && lb) {
      equippedCardFrameEffectKey = ek;
    }
  }
  return {
    equippedTitle,
    equippedFrame,
    equippedAvatarFrameEffectKey,
    equippedCardFrameEffectKey,
  };
}
