import { createAdminClient } from "@/lib/supabase/admin";
import type { AnnouncementRow, AnnouncementDto } from "@/types/database.types";

const MINI_PROFILE_SELECT = "id, nickname, avatar_url" as const;

export async function findAllAnnouncements(): Promise<AnnouncementDto[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("announcements")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const rows = (data ?? []) as AnnouncementRow[];

  const userIds = [...new Set(rows.map((r) => r.created_by))];
  const profiles: Record<
    string,
    { id: string; nickname: string; avatar_url: string | null }
  > = {};

  if (userIds.length > 0) {
    const { data: users } = await admin
      .from("users")
      .select(MINI_PROFILE_SELECT)
      .in("id", userIds);
    for (const u of users ?? []) {
      profiles[u.id] = u as {
        id: string;
        nickname: string;
        avatar_url: string | null;
      };
    }
  }

  return rows.map((r) => ({
    ...r,
    creator: profiles[r.created_by],
  }));
}

export async function findActiveAnnouncements(): Promise<AnnouncementRow[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("announcements")
    .select("*")
    .eq("is_active", true)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;

  return (data ?? []) as AnnouncementRow[];
}

export async function insertAnnouncement(payload: {
  title: string;
  content: string;
  image_url: string | null;
  is_pinned: boolean;
  created_by: string;
}): Promise<AnnouncementRow> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("announcements")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;

  return data as AnnouncementRow;
}

export async function updateAnnouncement(
  id: string,
  payload: Partial<{
    title: string;
    content: string;
    image_url: string | null;
    is_pinned: boolean;
    is_active: boolean;
  }>,
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from("announcements")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.from("announcements").delete().eq("id", id);
  if (error) throw error;
}
