"use server";

import { revalidateTag } from "next/cache";
import { sendPushToUser } from "@/lib/push/send-push";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  insertNotification as repoInsertNotification,
  type NotificationInsert,
} from "@/lib/repositories/server/notification.repository";
import { notificationsUserCacheTag } from "@/lib/constants/notification-cache";
import type { NotificationRow } from "@/types/database.types";

function fireMailboxNotificationPush(userId: string, message: string): void {
  const body = message.length > 100 ? `${message.slice(0, 100)}…` : message;
  void sendPushToUser(userId, {
    title: "傳奇公會",
    body,
    url: "/guild",
  }).catch(() => {});
}

export type NotificationListItem = NotificationRow & {
  fromUser: {
    id: string;
    nickname: string;
    avatar_url: string | null;
    role: string | null;
  } | null;
};

async function loadNotificationsForUser(
  userId: string,
): Promise<NotificationListItem[]> {
  const admin = createAdminClient();
  const { data: notifications, error } = await admin
    .from("notifications")
    .select("id, user_id, type, message, is_read, created_at, from_user_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("loadNotificationsForUser 失敗:", error);
    return [];
  }

  const rows = notifications ?? [];
  const fromIds = Array.from(
    new Set(
      rows
        .map((n) => n.from_user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const fromMap: Record<
    string,
    {
      id: string;
      nickname: string;
      avatar_url: string | null;
      role: string | null;
    }
  > = {};

  if (fromIds.length > 0) {
    const { data: users, error: usersErr } = await admin
      .from("users")
      .select("id, nickname, avatar_url, role")
      .in("id", fromIds);
    if (usersErr) {
      console.error("loadNotificationsForUser users:", usersErr);
    } else {
      for (const u of users ?? []) {
        const row = u as {
          id: string;
          nickname: string;
          avatar_url: string | null;
          role: string | null;
        };
        fromMap[row.id] = row;
      }
    }
  }

  return rows.map((n) => ({
    ...n,
    fromUser: n.from_user_id ? (fromMap[n.from_user_id] ?? null) : null,
  })) as NotificationListItem[];
}

/**
 * 分開查 **`notifications`** 與 **`users`**；發送者以單次 **`in`** 載入。
 * 信件列表**不**包 **`unstable_cache`**：`getMyNotificationsAction` 由客戶端 SWR 頻繁觸發時，Next 資料快取易造成首包延遲／體感卡頓；寫入後仍靠 **`revalidateTag(notifications-{userId})`** 讓其他已快取路徑失效。
 */
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

  return loadNotificationsForUser(user.id);
}

/** 寫入單筆通知並刷新該使用者列表快取（領袖邀請碼等需對錯誤處理時使用）。 */
export async function insertMailboxNotificationAction(
  row: NotificationInsert,
): Promise<void> {
  await repoInsertNotification(row);
  revalidateTag(notificationsUserCacheTag(row.user_id));
  fireMailboxNotificationPush(row.user_id, row.message);
}

/** 管理員／系統寫入：**靜默失敗**（僅 **`console.error`**），不影響主流程。 */
export async function notifyUserMailboxSilent(
  row: NotificationInsert,
): Promise<void> {
  try {
    await repoInsertNotification(row);
    revalidateTag(notificationsUserCacheTag(row.user_id));
    fireMailboxNotificationPush(row.user_id, row.message);
  } catch (e) {
    console.error("notifyUserMailboxSilent:", e);
  }
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
  revalidateTag(notificationsUserCacheTag(user.id));
  return { ok: true as const };
}

/** 將單筆通知標為已讀（僅限當前使用者自己的列） */
export async function markNotificationReadAction(notificationId: string) {
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
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error("markNotificationReadAction:", error);
    return { ok: false as const };
  }
  revalidateTag(notificationsUserCacheTag(user.id));
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
  revalidateTag(notificationsUserCacheTag(user.id));
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
