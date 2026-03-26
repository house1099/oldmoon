import { createAdminClient } from "@/lib/supabase/admin";
import type {
  TavernBanRow,
  TavernMessageDto,
  TavernMessageRow,
} from "@/types/database.types";

export async function findTavernMessages(): Promise<TavernMessageDto[]> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("tavern_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  const list = (rows ?? []) as TavernMessageRow[];
  if (list.length === 0) {
    return [];
  }

  const userIds = Array.from(new Set(list.map((r) => r.user_id)));
  const { data: users, error: usersErr } = await admin
    .from("users")
    .select("id, nickname, avatar_url, level")
    .in("id", userIds);

  if (usersErr) {
    throw usersErr;
  }

  const userMap = new Map(
    (users ?? []).map((u) => [
      u.id,
      {
        id: u.id as string,
        nickname: u.nickname as string,
        avatar_url: u.avatar_url as string | null,
        level: u.level as number,
      },
    ]),
  );

  const merged: TavernMessageDto[] = list.map((row) => {
    const user = userMap.get(row.user_id);
    if (!user) {
      return {
        ...row,
        user: {
          id: row.user_id,
          nickname: "未知冒險者",
          avatar_url: null,
          level: 1,
        },
      };
    }
    return { ...row, user };
  });

  merged.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  return merged;
}

export async function insertTavernMessage(payload: {
  user_id: string;
  content: string;
  type: "text" | "emoji";
}): Promise<TavernMessageRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tavern_messages")
    .insert({
      user_id: payload.user_id,
      content: payload.content,
      type: payload.type,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data as TavernMessageRow;
}

export async function isTavernBanned(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tavern_bans")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return Boolean(data);
}

export async function insertTavernBan(payload: {
  user_id: string;
  banned_by: string;
  reason: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("tavern_bans").insert({
    user_id: payload.user_id,
    banned_by: payload.banned_by,
    reason: payload.reason,
  });
  if (error) {
    throw error;
  }
}

export async function deleteTavernBan(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("tavern_bans").delete().eq("user_id", userId);
  if (error) {
    throw error;
  }
}

export async function findAllTavernBans(): Promise<
  (TavernBanRow & {
    user: { nickname: string; avatar_url: string | null };
  })[]
> {
  const admin = createAdminClient();
  const { data: bans, error } = await admin
    .from("tavern_bans")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (bans ?? []) as TavernBanRow[];
  if (rows.length === 0) {
    return [];
  }

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: users, error: usersErr } = await admin
    .from("users")
    .select("id, nickname, avatar_url")
    .in("id", userIds);

  if (usersErr) {
    throw usersErr;
  }

  const userMap = new Map(
    (users ?? []).map((u) => [
      u.id,
      {
        nickname: u.nickname as string,
        avatar_url: u.avatar_url as string | null,
      },
    ]),
  );

  return rows.map((row) => ({
    ...row,
    user: userMap.get(row.user_id) ?? {
      nickname: "未知",
      avatar_url: null,
    },
  }));
}

export async function deleteTavernMessage(messageId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("tavern_messages")
    .delete()
    .eq("id", messageId);
  if (error) {
    throw error;
  }
}
