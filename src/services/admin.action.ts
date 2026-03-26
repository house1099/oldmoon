"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import {
  getDashboardStats as repoGetDashboardStats,
  findUsersForAdmin,
  findUserDetailById,
  updateUserStatus,
  updateSuspendedUntil,
  insertAdminAction,
  adminAdjustExp,
  adjustReputation as repoAdjustReputation,
  findStaffUsers as repoFindStaffUsers,
  updateUserRole as repoUpdateUserRole,
  findModeratorPermissions as repoFindModeratorPermissions,
  upsertModeratorPermissions as repoUpsertModeratorPermissions,
  findAllSystemSettings as repoFindAllSystemSettings,
  updateSystemSetting as repoUpdateSystemSetting,
  batchGrantExp as repoBatchGrantExp,
  grantExpToAll as repoGrantExpToAll,
  grantExpByLevel as repoGrantExpByLevel,
  findExpLogsByUser as repoFindExpLogsByUser,
  findAdminExpGrantHistory as repoFindAdminExpGrantHistory,
} from "@/lib/repositories/server/admin.repository";
import type { AdminExpGrantSummary } from "@/lib/repositories/server/admin.repository";
import {
  findAllInvitationCodes,
  findInvitationByCode,
  insertInvitationCode,
  insertInvitationCodes,
  revokeInvitationCode as repoRevokeInvitationCode,
  findInvitationTree,
  findSystemSettingByKey,
} from "@/lib/repositories/server/invitation.repository";
import { DEFAULT_MODERATOR_PERMISSIONS } from "@/lib/constants/admin-permissions";
import type {
  UserRow,
  ExpLogRow,
  ModeratorPermissionRow,
  SystemSettingRow,
  InvitationCodeRow,
  InvitationCodeDto,
} from "@/types/database.types";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function requireRole(allowedRoles: ("master" | "moderator")[]) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("未登入");
  const profile = await findProfileById(user.id);
  if (
    !profile ||
    !allowedRoles.includes(profile.role as "master" | "moderator")
  ) {
    throw new Error("權限不足");
  }
  return { user, profile };
}

// ─── Dashboard ───

export async function getDashboardStatsAction() {
  try {
    await requireRole(["master", "moderator"]);
    const stats = await repoGetDashboardStats();
    return { ok: true as const, data: stats };
  } catch (e: unknown) {
    return { ok: false as const, error: (e as Error).message };
  }
}

// ─── Users ───

