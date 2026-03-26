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
  role: string;
};

export async function findAcceptedAlliancesWithPartners(
  userId: string,
): Promise<{ id: string; partner: UserMini }[]> {
  const admin = createAdminClient();

  const { data: alliances, error } = await admin
    .from("alliances")
    .select("id, user_a, user_b, status, created_at")
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .eq("status", "accepted")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }
  if (!alliances?.length) {
    return [];
  }

  const enriched = await Promise.all(
    alliances.map(async (a) => {
      const partnerId = a.user_a === userId ? a.user_b : a.user_a;
      const { data: partner } = await admin
        .from("users")
        .select("id, nickname, avatar_url, instagram_handle, role")
        .eq("id", partnerId)
        .single();
      return {
        id: a.id,
        partner: partner ?? {
          id: partnerId,
          nickname: "?",
          avatar_url: null,
          instagram_handle: null,
          role: "member",
        },
      };
    }),
  );

  return enriched;
}

export async function findPendingIncomingWithRequester(
  userId: string,
): Promise<{ id: string; requester: UserMini }[]> {
  const admin = createAdminClient();

  const { data: alliances, error } = await admin
    .from("alliances")
    .select("id, user_a, user_b, initiated_by, created_at")
    .eq("status", "pending")
    .neq("initiated_by", userId)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }
  if (!alliances?.length) {
    return [];
  }

  const enriched = await Promise.all(
    alliances.map(async (a) => {
      const { data: requester } = await admin
        .from("users")
        .select("id, nickname, avatar_url, instagram_handle, role")
        .eq("id", a.initiated_by)
        .single();
      return {
        id: a.id,
        requester: requester ?? {
          id: a.initiated_by,
          nickname: "?",
          avatar_url: null,
          instagram_handle: null,
          role: "member",
        },
      };
    }),
  );

  return enriched;
}
