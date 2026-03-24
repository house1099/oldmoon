"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  findProfileById,
  updateProfile,
} from "@/lib/repositories/server/user.repository";

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

  try {
    await updateProfile(user.id, {
      interests: data.interests,
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
