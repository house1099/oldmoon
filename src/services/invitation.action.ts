"use server";

import {
  findInvitationRowByCode,
  claimInvitationCode as repoClaimInvitationCode,
} from "@/lib/repositories/server/invitation.repository";
import { updateProfile } from "@/lib/repositories/server/user.repository";

function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * 註冊前即時檢查邀請碼（無需登入）。
 */
export async function validateInvitationCodeAction(code: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  const normalized = normalizeInviteCode(code);
  if (!normalized) {
    return { valid: false, error: "邀請碼為必填欄位" };
  }

  try {
    const row = await findInvitationRowByCode(normalized);
    if (!row) {
      return { valid: false, error: "找不到此邀請碼" };
    }
    if (row.expires_at && new Date(row.expires_at) <= new Date()) {
      return { valid: false, error: "此邀請碼已過期" };
    }
    if (row.is_revoked) {
      return { valid: false, error: "此邀請碼已被撤銷" };
    }
    if (row.use_count >= row.max_uses) {
      return { valid: false, error: "此邀請碼已達使用上限" };
    }
    return { valid: true };
  } catch (e: unknown) {
    return { valid: false, error: (e as Error).message };
  }
}

/**
 * 註冊建檔完成後核銷邀請碼並寫入 users.invited_by（發碼者）。
 */
export async function claimInvitationCodeAction(
  code: string,
  userId: string,
): Promise<{
  success: boolean;
  invitedBy?: string;
  error?: string;
}> {
  const result = await repoClaimInvitationCode({ code, userId });
  if (result.success && result.invitedBy) {
    try {
      await updateProfile(userId, { invited_by: result.invitedBy });
    } catch (e) {
      console.error("claimInvitationCodeAction: invited_by 更新失敗", e);
    }
  }
  return result;
}
