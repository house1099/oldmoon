import { createAdminClient } from "@/lib/supabase/admin";
import type {
  InvitationCodeRow,
  InvitationCodeDto,
  InvitationCodeUseRow,
  UserRow,
} from "@/types/database.types";

const MINI_PROFILE_SELECT = "id, nickname, avatar_url" as const;

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function isInvitationValidRow(row: InvitationCodeRow): boolean {
  if (row.is_revoked) return false;
  if (row.use_count >= row.max_uses) return false;
  if (row.expires_at && new Date(row.expires_at) <= new Date()) return false;
  return true;
}

/** 依字串查詢列（不論是否仍可使用；產碼撞碼檢查用） */
export async function findInvitationRowByCode(
  code: string,
): Promise<InvitationCodeRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invitation_codes")
    .select("*")
    .eq("code", normalizeCode(code))
    .maybeSingle();
  if (error) throw error;
  return (data as InvitationCodeRow) ?? null;
}

/**
 * 驗證邀請碼是否有效。
 * 有效條件：is_revoked = false、use_count < max_uses、expires_at 為空或未過期。
 */
export async function findInvitationByCode(
  code: string,
): Promise<InvitationCodeRow | null> {
  const row = await findInvitationRowByCode(code);
  if (!row || !isInvitationValidRow(row)) return null;
  return row;
}

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

  const codeIds = rows.map((r) => r.id);
  const latestUseByCodeId = new Map<
    string,
    { used_by: string; used_at: string }
  >();
  if (codeIds.length > 0) {
    const { data: usesRows, error: usesErr } = await admin
      .from("invitation_code_uses")
      .select("code_id, used_by, used_at")
      .in("code_id", codeIds)
      .order("used_at", { ascending: false });
    if (usesErr) throw usesErr;
    for (const u of (usesRows ?? []) as Pick<
      InvitationCodeUseRow,
      "code_id" | "used_by" | "used_at"
    >[]) {
      if (!latestUseByCodeId.has(u.code_id)) {
        latestUseByCodeId.set(u.code_id, {
          used_by: u.used_by,
          used_at: u.used_at,
        });
        userIdSet.add(u.used_by);
      }
    }
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

  return rows.map((r) => {
    const latest = latestUseByCodeId.get(r.id);
    return {
      ...r,
      creator: profiles[r.created_by],
      user: latest ? profiles[latest.used_by] : undefined,
    };
  });
}

export async function insertInvitationCode(payload: {
  code: string;
  created_by: string;
  expires_at: string | null;
  note: string | null;
  max_uses?: number;
}): Promise<InvitationCodeRow> {
  const admin = createAdminClient();
  const maxUses = payload.max_uses ?? 1;
  const { data, error } = await admin
    .from("invitation_codes")
    .insert({
      code: payload.code,
      created_by: payload.created_by,
      expires_at: payload.expires_at,
      note: payload.note,
      max_uses: maxUses,
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
    max_uses?: number;
  }>,
): Promise<InvitationCodeRow[]> {
  const admin = createAdminClient();
  const rows = codes.map((c) => ({
    code: c.code,
    created_by: c.created_by,
    expires_at: c.expires_at,
    note: c.note,
    max_uses: c.max_uses ?? 1,
  }));
  const { data, error } = await admin.from("invitation_codes").insert(rows).select();
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
    .eq("use_count", 0);
  if (error) throw error;
}

type ClaimRpcResult = {
  success?: boolean;
  error?: string;
  invited_by?: string;
};

export async function claimInvitationCode(params: {
  code: string;
  userId: string;
}): Promise<{ success: boolean; error?: string; invitedBy?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_invitation_code", {
    p_code: normalizeCode(params.code),
    p_user_id: params.userId,
  });
  if (error) {
    console.error("claimInvitationCode rpc failed:", error);
    return { success: false, error: error.message };
  }
  const parsed = data as ClaimRpcResult | null;
  if (!parsed || typeof parsed.success !== "boolean") {
    return { success: false, error: "邀請碼核銷回應異常" };
  }
  if (!parsed.success) {
    return { success: false, error: parsed.error ?? "邀請碼核銷失敗" };
  }
  return {
    success: true,
    invitedBy: parsed.invited_by,
  };
}

