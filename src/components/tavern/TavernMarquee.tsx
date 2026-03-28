"use client";

import { useEffect, useMemo, useState } from "react";
import { useTavern } from "@/hooks/useTavern";
import { getMarqueeSettingsAction } from "@/services/system-settings.action";
import { cn } from "@/lib/utils";

function marqueeTextClass(effect: string): string {
  const e = effect.trim();
  if (e === "pulse") return "animate-pulse text-amber-300";
  if (e === "rainbow") return "animate-rainbow-text text-amber-300";
  return "text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]";
}

export function TavernMarquee() {
  const { messages } = useTavern();
  const [speedSeconds, setSpeedSeconds] = useState(20);
  const [broadcastEffect, setBroadcastEffect] = useState("glow");

  useEffect(() => {
    void getMarqueeSettingsAction()
      .then((s) => {
        const sec =
          Number.isFinite(s.speedSeconds) && s.speedSeconds >= 1
            ? s.speedSeconds
            : 10;
        setSpeedSeconds(sec);
        setBroadcastEffect(s.broadcastEffect?.trim() || "glow");
      })
      .catch(() => {});
  }, []);

  const marqueeText = useMemo(() => {
    const latest = messages.slice(-5);
    if (latest.length === 0) return "";
    return latest
      .map((m) => `${m.user.nickname}：${m.content}　　`)
      .join("");
  }, [messages]);

  const textClass = marqueeTextClass(broadcastEffect);

  return (
    <div className="fixed left-0 right-0 top-0 z-[50] flex flex-col pt-[env(safe-area-inset-top,0px)]">
      <div className="flex h-8 items-stretch border-b border-zinc-800/50 bg-zinc-900/80 backdrop-blur-sm">
        <span
          className="flex shrink-0 items-center px-2 text-xs font-bold text-amber-400"
          aria-hidden
        >
          🍺
        </span>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          {marqueeText ? (
            <div
              className={cn(
                "animate-marquee inline-block will-change-transform text-xs",
                textClass,
              )}
              style={{
                animationDuration: `${speedSeconds}s`,
              }}
            >
              {marqueeText}
            </div>
          ) : (
            <div className="flex h-full items-center text-xs text-zinc-500">
              🍺 酒館等待冒險者入場...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
