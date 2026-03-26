"use server";

import { unstable_cache } from "next/cache";
import { findActiveAnnouncements } from "@/lib/repositories/server/announcement.repository";
import type { AnnouncementRow } from "@/types/database.types";

export async function getActiveAnnouncementsAction(): Promise<
  AnnouncementRow[]
> {
  const cached = unstable_cache(
    async () => findActiveAnnouncements(),
    ["active-announcements"],
    { revalidate: 60, tags: ["announcements"] },
  );
  return cached();
}
