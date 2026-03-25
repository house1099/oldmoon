"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json, NotificationRow } from "@/types/database.types";
import { findProfileById } from "@/lib/repositories/server/user.repository";

function fromUserIdFromMetadata(metadata: Json | null): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const m = metadata as Record<string, unknown>;
  if (typeof m.from_user === "string") {
    return m.from_user;
  }
  if (typeof m.from_user_id === "string") {
    return m.from_user_id;
  }
  return null;
}

export type NotificationListItem = NotificationRow & {
  fromUser: {
    id: string;
    nickname: string;
    avatar_url: string | null;
  } | null;
};

/** 與 **`database.types`** 一致：**`kind`**／**`title`**／**`body`**／**`read_at`**／**`metadata`**（發送者 uuid 見 **`metadata.from_user`**，與 **`insertNotification`** 對齊） */
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
  const { data, error } = await admin
    .from("notifications")
    .select("id, user_id, kind, title, body, metadata, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getMyNotificationsAction:", error);
    return [];
  }

  const rows = (data ?? []) as NotificationRow[];
  const enriched = await Promise.all(
    rows.map(async (n): Promise<NotificationListItem> => {
      const fromId = fromUserIdFromMetadata(n.metadata);
      if (!fromId) {
        return { ...n, fromUser: null };
      }
      const profile = await findProfileById(fromId);
      if (!profile) {
        return { ...n, fromUser: null };
      }
      return {
        ...n,
        fromUser: {
          id: profile.id,
          nickname: profile.nickname,
          avatar_url: profile.avatar_url,
        },
      };
    }),
  );

  return enriched;
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
  const now = new Date().toISOString();
  const { error } = await admin
    .from("notifications")
    .update({ read_at: now })
    .eq("user_id", user.id)
    .is("read_at", null);

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
    .is("read_at", null);

  if (error) {
    console.error("getUnreadNotificationCountAction:", error);
    return 0;
  }
  return count ?? 0;
}
