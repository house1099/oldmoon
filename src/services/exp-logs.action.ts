"use server";

import { createClient } from "@/lib/supabase/server";
import {
  findRecentExpLogsForUser,
  type ExpLogProfileEntry,
} from "@/lib/repositories/server/exp.repository";

export type { ExpLogProfileEntry };

/**
 * Layer 3：目前使用者近三個月 exp_logs（個人頁橫向列表）。
 */
export async function getMyRecentExpLogsAction(): Promise<
  { ok: true; logs: ExpLogProfileEntry[] } | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "請先登入。" };
  }

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  try {
    const logs = await findRecentExpLogsForUser(user.id, {
      since: threeMonthsAgo.toISOString(),
      limit: 50,
    });
    return { ok: true, logs };
  } catch (e) {
    console.error("❌ getMyRecentExpLogsAction:", e);
    return { ok: false, error: "無法載入經驗值紀錄。" };
  }
}
