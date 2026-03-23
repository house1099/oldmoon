"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProfile } from "@/lib/repositories/server/user.repository";

export type AdventurerQuestionnaire = {
  gender: string;
  region: string;
  orientation: string;
  offlineIntent: string;
};

function serializeBio(extra: AdventurerQuestionnaire): string {
  return JSON.stringify({ v: 1, ...extra });
}

/**
 * Layer 3：補齊公會檔（users 列）；問卷欄位暫存於 `bio` JSON（雲端若新增專欄可再遷移）。
 */
export async function completeAdventurerProfile(input: {
  displayName: string;
  questionnaire: AdventurerQuestionnaire;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/register/profile");
  }

  const display_name = input.displayName.trim();
  if (!display_name) {
    return { ok: false as const, error: "請填寫暱稱。" };
  }

  try {
    await createProfile({
      id: user.id,
      display_name,
      bio: serializeBio(input.questionnaire),
      status: "active",
    });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "23505") {
      return { ok: false as const, error: "公會名冊已有你的紀錄，請重新整理或聯絡管理員。" };
    }
    return { ok: false as const, error: "建立檔案時發生錯誤，請稍後再試。" };
  }

  revalidatePath("/");
  redirect("/");
}
