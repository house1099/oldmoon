"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  revalidatePath,
  revalidateTag,
  unstable_noStore as noStore,
} from "next/cache";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import {
  getDashboardStats as repoGetDashboardStats,
  findUsersForAdmin,
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
  findAdminActions as repoFindAdminActions,
  findUserActionHistory as repoFindUserActionHistory,
  findAllAdvertisements as repoFindAllAds,
  insertAdvertisement as repoInsertAd,
  updateAdvertisement as repoUpdateAd,
  deleteAdvertisement as repoDeleteAd,
} from "@/lib/repositories/server/admin.repository";
import type { AdminExpGrantSummary } from "@/lib/repositories/server/admin.repository";
import {
  findAllAnnouncements as repoFindAllAnnouncements,
  insertAnnouncement as repoInsertAnnouncement,
  updateAnnouncement as repoUpdateAnnouncement,
  deleteAnnouncement as repoDeleteAnnouncement,
} from "@/lib/repositories/server/announcement.repository";
import {
  findAllInvitationCodes,
  findInvitationRowByCode,
  insertInvitationCode,
  insertInvitationCodes,
  revokeInvitationCode as repoRevokeInvitationCode,
  findInvitationTree,
  findSystemSettingByKey,
  findInvitationUsesByCodeId,
} from "@/lib/repositories/server/invitation.repository";
import {
  creditCoins,
  getCoinStats,
  findUsersWithCoins,
  findCoinTransactions,
} from "@/lib/repositories/server/coin.repository";
import { DEFAULT_MODERATOR_PERMISSIONS } from "@/lib/constants/admin-permissions";
import type {
  UserRow,
  ExpLogRow,
  ModeratorPermissionRow,
  SystemSettingRow,
  InvitationCodeRow,
  InvitationCodeDto,
  InvitationCodeUseRow,
  AnnouncementRow,
  AnnouncementDto,
  AdvertisementRow,
  CoinTransactionRow,
  AdminActionRow,
} from "@/types/database.types";
import { notifyUserMailboxSilent } from "@/services/notification.action";
import { isTavernBanned } from "@/lib/repositories/server/tavern.repository";

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

async function checkOperationPermission(operatorId: string, targetUserId: string) {
  const [operator, target] = await Promise.all([
    findProfileById(operatorId),
    findProfileById(targetUserId),
  ]);

  if (!operator || !target) {
    throw new Error("用戶不存在");
  }

  const isSelf = operatorId === targetUserId;
  if (target.role === "master" && !isSelf) {
    throw new Error("無法對領袖執行此操作");
  }

  if (
    operator.role === "moderator" &&
    target.role === "moderator" &&
    !isSelf
  ) {
    throw new Error("無法對同級管理員執行此操作");
  }

  return { operator, target };
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
): Promise<
  ActionResult<
    (UserRow & { email: string | null; tavern_banned: boolean }) | null
  >
