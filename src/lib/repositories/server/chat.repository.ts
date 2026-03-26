import { createAdminClient } from "@/lib/supabase/admin";
import type { ChatMessageRow, ConversationRow } from "@/types/database.types";

export type { ChatMessageRow, ConversationRow };

/** 取得或建立一對一對話（兩人 id 排序後為 **user_a**／**user_b**，避免重複列） */
export async function getOrCreateConversation(
  userA: string,
  userB: string,
): Promise<ConversationRow> {
  const admin = createAdminClient();
  const [low, high] = [userA, userB].sort();

  const { data: existing, error: findErr } = await admin
    .from("conversations")
    .select("*")
    .eq("user_a", low)
    .eq("user_b", high)
    .maybeSingle();

  if (findErr) {
    throw findErr;
  }
  if (existing) {
    return existing as ConversationRow;
  }

  const { data, error } = await admin
    .from("conversations")
    .insert({ user_a: low, user_b: high })
    .select()
    .single();

  if (error) {
    throw error;
  }
  return data as ConversationRow;
}

export async function findConversationById(
  conversationId: string,
): Promise<ConversationRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return (data ?? null) as ConversationRow | null;
}

export async function getMessages(
  conversationId: string,
  limit = 50,
): Promise<ChatMessageRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chat_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }
  return (data ?? []) as ChatMessageRow[];
}

export async function sendMessage(payload: {
  conversation_id: string;
  sender_id: string;
  content: string;
}): Promise<ChatMessageRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chat_messages")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  const { error: convErr } = await admin
    .from("conversations")
    .update({
      last_message: payload.content.slice(0, 50),
      last_message_at: new Date().toISOString(),
      last_message_sender_id: payload.sender_id,
    })
    .eq("id", payload.conversation_id);

  if (convErr) {
    console.error("sendMessage: conversation last_message update failed", convErr);
  }

  return data as ChatMessageRow;
}

export async function getMyConversations(
  userId: string,
): Promise<Pick<
  ConversationRow,
  | "id"
  | "user_a"
  | "user_b"
  | "last_message"
  | "last_message_sender_id"
  | "last_message_at"
  | "created_at"
>[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("conversations")
    .select(
      "id, user_a, user_b, last_message, last_message_sender_id, last_message_at, created_at",
    )
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order("last_message_at", { ascending: false });

  if (error) {
    throw error;
  }
  return (data ?? []) as Pick<
    ConversationRow,
    | "id"
    | "user_a"
    | "user_b"
    | "last_message"
    | "last_message_sender_id"
    | "last_message_at"
    | "created_at"
  >[];
}

/** 這些對話中，至少有一則「非本人發送且未讀」訊息的 conversation_id */
export async function getConversationIdsWithUnreadFromOthers(
  userId: string,
  conversationIds: string[],
): Promise<Set<string>> {
  if (conversationIds.length === 0) {
    return new Set();
  }
  const admin = createAdminClient();
  const unread = new Set<string>();
  const chunkSize = 80;
  for (let i = 0; i < conversationIds.length; i += chunkSize) {
    const chunk = conversationIds.slice(i, i + chunkSize);
    const { data, error } = await admin
      .from("chat_messages")
      .select("conversation_id")
      .in("conversation_id", chunk)
      .eq("is_read", false)
      .neq("sender_id", userId);
    if (error) {
      throw error;
    }
    for (const row of data ?? []) {
      const id = (row as { conversation_id: string }).conversation_id;
      if (id) {
        unread.add(id);
      }
    }
  }
  return unread;
}

/** 至少有一則對方未讀訊息的對話數（底欄／tab 紅點） */
export async function countConversationsWithUnreadFromOthers(
  userId: string,
): Promise<number> {
  const convs = await getMyConversations(userId);
  const ids = convs.map((c) => c.id);
  const set = await getConversationIdsWithUnreadFromOthers(userId, ids);
  return set.size;
}

export async function markMessagesAsRead(
  conversationId: string,
  userId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("chat_messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .eq("is_read", false);

  if (error) {
    throw error;
  }
}

export async function blockUser(
  blockerId: string,
  blockedId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("blocks")
    .insert({ blocker_id: blockerId, blocked_id: blockedId });

  if (error && error.code !== "23505") {
    throw error;
  }
}

export async function unblockUser(
  blockerId: string,
  blockedId: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);

  if (error) {
    throw error;
  }
}

export async function isBlocked(
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("blocks")
    .select("id")
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return Boolean(data);
}

export async function submitReport(payload: {
  reporter_id: string;
  reported_user_id: string;
  conversation_id: string;
  reason: string;
  description?: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("reports").insert(payload);

  if (error) {
    throw error;
  }
}
