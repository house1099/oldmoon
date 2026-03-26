/** 與 **`getMyNotificationsAction`** 的 **`unstable_cache` tags**／**`revalidateTag`** 對齊。 */
export function notificationsUserCacheTag(userId: string): string {
  return `notifications-${userId}`;
}
