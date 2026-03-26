"use client";

import { useMemo } from "react";
import { useTavern } from "@/hooks/useTavern";

export function TavernMarquee() {
  const { messages } = useTavern();

  const marqueeText = useMemo(() => {
    const latest = messages.slice(-5);
    if (latest.length === 0) return "";
    return latest
      .map((m) => `${m.user.nickname}：${m.content}　　`)
      .join("");
  }, [messages]);

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
            <div className="animate-marquee inline-block will-change-transform">
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

