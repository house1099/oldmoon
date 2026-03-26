"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getPendingIgRequests,
  insertIgChangeRequest,
  reviewIgRequest,
  type PendingIgRequestRow,
} from "@/lib/repositories/server/ig-request.repository";
import { notifyUserMailboxSilent } from "@/services/notification.action";
import { instagramHandleSchema } from "@/lib/validation/instagram-handle";

function isStaffRole(role: string | null | undefined): boolean {
  const r = role ?? "member";
  return r === "master" || r === "moderator";
}

export async function requestIgChangeAction(
  newHandle: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未登入" };

  const trimmed = newHandle.trim();
  const parsed = instagramHandleSchema.safeParse(trimmed);
  if (!parsed.success) {
    const msg = parsed.error.flatten().formErrors[0];
    return { ok: false, error: msg ?? "IG 帳號格式不符。" };
  }

  const { data: profile, error: pe } = await supabase
    .from("users")
    .select("instagram_handle")
    .eq("id", user.id)
    .single();

  if (pe) {
    return { ok: false, error: "讀取資料失敗，請稍後再試。" };
  }

  try {
    await insertIgChangeRequest({
      user_id: user.id,
      old_handle: profile?.instagram_handle ?? null,
      new_handle: parsed.data,
    });
  } catch (e) {
    console.error("❌ insertIgChangeRequest:", e);
    return { ok: false, error: "送出申請失敗，請稍後再試。" };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function reviewIgRequestAction(
  requestId: string,
  action: "approved" | "rejected",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "未登入" };

  const { data: profile, error: pe } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (pe) return { ok: false, error: "讀取權限失敗。" };
  if (!isStaffRole(profile?.role)) {
    return { ok: false, error: "權限不足" };
  }

  try {
    await reviewIgRequest(requestId, action, user.id);
  } catch (e) {
    console.error("❌ reviewIgRequest:", e);
    return { ok: false, error: "審核失敗，請稍後再試。" };
  }

  const admin = createAdminClient();
  const { data: reqRow } = await admin
    .from("ig_change_requests")
    .select("user_id")
    .eq("id", requestId)
    .single();
  if (reqRow?.user_id) {
    await notifyUserMailboxSilent({
      user_id: reqRow.user_id,
      type: "system",
      message:
        action === "approved"
          ? "✅ 你的 IG 帳號變更申請已核准！"
          : "❌ 你的 IG 帳號變更申請未通過審核",
      is_read: false,
    });
  }

  revalidatePath("/");
  revalidatePath("/admin/ig-requests");
  return { ok: true };
}

export async function getPendingIgRequestsAction(): Promise<
  PendingIgRequestRow[]
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile, error: pe } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (pe || !isStaffRole(profile?.role)) return [];

  try {
    return await getPendingIgRequests();
  } catch (e) {
    console.error("❌ getPendingIgRequests:", e);
    return [];
  }
}
