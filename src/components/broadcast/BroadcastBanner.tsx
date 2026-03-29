"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  expireBroadcastAction,
  getActiveBroadcastsAction,
  type ActiveBroadcastDto,
} from "@/services/rewards.action";
import { getMarqueeAndBroadcastSettingsAction } from "@/services/system-settings.action";
import { cn } from "@/lib/utils";
import { useMyProfile } from "@/hooks/useMyProfile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const COMPACT_H = 40;
const REFRESH_MS = 30_000;
const SETTINGS_MS = 60_000;

type BroadcastStyle =
  | "glow"
  | "flicker"
  | "fullscreen"
  | "fire"
  | "lightning"
  | "flow";

function enterClassForStyle(style: string): string {
  switch (style) {
    case "fire":
      return "bb-broadcast-enter-slide-l";
    case "lightning":
      return "bb-broadcast-enter-slide-t";
    case "fullscreen":
      return "bb-broadcast-enter-zoom";
    default:
      return "bb-broadcast-enter-fade";
  }
}

export function BroadcastBanner({
  initialHasBroadcast = false,
  onCompactVisibleChange,
}: {
  initialHasBroadcast?: boolean;
  onCompactVisibleChange?: (visible: boolean) => void;
}) {
  const { profile } = useMyProfile();
  const [items, setItems] = useState<ActiveBroadcastDto[]>([]);
  const [style, setStyle] = useState<BroadcastStyle>("glow");
  const [speed, setSpeed] = useState(10);
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [overlayDismissed, setOverlayDismissed] = useState(true);
  const [confirmExpireOpen, setConfirmExpireOpen] = useState(false);
  const [expiring, setExpiring] = useState(false);
  const prevStyleRef = useRef<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const refreshBroadcasts = useCallback(() => {
    void getActiveBroadcastsAction()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  const refreshSettings = useCallback(() => {
    void getMarqueeAndBroadcastSettingsAction()
      .then((s) => {
        const st = (s.broadcast.style || "glow").trim() as BroadcastStyle;
        const allowed: BroadcastStyle[] = [
          "glow",
          "flicker",
          "fullscreen",
          "fire",
          "lightning",
          "flow",
        ];
        setStyle(allowed.includes(st) ? st : "glow");
        setSpeed(
          Number.isFinite(s.broadcast.speed) && s.broadcast.speed >= 1
            ? s.broadcast.speed
            : 10,
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshBroadcasts();
    const id = window.setInterval(refreshBroadcasts, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refreshBroadcasts]);

  useEffect(() => {
    refreshSettings();
    const id = window.setInterval(refreshSettings, SETTINGS_MS);
    return () => window.clearInterval(id);
  }, [refreshSettings]);

  useEffect(() => {
    if (initialHasBroadcast && items.length === 0) {
      refreshBroadcasts();
    }
  }, [initialHasBroadcast, items.length, refreshBroadcasts]);

  useEffect(() => {
    const prev = prevStyleRef.current;
    prevStyleRef.current = style;
    if (style === "fullscreen" && prev !== "fullscreen") {
      setOverlayDismissed(false);
    }
    if (style !== "fullscreen") {
      setOverlayDismissed(true);
    }
  }, [style]);

  useEffect(() => {
    onCompactVisibleChange?.(items.length > 0);
  }, [items.length, onCompactVisibleChange]);

  useEffect(() => {
    if (items.length === 0) return;
    setIndex((i) => Math.min(i, items.length - 1));
  }, [items.length]);

  useEffect(() => {
    if (style !== "fullscreen" || items.length === 0 || overlayDismissed) {
      return;
    }
    const t = window.setTimeout(
      () => setOverlayDismissed(true),
      Math.max(1000, speed * 1000),
    );
    return () => window.clearTimeout(t);
  }, [style, speed, items.length, overlayDismissed]);

  useEffect(() => {
    if (items.length <= 1) return;
    if (style === "fullscreen" && !overlayDismissed) return;
    const ms = Math.max(800, speed * 1000);
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % items.length),
      ms,
    );
    return () => window.clearInterval(id);
  }, [items.length, speed, style, overlayDismissed]);

  if (items.length === 0) return null;

  const current = items[index]!;
  const canExpire = profile?.role === "master";
  const showFullscreenOverlay =
    style === "fullscreen" && !overlayDismissed && mounted;

  const shellClass = cn(
    "flex min-h-[40px] w-full items-stretch border-b px-2 text-xs",
    style === "glow" &&
      "border-amber-500/50 bg-amber-950/90 shadow-[0_2px_20px_rgba(251,191,36,0.4)]",
    style === "flicker" &&
      "border-amber-500/50 bg-amber-950/90 shadow-[0_2px_20px_rgba(251,191,36,0.4)]",
    style === "fire" &&
      "border-orange-500/60 bg-gradient-to-r from-red-950 to-orange-950 shadow-[0_2px_20px_rgba(249,115,22,0.5)]",
    style === "lightning" &&
      "border-blue-400/60 bg-gradient-to-r from-blue-950 to-violet-950 shadow-[0_2px_20px_rgba(96,165,250,0.5)]",
    style === "flow" && "border-violet-500/40 bb-broadcast-flow-bg shadow-lg",
    style === "fullscreen" &&
      "border-amber-500/50 bg-amber-950/90 shadow-[0_2px_20px_rgba(251,191,36,0.4)]",
  );

  const nicknameClass = cn(
    "shrink-0 font-semibold",
    style === "glow" && "text-amber-300",
    style === "flicker" && "text-amber-300 animate-broadcast-flicker-text",
    style === "fire" && "text-orange-300",
    style === "lightning" && "text-blue-200",
    style === "flow" && "font-bold text-white [text-shadow:0_0_10px_rgba(255,255,255,0.8)]",
    style === "fullscreen" && "text-amber-300",
  );

  const bodyClass = cn(
    "flex min-h-[40px] min-w-0 flex-1 items-center gap-2 overflow-hidden",
    enterClassForStyle(style),
  );

  const compactBar = (
    <div
      className="fixed left-0 right-0 top-0 z-[45] flex flex-col pt-[env(safe-area-inset-top,0px)]"
      role="region"
      aria-label="公會廣播"
    >
      <div className={shellClass}>
        {style === "fire" ? (
          <span
            className="flex shrink-0 items-center px-0.5 text-sm animate-broadcast-fire-emoji"
            aria-hidden
          >
            🔥
          </span>
        ) : null}
        <div key={index} className={bodyClass}>
          {style === "lightning" ? (
            <span
              className="shrink-0 text-sm animate-broadcast-lightning-emoji"
              aria-hidden
            >
              ⚡
            </span>
          ) : null}
          <span aria-hidden>📢</span>
          <span className={nicknameClass}>{current.nickname}</span>
          <span
            className={cn(
              "min-w-0 truncate",
              style === "glow" && "text-amber-100",
              style === "flicker" && "text-amber-100",
              style === "fire" && "text-orange-100",
              style === "lightning" && "text-blue-100",
              style === "flow" && "font-bold text-white",
              style === "fullscreen" && "text-amber-100",
            )}
          >
            ：{current.message}
          </span>
          {style === "lightning" ? (
            <span
              className="shrink-0 text-sm animate-broadcast-lightning-emoji"
              aria-hidden
            >
              ⚡
            </span>
          ) : null}
        </div>
        {style === "fire" ? (
          <span
            className="flex shrink-0 items-center px-0.5 text-sm animate-broadcast-fire-emoji"
            aria-hidden
          >
            🔥
          </span>
        ) : null}
        {canExpire ? (
          <button
            type="button"
            className="ml-1 shrink-0 rounded-full px-1.5 py-0.5 text-xs text-red-200 hover:bg-red-500/20 hover:text-red-100"
            aria-label="下架這則廣播"
            onClick={() => setConfirmExpireOpen(true)}
          >
            ✕
          </button>
        ) : null}
      </div>
    </div>
  );

  const fullscreenPortal =
    showFullscreenOverlay &&
    createPortal(
      <div
        className="fixed inset-0 z-[200] flex flex-col bg-black/85 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-label="公會廣播全屏"
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="text-6xl" aria-hidden>
            📢
          </span>
          <p className="text-2xl font-bold text-amber-200">
            {current.nickname}
          </p>
          <p className="max-w-md text-2xl text-zinc-100">{current.message}</p>
        </div>
        <div className="safe-pb flex justify-center border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            className="rounded-full bg-amber-500 px-8 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
            onClick={() => setOverlayDismissed(true)}
          >
            繼續
          </button>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      {fullscreenPortal}
      {overlayDismissed || style !== "fullscreen" ? compactBar : null}
      <AlertDialog open={confirmExpireOpen} onOpenChange={setConfirmExpireOpen}>
        <AlertDialogContent className="border-zinc-700 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>確定下架這則廣播？</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              下架後會立即停止顯示，紀錄仍會保留。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              variant="outline"
              className="border-zinc-700 bg-zinc-900 text-zinc-200"
              disabled={expiring}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-500"
              disabled={expiring}
              onClick={async () => {
                if (expiring) return;
                setExpiring(true);
                try {
                  const result = await expireBroadcastAction(current.id);
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("已下架廣播");
                  setConfirmExpireOpen(false);
                  setItems((prev) => {
                    const next = prev.filter((b) => b.id !== current.id);
                    if (next.length === 0) {
                      setIndex(0);
                      return next;
                    }
                    setIndex((oldIdx) => Math.min(oldIdx, next.length - 1));
                    return next;
                  });
                  refreshBroadcasts();
                } finally {
                  setExpiring(false);
                }
              }}
            >
              {expiring ? "下架中…" : "確定下架"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export const BROADCAST_COMPACT_HEIGHT_PX = COMPACT_H;
