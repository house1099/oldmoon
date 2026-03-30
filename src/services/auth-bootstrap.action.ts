"use server";

import { createClient } from "@/lib/supabase/server";
import { findProfileById } from "@/lib/repositories/server/user.repository";

/** 登入後過場用：確認 session 並預熱個人資料讀取 */
export async function postLoginBootstrapAction(): Promise<{ ok: boolean }> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false };
    await findProfileById(user.id);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
