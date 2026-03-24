import { createClient } from "@/lib/supabase/server";
import { getCachedProfile } from "@/lib/supabase/get-cached-profile";
import {
  buildAuthStatus,
  type AuthStatus,
} from "@/services/auth-status";

export type { AuthStatus } from "@/services/auth-status";

/**
 * Layer 3：供 Server Components / Server Actions 取得目前 Session 與 Profile 狀態。
 * Profile 經 `getCachedProfile`（`unstable_cache` 30s）；勿在 Middleware 呼叫本函式。
 */
export async function getAuthStatus(): Promise<AuthStatus> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { kind: "unauthenticated" };
  }

  const profile = await getCachedProfile(user.id);
  return buildAuthStatus(user.id, profile);
}
