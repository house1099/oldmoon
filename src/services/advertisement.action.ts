"use server";

import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  findActiveHomeAds,
  recordAdClick,
} from "@/lib/repositories/server/admin.repository";
import type { AdvertisementRow } from "@/types/database.types";

export async function getHomeAdsAction(): Promise<AdvertisementRow[]> {
  const cached = unstable_cache(
    async () => findActiveHomeAds(),
    ["home-ads"],
    { revalidate: 300 },
  );
  return cached();
}

export async function recordAdClickAction(adId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await recordAdClick(adId, user.id);
  } catch {
    // silent
  }
}
