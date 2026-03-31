import { createAdminClient } from "@/lib/supabase/admin";
import {
  findEquippedAvatarFramesByUserIds,
  findEquippedCardFramesByUserIds,
  findEquippedTitlesByUserIds,
} from "@/lib/repositories/server/rewards.repository";
import type { UserRow } from "@/lib/repositories/server/user.repository";
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
    .select("id, nickname, avatar_url, level, role")
    .in("id", userIds);

  if (usersErr) {
    throw usersErr;
  }

  const [frameMap, cardFrameMap, titleMap] = await Promise.all([
    findEquippedAvatarFramesByUserIds(userIds),
    findEquippedCardFramesByUserIds(userIds),
    findEquippedTitlesByUserIds(userIds),
  ]);

  const userMap = new Map(
    (users ?? []).map((u) => {
      const row = u as Pick<
        UserRow,
        "id" | "nickname" | "avatar_url" | "level" | "role"
      >;
      const f = frameMap.get(row.id);
      const cf = cardFrameMap.get(row.id);
      const t = titleMap.get(row.id);
      return [
        row.id,
        {
          id: row.id,
          nickname: row.nickname,
          avatar_url: row.avatar_url,
          level: row.level,
          role: row.role ?? "member",
          equippedTitle: t?.equippedTitle ?? null,
          equippedTitleImageUrl: t?.equippedTitleImageUrl ?? null,
          equippedAvatarFrameEffectKey: f?.equippedAvatarFrameEffectKey ?? null,
          equippedAvatarFrameImageUrl: f?.equippedAvatarFrameImageUrl ?? null,
          equippedAvatarFrameLayout: f?.equippedAvatarFrameLayout ?? null,
          equippedCardFrameEffectKey: cf?.cardFrameEffectKey ?? null,
          equippedCardFrameImageUrl: cf?.cardFrameImageUrl ?? null,
          equippedCardFrameLayout: cf?.cardFrameLayout ?? null,
        },
      ] as const;
    }),
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
          role: "member",
          equippedTitle: null,
          equippedTitleImageUrl: null,
          equippedAvatarFrameEffectKey: null,
          equippedAvatarFrameImageUrl: null,
          equippedAvatarFrameLayout: null,
          equippedCardFrameEffectKey: null,
          equippedCardFrameImageUrl: null,
          equippedCardFrameLayout: null,
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
  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("tavern_bans")
    .select("id, expires_at")
    .eq("user_id", userId)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
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
  durationHours: 1 | 3 | 24;
}): Promise<void> {
  const admin = createAdminClient();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + payload.durationHours);
  const { error } = await admin
    .from("tavern_bans")
    .upsert(
      {
        user_id: payload.user_id,
        banned_by: payload.banned_by,
        reason: payload.reason,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "user_id" },
    );
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

export async function findTavernMessageById(
  messageId: string,
): Promise<Pick<TavernMessageRow, "id" | "user_id"> | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tavern_messages")
    .select("id, user_id")
    .eq("id", messageId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) return null;
  return {
    id: data.id as string,
    user_id: data.user_id as string,
  };
}
