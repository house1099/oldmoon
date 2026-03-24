import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export type UserAllianceRow = Database["public"]["Tables"]["user_alliances"]["Row"];
export type UserAllianceInsert =
  Database["public"]["Tables"]["user_alliances"]["Insert"];

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function findUserAllianceById(
  id: string,
): Promise<UserAllianceRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_alliances")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as UserAllianceRow | null;
}

export async function findUserAllianceBetween(
  userIdA: string,
  userIdB: string,
): Promise<UserAllianceRow | null> {
  const [low, high] = orderedPair(userIdA, userIdB);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_alliances")
    .select("*")
    .eq("user_low", low)
    .eq("user_high", high)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as UserAllianceRow | null;
}

export async function insertUserAlliance(
  payload: UserAllianceInsert,
): Promise<UserAllianceRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_alliances")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as UserAllianceRow;
}

export async function updateUserAlliance(
  id: string,
  patch: Database["public"]["Tables"]["user_alliances"]["Update"],
): Promise<UserAllianceRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_alliances")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as UserAllianceRow;
}

type UserMini = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  instagram_handle: string | null;
};

export async function findAcceptedAlliancesWithPartners(
  userId: string,
): Promise<{ id: string; partner: UserMini }[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_alliances")
    .select(
      `
      id,
      user_low,
      user_high,
      low_user:users!user_alliances_user_low_fkey(id, nickname, avatar_url, instagram_handle),
      high_user:users!user_alliances_user_high_fkey(id, nickname, avatar_url, instagram_handle)
    `,
    )
    .eq("status", "accepted")
    .or(`user_low.eq.${userId},user_high.eq.${userId}`);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as {
    id: string;
    user_low: string;
    user_high: string;
    low_user: UserMini | null;
    high_user: UserMini | null;
  }[];

  return rows.map((r) => {
    const partner =
      r.user_low === userId ? r.high_user ?? null : r.low_user ?? null;
    return {
      id: r.id,
      partner: partner ?? {
        id: "",
        nickname: "?",
        avatar_url: null,
        instagram_handle: null,
      },
    };
  });
}

export async function findPendingIncomingWithRequester(
  userId: string,
): Promise<{ id: string; requester: UserMini }[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_alliances")
    .select(
      `
      id,
      user_low,
      user_high,
      initiated_by,
      requester:users!user_alliances_initiated_by_fkey(id, nickname, avatar_url, instagram_handle)
    `,
    )
    .eq("status", "pending")
    .neq("initiated_by", userId)
    .or(`user_low.eq.${userId},user_high.eq.${userId}`);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as {
    id: string;
    requester: UserMini | null;
  }[];

  return rows.map((r) => ({
    id: r.id,
    requester: r.requester ?? {
      id: "",
      nickname: "?",
      avatar_url: null,
      instagram_handle: null,
    },
  }));
}
