import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

/**
 * Layer 1：伺服端專用 Supabase client（Server Components、Route Handlers、Server Actions）。
 * 使用 @supabase/ssr 與 Next cookies 同步 Auth session。
 * Middleware 內請以 request/response 另行建立 client（未來可加獨立 util）。
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component 內可能無法寫入 cookie；可搭配 middleware 刷新 session
          }
        },
      },
    },
  );
}
