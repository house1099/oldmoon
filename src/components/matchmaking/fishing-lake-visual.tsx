"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

import { FISHING_LOOP_LOTTIE_PATH } from "@/lib/constants/fishing-lottie";
import type { FishingStatusDto } from "@/services/fishing.action";

type UiPhase = "idle" | "casting" | "ready";

function WaveSvg() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 opacity-90">
      <svg
        className="h-full w-full text-violet-500/25"
        viewBox="0 0 1200 40"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0,20 Q300,5 600,20 T1200,20 L1200,40 L0,40 Z"
        />
      </svg>
      <svg
        className="absolute inset-x-0 bottom-0 h-10 w-full text-blue-500/20"
        viewBox="0 0 1200 32"
        preserveAspectRatio="none"
      >
        <path
          fill="currentColor"
          d="M0,16 Q400,28 800,16 T1200,16 L1200,32 L0,32 Z"
        />
      </svg>
    </div>
  );
}

type FishingLakeVisualProps = {
  serverPhase: FishingStatusDto["phase"];
  uiPhase: UiPhase;
};

export function FishingLakeVisual({ serverPhase, uiPhase }: FishingLakeVisualProps) {
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(FISHING_LOOP_LOTTIE_PATH)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<object>;
      })
      .then((data) => {
        if (!cancelled) setAnimationData(data);
      })
      .catch(() => {
        if (!cancelled) setAnimationData(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const showCasting = uiPhase === "casting";
  const showReady = uiPhase === "ready";

  if (serverPhase === "no_rod" || serverPhase === "no_bait") {
    return (
      <div
        className="relative flex min-h-[200px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-zinc-800/40 bg-gradient-to-b from-zinc-900 to-blue-950/40"
        aria-hidden
      >
        <WaveSvg />
        <div className="relative z-10 flex flex-col items-center">
          <span className="text-5xl">🎣</span>
          <span className="mt-1 text-xs text-zinc-400">命運之湖</span>
        </div>
      </div>
    );
  }

  const borderClass = showReady
    ? "border-orange-400/50 shadow-[0_0_24px_rgba(251,146,60,0.12)]"
    : "border-zinc-800/40";
  const bgClass = showReady
    ? "from-zinc-900 to-orange-950/25"
    : "from-zinc-900 to-blue-950/40";
  const pulse = showReady ? " animate-pulse" : "";

  let statusLine = "準備好拋竿了";
  let statusClass = "text-zinc-300";
  if (showCasting) {
    statusLine = "魚竿已拋出…";
    statusClass = "text-orange-400";
  } else if (showReady) {
    statusLine = "有東西上鉤了！";
    statusClass = "text-orange-200 font-medium";
  }

  return (
    <div
      className={`relative flex min-h-[240px] flex-col items-stretch overflow-hidden rounded-2xl border bg-gradient-to-b ${borderClass} ${bgClass}${pulse}`}
      aria-hidden
    >
      <WaveSvg />
      <div className="relative z-10 flex min-h-[200px] flex-1 flex-col items-center justify-center px-2 pt-2">
        {animationData ? (
          <div className="relative h-[min(52vw,220px)] w-full max-w-[340px]">
            <Lottie
              animationData={animationData}
              loop
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex h-44 w-full items-center justify-center">
            <span className={`text-5xl ${showCasting ? "rod-sway" : ""}`}>🎣</span>
          </div>
        )}
        <p className={`mt-1 pb-3 text-center text-xs ${statusClass}`}>{statusLine}</p>
      </div>
    </div>
  );
}
