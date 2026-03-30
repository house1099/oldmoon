"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  findProfileById,
  updateProfile,
} from "@/lib/repositories/server/user.repository";
import { getTagLimitsAction } from "@/services/system-settings.action";

/**
 * Layer 3：註冊標籤流程最後一步，一次寫入 **`interests`／`skills_offer`／`skills_want`**。
 */
export async function completeRegistration(data: {
  interests: string[];
  skills_offer: string[];
  skills_want: string[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "未登入" };
  }

  const existing = await findProfileById(user.id);
  if (!existing) {
    return { ok: false, error: "找不到冒險者資料。" };
  }

  const interests = Array.from(
    new Set(
      (data.interests ?? []).filter(
        (t): t is string => typeof t === "string" && t.trim().length > 0,
      ),
    ),
  );
  if (interests.length < 1) {
    return { ok: false, error: "請至少選擇 1 個興趣標籤。" };
  }

  const { interestsMax } = await getTagLimitsAction();
  if (interests.length > interestsMax) {
    return {
      ok: false,
      error: `興趣標籤最多 ${interestsMax} 個，請減少後再試。`,
    };
  }

  try {
    await updateProfile(user.id, {
      interests,
      skills_offer: data.skills_offer,
      skills_want: data.skills_want,
    });
  } catch (error) {
    console.error("completeRegistration:", error);
    const err = error as { message?: string };
    return {
      ok: false,
      error: err.message ?? "儲存失敗，請稍後再試。",
    };
  }

  revalidatePath("/");
  revalidatePath("/profile/edit-tags");
  return { ok: true };
}
