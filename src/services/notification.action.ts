"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationRow } from "@/types/database.types";

export type NotificationListItem = NotificationRow & {
  fromUser: {
    id: string;
    nickname: string;
    avatar_url: string | null;
  } | null;
};

/** 分開查 **`notifications`** 與 **`users`**，避免 PostgREST FK embed 問題。欄位：**`type`**／**`from_user_id`**／**`message`**／**`is_read`** */
export async function getMyNotificationsAction(): Promise<
  NotificationListItem[]
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const admin = createAdminClient();
  const { data: notifications, error } = await admin
    .from("notifications")
    .select("id, user_id, type, message, is_read, created_at, from_user_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getMyNotificationsAction 失敗:", error);
    return [];
  }

  const enriched = await Promise.all(
    (notifications ?? []).map(async (n) => {
      if (!n.from_user_id) {
        return { ...n, fromUser: null };
      }
      const { data: fromUser } = await admin
        .from("users")
        .select("id, nickname, avatar_url")
        .eq("id", n.from_user_id)
        .single();
      return {
        ...n,
        fromUser: fromUser ?? null,
      };
    }),
  );

  return enriched as NotificationListItem[];
}

export async function markAllNotificationsReadAction() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("markAllNotificationsReadAction:", error);
    return { ok: false as const };
  }
  return { ok: true as const };
}

export async function clearAllNotificationsAction() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("notifications")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    console.error("clearAllNotificationsAction:", error);
    return { ok: false as const };
  }
  return { ok: true as const };
}

export async function getUnreadNotificationCountAction(): Promise<number> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("getUnreadNotificationCountAction:", error);
    return 0;
  }
  return count ?? 0;
}
