import { createClient } from "@/lib/supabase/server";
import {
  deriveAuthStatus,
  type AuthStatus,
} from "@/services/auth-status";

export type { AuthStatus } from "@/services/auth-status";

/**
 * Layer 3：供 Server Components / Server Actions 取得目前 Session 與 Profile 狀態。
 */
export async function getAuthStatus(): Promise<AuthStatus> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return deriveAuthStatus(user);
}
