"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Chromium `BeforeInstallPromptEvent` (not in lib.dom.d.ts everywhere). */
export type BeforeInstallPromptEventLike = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isBeforeInstallPromptEvent(
  e: Event,
): e is BeforeInstallPromptEventLike {
  return (
    "prompt" in e &&
    typeof (e as BeforeInstallPromptEventLike).prompt === "function"
  );
}

export function usePwaInstall() {
  const deferredRef = useRef<BeforeInstallPromptEventLike | null>(null);
  const [hasDeferredPrompt, setHasDeferredPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      if (!isBeforeInstallPromptEvent(e)) return;
      deferredRef.current = e;
      setHasDeferredPrompt(true);
    };

    const onAppInstalled = () => {
      deferredRef.current = null;
      setHasDeferredPrompt(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    const ev = deferredRef.current;
    if (!ev) return;
    try {
      await ev.prompt();
      await ev.userChoice;
    } catch {
      /* user dismissed or prompt failed */
    } finally {
      deferredRef.current = null;
      setHasDeferredPrompt(false);
    }
  }, []);

  return { hasDeferredPrompt, handleInstallClick };
}
