"use server";

import { createClient } from "@/lib/supabase/server";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import { insertAdminAction } from "@/lib/repositories/server/admin.repository";
import {
  deleteTavernBan,
  deleteTavernMessage,
  findAllTavernBans,
  findTavernMessages,
  insertTavernBan,
  insertTavernMessage,
  isTavernBanned,
} from "@/lib/repositories/server/tavern.repository";
import { notifyUserMailboxSilent } from "@/services/notification.action";
import type { TavernBanRow, TavernMessageDto } from "@/types/database.types";

async function requireMaster() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("未登入");
  }
  const profile = await findProfileById(user.id);
  if (!profile || profile.role !== "master") {
    throw new Error("權限不足");
  }
  return { user, profile };
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
  if (trimmed.length > 50) {
    return { success: false, error: "訊息最多 50 字" };
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

export async function banTavernUserAction(
  userId: string,
  reason: string,
): Promise<void> {
  const { user } = await requireMaster();
  const r = reason.trim() || null;
  await insertTavernBan({
    user_id: userId,
    banned_by: user.id,
    reason: r,
  });
  await insertAdminAction({
    admin_id: user.id,
    target_user_id: userId,
    action_type: "tavern_ban",
    reason: r ?? undefined,
  });
  await notifyUserMailboxSilent({
    user_id: userId,
    type: "system",
    message: `🔇 你已被禁止在酒館發言，原因：${r ?? "未說明"}`,
    is_read: false,
  });
}

export async function unbanTavernUserAction(userId: string): Promise<void> {
  const { user } = await requireMaster();
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
  await requireMaster();
  await deleteTavernMessage(messageId);
}

export async function getTavernBansAction(): Promise<
  (TavernBanRow & {
    user: { nickname: string; avatar_url: string | null };
  })[]
> {
  await requireMaster();
  return findAllTavernBans();
}
