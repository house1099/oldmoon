"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getActiveBroadcastsAction,
  type ActiveBroadcastDto,
} from "@/services/rewards.action";
import { getMarqueeSettingsAction } from "@/services/system-settings.action";
import { cn } from "@/lib/utils";
import { rewardEffectClassName } from "@/lib/utils/reward-effects";

const BROADCAST_BAR_PX = 36;

function broadcastNicknameClass(effect: string): string {
  const e = effect.trim();
  if (e === "pulse") return "animate-pulse text-amber-300";
  if (e === "rainbow") return "animate-rainbow-text text-amber-300";
  return "text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]";
}

export function TavernMarquee({
  onBroadcastBarPx,
}: {
  /** 有廣播時約 36，無則 0 — 供版面預留頂部間距 */
  onBroadcastBarPx?: (px: number) => void;
}) {
  const [items, setItems] = useState<ActiveBroadcastDto[]>([]);
  const [index, setIndex] = useState(0);
  const [rotateMs, setRotateMs] = useState(10_000);
  const [broadcastEffect, setBroadcastEffect] = useState("glow");

  useEffect(() => {
    void getMarqueeSettingsAction()
      .then((s) => {
        const sec =
          Number.isFinite(s.speedSeconds) && s.speedSeconds >= 1
            ? s.speedSeconds
            : 10;
        setRotateMs(Math.max(1000, sec * 1000));
        setBroadcastEffect(s.broadcastEffect?.trim() || "glow");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getActiveBroadcastsAction()
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onBroadcastBarPx?.(items.length > 0 ? BROADCAST_BAR_PX : 0);
  }, [items.length, onBroadcastBarPx]);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, rotateMs);
    return () => window.clearInterval(id);
  }, [items.length, rotateMs]);

  useEffect(() => {
    if (items.length === 0) return;
    setIndex((i) => Math.min(i, items.length - 1));
  }, [items.length]);

  const nicknameClass = broadcastNicknameClass(broadcastEffect);
  const fxClass = rewardEffectClassName(broadcastEffect);

  const body = useMemo(() => {
    if (items.length === 0) return null;
    if (items.length === 1) {
      const b = items[0]!;
      return (
        <p className="flex min-h-[36px] min-w-0 items-center gap-2 px-2 text-xs font-medium text-amber-100">
          <span aria-hidden>📢</span>
          <span className={cn("shrink-0 font-bold", nicknameClass, fxClass)}>
            {b.nickname}
          </span>
          <span className="min-w-0 truncate text-amber-100/95">：{b.message}</span>
        </p>
      );
    }
    return (
      <div className="relative min-h-[36px] min-w-0 overflow-hidden px-2">
        {items.map((it, i) => (
          <div
            key={it.id}
            className={cn(
              "flex min-h-[36px] items-center gap-2 text-xs font-medium text-amber-100 transition-opacity duration-500",
              i === index
                ? "relative z-10 opacity-100"
                : "pointer-events-none absolute inset-0 opacity-0",
            )}
          >
            <span aria-hidden>📢</span>
            <span className={cn("shrink-0 font-bold", nicknameClass, fxClass)}>
              {it.nickname}
            </span>
            <span className="min-w-0 truncate text-amber-100/95">：{it.message}</span>
          </div>
        ))}
      </div>
    );
  }, [items, index, nicknameClass, fxClass]);

  if (!body) return null;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[45] flex flex-col pt-[env(safe-area-inset-top,0px)]"
      role="region"
      aria-label="公會廣播"
    >
      <div className="flex min-h-[36px] items-stretch border-b border-amber-900/40 bg-amber-950/80 backdrop-blur-sm">
        {body}
      </div>
    </div>
  );
}
