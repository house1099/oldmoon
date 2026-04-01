import { createAdminClient } from "@/lib/supabase/admin";
import type {
  ProfileChangeRequestInsert,
  ProfileChangeRequestRow,
  ProfileChangeStatus,
} from "@/types/database.types";
import type { UserUpdate } from "@/lib/repositories/server/user.repository";

const USER_EMBED =
  "users!profile_change_requests_user_id_fkey ( nickname, avatar_url, region, orientation, birth_year )";
const REVIEWER_EMBED =
  "reviewer:users!profile_change_requests_reviewed_by_fkey ( nickname )";
const ADMIN_SELECT = `*, ${USER_EMBED}, ${REVIEWER_EMBED}`;

const DEFAULT_PAGE_SIZE = 20;

export interface ProfileChangeRequestWithUser extends ProfileChangeRequestRow {
  user: {
    nickname: string;
    avatar_url: string | null;
    region: string | null;
    orientation: string | null;
    birth_year: number | null;
  };
  reviewer_nickname: string | null;
}

type RawWithUser = ProfileChangeRequestRow & {
  users: {
    nickname: string;
    avatar_url: string | null;
    region: string | null;
    orientation: string | null;
    birth_year: number | null;
  } | null;
  reviewer: { nickname: string | null } | null;
};

function toWithUser(raw: RawWithUser): ProfileChangeRequestWithUser {
  const { users: u, reviewer, ...rest } = raw;
  if (!u) {
    throw new Error("profile_change_requests: 缺少關聯用戶資料");
  }
  return {
    ...rest,
    user: {
      nickname: u.nickname,
      avatar_url: u.avatar_url,
      region: u.region,
      orientation: u.orientation,
      birth_year: u.birth_year,
    },
    reviewer_nickname: reviewer?.nickname ?? null,
  };
}

export async function findById(
  requestId: string,
): Promise<ProfileChangeRequestRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profile_change_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  return data as ProfileChangeRequestRow | null;
}

export async function findPendingRequestByUser(
  userId: string,
): Promise<ProfileChangeRequestRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profile_change_requests")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  if (error) throw error;
  return data as ProfileChangeRequestRow | null;
}

export async function createRequest(
  data: ProfileChangeRequestInsert,
): Promise<ProfileChangeRequestRow> {
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("profile_change_requests")
    .insert({
      user_id: data.user_id,
      new_region: data.new_region ?? null,
      new_orientation: data.new_orientation ?? null,
      new_birth_year: data.new_birth_year ?? null,
      note: data.note ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return row as ProfileChangeRequestRow;
}

export async function cancelRequest(
  requestId: string,
  userId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profile_change_requests")
    .delete()
    .eq("id", requestId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id");
  if (error) throw error;
  if (!data?.length) {
    throw new Error("找不到可撤回的待審核申請。");
  }
}

export async function findPendingRequestsForAdmin(): Promise<
  ProfileChangeRequestWithUser[]
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profile_change_requests")
    .select(ADMIN_SELECT)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => toWithUser(r as RawWithUser));
}

export async function findAllRequestsForAdmin(filters?: {
  status?: ProfileChangeStatus;
  nickname?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: ProfileChangeRequestWithUser[]; total: number }> {
  const admin = createAdminClient();
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.max(1, filters?.pageSize ?? DEFAULT_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let userIds: string[] | null = null;
  const nn = filters?.nickname?.trim();
  if (nn) {
    const { data: matched, error } = await admin
      .from("users")
      .select("id")
      .ilike("nickname", `%${nn}%`);
    if (error) throw error;
    userIds = (matched ?? []).map((u) => u.id as string);
    if (userIds.length === 0) {
      return { data: [], total: 0 };
    }
  }

  let q = admin
    .from("profile_change_requests")
    .select(ADMIN_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const st = filters?.status;
  if (st) {
    q = q.eq("status", st);
  }
  if (userIds) {
    q = q.in("user_id", userIds);
  }

  const { data, error, count } = await q;
  if (error) throw error;
  const rows = (data ?? []).map((r) => toWithUser(r as RawWithUser));
  return { data: rows, total: count ?? 0 };
}

export async function approveRequest(
  requestId: string,
  reviewerId: string,
): Promise<ProfileChangeRequestRow> {
  const admin = createAdminClient();
  const req = await findById(requestId);
  if (!req) {
    throw new Error("找不到申請。");
  }
  if (req.status !== "pending") {
    throw new Error("此申請已非待審核狀態。");
  }

  const updates: UserUpdate = {};
  if (req.new_region != null && req.new_region !== "") {
    updates.region = req.new_region;
  }
  if (req.new_orientation != null && req.new_orientation !== "") {
    updates.orientation = req.new_orientation;
  }
  if (req.new_birth_year != null) {
    updates.birth_year = req.new_birth_year;
  }

  if (Object.keys(updates).length > 0) {
    const { error: userErr } = await admin
      .from("users")
      .update(updates)
      .eq("id", req.user_id);
    if (userErr) throw userErr;
  }

  const reviewedAt = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("profile_change_requests")
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: reviewedAt,
    })
    .eq("id", requestId)
    .select()
    .single();
  if (error) throw error;
  return updated as ProfileChangeRequestRow;
}

export async function rejectRequest(
  requestId: string,
  reviewerId: string,
  reason: string,
): Promise<void> {
  const admin = createAdminClient();
  const req = await findById(requestId);
  if (!req) {
    throw new Error("找不到申請。");
  }
  if (req.status !== "pending") {
    throw new Error("此申請已非待審核狀態。");
  }

  const { error } = await admin
    .from("profile_change_requests")
    .update({
      status: "rejected",
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reject_reason: reason,
    })
    .eq("id", requestId);
  if (error) throw error;
}

export async function countPendingRequests(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("profile_change_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

/** 通知用：所有 master 的 user id */
export async function findMasterUserIds(): Promise<string[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id")
    .eq("role", "master");
  if (error) throw error;
  return (data ?? []).map((r) => r.id as string);
}
