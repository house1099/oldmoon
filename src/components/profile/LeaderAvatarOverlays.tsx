"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

const LIGHTNING_LOTTIE_URL = "/animations/yellow-circle.json";
const THUNDER_FRAME_SRC = "/frames/thunder-frame.png";

/**
 * 領袖（master）頭像外層：底層金屬框 PNG、頂層閃電 Lottie；兩者皆為頭像尺寸的 120%。
 */
export function LeaderAvatarOverlays() {
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(LIGHTNING_LOTTIE_URL);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as object;
        if (!cancelled) setAnimationData(data);
      } catch (e) {
        console.error("LeaderAvatarOverlays: Lottie load failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- 本地裝飾框，需與頭像比例一致 */}
      <img
        src={THUNDER_FRAME_SRC}
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 z-[10] h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 object-contain select-none"
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 z-[11] h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2"
        aria-hidden
      >
        {animationData ? (
          <Lottie
            animationData={animationData}
            loop
            className="h-full w-full"
          />
        ) : null}
      </div>
    </>
  );
}
