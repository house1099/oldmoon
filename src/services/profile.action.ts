"use server";

import { createClient } from "@/lib/supabase/server";
import { getCachedProfile } from "@/lib/supabase/get-cached-profile";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import { findEquippedRewardLabels } from "@/lib/repositories/server/rewards.repository";

export type MemberProfileView = UserRow & {
  equippedTitle: string | null;
  equippedFrame: string | null;
  equippedAvatarFrameEffectKey: string | null;
  equippedAvatarFrameImageUrl: string | null;
  equippedCardFrameEffectKey: string | null;
  equippedCardFrameImageUrl: string | null;
};

export async function getMyProfileAction() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  return getCachedProfile(user.id);
}

/** 已登入時讀取其他會員完整 profile（冒險團血盟詳情 Modal 等） */
export async function getMemberProfileByIdAction(
  targetUserId: string,
): Promise<MemberProfileView | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  try {
    const profile = await findProfileById(targetUserId);
    if (!profile) return null;
    const {
      equippedTitle,
      equippedFrame,
      equippedAvatarFrameEffectKey,
      equippedAvatarFrameImageUrl,
      equippedCardFrameEffectKey,
      equippedCardFrameImageUrl,
    } = await findEquippedRewardLabels(targetUserId);
    return {
      ...profile,
      equippedTitle,
      equippedFrame,
      equippedAvatarFrameEffectKey,
      equippedAvatarFrameImageUrl,
      equippedCardFrameEffectKey,
      equippedCardFrameImageUrl,
    };
  } catch (e) {
    console.error("getMemberProfileByIdAction:", e);
    return null;
  }
}
