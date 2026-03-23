import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Layer 1：Service Role（管理員）Supabase client。
 * 僅能在 Middleware、Server Actions、Route Handlers 等伺服端使用；
 * 禁止 import 至 Client Components 或任何會打包進瀏覽器的模組。
 *
 * 環境變數：請在 Vercel（或本機 `.env.local`）設定 **`SUPABASE_SERVICE_ROLE_KEY`**
 *（全名須一致、區分大小寫），值為 Supabase 專案 Settings → API → service_role。
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
