"use server";

import { createClient } from "@/lib/supabase/server";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import { insertAdminAction } from "@/lib/repositories/server/admin.repository";
import {
  deleteTavernBan,
  findTavernMessageById,
  deleteTavernMessage,
  findAllTavernBans,
  findTavernMessages,
  insertTavernBan,
  insertTavernMessage,
  isTavernBanned,
} from "@/lib/repositories/server/tavern.repository";
import { findSystemSettingByKey } from "@/lib/repositories/server/invitation.repository";
import { resolveTavernMessageMaxLength } from "@/lib/utils/tavern-message-limit";
import { notifyUserMailboxSilent } from "@/services/notification.action";
import type { TavernBanRow, TavernMessageDto } from "@/types/database.types";

async function effectiveTavernMessageMax(): Promise<number> {
  const raw = await findSystemSettingByKey("tavern_message_max_length");
  return resolveTavernMessageMaxLength(raw);
}

async function requireRole(allowedRoles: ("master" | "moderator")[]) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("未登入");
  }
  const profile = await findProfileById(user.id);
  if (
    !profile ||
    !allowedRoles.includes(profile.role as "master" | "moderator")
  ) {
    throw new Error("權限不足");
  }
  return { user, profile };
}

async function checkOperationPermission(operatorId: string, targetUserId: string) {
  const [operator, target] = await Promise.all([
    findProfileById(operatorId),
    findProfileById(targetUserId),
  ]);

  if (!operator || !target) {
    throw new Error("用戶不存在");
  }

  const isSelf = operatorId === targetUserId;
  if (target.role === "master" && !isSelf) {
    throw new Error("無法對領袖執行此操作");
  }
  if (
    operator.role === "moderator" &&
    target.role === "moderator" &&
    !isSelf
  ) {
    throw new Error("無法對同級管理員執行此操作");
  }
}

export async function getTavernMessagesAction(): Promise<TavernMessageDto[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }
  return findTavernMessages();
}

export async function sendTavernMessageAction(
  content: string,
  type: "text" | "emoji",
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "請先登入" };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return { success: false, error: "訊息不可為空" };
  }
  const maxLen = await effectiveTavernMessageMax();
  if (trimmed.length > maxLen) {
    return { success: false, error: `訊息最多 ${maxLen} 字` };
  }

  const banned = await isTavernBanned(user.id);
  if (banned) {
    return { success: false, error: "你已被禁止在酒館發言" };
  }

  await insertTavernMessage({
    user_id: user.id,
    content: trimmed,
    type,
  });
  return { success: true };
}

export async function getMyTavernBanStatusAction(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }
  return isTavernBanned(user.id);
}

export async function banTavernUserAction(params: {
  userId: string;
  reason: string;
  durationHours: 1 | 3 | 24;
}): Promise<void> {
  const { user, profile: operator } = await requireRole(["master", "moderator"]);
  await checkOperationPermission(user.id, params.userId);
  const target = await findProfileById(params.userId);
  const targetNickname = target?.nickname ?? "（未知）";
  const r = params.reason.trim() || null;
  await insertTavernBan({
    user_id: params.userId,
    banned_by: user.id,
    reason: r,
    durationHours: params.durationHours,
  });
  await insertAdminAction({
    admin_id: user.id,
    target_user_id: params.userId,
    action_type: "tavern_ban",
    action_label: `酒館禁言 ${targetNickname} ${params.durationHours} 小時，原因：${r ?? "未說明"}`,
    reason: r ?? undefined,
    metadata: {
      duration_hours: params.durationHours,
      reason: r ?? "未說明",
      target_nickname: targetNickname,
      admin_nickname: operator.nickname,
    },
  });
  await notifyUserMailboxSilent({
    user_id: params.userId,
    type: "system",
    message: `🔇 你已被禁止在酒館發言 ${params.durationHours} 小時，原因：${r ?? "未說明"}`,
    is_read: false,
  });
}

export async function unbanTavernUserAction(userId: string): Promise<void> {
  const { user } = await requireRole(["master", "moderator"]);
  await checkOperationPermission(user.id, userId);
  await deleteTavernBan(userId);
  await insertAdminAction({
    admin_id: user.id,
    target_user_id: userId,
    action_type: "tavern_unban",
  });
  await notifyUserMailboxSilent({
    user_id: userId,
    type: "system",
    message: "✅ 你的酒館發言權限已恢復",
    is_read: false,
  });
}

export async function deleteTavernMessageAction(
  messageId: string,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("未登入");
  }
  const [message, operator] = await Promise.all([
    findTavernMessageById(messageId),
    findProfileById(user.id),
  ]);
  if (!message) {
    throw new Error("找不到訊息");
  }
  if (!operator) {
    throw new Error("用戶不存在");
  }
  const isOwner = message.user_id === user.id;
  const isModerator =
    operator.role === "master" || operator.role === "moderator";
  if (!isOwner && !isModerator) {
    throw new Error("權限不足");
  }
  await deleteTavernMessage(messageId);
}

export async function getTavernBansAction(): Promise<
  (TavernBanRow & {
    user: { nickname: string; avatar_url: string | null };
  })[]
> {
  await requireRole(["master", "moderator"]);
  return findAllTavernBans();
}
