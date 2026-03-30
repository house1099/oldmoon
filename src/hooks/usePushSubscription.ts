"use client";

import { useCallback, useEffect, useState } from "react";
import { savePushSubscriptionAction } from "@/services/push.action";

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

export function usePushSubscription() {
  const [state, setState] = useState<PushSubscribeState>("idle");

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

    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
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

    try {
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
        setState("error");
        return { ok: false, message: "無法取得訂閱金鑰" };
      }

      const result = await savePushSubscriptionAction({
        endpoint,
        keys: { p256dh: key.p256dh, auth: key.auth },
      });

      if (!result.ok) {
        setState("error");
        return { ok: false, message: result.error };
      }

      setState("subscribed");
      return { ok: true, message: "已開啟推播通知" };
    } catch (e) {
      console.error("usePushSubscription:", e);
      setState("error");
      return {
        ok: false,
        message: (e as Error).message ?? "訂閱失敗",
      };
    }
  }, []);

  return { state, subscribe };
}
