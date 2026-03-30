"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { savePushSubscriptionAction } from "@/services/push.action";

/** Public key inlined at build; empty means client cannot subscribe. */
export function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? "";
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = globalThis.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushSubscribeState =
  | "idle"
  | "unsupported"
  | "denied"
  | "subscribing"
  | "subscribed"
  | "error";

export type PushSubscribeResult = { ok: boolean; message: string | null };

const SUBSCRIBE_TIMEOUT_MS = 35_000;

function rejectAfter(ms: number, reason: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(reason)), ms);
  });
}

export function usePushSubscription() {
  const [state, setState] = useState<PushSubscribeState>("idle");
  const vapidConfigured = useMemo(() => getVapidPublicKey().length > 0, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      setState("unsupported");
      return;
    }
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "denied"
    ) {
      setState("denied");
      return;
    }
    let cancelled = false;
    void navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (cancelled) return;
        if (sub) setState("subscribed");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const subscribe = useCallback(async (): Promise<PushSubscribeResult> => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      setState("unsupported");
      return { ok: false, message: "此環境不支援推播" };
    }

    const vapid = getVapidPublicKey();
    if (!vapid) {
      setState("error");
      return { ok: false, message: "推播尚未設定完成" };
    }

    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setState("denied");
      return { ok: false, message: "已拒絕通知權限" };
    }

    setState("subscribing");

    const work = async (): Promise<PushSubscribeResult> => {
      const reg = await navigator.serviceWorker.ready;
      const vapidBytes = urlBase64ToUint8Array(vapid);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidBytes.buffer.slice(
          vapidBytes.byteOffset,
          vapidBytes.byteOffset + vapidBytes.byteLength,
        ) as ArrayBuffer,
      });

      const json = sub.toJSON();
      const endpoint = json.endpoint;
      const key = json.keys;
      if (!endpoint || !key?.p256dh || !key?.auth) {
        return { ok: false, message: "無法取得訂閱金鑰" };
      }

      const result = await savePushSubscriptionAction({
        endpoint,
        keys: { p256dh: key.p256dh, auth: key.auth },
      });

      if (!result.ok) {
        return { ok: false, message: result.error };
      }

      return { ok: true, message: "已開啟推播通知" };
    };

    try {
      const outcome = await Promise.race([
        work(),
        rejectAfter(SUBSCRIBE_TIMEOUT_MS, "__TIMEOUT__"),
      ]);

      if (outcome.ok) {
        setState("subscribed");
        return { ok: true, message: outcome.message };
      }
      setState("error");
      return {
        ok: false,
        message: outcome.message,
      };
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "__TIMEOUT__") {
        setState("idle");
        return { ok: false, message: "連線逾時，請再試一次" };
      }
      console.error("usePushSubscription:", e);
      setState("error");
      return {
        ok: false,
        message: (e as Error).message ?? "訂閱失敗",
      };
    }
  }, []);

  /** 取消此裝置的 Push 訂閱並回到可再次點「開啟通知」；不刪伺服器 DB（下次成功訂閱會 upsert）。 */
  const clearLocalSubscription = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    } catch (e) {
      console.error("clearLocalSubscription:", e);
    }
    setState("idle");
  }, []);

  return { state, subscribe, vapidConfigured, clearLocalSubscription };
}
