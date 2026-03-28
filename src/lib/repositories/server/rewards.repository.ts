import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, UserRewardRow } from "@/types/database.types";

type UserRewardUpdate = Database["public"]["Tables"]["user_rewards"]["Update"];
type BroadcastInsert = Database["public"]["Tables"]["broadcasts"]["Insert"];

export type UserRewardWithEffect = UserRewardRow & {
  effect_key: string | null;
};

/** 相容舊庫曾用 reward_ref_id；effect_key 僅在 prize_items */
type RawUserRewardRow = UserRewardRow & { reward_ref_id?: string | null };

function prizeItemRefId(row: RawUserRewardRow): string | null {
  return row.item_ref_id ?? row.reward_ref_id ?? null;
}

export async function findMyRewards(
  userId: string,
): Promise<UserRewardWithEffect[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_rewards")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as RawUserRewardRow[];

  const itemIds = Array.from(
    new Set(rows.map(prizeItemRefId).filter((id): id is string => Boolean(id))),
  );
  const effectByItemId = new Map<string, string | null>();
  if (itemIds.length > 0) {
    const { data: items, error: itemErr } = await admin
      .from("prize_items")
      .select("id, effect_key")
      .in("id", itemIds);
    if (itemErr) throw itemErr;
    for (const it of items ?? []) {
      effectByItemId.set(it.id as string, (it.effect_key as string | null) ?? null);
    }
  }

  return rows.map((row) => {
    const refId = prizeItemRefId(row);
    return {
      id: row.id,
      user_id: row.user_id,
      reward_type: row.reward_type,
      item_ref_id: refId,
      label: row.label,
      is_equipped: row.is_equipped,
      used_at: row.used_at,
      created_at: row.created_at,
      effect_key: refId ? (effectByItemId.get(refId) ?? null) : null,
    };
  });
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
    .select("*")
    .eq("user_id", userId)
    .eq("is_equipped", true)
    .in("reward_type", ["title", "avatar_frame", "card_frame"]);
  if (error) throw error;
  const list = (data ?? []) as RawUserRewardRow[];

  const itemIds = Array.from(
    new Set(
      list.map(prizeItemRefId).filter((id): id is string => Boolean(id)),
    ),
  );
  const effectByItemId = new Map<string, string | null>();
  if (itemIds.length > 0) {
    const { data: items, error: itemErr } = await admin
      .from("prize_items")
      .select("id, effect_key")
      .in("id", itemIds);
    if (itemErr) throw itemErr;
    for (const it of items ?? []) {
      effectByItemId.set(it.id as string, (it.effect_key as string | null) ?? null);
    }
  }

  let equippedTitle: string | null = null;
  let equippedFrame: string | null = null;
  let equippedAvatarFrameEffectKey: string | null = null;
  let equippedCardFrameEffectKey: string | null = null;
  for (const row of list) {
    const rt = row.reward_type;
    const lb = row.label?.trim() || null;
    const refId = prizeItemRefId(row);
    const ek = refId
      ? effectByItemId.get(refId)?.trim() || null
      : null;
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
