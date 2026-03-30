"use client";

import { useEffect } from "react";

/**
 * 註冊根目錄 **`/sw.js`**（Web Push／PWA）。
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => console.error("serviceWorker.register:", err));
  }, []);

  return null;
}
