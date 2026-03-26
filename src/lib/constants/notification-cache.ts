/** 與 **`insertMailboxNotificationAction`** 等寫入後的 **`revalidateTag`** 對齊（**`getMyNotificationsAction`** 本身已不再包 **`unstable_cache`**）。 */
export function notificationsUserCacheTag(userId: string): string {
  return `notifications-${userId}`;
}