export async function findInvitationUsesByCodeId(
  codeId: string,
): Promise<
  (InvitationCodeUseRow & {
    user: { nickname: string; avatar_url: string | null; created_at: string };
  })[]
> {
  const admin = createAdminClient();
  const { data: uses, error } = await admin
    .from("invitation_code_uses")
    .select("id, code_id, used_by, used_at")
    .eq("code_id", codeId)
    .order("used_at", { ascending: false });
  if (error) throw error;
  const list = (uses ?? []) as InvitationCodeUseRow[];
  if (list.length === 0) return [];

  const userIds = Array.from(new Set(list.map((u) => u.used_by)));
  const { data: users, error: uerr } = await admin
    .from("users")
    .select("id, nickname, avatar_url, created_at")
    .in("id", userIds);
  if (uerr) throw uerr;

  const profileById = new Map<
    string,
    { nickname: string; avatar_url: string | null; created_at: string }
  >();
  for (const u of (users ?? []) as Pick<
    UserRow,
    "id" | "nickname" | "avatar_url" | "created_at"
  >[]) {
    profileById.set(u.id, {
      nickname: u.nickname,
      avatar_url: u.avatar_url,
      created_at: u.created_at,
    });
  }

  return list.map((row) => {
    const user = profileById.get(row.used_by);
    if (!user) {
      return {
        ...row,
        user: {
          nickname: "（未知）",
          avatar_url: null,
          created_at: "",
        },
      };
    }
    return { ...row, user };
  });
}

export type InvitationTreeNode = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  invited_by: string | null;
  created_at: string;
  level: number;
  registration_invite_code: string | null;
  registration_invite_meta: {
    note: string | null;
    expires_at: string | null;
    max_uses: number;
    use_count: number;
    is_revoked: boolean;
  } | null;
};

export async function findInvitationTree(): Promise<InvitationTreeNode[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id, nickname, avatar_url, invited_by, created_at, level")
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const nodes = (data ?? []) as Omit<
    InvitationTreeNode,
    "registration_invite_code" | "registration_invite_meta"
  >[];

  const userIds = nodes.map((n) => n.id);
  const inviteByUserId = new Map<
    string,
    { code: string; meta: InvitationTreeNode["registration_invite_meta"] }
  >();

  if (userIds.length > 0) {
    const { data: useRows, error: useErr } = await admin
      .from("invitation_code_uses")
      .select(
        `
        used_by,
        used_at,
        invitation_codes (
          code,
          note,
          expires_at,
          max_uses,
          use_count,
          is_revoked
        )
      `,
      )
      .in("used_by", userIds)
      .order("used_at", { ascending: false });
    if (useErr) throw useErr;

    type NestedIc = Pick<
      InvitationCodeRow,
      | "code"
      | "note"
      | "expires_at"
      | "max_uses"
      | "use_count"
      | "is_revoked"
    >;
    type UseJoinRow = {
      used_by: string;
      used_at: string;
      invitation_codes: NestedIc | NestedIc[] | null;
    };

    for (const row of (useRows ?? []) as UseJoinRow[]) {
      if (inviteByUserId.has(row.used_by)) continue;
      const icRaw = row.invitation_codes;
      const ic = Array.isArray(icRaw) ? icRaw[0] : icRaw;
      if (!ic) continue;
      inviteByUserId.set(row.used_by, {
        code: ic.code,
        meta: {
          note: ic.note,
          expires_at: ic.expires_at,
          max_uses: ic.max_uses,
          use_count: ic.use_count,
          is_revoked: ic.is_revoked,
        },
      });
    }
  }

  return nodes.map((n) => {
    const reg = inviteByUserId.get(n.id);
    return {
      ...n,
      registration_invite_code: reg?.code ?? null,
      registration_invite_meta: reg?.meta ?? null,
    };
  });
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
