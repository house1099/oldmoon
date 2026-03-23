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
 * 可傳入部分欄位；**`mood` 出現在 input** 時一併寫入 **`mood_at`**（可傳 `mood_at` ISO 字串，否則伺服端用當下時間）。
 */
const AVATAR_URL_MAX = 2048;

function coerceMoodAtIso(raw: string | undefined): string {
  if (raw === undefined || raw.trim() === "") {
    return new Date().toISOString();
  }
  const t = Date.parse(raw);
  if (Number.isNaN(t)) {
    return new Date().toISOString();
  }
  return new Date(t).toISOString();
}

export async function updateMyProfile(input: {
  bio?: string;
  ig_public?: boolean;
  mood?: string;
  /** 與 `mood` 一併寫入；省略時由伺服端設為當下時間 */
  mood_at?: string | null;
  /** 大頭貼公開 HTTPS URL（**Cloudinary `secure_url`**；**勿**經 Supabase Storage 上傳） */
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
    patch.mood_at =
      moodTrimmed.length > 0
        ? input.mood_at != null && String(input.mood_at).trim() !== ""
          ? coerceMoodAtIso(String(input.mood_at))
          : new Date().toISOString()
        : null;
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
