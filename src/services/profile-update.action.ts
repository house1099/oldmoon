"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "@/lib/repositories/server/user.repository";

/**
 * Layer 3：編輯公會名片（自介、IG 公開、每日心情）。
 * 清空心情時一併清除 `mood_at`。
 */
export async function updateMyProfile(input: {
  bio: string;
  ig_public: boolean;
  mood: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "請先登入。" };
  }

  const bioTrimmed = input.bio.trim();
  const moodTrimmed = input.mood.trim();

  try {
    await updateProfile(user.id, {
      bio: bioTrimmed.length > 0 ? bioTrimmed : null,
      ig_public: input.ig_public,
      mood: moodTrimmed.length > 0 ? moodTrimmed : null,
      mood_at: moodTrimmed.length > 0 ? new Date().toISOString() : null,
    });
  } catch (error) {
    console.error("❌ 更新個人資料失敗:", error);
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
