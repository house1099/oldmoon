"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Share2 } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import {
  hasPwaInstallEngaged,
  subscribePwaInstallEngaged,
} from "@/lib/pwa-install-engagement";
import { dismissPwaPrompt, isPwaPromptInCooldown } from "@/lib/pwa-install-prompt";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const REVEAL_DELAY_MS = 1700;

function isDisplayStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  try {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches
    );
  } catch {
    return false;
  }
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function PwaInstallOverlay() {
  const { hasDeferredPrompt, handleInstallClick } = usePwaInstall();
  const [mounted, setMounted] = useState(false);
  const [engaged, setEngaged] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [blockedThisSession, setBlockedThisSession] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setEngaged(hasPwaInstallEngaged());
    return subscribePwaInstallEngaged(() => setEngaged(true));
  }, []);

  const ios = mounted && isIosDevice();
  const standalone = mounted && isDisplayStandalone();
  const inCooldown = mounted && isPwaPromptInCooldown();
  const showBar =
    mounted &&
    !standalone &&
    engaged &&
    !inCooldown &&
    !blockedThisSession &&
    (ios || hasDeferredPrompt);

  useEffect(() => {
    if (!showBar) {
      setRevealed(false);
      return;
    }
    const t = window.setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [showBar]);

  const handleDismiss = () => {
    dismissPwaPrompt();
    setBlockedThisSession(true);
    setRevealed(false);
  };

  if (!mounted || standalone) return null;
  if (!showBar) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-50 mx-auto w-full max-w-md transition-transform duration-300 ease-out",
        revealed ? "translate-y-0" : "translate-y-full pointer-events-none",
      )}
      style={{
        bottom: 0,
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))",
      }}
      role="dialog"
      aria-labelledby="pwa-install-title"
    >
      <div className="rounded-t-2xl border-t border-violet-500/30 bg-zinc-950/90 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="px-4 pb-4 pt-3">
          {ios ? (
            <>
              <h2
                id="pwa-install-title"
                className="text-center text-sm font-semibold leading-snug text-zinc-100"
              >
                📱 點擊下方 [分享圖示] ➔ [加入主畫面] 即可安裝公會！
              </h2>
              <div className="mt-4 flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <Share2
                    className="size-7 text-violet-300 animate-pulse"
                    aria-hidden
                  />
                  <ChevronDown
                    className="size-6 animate-pulse text-violet-400/80"
                    aria-hidden
                  />
                </div>
                <p className="text-center text-xs text-zinc-500">
                  分享按鈕在畫面底部中央附近
                </p>
              </div>
            </>
          ) : (
            <>
              <h2
                id="pwa-install-title"
                className="text-center text-sm font-semibold leading-snug text-zinc-100"
              >
                ✨ 將公會安裝至桌面，享受全屏冒險！
              </h2>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  type="button"
                  size="lg"
                  className="w-full bg-violet-600 text-white hover:bg-violet-500 sm:w-auto"
                  onClick={() => void handleInstallClick()}
                >
                  立即安裝
                </Button>
              </div>
            </>
          )}
          <div className="mt-4 flex justify-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-zinc-400 hover:text-zinc-200"
              onClick={handleDismiss}
            >
              下次再說
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
