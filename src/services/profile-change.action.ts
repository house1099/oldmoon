"use server";

import { revalidateTag, unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateSystemSetting } from "@/lib/repositories/server/admin.repository";
import { findSystemSettingByKey } from "@/lib/repositories/server/invitation.repository";
import {
  approveRequest,
  cancelRequest,
  countPendingRequests,
  createRequest,
  findAllRequestsForAdmin,
  findById,
  findMasterUserIds,
  findPendingRequestByUser,
  findPendingRequestsForAdmin,
  rejectRequest,
  type ProfileChangeRequestWithUser,
} from "@/lib/repositories/server/profile-change.repository";
import { requireRole } from "@/services/admin.action";
import { notifyUserMailboxSilent } from "@/services/notification.action";
import { profileCacheTag } from "@/lib/supabase/get-cached-profile";
import { ALL_TAIWAN_CITIES } from "@/lib/utils/matchmaker-region";
import type {
  ProfileChangeRequestRow,
  ProfileChangeStatus,
} from "@/types/database.types";

const TAIWAN_REGION_SET = new Set<string>(ALL_TAIWAN_CITIES);

const ORIENTATION_SET = new Set([
  "heterosexual",
  "homosexual",
  "pansexual",
]);

function isValidNewRegion(raw: string): boolean {
  const t = raw.trim();
  if (TAIWAN_REGION_SET.has(t)) {
    return t.length >= 2 && t.length <= 10;
  }
  /* 與註冊 `海外・{細節}` 一致；總長度上限避免濫用 */
  if (t.startsWith("海外・")) {
    return t.length >= 4 && t.length <= 100;
  }
  return false;
}

function validateSubmittedFields(input: {
  newRegion?: string;
  newOrientation?: string;
  newBirthYear?: number;
  newHeightCm?: number;
  note?: string;
}): { ok: true } | { ok: false; error: string } {
  const hasRegion =
    input.newRegion !== undefined &&
    String(input.newRegion).trim().length > 0;
  const hasOrientation =
    input.newOrientation !== undefined &&
    String(input.newOrientation).trim().length > 0;
  const hasBirth =
    input.newBirthYear !== undefined && input.newBirthYear !== null;
  const hasHeight =
    input.newHeightCm !== undefined && input.newHeightCm !== null;
  if (!hasRegion && !hasOrientation && !hasBirth && !hasHeight) {
    return { ok: false, error: "no_fields" };
  }

  if (hasRegion && !isValidNewRegion(String(input.newRegion))) {
    return { ok: false, error: "地區格式不符（請選擇縣市或海外・地點）。" };
  }
  if (hasOrientation) {
    const o = String(input.newOrientation).trim();
    if (!ORIENTATION_SET.has(o)) {
      return { ok: false, error: "性向選項無效。" };
    }
  }
  if (hasBirth) {
    const y = input.newBirthYear!;
    if (!Number.isInteger(y) || y < 1940 || y > 2006) {
      return { ok: false, error: "出生年須為 1940–2006 的整數。" };
    }
  }
  if (hasHeight) {
    const h = input.newHeightCm!;
    if (!Number.isInteger(h) || h < 100 || h > 250) {
      return { ok: false, error: "invalid_height" };
    }
  }
  return { ok: true };
}

export async function getMyPendingChangeRequestAction(): Promise<ProfileChangeRequestRow | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  try {
    return await findPendingRequestByUser(user.id);
  } catch (e) {
    console.error("❌ findPendingRequestByUser:", e);
    return null;
  }
}

export async function submitProfileChangeRequestAction(input: {
  newRegion?: string;
  newOrientation?: string;
  newBirthYear?: number;
  newHeightCm?: number;
  note?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "未登入" };
  }

  const v = validateSubmittedFields(input);
  if (!v.ok) {
    if (v.error === "no_fields") {
      return { ok: false, error: "no_fields" };
    }
    if (v.error === "invalid_height") {
      return { ok: false, error: "invalid_height" };
    }
    return { ok: false, error: v.error };
  }

  try {
    const pending = await findPendingRequestByUser(user.id);
    if (pending) {
      return { ok: false, error: "already_pending" };
    }

    await createRequest({
      user_id: user.id,
      new_region:
        input.newRegion !== undefined && String(input.newRegion).trim() !== ""
          ? String(input.newRegion).trim()
          : null,
      new_orientation:
        input.newOrientation !== undefined &&
        String(input.newOrientation).trim() !== ""
          ? String(input.newOrientation).trim()
          : null,
      new_birth_year:
        input.newBirthYear !== undefined ? input.newBirthYear : null,
      new_height_cm:
        input.newHeightCm !== undefined ? input.newHeightCm : null,
      note:
        input.note !== undefined && String(input.note).trim() !== ""
          ? String(input.note).trim()
          : null,
    });

    const masterIds = await findMasterUserIds();
    const msg = "📝 有新的基本資料變更申請，請至後台審核";
    await Promise.allSettled(
      masterIds.map((id) =>
        notifyUserMailboxSilent({
          user_id: id,
          type: "system",
          message: msg,
          is_read: false,
        }),
      ),
    );

    return { ok: true };
  } catch (e) {
    console.error("❌ submitProfileChangeRequestAction:", e);
    return { ok: false, error: "送出申請失敗，請稍後再試。" };
  }
}

