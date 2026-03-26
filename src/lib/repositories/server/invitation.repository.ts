import { createAdminClient } from "@/lib/supabase/admin";
import type {
  InvitationCodeRow,
  InvitationCodeDto,
  UserRow,
} from "@/types/database.types";

const MINI_PROFILE_SELECT = "id, nickname, avatar_url" as const;

export async function findAllInvitationCodes(): Promise<InvitationCodeDto[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("invitation_codes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as InvitationCodeRow[];

  const userIdSet = new Set<string>();
  for (const r of rows) {
    userIdSet.add(r.created_by);
    if (r.used_by) userIdSet.add(r.used_by);
  }
  const userIds = Array.from(userIdSet);

  const profiles: Record<
    string,
    { id: string; nickname: string; avatar_url: string | null }
  > = {};
  if (userIds.length > 0) {
    const { data: users } = await admin
      .from("users")
      .select(MINI_PROFILE_SELECT)
      .in("id", userIds);
    for (const u of (users ?? []) as Pick<
      UserRow,
      "id" | "nickname" | "avatar_url"
    >[]) {
      profiles[u.id] = {
        id: u.id,
        nickname: u.nickname,
        avatar_url: u.avatar_url,
      };
    }
  }

  return rows.map((r) => ({
    ...r,
    creator: profiles[r.created_by],
    user: r.used_by ? profiles[r.used_by] : undefined,
  }));
}

export async function findInvitationByCode(
  code: string,
): Promise<InvitationCodeRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invitation_codes")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return (data as InvitationCodeRow) ?? null;
}

export async function insertInvitationCode(payload: {
  code: string;
  created_by: string;
  expires_at: string | null;
  note: string | null;
}): Promise<InvitationCodeRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invitation_codes")
    .insert({
      code: payload.code,
      created_by: payload.created_by,
      expires_at: payload.expires_at,
      note: payload.note,
    })
    .select()
    .single();
  if (error) throw error;
  return data as InvitationCodeRow;
}

export async function insertInvitationCodes(
  codes: Array<{
    code: string;
    created_by: string;
    expires_at: string | null;
    note: string | null;
  }>,
): Promise<InvitationCodeRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invitation_codes")
    .insert(codes)
    .select();
  if (error) throw error;
  return (data ?? []) as InvitationCodeRow[];
}

export async function revokeInvitationCode(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("invitation_codes")
    .update({ is_revoked: true })
    .eq("id", id);
  if (error) throw error;
}

export async function revokeUnusedInvitationCodes(
  ids: string[],
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("invitation_codes")
    .update({ is_revoked: true })
    .in("id", ids)
    .is("used_by", null);
  if (error) throw error;
}

export async function claimInvitationCode(
  code: string,
  userId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("invitation_codes")
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq("code", code)
    .is("used_by", null)
    .eq("is_revoked", false);
  if (error) {
    console.error("claimInvitationCode failed:", error);
  }
}

export type InvitationTreeNode = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  invited_by: string | null;
  created_at: string;
  level: number;
};

export async function findInvitationTree(): Promise<InvitationTreeNode[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id, nickname, avatar_url, invited_by, created_at, level")
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as InvitationTreeNode[];
}

export async function findSystemSettingByKey(
  key: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) {
    console.error("findSystemSettingByKey failed:", error);
    return null;
  }
  return data?.value ?? null;
}
