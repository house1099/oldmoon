"use server";

import {
  findInvitationRowByCode,
  claimInvitationCode as repoClaimInvitationCode,
} from "@/lib/repositories/server/invitation.repository";
import { updateProfile } from "@/lib/repositories/server/user.repository";
import { createClient } from "@/lib/supabase/server";

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

/**
 * Google OAuth 等略過 Email 註冊 Step1 時，將已驗證之邀請碼寫入 `user_metadata.invite_code`，
 * 供 middleware 放行 `/register/profile` 與 `completeAdventurerProfile` 核銷。
 */
export async function saveInviteCodeToMetadataAction(
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = normalizeInviteCode(code);
  if (!normalized) {
    return { ok: false, error: "邀請碼為必填欄位" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "工作階段已失效，請重新登入。" };
  }

  const { error } = await supabase.auth.updateUser({
    data: { invite_code: normalized },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
