"use server";

import { createClient } from "@/lib/supabase/server";
import {
  blockUser,
  countConversationsWithUnreadFromOthers,
  findConversationById,
  getConversationIdsWithUnreadFromOthers,
  getMessages,
  getMyConversations,
  getOrCreateConversation,
  markMessagesAsRead,
  sendMessage,
  submitReport,
  unblockUser,
} from "@/lib/repositories/server/chat.repository";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import type { ChatMessageRow } from "@/types/database.types";

export type ConversationListItemDto = {
  id: string;
  user_a: string;
  user_b: string;
  last_message: string | null;
  last_message_sender_id: string | null;
  last_message_at: string;
  created_at: string;
  partner: UserRow | null;
  hasUnreadFromPartner: boolean;
};

export async function getOrCreateConversationAction(targetUserId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "未登入" };
  }
  if (user.id === targetUserId) {
    return { ok: false as const, error: "無法與自己開啟對話" };
  }

  try {
    const conversation = await getOrCreateConversation(user.id, targetUserId);
    const targetProfile = await findProfileById(targetUserId);
    return { ok: true as const, conversation, targetProfile };
  } catch {
    return { ok: false as const, error: "無法開啟對話" };
  }
}

export async function getMessagesAction(conversationId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, messages: [] as ChatMessageRow[] };
  }

  try {
    const conv = await findConversationById(conversationId);
    if (!conv || (conv.user_a !== user.id && conv.user_b !== user.id)) {
      return { ok: false as const, messages: [] as ChatMessageRow[] };
    }

    const messages = await getMessages(conversationId);
    await markMessagesAsRead(conversationId, user.id);
    return { ok: true as const, messages };
  } catch {
    return { ok: false as const, messages: [] as ChatMessageRow[] };
  }
}

export async function sendMessageAction(conversationId: string, content: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "未登入" };
  }
  if (!content.trim()) {
    return { ok: false as const, error: "訊息不能為空" };
  }
  if (content.length > 500) {
    return { ok: false as const, error: "訊息太長（最多500字）" };
  }

  try {
    const conv = await findConversationById(conversationId);
    if (!conv || (conv.user_a !== user.id && conv.user_b !== user.id)) {
      return { ok: false as const, error: "對話不存在" };
    }

    const message = await sendMessage({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
    });

    return { ok: true as const, message };
  } catch {
    return { ok: false as const, error: "發送失敗" };
  }
}

export async function getMyConversationsAction(): Promise<
  ConversationListItemDto[]
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    const conversations = await getMyConversations(user.id);
    const ids = conversations.map((c) => c.id);
    const unreadSet = await getConversationIdsWithUnreadFromOthers(
      user.id,
      ids,
    );

    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const partnerId =
          conv.user_a === user.id ? conv.user_b : conv.user_a;
        let partner: UserRow | null = null;
        try {
          partner = await findProfileById(partnerId);
        } catch (err) {
          console.error(
            "getMyConversationsAction: findProfileById failed",
            partnerId,
            err,
          );
        }
        return {
          ...conv,
          last_message_at: conv.last_message_at ?? "",
          partner,
          hasUnreadFromPartner: unreadSet.has(conv.id),
        };
      }),
    );
    return enriched;
  } catch {
    return [];
  }
}

/** 有「對方發送且我未讀」訊息的對話數（冒險團 tab／底欄紅點） */
export async function getUnreadChatConversationsCountAction(): Promise<number> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  try {
    return await countConversationsWithUnreadFromOthers(user.id);
  } catch (e) {
    console.error("getUnreadChatConversationsCountAction:", e);
    return 0;
  }
}

export async function blockUserAction(targetUserId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "未登入" };
  }
  if (user.id === targetUserId) {
    return { ok: false as const, error: "無法封鎖自己" };
  }

  try {
    await blockUser(user.id, targetUserId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "封鎖失敗" };
  }
}

export async function unblockUserAction(targetUserId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "未登入" };
  }

  try {
    await unblockUser(user.id, targetUserId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "解除封鎖失敗" };
  }
}

export async function submitReportAction(payload: {
  reportedUserId: string;
  conversationId: string;
  reason: string;
  description?: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false as const, error: "未登入" };
  }

  try {
    await submitReport({
      reporter_id: user.id,
      reported_user_id: payload.reportedUserId,
      conversation_id: payload.conversationId,
      reason: payload.reason,
      description: payload.description,
    });
    await blockUser(user.id, payload.reportedUserId);
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "檢舉失敗" };
  }
}
