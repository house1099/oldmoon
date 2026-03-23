"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createProfile } from "@/lib/repositories/server/user.repository";

import type {
  GenderValue,
  OfflineIntentValue,
  OrientationValue,
  RegionValue,
} from "@/lib/constants/adventurer-questionnaire";

/** 問卷值皆為英文 slug（與 `adventurer-questionnaire` 常數一致），寫入 `bio` JSON。 */
export type AdventurerQuestionnaire = {
  gender: GenderValue;
  region: RegionValue;
  orientation: OrientationValue;
  offlineIntent: OfflineIntentValue;
};

function serializeBio(extra: AdventurerQuestionnaire): string {
  return JSON.stringify({ v: 1, ...extra });
}

/**
 * Layer 3：補齊公會檔（users 列）；問卷欄位暫存於 `bio` JSON（雲端若新增專欄可再遷移）。
 * 插入欄位與 `users` 表一致：`nickname`、`total_exp`／`level` 初值依 SSOT（Lv1 起算）。
 */
export async function completeAdventurerProfile(input: {
  nickname: string;
  questionnaire: AdventurerQuestionnaire;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/register/profile");
  }

  const nickname = input.nickname.trim();
  if (!nickname) {
    return { ok: false as const, error: "請填寫暱稱。" };
  }

  try {
    await createProfile({
      id: user.id,
      nickname,
      bio: serializeBio(input.questionnaire),
      status: "active",
      total_exp: 0,
      level: 1,
    });
  } catch (error) {
    console.error("❌ 伺服器寫入失敗詳細原因:", error);
    const err = error as { code?: string; message?: string };
    const code = err.code ? String(err.code) : "";
    if (code === "23505") {
      return { ok: false as const, error: "公會名冊已有你的紀錄，請重新整理或聯絡管理員。" };
    }
    if (code === "42703" || err.message?.includes("does not exist")) {
      return {
        ok: false as const,
        error: "資料庫欄位與程式不一致，請聯絡管理員檢查 users 表結構。",
      };
    }
    if (code === "23502") {
      return {
        ok: false as const,
        error: "缺少必要欄位，請聯絡管理員檢查 users 表 NOT NULL／預設值。",
      };
    }
    return { ok: false as const, error: "建立檔案時發生錯誤，請稍後再試。" };
  }

  revalidatePath("/");
  redirect("/");
}
