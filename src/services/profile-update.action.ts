"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  findProfileById,
  updateProfile,
  type UserUpdate,
} from "@/lib/repositories/server/user.repository";

/**
 * Layer 3：編輯公會名片（自介、IG 公開、每日心情）。
 * 可傳入部分欄位；僅在 **`mood` 出現在 input** 時更新 `mood_at`（避免只改自介卻刷新心情時間）。
 */
const AVATAR_URL_MAX = 2048;

export async function updateMyProfile(input: {
  bio?: string;
  ig_public?: boolean;
  mood?: string;
  /** 大頭貼公開 URL（通常來自 Storage `avatars` bucket） */
  avatar_url?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (
    input.bio === undefined &&
    input.ig_public === undefined &&
    input.mood === undefined &&
    input.avatar_url === undefined
  ) {
    return { ok: false, error: "沒有要更新的項目。" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "請先登入。" };
  }

  const existing = await findProfileById(user.id);
  if (!existing) {
    return { ok: false, error: "找不到冒險者資料。" };
  }

  const patch: UserUpdate = {};
  if (input.bio !== undefined) {
    const bioTrimmed = input.bio.trim();
    patch.bio = bioTrimmed.length > 0 ? bioTrimmed : null;
  }
  if (input.ig_public !== undefined) {
    patch.ig_public = input.ig_public;
  }
  if (input.mood !== undefined) {
    const moodTrimmed = input.mood.trim();
    patch.mood = moodTrimmed.length > 0 ? moodTrimmed : null;
    patch.mood_at = moodTrimmed.length > 0 ? new Date().toISOString() : null;
  }
  if (input.avatar_url !== undefined) {
    const u = input.avatar_url?.trim() ?? "";
    if (u.length > AVATAR_URL_MAX) {
      return { ok: false, error: "頭像網址過長。" };
    }
    if (u.length > 0 && !/^https:\/\//i.test(u)) {
      return { ok: false, error: "頭像必須為 HTTPS 網址。" };
    }
    patch.avatar_url = u.length > 0 ? u : null;
  }

  try {
    await updateProfile(user.id, patch);
  } catch (error) {
    console.error("❌ 更新個人資料失敗 — raw:", error);
    if (error && typeof error === "object") {
      console.error(
        "❌ 更新個人資料失敗 — serialized:",
        JSON.stringify(error, Object.getOwnPropertyNames(error)),
      );
    }
    const err = error as { code?: string; message?: string };
    if (err.code === "42703" || err.message?.includes("does not exist")) {
      return {
        ok: false,
        error:
          "資料庫尚未對齊（例如缺少 bio／ig_public／mood 欄位），請聯絡管理員。",
      };
    }
    return { ok: false, error: "儲存失敗，請稍後再試。" };
  }

  revalidatePath("/");
  return { ok: true };
}
