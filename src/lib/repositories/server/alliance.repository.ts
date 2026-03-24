import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export type AllianceRow = Database["public"]["Tables"]["alliances"]["Row"];
export type AllianceInsert = Database["public"]["Tables"]["alliances"]["Insert"];
export type AllianceUpdate = Database["public"]["Tables"]["alliances"]["Update"];

export async function findAllianceById(id: string): Promise<AllianceRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("alliances")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as AllianceRow | null;
}

export async function findAllianceBetween(
  userIdA: string,
  userIdB: string,
): Promise<AllianceRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("alliances")
    .select("*")
    .or(
      `and(user_a.eq.${userIdA},user_b.eq.${userIdB}),and(user_a.eq.${userIdB},user_b.eq.${userIdA})`,
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as AllianceRow | null;
}

export async function insertAlliance(payload: AllianceInsert): Promise<AllianceRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("alliances")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AllianceRow;
}

export async function updateAlliance(
  id: string,
  patch: AllianceUpdate,
): Promise<AllianceRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("alliances")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AllianceRow;
}

/** `dissolved` 後再次申請：重設為 pending 並改由目前使用者發起 */
export async function reactivateAllianceFromDissolved(
  id: string,
  initiatedByUserId: string,
): Promise<AllianceRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("alliances")
    .update({
      status: "pending",
      initiated_by: initiatedByUserId,
    } as AllianceUpdate)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as AllianceRow;
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
    .from("alliances")
    .select(
      `
      id,
      user_a,
      user_b,
      a_user:users!alliances_user_a_fkey(id, nickname, avatar_url, instagram_handle),
      b_user:users!alliances_user_b_fkey(id, nickname, avatar_url, instagram_handle)
    `,
    )
    .eq("status", "accepted")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as {
    id: string;
    user_a: string;
    user_b: string;
    a_user: UserMini | null;
    b_user: UserMini | null;
  }[];

  return rows.map((r) => {
    const partner =
      r.user_a === userId ? r.b_user ?? null : r.a_user ?? null;
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
    .from("alliances")
    .select(
      `
      id,
      user_a,
      user_b,
      initiated_by,
      requester:users!alliances_initiated_by_fkey(id, nickname, avatar_url, instagram_handle)
    `,
    )
    .eq("status", "pending")
    .neq("initiated_by", userId)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

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
