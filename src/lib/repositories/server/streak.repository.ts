import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export type LoginStreakRow = Database["public"]["Tables"]["login_streaks"]["Row"];

export async function findStreakByUserId(
  userId: string,
): Promise<LoginStreakRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("login_streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as LoginStreakRow) ?? null;
}

export async function upsertStreak(
  userId: string,
  data: {
    current_streak: number;
    longest_streak: number;
    last_claim_at: string | null;
  },
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("login_streaks").upsert(
    {
      user_id: userId,
      current_streak: data.current_streak,
      longest_streak: data.longest_streak,
      last_claim_at: data.last_claim_at,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
