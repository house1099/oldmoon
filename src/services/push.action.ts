"use server";

import { createClient } from "@/lib/supabase/server";
import { upsertPushSubscription } from "@/lib/repositories/server/push.repository";

export type SavePushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/**
 * 儲存／更新當前使用者的 Web Push 訂閱（依 **endpoint** upsert）。
 * 伺服端推播 JSON 欄位（**`title`**／**`body`**／**`url`**／**`unreadCount`**）由 **`src/lib/push/send-push.ts`** 組裝。
 */
export async function savePushSubscriptionAction(
  sub: SavePushSubscriptionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "未登入" };
  }

  const endpoint = sub.endpoint?.trim();
  const p256dh = sub.keys?.p256dh?.trim();
  const auth = sub.keys?.auth?.trim();

  if (!endpoint || !p256dh || !auth) {
    return { ok: false, error: "訂閱資料不完整" };
  }

  try {
    await upsertPushSubscription({
      user_id: user.id,
      endpoint,
      p256dh,
      auth,
    });
    return { ok: true };
  } catch (e) {
    console.error("savePushSubscriptionAction:", e);
    return { ok: false, error: "儲存訂閱失敗" };
  }
}
