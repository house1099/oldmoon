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

/** 問卷值皆為英文 slug（與 `adventurer-questionnaire` 常數一致），對應 `users.gender` 等欄位。 */
export type AdventurerQuestionnaire = {
  gender: GenderValue;
  region: RegionValue;
  orientation: OrientationValue;
  offlineIntent: OfflineIntentValue;
};

/** 前端 `offlineIntent` → DB `offline_ok`：僅「願意實體聚會」為 true，其餘為 false */
function offlineIntentToOfflineOk(v: OfflineIntentValue): boolean {
  return v === "in_person";
}

/**
 * Layer 3：補齊公會檔（`users` 列）：`nickname`、`gender`、`region`、`orientation`、`offline_ok` 等。
 * `total_exp`／`level` 初值依 SSOT（Lv1 起算）。
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

  const q = input.questionnaire;

  try {
    await createProfile({
      id: user.id,
      nickname,
      gender: q.gender,
      region: q.region,
      orientation: q.orientation,
      offline_ok: offlineIntentToOfflineOk(q.offlineIntent),
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
