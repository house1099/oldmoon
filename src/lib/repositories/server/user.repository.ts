import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

/**
 * 執行時剔除已廢棄鍵 **`exp`**，必要時映到 **`total_exp`**，避免 PostgREST／雲端 42703。
 * （SSOT 欄位名為 **`total_exp`**；若 Trigger 仍引用 `users.exp` 須於 🗄️ 一併修正。）
 */
function normalizeUserWritePayload<T extends Record<string, unknown>>(row: T): T {
  const o: Record<string, unknown> = { ...row };
  if (!("exp" in o)) {
    return o as T;
  }
  const legacy = o.exp;
  if (o.total_exp === undefined && typeof legacy === "number") {
    o.total_exp = legacy;
  }
  delete o.exp;
  return o as T;
}

/**
 * Layer 2：users 表存取（伺服端，使用 admin client 以略過 RLS 做管理查詢／建檔）。
 */
export async function findProfileById(id: string): Promise<UserRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as UserRow | null;
}

/**
 * 新增 `public.users` 一列。欄位須與雲端一致（含 **`total_exp`**，勿傳 `exp`）。
 * 若雲端尚無 `bio`／`core_values`，請於 Supabase 補欄後再部署。
 */
export async function createProfile(data: UserInsert): Promise<UserRow> {
  const admin = createAdminClient();
  const payload = normalizeUserWritePayload(
    data as unknown as Record<string, unknown>,
  ) as UserInsert;
  const { data: row, error } = await admin
    .from("users")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return row as UserRow;
}

/**
 * 更新既有使用者列（略過 RLS）。用於 Layer 3 個人資料編修等。
 */
export async function updateProfile(
  id: string,
  patch: UserUpdate,
): Promise<UserRow> {
  const admin = createAdminClient();
  const payload = normalizeUserWritePayload(
    patch as unknown as Record<string, unknown>,
  ) as UserUpdate;
  const { data, error } = await admin
    .from("users")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as UserRow;
}

/**
 * 列出 **`status === 'active'`** 且**非目前使用者**的冒險者（村莊列表用）。
 * 排序：**`last_seen_at` 降序**（最活躍在前；未上線 `null` 排在後）。
 */
export async function findActiveUsers(
  currentUserId: string,
): Promise<UserRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("*")
    .eq("status", "active")
    .neq("id", currentUserId)
    .order("last_seen_at", { ascending: false, nullsFirst: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as UserRow[];
}

/**
 * 興趣村莊：同縣市、**`active`**，排除自己（Layer 3 再篩性向／排序）。
 */
export async function findVillageUsers(params: {
  currentUserId: string;
  region: string;
}): Promise<UserRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select(
      `
      id, nickname, gender, region, orientation,
      avatar_url, level, role, mood, mood_at,
      interests, skills_offer, skills_want,
      bio_village, bio_market, last_seen_at,
      instagram_handle, ig_public, activity_status, offline_ok
    `,
    )
    .eq("region", params.region)
    .eq("status", "active")
    .neq("activity_status", "hidden")
    .neq("id", params.currentUserId);

  if (error) {
    throw error;
  }

  return (data ?? []) as UserRow[];
}

/**
 * 興趣村莊：**全站** **`master`／`moderator`**（不受縣市限制），其餘條件同村莊列表。
 * 與 **`findVillageUsers`** 合併去重後由 Layer 3 置頂排序。
 */
export async function findVillageStaffUsersGlobally(params: {
  currentUserId: string;
}): Promise<UserRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select(
      `
      id, nickname, gender, region, orientation,
      avatar_url, level, role, mood, mood_at,
      interests, skills_offer, skills_want,
      bio_village, bio_market, last_seen_at,
      instagram_handle, ig_public, activity_status, offline_ok
    `,
    )
    .in("role", ["master", "moderator"])
    .eq("status", "active")
    .neq("activity_status", "hidden")
    .neq("id", params.currentUserId);

  if (error) {
    throw error;
  }

  return (data ?? []) as UserRow[];
}

/**
 * 技能市集：全台其他 **`active`** 冒險者（排除自己）；不含 IG 欄位。
 * 至少 **`skills_offer` 或 `skills_want` 其一為非 NULL 且非空陣列**（Layer 2 排除無技能者）。
 */
export async function findMarketUsers(params: {
  currentUserId: string;
}): Promise<UserRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select(
      `
      id, nickname, gender, region, orientation,
      avatar_url, level, total_exp, role, mood, mood_at,
      interests, skills_offer, skills_want,
      bio_village, bio_market, last_seen_at, activity_status, offline_ok
    `,
    )
    .eq("status", "active")
    .neq("activity_status", "hidden")
    .neq("id", params.currentUserId)
    .or(
      "and(skills_offer.not.is.null,skills_offer.neq.{}),and(skills_want.not.is.null,skills_want.neq.{})",
    );

  if (error) {
    throw error;
  }

  return (data ?? []) as UserRow[];
}

/**
 * 簽到成功後恢復 **`activity_status = active`**，信譽 **+1**（上限 100，等同 🗄️ `LEAST(reputation_score + 1, 100)`）。
 */
export async function restoreActivityOnCheckin(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: row, error: selErr } = await admin
    .from("users")
    .select("reputation_score")
    .eq("id", userId)
    .maybeSingle();

  if (selErr) {
    throw selErr;
  }

  const nextRep = Math.min((row?.reputation_score ?? 100) + 1, 100);
  const { error } = await admin
    .from("users")
    .update({
      activity_status: "active",
      reputation_score: nextRep,
    })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}

/** 簽到成功後寫入 **`last_checkin_at`**（台北自然日冷卻 SSOT，與 `taipeiCalendarDateKey` 比對）。 */
export async function updateLastCheckinAt(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({ last_checkin_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}

/** 月老魚候選池（Layer 3 再以年齡／地區／封鎖／硬鎖篩選） */
export type MatchmakerPoolCandidateRow = Pick<
  UserRow,
  | "id"
  | "nickname"
  | "avatar_url"
  | "region"
  | "birth_year"
  | "gender"
  | "orientation"
  | "matchmaker_age_mode"
  | "matchmaker_age_older"
  | "matchmaker_age_younger"
  | "matchmaker_region_pref"
  | "diet_type"
  | "smoking_habit"
  | "accept_smoking"
  | "my_pets"
  | "accept_pets"
  | "has_children"
  | "accept_single_parent"
  | "fertility_self"
  | "fertility_pref"
  | "marriage_view"
  | "zodiac"
  | "exclude_zodiac"
  | "v1_money"
  | "v3_clingy"
  | "v4_conflict"
  | "height_cm"
  | "pref_height"
>;

export async function findMatchmakerPoolCandidates(
  excludeUserId: string,
): Promise<MatchmakerPoolCandidateRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select(
      "id, nickname, avatar_url, region, birth_year, gender, orientation, matchmaker_age_mode, matchmaker_age_older, matchmaker_age_younger, matchmaker_region_pref, diet_type, smoking_habit, accept_smoking, my_pets, accept_pets, has_children, accept_single_parent, fertility_self, fertility_pref, marriage_view, zodiac, exclude_zodiac, v1_money, v3_clingy, v4_conflict, height_cm, pref_height",
    )
    .eq("status", "active")
    .neq("activity_status", "hidden")
    .eq("matchmaker_opt_in", true)
    .eq("relationship_status", "single")
    .not("birth_year", "is", null)
    .neq("id", excludeUserId)
    .limit(800);

  if (error) {
    throw error;
  }

  return (data ?? []) as MatchmakerPoolCandidateRow[];
}
