import { createAdminClient } from "@/lib/supabase/admin";
import type {
  UserRow,
  ExpLogRow,
  ModeratorPermissionRow,
  SystemSettingRow,
  AdvertisementRow,
  AdminActionRow,
} from "@/types/database.types";

export type DashboardStats = {
  todayNewUsers: number;
  pendingUsers: number;
  pendingReports: number;
  activeUsers: number;
  weekNewAlliances: number;
  pendingIgRequests: number;
  pendingProfileChangeCount: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const admin = createAdminClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekISO = weekAgo.toISOString();

  const [
    todayNewRes,
    pendingUsersRes,
    pendingReportsRes,
    activeUsersRes,
    weekAlliancesRes,
    pendingIgRes,
    pendingProfileChangeRes,
  ] = await Promise.all([
    admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayISO),
    admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    admin
      .from("alliances")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekISO),
    admin
      .from("ig_change_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("profile_change_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return {
    todayNewUsers: todayNewRes.count ?? 0,
    pendingUsers: pendingUsersRes.count ?? 0,
    pendingReports: pendingReportsRes.count ?? 0,
    activeUsers: activeUsersRes.count ?? 0,
    weekNewAlliances: weekAlliancesRes.count ?? 0,
    pendingIgRequests: pendingIgRes.count ?? 0,
    pendingProfileChangeCount: pendingProfileChangeRes.count ?? 0,
  };
}

export async function findUsersForAdmin(params: {
  search?: string;
  status?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ users: UserRow[]; total: number }> {
  const admin = createAdminClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = admin
    .from("users")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.status) {
    query = query.eq(
      "status",
      params.status as "pending" | "active" | "suspended" | "banned",
    );
  }
  if (params.role) {
    query = query.eq(
      "role",
      params.role as "member" | "moderator" | "master",
    );
  }
  if (params.search) {
    query = query.ilike("nickname", `%${params.search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    users: (data ?? []) as UserRow[],
    total: count ?? 0,
  };
}

export async function findUserDetailById(
  userId: string,
): Promise<(UserRow & { email: string }) | null> {
  const admin = createAdminClient();

  const { data: profile, error } = await admin
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!profile) return null;

  const {
    data: { user: authUser },
  } = await admin.auth.admin.getUserById(userId);

  return {
    ...(profile as UserRow),
    email: authUser?.email ?? "",
  };
}

export async function updateUserStatus(
  userId: string,
  status: string,
  reason?: string,
): Promise<void> {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    status: status as "pending" | "active" | "suspended" | "banned",
  };
  if (status === "banned" && reason) {
    patch.ban_reason = reason;
  }
  if (status === "active") {
    patch.ban_reason = null;
    patch.suspended_until = null;
  }

  const { error } = await admin.from("users").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function updateSuspendedUntil(
  userId: string,
  suspendedUntil: string | null,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ suspended_until: suspendedUntil })
    .eq("id", userId);
  if (error) throw error;
}

export async function insertAdminAction(payload: {
  admin_id: string;
  target_user_id?: string;
  action_type: string;
  action_label?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("admin_actions").insert({
    admin_id: payload.admin_id,
    target_user_id: payload.target_user_id ?? null,
    action_type: payload.action_type,
    action_label: payload.action_label ?? null,
    reason: payload.reason ?? null,
    metadata: payload.metadata ?? null,
  });
  if (error) {
    console.error("insertAdminAction failed:", error);
    throw error;
  }
}

export type AdminActionWithUsers = AdminActionRow & {
  admin: { nickname: string; avatar_url: string | null };
  target: { nickname: string; avatar_url: string | null } | null;
};

export async function findAdminActions(params: {
  page?: number;
  actionType?: string;
  adminId?: string;
  targetUserId?: string;
  search?: string;
}): Promise<{ actions: AdminActionWithUsers[]; total: number }> {
  const admin = createAdminClient();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = 30;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let searchUserIds: string[] | null = null;
  if (params.search?.trim()) {
    const { data: users, error: usersError } = await admin
      .from("users")
      .select("id")
      .ilike("nickname", `%${params.search.trim()}%`)
      .limit(200);
    if (usersError) throw usersError;
    searchUserIds = (users ?? []).map((u) => u.id as string);
    if (searchUserIds.length === 0) {
      return { actions: [], total: 0 };
    }
  }

  let query = admin
    .from("admin_actions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.actionType?.trim()) query = query.eq("action_type", params.actionType.trim());
  if (params.adminId?.trim()) query = query.eq("admin_id", params.adminId.trim());
  if (params.targetUserId?.trim()) query = query.eq("target_user_id", params.targetUserId.trim());
  if (searchUserIds) {
    const inList = searchUserIds.map((id) => `"${id}"`).join(",");
    query = query.or(`admin_id.in.(${inList}),target_user_id.in.(${inList})`);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  const rows = (data ?? []) as AdminActionRow[];
  if (rows.length === 0) return { actions: [], total: count ?? 0 };

  const userIds = Array.from(
    new Set(
      rows
        .flatMap((row) => [row.admin_id, row.target_user_id])
        .filter((id): id is string => Boolean(id)),
    ),
  );
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

  const actions: AdminActionWithUsers[] = rows.map((row) => ({
    ...row,
    admin: userMap.get(row.admin_id) ?? { nickname: "（未知）", avatar_url: null },
    target: row.target_user_id
      ? (userMap.get(row.target_user_id) ?? { nickname: "（未知）", avatar_url: null })
      : null,
  }));

  return { actions, total: count ?? 0 };
}

export async function findUserActionHistory(
  userId: string,
  limit = 20,
): Promise<AdminActionRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("admin_actions")
    .select("*")
    .eq("target_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as AdminActionRow[];
}

export async function adminAdjustExp(
  userId: string,
  delta: number,
): Promise<void> {
  const admin = createAdminClient();

  const { error: expLogErr } = await admin.from("exp_logs").insert({
    user_id: userId,
    source: "admin_adjust",
    unique_key: `admin_exp:${userId}:${Date.now()}`,
    delta,
    delta_exp: delta,
  });
  if (expLogErr) throw expLogErr;

  const { data: user, error: readErr } = await admin
    .from("users")
    .select("total_exp")
    .eq("id", userId)
    .single();
  if (readErr) throw readErr;

  const newExp = Math.max(0, (user?.total_exp ?? 0) + delta);
  const { error: updateErr } = await admin
    .from("users")
    .update({ total_exp: newExp })
    .eq("id", userId);
  if (updateErr) throw updateErr;
}

export async function adjustReputation(
  userId: string,
  delta: number,
): Promise<void> {
  const admin = createAdminClient();

  const { data: user, error: readErr } = await admin
    .from("users")
    .select("reputation_score")
    .eq("id", userId)
    .single();
  if (readErr) throw readErr;

  const current = user?.reputation_score ?? 100;
  const newScore = Math.max(0, Math.min(100, current + delta));

  const { error } = await admin
    .from("users")
    .update({ reputation_score: newScore })
    .eq("id", userId);
  if (error) throw error;
}

export async function findStaffUsers(): Promise<UserRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("*")
    .in("role", ["master", "moderator"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as UserRow[];
}

export async function updateUserRole(
  userId: string,
  role: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ role: role as "member" | "moderator" | "master" })
    .eq("id", userId);
  if (error) throw error;
}

export async function findModeratorPermissions(
  userId: string,
): Promise<ModeratorPermissionRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("moderator_permissions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as ModeratorPermissionRow) ?? null;
}

export async function upsertModeratorPermissions(
  userId: string,
  permissions: Partial<ModeratorPermissionRow>,
  updatedBy: string,
): Promise<void> {
  const admin = createAdminClient();

  const existing = await findModeratorPermissions(userId);
  if (existing) {
    const { error } = await admin
      .from("moderator_permissions")
      .update({
        ...permissions,
        updated_by: updatedBy,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await admin.from("moderator_permissions").insert({
      user_id: userId,
      can_review_users: false,
      can_grant_exp: false,
      can_deduct_exp: false,
      can_handle_reports: false,
      can_manage_events: false,
      can_manage_announcements: false,
      can_manage_invitations: false,
      can_view_analytics: false,
      can_manage_ads: false,
      ...permissions,
      updated_by: updatedBy,
    });
    if (error) throw error;
  }
}

export async function findAllSystemSettings(): Promise<SystemSettingRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("system_settings")
    .select("*")
    .order("key", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SystemSettingRow[];
}

export async function updateSystemSetting(
  key: string,
  value: string,
  updatedBy: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("system_settings").upsert(
    {
      key,
      value,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw error;
}

// ─── EXP Batch Grant ───

async function grantExpToSingleUser(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  delta: number,
  source: string,
): Promise<void> {
  const { error: logErr } = await admin.from("exp_logs").insert({
    user_id: userId,
    source,
    unique_key: `admin_grant:${source}:${userId}`,
    delta,
    delta_exp: delta,
  });
  if (logErr) throw logErr;

  const { data: u, error: readErr } = await admin
    .from("users")
    .select("total_exp")
    .eq("id", userId)
    .single();
  if (readErr) throw readErr;

  const newExp = Math.max(0, (u?.total_exp ?? 0) + delta);
  const { error: updateErr } = await admin
    .from("users")
    .update({ total_exp: newExp })
    .eq("id", userId);
  if (updateErr) throw updateErr;
}

export async function batchGrantExp(params: {
  userIds: string[];
  delta: number;
  source: string;
  adminId: string;
}): Promise<{
  success: number;
  failed: number;
  successfulUserIds: string[];
}> {
  const admin = createAdminClient();
  const results = await Promise.allSettled(
    params.userIds.map((uid) =>
      grantExpToSingleUser(admin, uid, params.delta, params.source),
    ),
  );
  let success = 0;
  let failed = 0;
  const successfulUserIds: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      success++;
      const id = params.userIds[i];
      if (id) successfulUserIds.push(id);
    } else {
      failed++;
      console.error("batchGrantExp single failed:", r.reason);
    }
  });
  return { success, failed, successfulUserIds };
}

export async function grantExpToAll(params: {
  delta: number;
  source: string;
  adminId: string;
}): Promise<{
  success: number;
  failed: number;
  successfulUserIds: string[];
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id")
    .eq("status", "active");
  if (error) throw error;

  const userIds = (data ?? []).map((u: { id: string }) => u.id);
  return batchGrantExp({ ...params, userIds });
}

export async function grantExpByLevel(params: {
  minLevel: number;
  maxLevel: number;
  delta: number;
  source: string;
  adminId: string;
}): Promise<{
  success: number;
  failed: number;
  successfulUserIds: string[];
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id")
    .eq("status", "active")
    .gte("level", params.minLevel)
    .lte("level", params.maxLevel);
  if (error) throw error;

  const userIds = (data ?? []).map((u: { id: string }) => u.id);
  return batchGrantExp({ ...params, userIds });
}

export async function findExpLogsByUser(
  userId: string,
  page: number,
): Promise<{ logs: ExpLogRow[]; total: number }> {
  const admin = createAdminClient();
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await admin
    .from("exp_logs")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { logs: (data ?? []) as ExpLogRow[], total: count ?? 0 };
}

export type AdminExpGrantSummary = {
  source: string;
  total_users: number;
  total_exp: number;
  created_at: string;
};

export async function findAdminExpGrantHistory(): Promise<
  AdminExpGrantSummary[]
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("exp_logs")
    .select("source, delta_exp, created_at")
    .like("unique_key", "admin_grant:%")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    source: string;
    delta_exp: number;
    created_at: string;
  }>;

  const map = new Map<
    string,
    { total_users: number; total_exp: number; created_at: string }
  >();
  for (const r of rows) {
    const existing = map.get(r.source);
    if (existing) {
      existing.total_users++;
      existing.total_exp += r.delta_exp;
      if (r.created_at < existing.created_at) {
        existing.created_at = r.created_at;
      }
    } else {
      map.set(r.source, {
        total_users: 1,
        total_exp: r.delta_exp,
        created_at: r.created_at,
      });
    }
  }

  return Array.from(map.entries())
    .map(([source, v]) => ({ source, ...v }))
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

// ─── Advertisement Management ───

export async function findAllAdvertisements(): Promise<AdvertisementRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("advertisements")
    .select("*")
    .order("position")
    .order("weight", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdvertisementRow[];
}

export async function findActiveHomeAds(): Promise<AdvertisementRow[]> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const fetchByPosition = async (
    position: "banner" | "card",
    limit: number,
  ): Promise<AdvertisementRow[]> => {
    const { data, error } = await admin
      .from("advertisements")
      .select("*")
      .eq("is_active", true)
      .eq("position", position)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order("weight", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as AdvertisementRow[];
  };

  const [banners, cards] = await Promise.all([
    fetchByPosition("banner", 15),
    fetchByPosition("card", 3),
  ]);
  return [...banners, ...cards];
}

export async function insertAdvertisement(payload: {
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  position: "banner" | "card" | "announcement";
  weight: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string;
}): Promise<AdvertisementRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("advertisements")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as AdvertisementRow;
}

export async function updateAdvertisement(
  id: string,
  payload: Partial<AdvertisementRow>,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("advertisements")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAdvertisement(id: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("advertisements")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function recordAdClick(
  adId: string,
  userId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error: clickErr } = await admin
    .from("ad_clicks")
    .insert({ ad_id: adId, user_id: userId });
  if (clickErr) console.error("recordAdClick insert:", clickErr);

  const { data: ad } = await admin
    .from("advertisements")
    .select("click_count")
    .eq("id", adId)
    .single();
  if (ad) {
    await admin
      .from("advertisements")
      .update({ click_count: (ad.click_count ?? 0) + 1 })
      .eq("id", adId);
  }
}
