import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database.types";

export type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];

/** Layer 2：寫入 **`notifications`**（伺服端 admin client）。 */
export async function insertNotification(
  row: NotificationInsert,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert(row);
  if (error) {
    throw error;
  }
}
