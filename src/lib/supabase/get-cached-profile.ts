import { unstable_cache } from "next/cache";
import { findProfileById } from "@/lib/repositories/server/user.repository";

export function profileCacheTag(userId: string) {
  return `profile-${userId}`;
}

export function getCachedProfile(userId: string) {
  const tag = profileCacheTag(userId);
  return unstable_cache(
    () => findProfileById(userId),
    [tag],
    { revalidate: 30, tags: [tag] },
  )();
}
