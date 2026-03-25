"use server";

import { createClient } from "@/lib/supabase/server";
import {
  blockUser,
  findConversationById,
  getMessages,
  getMyConversations,
  getOrCreateConversation,
  markMessagesAsRead,
  sendMessage,
  submitReport,
  unblockUser,
} from "@/lib/repositories/server/chat.repository";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import { insertNotification } from "@/lib/repositories/server/notification.repository";
import type { ChatMessageRow } from "@/types/database.types";

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

    const targetId = conv.user_a === user.id ? conv.user_b : conv.user_a;
    try {
      const sender = await findProfileById(user.id);
      const nickname = sender?.nickname?.trim() || "某位冒險者";
      await insertNotification({
        user_id: targetId,
        kind: "new_message",
        title: `${nickname} 傳了一則訊息給你`,
        body: content.trim().slice(0, 60),
        metadata: { from_user: user.id, conversation_id: conversationId },
      });
    } catch {
      // 通知失敗不影響訊息發送
    }

    return { ok: true as const, message };
  } catch {
    return { ok: false as const, error: "發送失敗" };
  }
}

export async function getMyConversationsAction() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    const conversations = await getMyConversations(user.id);
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const partnerId =
          conv.user_a === user.id ? conv.user_b : conv.user_a;
        const partner = await findProfileById(partnerId);
        return { ...conv, partner };
      }),
    );
    return enriched;
  } catch {
    return [];
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
