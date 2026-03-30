import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export type PushSubscriptionRow =
  Database["public"]["Tables"]["push_subscriptions"]["Row"];

export type PushSubscriptionInsert =
  Database["public"]["Tables"]["push_subscriptions"]["Insert"];

/** Upsert by **endpoint**：同一裝置換 key 時更新 **p256dh**／**auth**／**user_id**。 */
export async function upsertPushSubscription(
  row: PushSubscriptionInsert,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      user_id: row.user_id,
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) {
    throw error;
  }
}

export async function findPushSubscriptionsByUserId(
  userId: string,
): Promise<PushSubscriptionRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
  return (data ?? []) as PushSubscriptionRow[];
}

export async function deletePushSubscriptionByEndpoint(
  endpoint: string,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    throw error;
  }
}