export async function cancelProfileChangeRequestAction(
  requestId: string,
): Promise<{ ok: boolean }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false };
  }
  try {
    await cancelRequest(requestId, user.id);
    return { ok: true };
  } catch (e) {
    console.error("❌ cancelProfileChangeRequestAction:", e);
    return { ok: false };
  }
}

export async function getPendingProfileChangeRequestsAction(): Promise<
  ProfileChangeRequestWithUser[]
> {
  try {
    await requireRole(["master", "moderator"]);
    return await findPendingRequestsForAdmin();
  } catch (e) {
    console.error("❌ getPendingProfileChangeRequestsAction:", e);
    return [];
  }
}

export async function getAllProfileChangeRequestsAction(filters?: {
  status?: ProfileChangeStatus;
  nickname?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  data: ProfileChangeRequestWithUser[];
  total: number;
}> {
  try {
    await requireRole(["master", "moderator"]);
    return await findAllRequestsForAdmin(filters);
  } catch (e) {
    console.error("❌ getAllProfileChangeRequestsAction:", e);
    return { data: [], total: 0 };
  }
}

export async function approveProfileChangeRequestAction(
  requestId: string,
): Promise<{ ok: boolean }> {
  try {
    const { user } = await requireRole(["master", "moderator"]);
    const row = await approveRequest(requestId, user.id);
    await notifyUserMailboxSilent({
      user_id: row.user_id,
      type: "profile_change_approved",
      message:
        "✅ 你的基本資料變更申請已通過！請回到「基本資料」頁面確認並補充資料。",
      is_read: false,
    });
    revalidateTag(profileCacheTag(row.user_id));
    return { ok: true };
  } catch (e) {
    console.error("❌ approveProfileChangeRequestAction:", e);
    return { ok: false };
  }
}

export async function rejectProfileChangeRequestAction(
  requestId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = String(reason ?? "").trim();
  if (!trimmed) {
    return { ok: false, error: "reason_required" };
  }
  try {
    const { user } = await requireRole(["master", "moderator"]);
    const req = await findById(requestId);
    if (!req) {
      return { ok: false };
    }
    await rejectRequest(requestId, user.id, trimmed);
    await notifyUserMailboxSilent({
      user_id: req.user_id,
      type: "system",
      message: `❌ 你的基本資料變更申請未通過審核。原因：${trimmed}`,
      is_read: false,
    });
    return { ok: true };
  } catch (e) {
    console.error("❌ rejectProfileChangeRequestAction:", e);
    return { ok: false };
  }
}

export async function getPendingProfileChangeCountAction(): Promise<number> {
  try {
    await requireRole(["master", "moderator"]);
    return await countPendingRequests();
  } catch (e) {
    console.error("❌ getPendingProfileChangeCountAction:", e);
    return 0;
  }
}

async function loadProfileBannerSettings(): Promise<{
  enabled: boolean;
  title: string;
  force: boolean;
  checkMatchmakerFields: boolean;
}> {
  const [en, title, force, mm] = await Promise.all([
    findSystemSettingByKey("profile_banner_enabled"),
    findSystemSettingByKey("profile_banner_title"),
    findSystemSettingByKey("profile_banner_force"),
    findSystemSettingByKey("banner_check_matchmaker_fields"),
  ]);
  return {
    enabled: en === "true",
    title:
      title?.trim() ??
      "🎣 新功能上線！請補充你的冒險者資料",
    force: force === "true",
    checkMatchmakerFields: mm === "true",
  };
}

const getCachedProfileBannerSettings = unstable_cache(
  loadProfileBannerSettings,
  ["profile-banner-settings"],
  { revalidate: 60, tags: ["system_settings"] },
);

export async function getProfileBannerSettingsAction(): Promise<{
  enabled: boolean;
  title: string;
  force: boolean;
  checkMatchmakerFields: boolean;
}> {
  return getCachedProfileBannerSettings();
}

export async function updateProfileBannerSettingsAction(settings: {
  enabled?: boolean;
  title?: string;
  force?: boolean;
}): Promise<{ ok: boolean }> {
  try {
    const { user } = await requireRole(["master"]);
    if (settings.enabled !== undefined) {
      await updateSystemSetting(
        "profile_banner_enabled",
        settings.enabled ? "true" : "false",
        user.id,
      );
    }
    if (settings.title !== undefined) {
      await updateSystemSetting(
        "profile_banner_title",
        settings.title,
        user.id,
      );
    }
    if (settings.force !== undefined) {
      await updateSystemSetting(
        "profile_banner_force",
        settings.force ? "true" : "false",
        user.id,
      );
    }
    revalidateTag("system_settings");
    return { ok: true };
  } catch (e) {
    console.error("❌ updateProfileBannerSettingsAction:", e);
    return { ok: false };
  }
}
