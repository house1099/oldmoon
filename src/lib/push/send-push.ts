import webpush, { WebPushError } from "web-push";
import { countConversationsWithUnreadFromOthers } from "@/lib/repositories/server/chat.repository";
import {
  deletePushSubscriptionByEndpoint,
  findPushSubscriptionsByUserId,
} from "@/lib/repositories/server/push.repository";

export type WebPushPayload = {
  title: string;
  body: string;
  url: string;
  /** 由 `sendPushToUser` 依接收者合併；呼叫端可省略 */
  unreadCount?: number;
};

let vapidInitialized = false;

function ensureVapidConfigured(): boolean {
  if (vapidInitialized) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) {
    return false;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidInitialized = true;
    return true;
  } catch (e) {
    console.error("webpush.setVapidDetails failed:", e);
    return false;
  }
}

/**
 * 對單一使用者的所有訂閱發送推播；**僅供伺服端**呼叫。
 * 未設定 VAPID、無訂閱、或傳送失敗時皆不拋錯（僅 log）；**410／404** 會刪除該 endpoint。
 */
export async function sendPushToUser(
  userId: string,
  payload: WebPushPayload,
): Promise<void> {
  if (!ensureVapidConfigured()) {
    return;
  }

  let rows: Awaited<ReturnType<typeof findPushSubscriptionsByUserId>>;
  try {
    rows = await findPushSubscriptionsByUserId(userId);
  } catch (e) {
    console.error("sendPushToUser findPushSubscriptionsByUserId:", e);
    return;
  }

  if (rows.length === 0) return;

  let unreadRaw = 0;
  try {
    unreadRaw = await countConversationsWithUnreadFromOthers(userId);
  } catch (e) {
    console.error("sendPushToUser countConversationsWithUnreadFromOthers:", e);
  }
  const unreadCount = Math.min(Math.max(0, Math.floor(unreadRaw)), 99);
  const data = JSON.stringify({ ...payload, unreadCount });

  await Promise.allSettled(
    rows.map(async (row) => {
      const subscription = {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth,
        },
      };

      try {
        await webpush.sendNotification(subscription, data, {
          TTL: 86_400,
        });
      } catch (err) {
        if (err instanceof WebPushError) {
          const code = err.statusCode;
          if (code === 410 || code === 404) {
            try {
              await deletePushSubscriptionByEndpoint(row.endpoint);
            } catch (delErr) {
              console.error(
                "deletePushSubscriptionByEndpoint:",
                row.endpoint.slice(0, 48),
                delErr,
              );
            }
            return;
          }
        }
        console.error("webpush.sendNotification:", err);
      }
    }),
  );
}
