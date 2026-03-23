import { createAdminClient } from "@/lib/supabase/admin";
import type { IgChangeRequestRow } from "@/types/database.types";

export type PendingIgRequestRow = IgChangeRequestRow & {
  users: { nickname: string; avatar_url: string | null } | null;
};

export async function insertIgChangeRequest(payload: {
  user_id: string;
  old_handle: string | null;
  new_handle: string;
}): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("ig_change_requests").insert({
    user_id: payload.user_id,
    old_handle: payload.old_handle,
    new_handle: payload.new_handle,
  });
  if (error) throw error;
}

export async function getPendingIgRequests(): Promise<PendingIgRequestRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ig_change_requests")
    .select(
      "*, users!ig_change_requests_user_id_fkey ( nickname, avatar_url )",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PendingIgRequestRow[];
}

export async function reviewIgRequest(
  requestId: string,
  action: "approved" | "rejected",
  reviewerId: string,
): Promise<void> {
  const supabase = createAdminClient();

  if (action === "approved") {
    const { data: req, error: fetchErr } = await supabase
      .from("ig_change_requests")
      .select("user_id, new_handle")
      .eq("id", requestId)
      .single();

    if (fetchErr) throw fetchErr;
    if (!req?.user_id) {
      throw new Error("申請資料不完整（缺少 user_id）。");
    }

    const { error: userErr } = await supabase
      .from("users")
      .update({ instagram_handle: req.new_handle })
      .eq("id", req.user_id);

    if (userErr) throw userErr;
  }

  const { error } = await supabase
    .from("ig_change_requests")
    .update({
      status: action,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) throw error;
}