> {
  try {
    const { profile: operator } = await requireRole(["master", "moderator"]);
    const detail = await findProfileById(userId);
    if (!detail) {
      return { ok: true, data: null };
    }

    let email: string | null = null;
    if (operator.role === "master") {
      try {
        const admin = createAdminClient();
        const { data } = await admin.auth.admin.getUserById(userId);
        email = data.user?.email ?? null;
      } catch {
        email = null;
      }
    }

    const tavern_banned = await isTavernBanned(userId);
    return { ok: true, data: { ...detail, email, tavern_banned } };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function banUserAction(
  userId: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const { user, profile: operator } = await requireRole(["master", "moderator"]);
    const { target } = await checkOperationPermission(user.id, userId);
    await updateUserStatus(userId, "banned", reason);
    await insertAdminAction({
      admin_id: user.id,
      target_user_id: userId,
      action_type: "ban",
      action_label: `放逐 ${target.nickname}，原因：${reason}`,
      reason,
      metadata: {
        reason,
        target_nickname: target.nickname,
        admin_nickname: operator.nickname,
      },
    });
    await notifyUserMailboxSilent({
      user_id: userId,
      type: "system",
      message: `⚠️ 你的帳號已被放逐，原因：${reason}`,
      is_read: false,
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
    const { user, profile: operator } = await requireRole(["master", "moderator"]);
    const { target } = await checkOperationPermission(user.id, userId);
    await updateUserStatus(userId, "suspended", reason);
    if (suspendedUntil) {
      await updateSuspendedUntil(userId, suspendedUntil);
    }
    await insertAdminAction({
      admin_id: user.id,
      target_user_id: userId,
      action_type: "suspend",
      action_label: `停權 ${target.nickname}，原因：${reason}`,
      reason,
      metadata: {
        ...(suspendedUntil ? { suspended_until: suspendedUntil } : {}),
        reason,
        target_nickname: target.nickname,
        admin_nickname: operator.nickname,
      },
    });
    await notifyUserMailboxSilent({
      user_id: userId,
      type: "system",
      message: `⚠️ 你的帳號已被停權，原因：${reason}`,
      is_read: false,
    });
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function unbanUserAction(userId: string): Promise<ActionResult> {
  try {
    const { user, profile: operator } = await requireRole(["master", "moderator"]);
    const { target } = await checkOperationPermission(user.id, userId);
    await updateUserStatus(userId, "active");
    await insertAdminAction({
      admin_id: user.id,
      target_user_id: userId,
      action_type: "unban",
      action_label: `解除 ${target.nickname} 的停權/放逐`,
      metadata: {
        target_nickname: target.nickname,
        admin_nickname: operator.nickname,
      },
    });
    await notifyUserMailboxSilent({
      user_id: userId,
      type: "system",
      message: "✅ 你的帳號已恢復正常，歡迎回來！",
      is_read: false,
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
    const { user, profile: operator } = await requireRole(["master", "moderator"]);
    const { target } = await checkOperationPermission(user.id, userId);
    const source = "manual_adjust";
    await adminAdjustExp(userId, delta);
    await insertAdminAction({
      admin_id: user.id,
      target_user_id: userId,
      action_type: "exp_grant",
      action_label: `送出 +${delta} EXP 給 ${target.nickname}，原因：${reason}`,
      reason,
      metadata: {
        delta,
        source,
        target_nickname: target.nickname,
        admin_nickname: operator.nickname,
      },
    });
    const expMsg =
      delta > 0
        ? `⭐ 管理員發放了 +${delta} EXP 給你，原因：${reason}`
        : `📉 管理員扣除了 ${Math.abs(delta)} EXP，原因：${reason}`;
    await notifyUserMailboxSilent({
      user_id: userId,
      type: "system",
      message: expMsg,
      is_read: false,
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
    await checkOperationPermission(user.id, userId);
    await repoAdjustReputation(userId, delta);
    await insertAdminAction({
      admin_id: user.id,
      target_user_id: userId,
      action_type: "reputation_adjust",
      reason,
      metadata: { delta },
    });
    const repMsg =
      delta > 0
        ? `✨ 你的信譽分 +${delta}，原因：${reason}`
        : `📉 你的信譽分 -${Math.abs(delta)}，原因：${reason}`;
    await notifyUserMailboxSilent({
      user_id: userId,
      type: "system",
      message: repMsg,
      is_read: false,
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
    const { user, profile: operator } = await requireRole(["master"]);
    const { target } = await checkOperationPermission(user.id, userId);
    const oldRole = target.role;
    const newRole = role;
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
      action_label: `將 ${target.nickname} 的角色從 ${oldRole} 改為 ${newRole}`,
      metadata: {
        old_role: oldRole,
        new_role: newRole,
        target_nickname: target.nickname,
        admin_nickname: operator.nickname,
      },
    });
    if (role === "moderator") {
      await notifyUserMailboxSilent({
        user_id: userId,
        type: "system",
        message: "🛡️ 恭喜！你已被授予版主權限",
        is_read: false,
      });
    } else if (role === "member") {
      await notifyUserMailboxSilent({
        user_id: userId,
        type: "system",
        message: "你的管理員權限已被撤銷",
        is_read: false,
      });
    }
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
    noStore();
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
): Promise<ActionResult<{ success: true }>> {
  try {
    const { user } = await requireRole(["master"]);
    await repoUpdateSystemSetting(key, value, user.id);
    revalidatePath("/admin/settings");
    revalidateTag("system_settings");
    return { ok: true, data: { success: true } };
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
    const { user, profile: operator } = await requireRole(["master", "moderator"]);
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

    let targetNickname = "（未知）";
    if (igReq?.user_id) {
      const target = await findProfileById(igReq.user_id);
      targetNickname = target?.nickname ?? "（未知）";
    }

    await insertAdminAction({
      admin_id: user.id,
      target_user_id: igReq?.user_id ?? undefined,
      action_type: "ig_review",
      action_label: `${action === "approved" ? "核准" : "拒絕"} ${targetNickname} 的 IG 變更申請`,
      metadata: {
        verdict: action,
        new_handle: igReq?.new_handle ?? null,
        target_nickname: targetNickname,
        admin_nickname: operator.nickname,
      },
    });

    if (igReq?.user_id) {
      await notifyUserMailboxSilent({
        user_id: igReq.user_id,
        type: "system",
        message:
          action === "approved"
            ? "✅ 你的 IG 帳號變更申請已核准！"
            : "❌ 你的 IG 帳號變更申請未通過審核",
        is_read: false,
      });
    }

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
    const { user, profile: operator } = await requireRole(["master", "moderator"]);
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
    const successfulProfiles = await Promise.all(
      result.successfulUserIds.map((uid) => findProfileById(uid)),
    );
    await Promise.all(
      result.successfulUserIds.map((uid, idx) =>
        insertAdminAction({
          admin_id: user.id,
          target_user_id: uid,
          action_type: "exp_grant",
          action_label: `送出 +${params.delta} EXP 給 ${successfulProfiles[idx]?.nickname ?? "（未知）"}，原因：${params.source.trim()}`,
          reason: params.source.trim(),
          metadata: {
            delta: params.delta,
            source: params.source.trim(),
            target_nickname: successfulProfiles[idx]?.nickname ?? "（未知）",
            admin_nickname: operator.nickname,
          },
        }),
      ),
    );
    const src = params.source.trim();
    const msg = `🎁 你獲得了 +${params.delta} EXP！活動名稱：${src}`;
    await Promise.allSettled(
      result.successfulUserIds.map((uid) =>
        notifyUserMailboxSilent({
          user_id: uid,
          type: "system",
          message: msg,
          is_read: false,
        }),
      ),
    );
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
    const src = params.source.trim();
    const msg = `🎁 你獲得了 +${params.delta} EXP！活動名稱：${src}`;
    await Promise.allSettled(
      result.successfulUserIds.map((uid) =>
        notifyUserMailboxSilent({
          user_id: uid,
          type: "system",
          message: msg,
          is_read: false,
        }),
      ),
    );
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
    const src = params.source.trim();
    const msg = `🎁 你獲得了 +${params.delta} EXP！活動名稱：${src}`;
    await Promise.allSettled(
      result.successfulUserIds.map((uid) =>
        notifyUserMailboxSilent({
          user_id: uid,
          type: "system",
          message: msg,
          is_read: false,
        }),
      ),
    );
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
    const existing = await findInvitationRowByCode(code);
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
  /** 使用人數上限，預設 1，最大 100 */
  maxUses?: number;
}): Promise<ActionResult<InvitationCodeRow>> {
  try {
    const { user } = await requireRole(["master", "moderator"]);

    const maxUses = Math.min(
      100,
      Math.max(1, params.maxUses ?? 1),
    );

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
      max_uses: maxUses,
    });

    await insertAdminAction({
      admin_id: user.id,
      action_type: "invitation_create",
      metadata: { code, expires_in_days: expiresInDays, max_uses: maxUses },
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
  maxUses?: number;
}): Promise<ActionResult<InvitationCodeRow[]>> {
  try {
    const { user } = await requireRole(["master", "moderator"]);

    const count = Math.min(Math.max(1, params.count), 50);
    const maxUses = Math.min(100, Math.max(1, params.maxUses ?? 1));

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
      max_uses: maxUses,
    }));

    const rows = await insertInvitationCodes(payloads);

    await insertAdminAction({
      admin_id: user.id,
      action_type: "invitation_batch_create",
      metadata: {
        count: rows.length,
        expires_in_days: expiresInDays,
        max_uses: maxUses,
      },
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
      .select("use_count, code")
      .eq("id", id)
      .single();
    if (readErr) throw readErr;

    if (row && Number(row.use_count) > 0) {
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
  registration_invite_code: string | null;
  registration_invite_meta: {
    note: string | null;
    expires_at: string | null;
    max_uses: number;
    use_count: number;
    is_revoked: boolean;
  } | null;
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
        registration_invite_code: u.registration_invite_code,
        registration_invite_meta: u.registration_invite_meta,
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

export async function getInvitationCodeUsesAction(
  codeId: string,
): Promise<
  ActionResult<
    (InvitationCodeUseRow & {
      user: {
        nickname: string;
        avatar_url: string | null;
        created_at: string;
      };
    })[]
  >
> {
  try {
    await requireRole(["master", "moderator"]);
    const rows = await findInvitationUsesByCodeId(codeId);
    return { ok: true, data: rows };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── Announcement Management ───

export async function getAnnouncementsAction(): Promise<
  ActionResult<AnnouncementDto[]>
> {
  try {
    await requireRole(["master", "moderator"]);
    const data = await repoFindAllAnnouncements();
    return { ok: true, data };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function createAnnouncementAction(payload: {
  title: string;
  content: string;
  image_url?: string;
  is_pinned: boolean;
}): Promise<ActionResult<AnnouncementRow>> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    if (!payload.title?.trim() || payload.title.length > 100)
      return { ok: false, error: "標題必填且不超過 100 字" };
    if (!payload.content?.trim() || payload.content.length > 2000)
      return { ok: false, error: "內文必填且不超過 2000 字" };

    const row = await repoInsertAnnouncement({
      title: payload.title.trim(),
      content: payload.content.trim(),
      image_url: payload.image_url?.trim() || null,
      is_pinned: payload.is_pinned,
      created_by: user.id,
    });

    await insertAdminAction({
      admin_id: user.id,
      action_type: "announcement_create",
      metadata: { title: row.title, id: row.id },
    });

    return { ok: true, data: row };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateAnnouncementAction(
  id: string,
  payload: Partial<{
    title: string;
    content: string;
    image_url: string | null;
    is_pinned: boolean;
    is_active: boolean;
  }>,
): Promise<ActionResult<void>> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    if (payload.title !== undefined && (!payload.title.trim() || payload.title.length > 100))
      return { ok: false, error: "標題必填且不超過 100 字" };
    if (payload.content !== undefined && (!payload.content.trim() || payload.content.length > 2000))
      return { ok: false, error: "內文必填且不超過 2000 字" };

    await repoUpdateAnnouncement(id, payload);

    await insertAdminAction({
      admin_id: user.id,
      action_type: "announcement_update",
      metadata: { id, ...payload },
    });

    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteAnnouncementAction(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    await repoDeleteAnnouncement(id);

    await insertAdminAction({
      admin_id: user.id,
      action_type: "announcement_delete",
      metadata: { id },
    });

    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function toggleAnnouncementPinAction(
  id: string,
  is_pinned: boolean,
): Promise<ActionResult<void>> {
  try {
    await requireRole(["master", "moderator"]);
    await repoUpdateAnnouncement(id, { is_pinned });
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function toggleAnnouncementActiveAction(
  id: string,
  is_active: boolean,
): Promise<ActionResult<void>> {
  try {
    await requireRole(["master", "moderator"]);
    await repoUpdateAnnouncement(id, { is_active });
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── Advertisement Management ───

export async function getAdvertisementsAction(): Promise<
  ActionResult<AdvertisementRow[]>
> {
  try {
    await requireRole(["master", "moderator"]);
    const data = await repoFindAllAds();
    return { ok: true, data };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function createAdvertisementAction(payload: {
  title: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  position: "banner" | "card" | "announcement";
  weight: number;
  is_active: boolean;
  starts_at?: string;
  ends_at?: string;
}): Promise<ActionResult<AdvertisementRow>> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    if (!payload.title?.trim()) return { ok: false, error: "標題必填" };
    if (payload.weight < 1 || payload.weight > 10)
      return { ok: false, error: "權重須為 1-10" };

    const row = await repoInsertAd({
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      image_url: payload.image_url?.trim() || null,
      link_url: payload.link_url?.trim() || null,
      position: payload.position,
      weight: payload.weight,
      is_active: payload.is_active,
      starts_at: payload.starts_at || null,
      ends_at: payload.ends_at || null,
      created_by: user.id,
    });

    await insertAdminAction({
      admin_id: user.id,
      action_type: "ad_create",
      metadata: { title: row.title, id: row.id },
    });

    return { ok: true, data: row };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function updateAdvertisementAction(
  id: string,
  payload: Partial<{
    title: string;
    description: string | null;
    image_url: string | null;
    link_url: string | null;
    position: "banner" | "card" | "announcement";
    weight: number;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
  }>,
): Promise<ActionResult<void>> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    await repoUpdateAd(id, payload);

    await insertAdminAction({
      admin_id: user.id,
      action_type: "ad_update",
      metadata: { id, ...payload },
    });

    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function deleteAdvertisementAction(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    await repoDeleteAd(id);

    await insertAdminAction({
      admin_id: user.id,
      action_type: "ad_delete",
      metadata: { id },
    });

    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function toggleAdvertisementAction(
  id: string,
  is_active: boolean,
): Promise<ActionResult<void>> {
  try {
    await requireRole(["master", "moderator"]);
    await repoUpdateAd(id, { is_active });
    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

// ─── Coins（金幣）───

export async function adminAdjustCoinsAction(params: {
  userId: string;
  coinType: "premium" | "free";
  amount: number;
  note: string;
  pin: string;
}): Promise<ActionResult> {
  try {
    const { user, profile: operator } = await requireRole(["master"]);
    const { target } = await checkOperationPermission(user.id, params.userId);
    const note = params.note?.trim();
    if (!note) return { ok: false, error: "請填寫原因" };
    const pin = params.pin?.trim();
    if (!/^\d{4}$/.test(pin)) return { ok: false, error: "請輸入四位數密碼" };

    const stored = await findSystemSettingByKey("coin_admin_pin");
    if (!stored || pin !== stored) {
      return { ok: false, error: "密碼錯誤" };
    }

    const source =
      params.amount >= 0 ? "admin_grant" : "admin_deduct";
    const result = await creditCoins({
      userId: params.userId,
      coinType: params.coinType,
      amount: params.amount,
      source,
      note,
      operatorId: user.id,
    });
    if (!result.success) {
      return { ok: false, error: result.error ?? "調整失敗" };
    }

    await insertAdminAction({
      admin_id: user.id,
      target_user_id: params.userId,
      action_type: "coin_adjust",
      action_label: `${params.amount > 0 ? "贈與" : "扣除"} ${Math.abs(params.amount)} ${params.coinType === "premium" ? "純金" : "探險幣"} 給 ${target.nickname}，原因：${note}`,
      reason: note,
      metadata: {
        amount: params.amount,
        coin_type: params.coinType,
        note,
        target_nickname: target.nickname,
        admin_nickname: operator.nickname,
      },
    });

    const coinLabel = params.coinType === "premium" ? "純金" : "探險幣";
    const msg =
      params.amount > 0
        ? `🪙 管理員贈與了 +${params.amount} ${coinLabel}，備註：${note}`
        : `🪙 管理員扣除了 ${Math.abs(params.amount)} ${coinLabel}，備註：${note}`;
    await notifyUserMailboxSilent({
      user_id: params.userId,
      type: "system",
      message: msg,
      is_read: false,
    });

    return { ok: true, data: undefined };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getAdminCoinStatsAction(): Promise<
  ActionResult<
    Awaited<ReturnType<typeof getCoinStats>>
  >
> {
  try {
    await requireRole(["master", "moderator"]);
    const stats = await getCoinStats();
    return { ok: true, data: stats };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getAdminActionsAction(params: {
  page?: number;
  actionType?: string;
  adminId?: string;
  targetUserId?: string;
  search?: string;
}): Promise<
  ActionResult<{
    actions: (AdminActionRow & {
      admin: { nickname: string; avatar_url: string | null };
      target: { nickname: string; avatar_url: string | null } | null;
    })[];
    total: number;
  }>
> {
  try {
    await requireRole(["master"]);
    const result = await repoFindAdminActions(params);
    return { ok: true, data: result };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getUserActionHistoryAction(
  userId: string,
): Promise<ActionResult<AdminActionRow[]>> {
  try {
    await requireRole(["master", "moderator"]);
    const rows = await repoFindUserActionHistory(userId);
    return { ok: true, data: rows };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getAdminUsersWithCoinsAction(params: {
  search?: string;
  page?: number;
}): Promise<
  ActionResult<
    Awaited<ReturnType<typeof findUsersWithCoins>>
  >
> {
  try {
    await requireRole(["master", "moderator"]);
    const data = await findUsersWithCoins(params);
    return { ok: true, data };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getAdminCoinTransactionsAction(
  userId: string,
  page: number,
): Promise<ActionResult<{ transactions: CoinTransactionRow[]; total: number }>> {
  try {
    await requireRole(["master", "moderator"]);
    const data = await findCoinTransactions(userId, { page });
    return { ok: true, data };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getRecentCoinTransactionsAction(): Promise<
  ActionResult<(CoinTransactionRow & {
    user: { nickname: string; avatar_url: string | null };
  })[]>
> {
  try {
    await requireRole(["master"]);
    const admin = createAdminClient();
    const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await admin
      .from("coin_transactions")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    const rows = (data ?? []) as CoinTransactionRow[];
    if (rows.length === 0) return { ok: true, data: [] };

    const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
    const { data: users, error: usersError } = await admin
      .from("users")
      .select("id, nickname, avatar_url")
      .in("id", userIds);
    if (usersError) throw usersError;

    const userMap = new Map(
      (users ?? []).map((u) => [
        u.id as string,
        {
          nickname: (u.nickname as string) ?? "（未知）",
          avatar_url: (u.avatar_url as string | null) ?? null,
        },
      ]),
    );

    return {
      ok: true,
      data: rows.map((row) => ({
        ...row,
        user: userMap.get(row.user_id) ?? { nickname: "（未知）", avatar_url: null },
      })),
    };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}
