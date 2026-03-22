import type { User } from "@supabase/supabase-js";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import type { UserRow } from "@/lib/repositories/server/user.repository";

/**
 * 供 Middleware 與 auth.service 共用；勿在此檔 import `@/lib/supabase/server`（避免 Edge 誤打包 cookies()）。
 */
export type AuthStatus =
  | { kind: "unauthenticated" }
  | { kind: "needs_profile"; userId: string }
  | { kind: "banned"; userId: string }
  | { kind: "authenticated"; userId: string; profile: UserRow };

export async function deriveAuthStatus(
  user: User | null,
): Promise<AuthStatus> {
  if (!user) {
    return { kind: "unauthenticated" };
  }

  const profile = await findProfileById(user.id);

  if (!profile) {
    return { kind: "needs_profile", userId: user.id };
  }

  if (profile.status === "banned") {
    return { kind: "banned", userId: user.id };
  }

  return { kind: "authenticated", userId: user.id, profile };
}
