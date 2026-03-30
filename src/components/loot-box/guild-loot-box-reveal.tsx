"use client";

import { useCallback, useEffect, useState } from "react";
import Lottie from "lottie-react";
import { Loader2 } from "lucide-react";
import { GUILD_LOOT_BOX_LOTTIE_PATH } from "@/lib/constants/guild-loot-box-lottie";
import type { DrawResult } from "@/services/prize-engine";
import { cn } from "@/lib/utils";

const LOOT_REVEAL_FALLBACK_MS = 4200;

type GuildLootBoxRevealProps = {
  /** Increment when opening so fetch + Lottie reset from a clean state. */
  playbackKey: number;
  draws: DrawResult[];
  className?: string;
};

export function GuildLootBoxReveal({
  playbackKey,
  draws,
  className,
}: GuildLootBoxRevealProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [visiblePrizeCount, setVisiblePrizeCount] = useState(0);

  useEffect(() => {
    setAnimationData(null);
    setLoadError(false);
    setRevealed(false);
    setVisiblePrizeCount(0);

    let cancelled = false;
    void fetch(GUILD_LOOT_BOX_LOTTIE_PATH)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<object>;
      })
      .then((data) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          setRevealed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [playbackKey]);

  const onLottieComplete = useCallback(() => {
    setRevealed(true);
  }, []);

  useEffect(() => {
    if (!animationData || loadError || revealed) return;
    const t = window.setTimeout(() => {
      setRevealed(true);
    }, LOOT_REVEAL_FALLBACK_MS);
    return () => window.clearTimeout(t);
  }, [animationData, loadError, revealed]);

  useEffect(() => {
    if (!revealed || draws.length === 0) {
      setVisiblePrizeCount(0);
      return;
    }
    if (draws.length === 1) {
      setVisiblePrizeCount(1);
      return;
    }
    setVisiblePrizeCount(1);
    let i = 1;
    const id = window.setInterval(() => {
      i += 1;
      setVisiblePrizeCount((c) => Math.min(c + 1, draws.length));
      if (i >= draws.length) window.clearInterval(id);
    }, 110);
    return () => window.clearInterval(id);
  }, [revealed, draws.length]);

  if (draws.length === 0) return null;

  const showLottie = animationData && !loadError;
  const showLoading = !animationData && !loadError;

  return (
    <div className={cn("relative mx-auto w-full max-w-[300px]", className)}>
      <div
        className={cn(
          "relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl border border-violet-500/25 bg-black/40",
        )}
      >
        {showLoading ? (
          <div className="flex flex-col items-center gap-2 py-12 text-zinc-500">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" aria-hidden />
            <span className="text-xs">載入寶箱動畫…</span>
          </div>
        ) : null}

        {showLottie ? (
          <div
            className={cn(
              "flex w-full max-w-[260px] items-center justify-center transition-opacity duration-500",
              revealed ? "pointer-events-none opacity-[0.35]" : "opacity-100",
            )}
          >
            <Lottie
              key={playbackKey}
              animationData={animationData}
              loop={false}
              className="h-[240px] w-[240px] max-w-full"
              onComplete={onLottieComplete}
            />
          </div>
        ) : null}

        {revealed ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 overflow-y-auto p-3">
            {loadError ? (
              <p className="mb-1 text-center text-[11px] text-zinc-500">
                動畫載入失敗，獎勵仍已發放
              </p>
            ) : null}
            <div
              className={cn(
                "flex w-full max-h-[min(52vh,340px)] flex-col items-center justify-center gap-2 overflow-y-auto",
                draws.length > 1 ? "items-stretch" : "",
              )}
            >
              {draws.slice(0, visiblePrizeCount).map((d, i) => (
                <div
                  key={`${d.itemId}-${i}`}
                  className={cn(
                    "w-full max-w-[240px] rounded-2xl border border-amber-400/50 bg-zinc-950/95 px-4 py-3 text-center shadow-[0_0_24px_rgba(251,191,36,0.15)]",
                    "animate-[guildLootPrize_0.45s_ease-out_both]",
                  )}
                  style={{ animationDelay: draws.length > 1 ? `${i * 40}ms` : "0ms" }}
                >
                  {draws.length > 1 ? (
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                      第 {i + 1} 抽
                    </p>
                  ) : null}
                  <p className="text-base font-bold text-white">{d.label}</p>
                  <p className="mt-1 text-[11px] font-medium uppercase text-violet-300">
                    {d.rewardType}
                  </p>
                  {d.value != null ? (
                    <p className="mt-1 text-sm font-semibold tabular-nums text-amber-200">
                      +{d.value}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {!revealed && showLottie ? (
        <p className="mt-2 text-center text-xs text-zinc-500">寶箱開啟中…</p>
      ) : null}
    </div>
  );
}
