"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  findProfileById,
  updateProfile,
  type UserUpdate,
} from "@/lib/repositories/server/user.repository";
import { instagramHandleSchema } from "@/lib/validation/instagram-handle";
import { nicknameSchema } from "@/lib/validation/nickname";
import { profileCacheTag } from "@/lib/supabase/get-cached-profile";
import { findSystemSettingByKey } from "@/lib/repositories/server/invitation.repository";
import { getTagLimitsAction } from "@/services/system-settings.action";

/**
 * Layer 3：編輯公會名片（通用 bio、分域自白、**`instagram_handle`**、IG 公開、每日心情、頭像 URL、**`interests`／`skills_offer`／`skills_want`** 標籤陣列）。
 * 可傳入部分欄位；**`mood` 出現在 input** 時一併寫入 **`mood_at`**（可傳 `mood_at` ISO 字串，否則伺服端用當下時間）。
 */
const AVATAR_URL_MAX = 2048;
const MOOD_HARD_CAP = 500;
const MOOD_DEFAULT_MAX = 50;

async function effectiveMoodMaxFromDb(): Promise<number> {
  const raw = await findSystemSettingByKey("mood_max_length");
  const n = parseInt((raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n < 1) return MOOD_DEFAULT_MAX;
  return Math.min(n, MOOD_HARD_CAP);
}

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
  bio_village?: string;
  bio_market?: string;
  /** 改名卡等情境；經 nicknameSchema（含不雅字過濾） */
  nickname?: string;
  ig_public?: boolean;
  instagram_handle?: string | null;
  mood?: string;
  /** 與 `mood` 一併寫入；省略時由伺服端設為當下時間 */
  mood_at?: string | null;
  /** 大頭貼公開 HTTPS URL（**Cloudinary `secure_url`**；**勿**經 Supabase Storage 上傳） */
  avatar_url?: string | null;
  interests?: string[];
  skills_offer?: string[];
  skills_want?: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (
    input.bio === undefined &&
    input.bio_village === undefined &&
    input.bio_market === undefined &&
    input.nickname === undefined &&
    input.ig_public === undefined &&
    input.instagram_handle === undefined &&
    input.mood === undefined &&
    input.avatar_url === undefined &&
    input.interests === undefined &&
    input.skills_offer === undefined &&
    input.skills_want === undefined
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
  if (input.bio_village !== undefined) {
    const t = input.bio_village.trim();
    patch.bio_village = t.length > 0 ? t : null;
  }
  if (input.bio_market !== undefined) {
    const t = input.bio_market.trim();
    patch.bio_market = t.length > 0 ? t : null;
  }
  if (input.nickname !== undefined) {
    const parsed = nicknameSchema.safeParse(input.nickname);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "暱稱格式錯誤",
      };
    }
    patch.nickname = parsed.data;
  }
  if (input.ig_public !== undefined) {
    patch.ig_public = input.ig_public;
  }
  if (input.instagram_handle !== undefined) {
    const t = String(input.instagram_handle).trim();
    if (t.length === 0) {
      patch.instagram_handle = null;
    } else {
      const parsed = instagramHandleSchema.safeParse(t);
      if (!parsed.success) {
        const msg = parsed.error.flatten().formErrors[0];
        return {
          ok: false,
          error: msg ?? "IG 帳號格式不符。",
        };
      }
      patch.instagram_handle = parsed.data;
    }
  }
  if (input.mood !== undefined) {
    const moodTrimmed = input.mood.trim();
    const moodMax = await effectiveMoodMaxFromDb();
    if (moodTrimmed.length > moodMax) {
      return { ok: false, error: `心情最多 ${moodMax} 字` };
    }
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
  if (input.interests !== undefined) {
    const cleaned = Array.from(
      new Set(
        input.interests.filter(
          (t): t is string => typeof t === "string" && t.trim().length > 0,
        ),
      ),
    );
    if (cleaned.length < 1) {
      return { ok: false, error: "興趣至少需要保留 1 個標籤。" };
    }
    const { interestsMax } = await getTagLimitsAction();
    if (cleaned.length > interestsMax) {
      return {
        ok: false,
        error: `興趣標籤最多 ${interestsMax} 個。`,
      };
    }
    patch.interests = cleaned;
  }
  if (input.skills_offer !== undefined) {
    patch.skills_offer = input.skills_offer;
  }
  if (input.skills_want !== undefined) {
    patch.skills_want = input.skills_want;
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
          "資料庫尚未對齊（例如缺少 bio／bio_village／bio_market／instagram_handle／ig_public／mood 欄位），請聯絡管理員。",
      };
    }
    return { ok: false, error: "儲存失敗，請稍後再試。" };
  }

  revalidatePath("/");
  revalidatePath("/profile/edit-tags");
  revalidatePath("/register/pending");
  revalidateTag(profileCacheTag(user.id));
  return { ok: true };
}
