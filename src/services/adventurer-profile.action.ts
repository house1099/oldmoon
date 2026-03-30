"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createProfile } from "@/lib/repositories/server/user.repository";
import { profileCacheTag } from "@/lib/supabase/get-cached-profile";
import { claimInvitationCodeAction } from "@/services/invitation.action";

import {
  offlineIntentToOfflineOk,
  type GenderValue,
  type OfflineIntentValue,
  type OrientationValue,
} from "@/lib/constants/adventurer-questionnaire";
import { instagramHandleSchema } from "@/lib/validation/instagram-handle";
import { adventurerNicknameSchema } from "@/lib/validation/nickname";

/**
 * 問卷：`gender`／性向／線下意願為英文 slug；**`region`** 為繁中地區字串（含 `海外・…`）。
 */
export type AdventurerQuestionnaire = {
  gender: GenderValue;
  region: string;
  orientation: OrientationValue;
  offlineIntent: OfflineIntentValue;
};

/**
 * Layer 3：補齊公會檔（`users` 列）：`nickname`、`gender`、`region`、`orientation`、`offline_ok` 等。
 * `total_exp`／`level` 初值依 SSOT（Lv1 起算）。
 */
export async function completeAdventurerProfile(input: {
  nickname: string;
  questionnaire: AdventurerQuestionnaire;
  /** 三題核心價值觀，依序對應 `CORE_VALUES_QUESTIONS` */
  coreValues: string[];
  /** 興趣 slug 列表；建檔時傳空陣列，須於 `/register/interests` → **`completeRegistration`** 寫入至少 1 筆 */
  interests: string[];
  /**
   * OAuth（如 Google）略過註冊 Step1 時，`user_metadata` 可能無 IG；
   * 此時由 Profile 表單補填。若 metadata 已有 `instagram_handle` 則優先採用 metadata。
   */
  instagramHandleFromForm?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "工作階段已失效，請重新登入。" };
  }

  const nickResult = adventurerNicknameSchema.safeParse(input.nickname);
  if (!nickResult.success) {
    const msg = nickResult.error.issues[0]?.message ?? "暱稱無效";
    return { ok: false, error: msg };
  }
  const nickname = nickResult.data;

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const rawMetaIg = meta?.instagram_handle;
  const fromMeta =
    typeof rawMetaIg === "string" && rawMetaIg.trim().length > 0
      ? rawMetaIg.trim()
      : null;

  let instagram_handle: string | null = fromMeta;

  if (!instagram_handle) {
    const igParsed = instagramHandleSchema.safeParse(
      input.instagramHandleFromForm ?? "",
    );
    if (!igParsed.success) {
      const msg = igParsed.error.issues[0]?.message ?? "IG 帳號無效";
      return { ok: false, error: msg };
    }
    instagram_handle = igParsed.data;
  }

  if (input.coreValues.length !== 3) {
    return { ok: false, error: "請完成三題核心價值觀。" };
  }

  if (input.interests.length > 12) {
    return { ok: false, error: "興趣標籤最多 12 個。" };
  }

  const q = input.questionnaire;
  const regionTrimmed = q.region.trim();
  if (regionTrimmed.length === 0) {
    return { ok: false, error: "請選擇或填寫地區。" };
  }
  if (regionTrimmed.length > 120) {
    return { ok: false, error: "地區內容過長。" };
  }

  try {
    // 註冊建檔不帶 `bio`：雲端欄位／schema 快取未齊時可避免 PostgREST 報「找不到 bio」；自介可於個人頁後補。
    await createProfile({
      id: user.id,
      nickname,
      core_values: input.coreValues,
      gender: q.gender,
      region: regionTrimmed,
      orientation: q.orientation,
      offline_ok: offlineIntentToOfflineOk(q.offlineIntent),
      status: "pending", // 雙重保險：與 DB `users.status` DEFAULT 一致（見遷移／Supabase）
      total_exp: 0, // users 表欄位名為 total_exp，非 exp
      level: 1,
      interests: input.interests,
      instagram_handle,
      ig_public: false,
      mood: null,
      mood_at: null,
    });
  } catch (error) {
    console.error("❌ 伺服器寫入失敗詳細原因:", error);
    const err = error as { code?: string; message?: string };
    const code = err.code ? String(err.code) : "";
    if (code === "23505") {
      return {
        ok: false,
        error: "公會名冊已有你的紀錄，請重新整理或聯絡管理員。",
      };
    }
    if (code === "42703" || err.message?.includes("does not exist")) {
      return {
        ok: false,
        error:
          "資料庫欄位與程式不一致。請在 Supabase 確認 **`public.users`** 欄位（含 **`interests` 須為 `text[]`**），並於 Dashboard → **Settings → API** 重新載入 **Schema** 後再試。",
      };
    }
    if (code === "23502") {
      return {
        ok: false,
        error: "缺少必要欄位，請聯絡管理員檢查 users 表 NOT NULL／預設值。",
      };
    }
    return { ok: false, error: "建立檔案時發生錯誤，請稍後再試。" };
  }

  // Email 註冊（signUp data）與 Google OAuth（`/register/invite` → saveInviteCodeToMetadataAction）皆寫入此欄
  const inviteRaw = meta?.invite_code;
  const inviteStr =
    typeof inviteRaw === "string" ? inviteRaw.trim() : "";
  if (inviteStr) {
    const claim = await claimInvitationCodeAction(inviteStr, user.id);
    if (!claim.success) {
      console.error(
        "邀請碼核銷失敗（註冊仍完成）:",
        claim.error ?? claim,
      );
    }
  }

  revalidatePath("/");
  revalidateTag(profileCacheTag(user.id));
  return { ok: true };
}