export async function getUsersAction(params: {
  search?: string;
  status?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ users: UserRow[]; total: number }>> {
  try {
    await requireRole(["master", "moderator"]);
    const result = await findUsersForAdmin(params);
    return { ok: true, data: result };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getUserDetailAction(
  userId: string,
): Promise<ActionResult<(UserRow & { email: string }) | null>> {
  try {
    await requireRole(["master", "moderator"]);
    const detail = await findUserDetailById(userId);
    return { ok: true, data: detail };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function banUserAction(
  userId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    await updateUserStatus(userId, "banned", reason);
    await insertAdminAction({
      admin_id: user.id,
      target_user_id: userId,
      action_type: "ban",
      reason,
    });
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function suspendUserAction(
  userId: string,
  reason: string,
  suspendedUntil?: string,
): Promise<ActionResult> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    await updateUserStatus(userId, "suspended", reason);
    if (suspendedUntil) {
      await updateSuspendedUntil(userId, suspendedUntil);
    }
    await insertAdminAction({
      admin_id: user.id,
      target_user_id: userId,
      action_type: "suspend",
      reason,
      metadata: suspendedUntil ? { suspended_until: suspendedUntil } : undefined,
    });
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function unbanUserAction(userId: string): Promise<ActionResult> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    await updateUserStatus(userId, "active");
    await insertAdminAction({
      admin_id: user.id,
      target_user_id: userId,
      action_type: "unban",
    });
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function adjustExpAction(
  userId: string,
  delta: number,
  reason: string,
): Promise<ActionResult> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    await adminAdjustExp(userId, delta);
    await insertAdminAction({
      admin_id: user.id,
      target_user_id: userId,
      action_type: "exp_adjust",
      reason,
      metadata: { delta },
    });
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function adjustReputationAction(
  userId: string,
  delta: number,
  reason: string,
): Promise<ActionResult> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    await repoAdjustReputation(userId, delta);
    await insertAdminAction({
      admin_id: user.id,
      target_user_id: userId,
      action_type: "reputation_adjust",
      reason,
      metadata: { delta },
    });
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── Reports ───

export type ReportWithUsers = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  conversation_id: string | null;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  reported_nickname: string | null;
  reported_avatar: string | null;
  reporter_nickname: string | null;
};

export async function getReportsAction(params: {
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ reports: ReportWithUsers[]; total: number }>> {
  try {
    await requireRole(["master", "moderator"]);
    const admin = createAdminClient();
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = admin
      .from("reports")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const reports = data ?? [];
    const userIdSet = new Set<string>();
    for (const r of reports as Record<string, unknown>[]) {
      if (r.reported_user_id) userIdSet.add(r.reported_user_id as string);
      if (r.reporter_id) userIdSet.add(r.reporter_id as string);
    }
    const userIds = Array.from(userIdSet);

    const profiles: Record<string, UserRow> = {};
    if (userIds.length > 0) {
      const { data: users } = await admin
        .from("users")
        .select("id, nickname, avatar_url")
        .in("id", userIds);
      for (const u of users ?? []) {
        profiles[u.id] = u as unknown as UserRow;
      }
    }

    const enriched: ReportWithUsers[] = reports.map(
      (r: Record<string, unknown>) => ({
        id: r.id as string,
        reporter_id: r.reporter_id as string,
        reported_user_id: r.reported_user_id as string,
        conversation_id: r.conversation_id as string | null,
        reason: r.reason as string,
        description: r.description as string | null,
        status: r.status as string,
        created_at: r.created_at as string,
        reported_nickname:
          profiles[r.reported_user_id as string]?.nickname ?? null,
        reported_avatar:
          profiles[r.reported_user_id as string]?.avatar_url ?? null,
        reporter_nickname:
          profiles[r.reporter_id as string]?.nickname ?? null,
      }),
    );

    return { ok: true, data: { reports: enriched, total: count ?? 0 } };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function resolveReportAction(
  reportId: string,
  verdict: "upheld" | "dismissed",
  reason: string,
): Promise<ActionResult> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    const admin = createAdminClient();

    const newStatus = verdict === "upheld" ? "upheld" : "dismissed";
    const { data: report, error: readErr } = await admin
      .from("reports")
      .select("reported_user_id")
      .eq("id", reportId)
      .single();
    if (readErr) throw readErr;

    const { error } = await admin
      .from("reports")
      .update({ status: newStatus })
      .eq("id", reportId);
    if (error) throw error;

    if (verdict === "upheld" && report?.reported_user_id) {
      await repoAdjustReputation(report.reported_user_id, -10);
    }

    await insertAdminAction({
      admin_id: user.id,
      target_user_id: report?.reported_user_id ?? undefined,
      action_type: "resolve_report",
      reason,
      metadata: { report_id: reportId, verdict },
    });

    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── Roles & Permissions ───

export async function getStaffUsersAction(): Promise<
  ActionResult<UserRow[]>
> {
  try {
    await requireRole(["master"]);
    const users = await repoFindStaffUsers();
    return { ok: true, data: users };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateUserRoleAction(
  userId: string,
  role: string,
): Promise<ActionResult> {
  try {
    const { user } = await requireRole(["master"]);
    await repoUpdateUserRole(userId, role);

    if (role === "moderator") {
      await repoUpsertModeratorPermissions(
        userId,
        DEFAULT_MODERATOR_PERMISSIONS,
        user.id,
      );
    }

    await insertAdminAction({
      admin_id: user.id,
      target_user_id: userId,
      action_type: "role_change",
      metadata: { new_role: role },
    });
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getModeratorPermissionsAction(
  userId: string,
): Promise<ActionResult<ModeratorPermissionRow | null>> {
  try {
    await requireRole(["master"]);
    const perms = await repoFindModeratorPermissions(userId);
    return { ok: true, data: perms };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateModeratorPermissionsAction(
  userId: string,
  permissions: Partial<ModeratorPermissionRow>,
): Promise<ActionResult> {
  try {
    const { user } = await requireRole(["master"]);
    await repoUpsertModeratorPermissions(userId, permissions, user.id);
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── System Settings ───

export async function getSystemSettingsAction(): Promise<
  ActionResult<SystemSettingRow[]>
> {
  try {
    await requireRole(["master"]);
    const settings = await repoFindAllSystemSettings();
    return { ok: true, data: settings };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateSystemSettingAction(
  key: string,
  value: string,
): Promise<ActionResult> {
  try {
    const { user } = await requireRole(["master"]);
    await repoUpdateSystemSetting(key, value, user.id);
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── IG Requests (integrated into user detail) ───

export async function getPendingIgRequestsForUserAction(userId: string) {
  try {
    await requireRole(["master", "moderator"]);
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ig_change_requests")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { ok: true as const, data: data ?? [] };
  } catch (e: unknown) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function reviewIgRequestFromAdminAction(
  requestId: string,
  action: "approved" | "rejected",
): Promise<ActionResult> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    const admin = createAdminClient();

    const { data: reqData, error: readErr } = await admin
      .from("ig_change_requests")
      .select("*")
      .eq("id", requestId)
      .single();
    if (readErr) throw readErr;

    const igReq = reqData as {
      id: string;
      user_id: string | null;
      new_handle: string;
      old_handle: string | null;
    } | null;

    if (action === "approved" && igReq?.new_handle && igReq.user_id) {
      const { error: updateErr } = await admin
        .from("users")
        .update({ instagram_handle: igReq.new_handle })
        .eq("id", igReq.user_id);
      if (updateErr) throw updateErr;
    }

    const { error } = await admin
      .from("ig_change_requests")
      .update({
        status: action,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", requestId);
    if (error) throw error;

    await insertAdminAction({
      admin_id: user.id,
      target_user_id: igReq?.user_id ?? undefined,
      action_type: `ig_request_${action}`,
      metadata: { request_id: requestId },
    });

    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── EXP Batch Management ───

export async function batchGrantExpAction(params: {
  userIds: string[];
  delta: number;
  source: string;
}): Promise<ActionResult<{ success: number; failed: number }>> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    if (params.userIds.length > 200) {
      return { ok: false, error: "單次最多 200 人" };
    }
    if (params.delta < 1 || params.delta > 1000) {
      return { ok: false, error: "EXP 範圍為 1–1000" };
    }
    if (!params.source.trim()) {
      return { ok: false, error: "發放名稱不可空白" };
    }
    const result = await repoBatchGrantExp({
      userIds: params.userIds,
      delta: params.delta,
      source: params.source.trim(),
      adminId: user.id,
    });
    await insertAdminAction({
      admin_id: user.id,
      action_type: "exp_batch_grant",
      metadata: {
        count: params.userIds.length,
        delta: params.delta,
        source: params.source.trim(),
        success: result.success,
        failed: result.failed,
      },
    });
    return { ok: true, data: result };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function grantExpToAllAction(params: {
  delta: number;
  source: string;
}): Promise<ActionResult<{ success: number; failed: number }>> {
  try {
    const { user } = await requireRole(["master"]);
    if (params.delta < 1 || params.delta > 1000) {
      return { ok: false, error: "EXP 範圍為 1–1000" };
    }
    if (!params.source.trim()) {
      return { ok: false, error: "發放名稱不可空白" };
    }
    const result = await repoGrantExpToAll({
      delta: params.delta,
      source: params.source.trim(),
      adminId: user.id,
    });
    await insertAdminAction({
      admin_id: user.id,
      action_type: "exp_grant_all",
      metadata: {
        delta: params.delta,
        source: params.source.trim(),
        success: result.success,
        failed: result.failed,
      },
    });
    return { ok: true, data: result };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function grantExpByLevelAction(params: {
  minLevel: number;
  maxLevel: number;
  delta: number;
  source: string;
}): Promise<ActionResult<{ success: number; failed: number }>> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    if (params.delta < 1 || params.delta > 1000) {
      return { ok: false, error: "EXP 範圍為 1–1000" };
    }
    if (!params.source.trim()) {
      return { ok: false, error: "發放名稱不可空白" };
    }
    const result = await repoGrantExpByLevel({
      minLevel: params.minLevel,
      maxLevel: params.maxLevel,
      delta: params.delta,
      source: params.source.trim(),
      adminId: user.id,
    });
    await insertAdminAction({
      admin_id: user.id,
      action_type: "exp_grant_by_level",
      metadata: {
        min_level: params.minLevel,
        max_level: params.maxLevel,
        delta: params.delta,
        source: params.source.trim(),
        success: result.success,
        failed: result.failed,
      },
    });
    return { ok: true, data: result };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getExpLogsByUserAction(
  userId: string,
  page: number,
): Promise<ActionResult<{ logs: ExpLogRow[]; total: number }>> {
  try {
    await requireRole(["master", "moderator"]);
    const result = await repoFindExpLogsByUser(userId, page);
    return { ok: true, data: result };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getAdminExpGrantHistoryAction(): Promise<
  ActionResult<AdminExpGrantSummary[]>
> {
  try {
    await requireRole(["master", "moderator"]);
    const history = await repoFindAdminExpGrantHistory();
    return { ok: true, data: history };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── Invitation Codes ───

function generateRandomCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function generateUniqueCode(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = generateRandomCode();
    const existing = await findInvitationByCode(code);
    if (!existing) return code;
  }
  throw new Error("無法產生唯一邀請碼，請重試");
}

export async function getInvitationCodesAction(): Promise<
  ActionResult<InvitationCodeDto[]>
> {
  try {
    await requireRole(["master", "moderator"]);
    const codes = await findAllInvitationCodes();
    return { ok: true, data: codes };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function generateInvitationCodeAction(params: {
  expiresInDays?: number;
  note?: string;
}): Promise<ActionResult<InvitationCodeRow>> {
  try {
    const { user } = await requireRole(["master", "moderator"]);

    let expiresInDays = params.expiresInDays;
    if (expiresInDays === undefined) {
      const settingVal = await findSystemSettingByKey(
        "invitation_expire_days",
      );
      expiresInDays = settingVal ? parseInt(settingVal, 10) : 30;
    }

    const code = await generateUniqueCode();
    let expiresAt: string | null = null;
    if (expiresInDays && expiresInDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + expiresInDays);
      expiresAt = d.toISOString();
    }

    const row = await insertInvitationCode({
      code,
      created_by: user.id,
      expires_at: expiresAt,
      note: params.note?.trim() || null,
    });

    await insertAdminAction({
      admin_id: user.id,
      action_type: "invitation_create",
      metadata: { code, expires_in_days: expiresInDays },
    });

    return { ok: true, data: row };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function generateBatchInvitationCodesAction(params: {
  count: number;
  expiresInDays?: number;
  note?: string;
}): Promise<ActionResult<InvitationCodeRow[]>> {
  try {
    const { user } = await requireRole(["master", "moderator"]);

    const count = Math.min(Math.max(1, params.count), 50);

    let expiresInDays = params.expiresInDays;
    if (expiresInDays === undefined) {
      const settingVal = await findSystemSettingByKey(
        "invitation_expire_days",
      );
      expiresInDays = settingVal ? parseInt(settingVal, 10) : 30;
    }

    let expiresAt: string | null = null;
    if (expiresInDays && expiresInDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + expiresInDays);
      expiresAt = d.toISOString();
    }

    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(await generateUniqueCode());
    }

    const payloads = codes.map((c) => ({
      code: c,
      created_by: user.id,
      expires_at: expiresAt,
      note: params.note?.trim() || null,
    }));

    const rows = await insertInvitationCodes(payloads);

    await insertAdminAction({
      admin_id: user.id,
      action_type: "invitation_batch_create",
      metadata: { count: rows.length, expires_in_days: expiresInDays },
    });

    return { ok: true, data: rows };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function revokeInvitationCodeAction(
  id: string,
): Promise<ActionResult> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    const admin = createAdminClient();

    const { data: row, error: readErr } = await admin
      .from("invitation_codes")
      .select("used_by, code")
      .eq("id", id)
      .single();
    if (readErr) throw readErr;

    if (row?.used_by) {
      return { ok: false, error: "已使用的邀請碼無法撤銷" };
    }

    await repoRevokeInvitationCode(id);

    await insertAdminAction({
      admin_id: user.id,
      action_type: "invitation_revoke",
      metadata: { invitation_id: id, code: row?.code },
    });

    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export type InvitationTreeNodeDto = {
  id: string;
  nickname: string;
  avatar_url: string | null;
  level: number;
  created_at: string;
  children: InvitationTreeNodeDto[];
};

export async function getInvitationTreeAction(): Promise<
  ActionResult<InvitationTreeNodeDto[]>
> {
  try {
    await requireRole(["master", "moderator"]);
    const flat = await findInvitationTree();

    const nodeMap = new Map<string, InvitationTreeNodeDto>();
    for (const u of flat) {
      nodeMap.set(u.id, {
        id: u.id,
        nickname: u.nickname,
        avatar_url: u.avatar_url,
        level: u.level,
        created_at: u.created_at,
        children: [],
      });
    }

    const roots: InvitationTreeNodeDto[] = [];
    for (const u of flat) {
      const node = nodeMap.get(u.id)!;
      if (u.invited_by && nodeMap.has(u.invited_by)) {
        nodeMap.get(u.invited_by)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return { ok: true, data: roots };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function validateInviteCodeAction(
  code: string,
): Promise<ActionResult<{ valid: boolean }>> {
  try {
    const row = await findInvitationByCode(code.trim().toUpperCase());
    if (!row) {
      return { ok: true, data: { valid: true } };
    }
    if (row.is_revoked) {
      return { ok: false, error: "此邀請碼已被撤銷" };
    }
    if (row.used_by) {
      return { ok: false, error: "此邀請碼已被使用" };
    }
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return { ok: false, error: "此邀請碼已過期" };
    }
    return { ok: true, data: { valid: true } };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function claimInviteCodeAfterRegisterAction(
  code: string,
  userId: string,
): Promise<void> {
  try {
    const { claimInvitationCode } = await import(
      "@/lib/repositories/server/invitation.repository"
    );
    await claimInvitationCode(code.trim().toUpperCase(), userId);
  } catch {
    // silent — backward compatible
  }
}
