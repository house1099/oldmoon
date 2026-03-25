"use server";

import { createClient } from "@/lib/supabase/server";
import {
  findAcceptedAlliancesWithPartners,
  findAllianceBetween,
  findAllianceById,
  findPendingIncomingWithRequester,
  insertAlliance,
  reactivateAllianceFromDissolved,
  updateAlliance,
} from "@/lib/repositories/server/alliance.repository";
import { checkMutualLike } from "@/lib/repositories/server/like.repository";
import { insertNotification } from "@/lib/repositories/server/notification.repository";
import { findProfileById } from "@/lib/repositories/server/user.repository";

export type AllianceStatusDto = {
  id: string;
  status: "pending" | "accepted";
  initiated_by: string;
};

function mapAllianceError(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "血盟操作失敗，請稍後再試。";
  }
  const e = error as { code?: string; message?: string };
  const msg = typeof e.message === "string" ? e.message : "";
  if (
    e.code === "23505" ||
    msg.includes("23505") ||
    (msg.includes("duplicate") && msg.includes("unique"))
  ) {
    return "此血盟申請已存在。";
  }
  if (e.code === "23503" || msg.toLowerCase().includes("foreign key")) {
    return "找不到對應的冒險者資料。";
  }
  if (
    e.code === "42501" ||
    msg.toLowerCase().includes("permission denied") ||
    msg.toLowerCase().includes("row-level security")
  ) {
    return "目前無法操作血盟，請稍後再試。";
  }
  return "血盟操作失敗，請稍後再試。";
}

/** 與目標使用者之雙人血盟狀態；無紀錄或已解除回傳 null */
export async function getAllianceStatusAction(
  targetUserId: string,
): Promise<AllianceStatusDto | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id === targetUserId) {
    return null;
  }

  try {
    const row = await findAllianceBetween(user.id, targetUserId);
    if (!row || row.status === "dissolved") {
      return null;
    }
    if (row.status !== "pending" && row.status !== "accepted") {
      return null;
    }
    return {
      id: row.id,
      status: row.status,
      initiated_by: row.initiated_by,
    };
  } catch (error) {
    console.error("getAllianceStatusAction:", error);
    return null;
  }
}

export async function requestAllianceAction(
  targetUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "請先登入。" };
  }
  if (user.id === targetUserId) {
    return { ok: false, error: "無法對自己申請血盟。" };
  }

  try {
    const mutual = await checkMutualLike(user.id, targetUserId);
    if (!mutual) {
      return { ok: false, error: "須雙向互讚才能申請血盟。" };
    }

    const existing = await findAllianceBetween(user.id, targetUserId);
    if (existing?.status === "accepted") {
      return { ok: false, error: "已是血盟夥伴。" };
    }
    if (existing?.status === "pending") {
      if (existing.initiated_by === user.id) {
        return { ok: true };
      }
      return { ok: false, error: "對方已送出申請，請至冒險團確認。" };
    }
    if (existing?.status === "dissolved") {
      await reactivateAllianceFromDissolved(existing.id, user.id);
      await notifyAllianceRequest(user.id, targetUserId);
      return { ok: true };
    }

    const [ua, ub] =
      user.id < targetUserId
        ? [user.id, targetUserId]
        : [targetUserId, user.id];
    await insertAlliance({
      user_a: ua,
      user_b: ub,
      initiated_by: user.id,
      status: "pending",
    });
    await notifyAllianceRequest(user.id, targetUserId);
    return { ok: true };
  } catch (error) {
    console.error("requestAllianceAction:", error);
    return { ok: false, error: mapAllianceError(error) };
  }
}

export async function respondAllianceAction(
  allianceId: string,
  nextStatus: "accepted" | "dissolved",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "請先登入。" };
  }

  try {
    const row = await findAllianceById(allianceId);
    if (!row) {
      return { ok: false, error: "找不到此申請。" };
    }
    const inPair = row.user_a === user.id || row.user_b === user.id;
    if (!inPair) {
      return { ok: false, error: "無權操作此申請。" };
    }
    if (row.status !== "pending") {
      return { ok: false, error: "此申請已處理。" };
    }
    if (row.initiated_by === user.id) {
      return { ok: false, error: "無法回應自己送出的申請。" };
    }

    await updateAlliance(allianceId, { status: nextStatus });

    if (nextStatus === "accepted") {
      try {
        const me = await findProfileById(user.id);
        const nickname = me?.nickname?.trim() || "某位冒險者";
        await insertNotification({
          user_id: row.initiated_by,
          kind: "alliance_accepted",
          title: `${nickname} 接受了你的血盟申請`,
          body: "你們已成為血盟夥伴 🎉",
          metadata: { from_user: user.id },
        });
      } catch {
        // 通知失敗不影響主流程
      }
    }

    return { ok: true };
  } catch (error) {
    console.error("respondAllianceAction:", error);
    return { ok: false, error: mapAllianceError(error) };
  }
}

export async function dissolveAllianceAction(
  partnerUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "請先登入。" };
  }

  try {
    const row = await findAllianceBetween(user.id, partnerUserId);
    if (!row || row.status !== "accepted") {
      return { ok: false, error: "目前沒有生效中的血盟。" };
    }
    await updateAlliance(row.id, { status: "dissolved" });
    return { ok: true };
  } catch (error) {
    console.error("dissolveAllianceAction:", error);
    return { ok: false, error: mapAllianceError(error) };
  }
}

export type MyAllianceListItem = {
  id: string;
  partner: {
    id: string;
    nickname: string;
    avatar_url: string | null;
    instagram_handle: string | null;
  };
};

export async function getMyAlliancesAction(): Promise<MyAllianceListItem[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    return await findAcceptedAlliancesWithPartners(user.id);
  } catch (error) {
    console.error("getMyAlliancesAction:", error);
    return [];
  }
}

export type PendingAllianceRequestItem = {
  id: string;
  requester: {
    id: string;
    nickname: string;
    avatar_url: string | null;
    instagram_handle: string | null;
  };
};

export async function getPendingRequestsAction(): Promise<
  PendingAllianceRequestItem[]
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  try {
    return await findPendingIncomingWithRequester(user.id);
  } catch (error) {
    console.error("getPendingRequestsAction:", error);
    return [];
  }
}

async function notifyAllianceRequest(
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  try {
    const requester = await findProfileById(fromUserId);
    const nickname = requester?.nickname?.trim() || "某位冒險者";
    await insertNotification({
      user_id: toUserId,
      kind: "alliance_request",
      title: `${nickname} 對你送出了血盟申請`,
      body: "去冒險團查看吧 ⚔️",
      metadata: { from_user: fromUserId },
    });
  } catch {
    // 通知失敗不影響主流程
  }
}
