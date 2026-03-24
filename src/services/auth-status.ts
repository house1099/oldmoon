import type { User } from "@supabase/supabase-js";
import {
  findProfileById,
  type UserRow,
} from "@/lib/repositories/server/user.repository";

/**
 * 供 Middleware 與 auth.service 共用；勿在此檔 import `@/lib/supabase/server`（避免 Edge 誤打包 cookies()）。
 * 勿在此檔 import `next/cache`／`getCachedProfile` — Middleware 跑在 Edge，不支援 incremental cache。
 */
export type AuthStatus =
  | { kind: "unauthenticated" }
  | { kind: "needs_profile"; userId: string }
  | { kind: "banned"; userId: string }
  | { kind: "authenticated"; userId: string; profile: UserRow };

/** 依 profile 列組出狀態（供 `getAuthStatus` 搭配快取與 `deriveAuthStatus` 共用） */
export function buildAuthStatus(
  userId: string,
  profile: UserRow | null,
): AuthStatus {
  if (!profile) {
    return { kind: "needs_profile", userId };
  }
  if (profile.status === "banned") {
    return { kind: "banned", userId };
  }
  return { kind: "authenticated", userId, profile };
}

/**
 * Edge Middleware 專用：直接查 DB，不可使用 `unstable_cache`。
 */
export async function deriveAuthStatus(
  user: User | null,
): Promise<AuthStatus> {
  if (!user) {
    return { kind: "unauthenticated" };
  }

  const profile = await findProfileById(user.id);
  return buildAuthStatus(user.id, profile);
}
