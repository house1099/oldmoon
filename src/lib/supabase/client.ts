import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

/**
 * Layer 1：瀏覽器環境專用 Supabase client（Client Components）。
 * 僅於此檔與 server.ts 建立 client；上層請經 Repository / Service。
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
