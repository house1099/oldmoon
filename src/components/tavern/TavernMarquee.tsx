"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { useTavern } from "@/hooks/useTavern";
import { getMarqueeAndBroadcastSettingsAction } from "@/services/system-settings.action";
import { cn } from "@/lib/utils";

const FADE_MS = 500;

/**
 * 首頁內容區酒館跑馬燈（隨頁捲動，非 fixed）。
 * 設定來自 system_settings：`tavern_marquee_mode`／`tavern_marquee_speed`。
 */
export function TavernMarquee() {
  const { messages } = useTavern();
  const [mode, setMode] = useState("scroll");
  const [speed, setSpeed] = useState(20);

  useEffect(() => {
    void getMarqueeAndBroadcastSettingsAction()
      .then((s) => {
        setMode((s.marquee.mode || "scroll").trim() || "scroll");
        setSpeed(
          Number.isFinite(s.marquee.speed) && s.marquee.speed >= 1
            ? s.marquee.speed
            : 20,
        );
      })
      .catch(() => {});
    const id = window.setInterval(() => {
      void getMarqueeAndBroadcastSettingsAction()
        .then((s) => {
          setMode((s.marquee.mode || "scroll").trim() || "scroll");
          setSpeed(
            Number.isFinite(s.marquee.speed) && s.marquee.speed >= 1
              ? s.marquee.speed
              : 20,
          );
        })
        .catch(() => {});
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const latest = useMemo(() => messages.slice(-5), [messages]);

  const scrollText = useMemo(() => {
    if (latest.length === 0) return "";
    return latest
      .map((m) => `🍺 ${m.user.nickname}：${m.content}`)
      .join(" ・ ");
  }, [latest]);

  if (latest.length === 0) return null;

  if (mode === "scroll") {
    return (
      <section
        aria-label="酒館訊息"
        className="h-8 w-full overflow-hidden border-b border-zinc-700/30 bg-zinc-900/60"
      >
        <div className="flex h-full items-center">
          <span
            className="flex shrink-0 items-center px-2 text-xs text-zinc-400"
            aria-hidden
          >
            🍺
          </span>
          <div className="relative min-w-0 flex-1 overflow-hidden">
            <div
              className="bb-tavern-marquee-scroll text-xs text-zinc-100"
              style={
                {
                  "--tavern-marquee-dur": `${speed}s`,
                } as CSSProperties
              }
            >
              {scrollText}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (mode === "fade") {
    return (
      <section
        aria-label="酒館訊息"
        className="h-8 w-full overflow-hidden border-b border-zinc-700/30 bg-zinc-900/60"
      >
        <TavernFadeRotator items={latest} speedSec={speed} />
      </section>
    );
  }

  if (mode === "bounce") {
    return (
      <section
        aria-label="酒館訊息"
        className="h-8 w-full overflow-hidden border-b border-zinc-700/30 bg-zinc-900/60"
      >
        <TavernBounceRotator items={latest} speedSec={speed} />
      </section>
    );
  }

  return (
    <section
      aria-label="酒館訊息"
      className="h-8 w-full overflow-hidden border-b border-zinc-700/30 bg-zinc-900/60"
    >
      <div className="flex h-full items-center px-2 text-xs text-zinc-100">
        🍺 {latest[0]!.user.nickname}：{latest[0]!.content}
      </div>
    </section>
  );
}

type TavernMsg = {
  user: { nickname: string };
  content: string;
};

function TavernFadeRotator({
  items,
  speedSec,
}: {
  items: TavernMsg[];
  speedSec: number;
}) {
  const [idx, setIdx] = useState(0);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    let i = 0;

    (async () => {
      while (!cancelled) {
        setIdx(i % items.length);
        setOpacity(0);
        await new Promise((r) => setTimeout(r, 40));
        if (cancelled) break;
        setOpacity(1);
        await new Promise((r) => setTimeout(r, FADE_MS + speedSec * 1000));
        if (cancelled) break;
        setOpacity(0);
        await new Promise((r) => setTimeout(r, FADE_MS));
        if (cancelled) break;
        i += 1;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items, speedSec]);

  const m = items[idx];
  if (!m) return null;

  return (
    <div className="flex h-full items-center justify-center px-3">
      <p
        className="line-clamp-1 text-center text-xs text-zinc-100 transition-opacity duration-500"
        style={{ opacity }}
      >
        🍺 {m.user.nickname}：{m.content}
      </p>
    </div>
  );
}

const BOUNCE_IN_MS = 550;
const BOUNCE_OUT_MS = 450;

function TavernBounceRotator({
  items,
  speedSec,
}: {
  items: TavernMsg[];
  speedSec: number;
}) {
  const [idx, setIdx] = useState(0);
  const [bounceClass, setBounceClass] = useState("bb-tavern-bounce-in");

  useEffect(() => {
    if (items.length === 0) return;
    let cancelled = false;
    let i = 0;
    const timers: number[] = [];

    const tick = () => {
      if (cancelled) return;
      setIdx(i % items.length);
      setBounceClass("bb-tavern-bounce-in");
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return;
          setBounceClass("");
          timers.push(
            window.setTimeout(() => {
              if (cancelled) return;
              setBounceClass("bb-tavern-bounce-out");
              timers.push(
                window.setTimeout(() => {
                  if (cancelled) return;
                  i += 1;
                  tick();
                }, BOUNCE_OUT_MS),
              );
            }, speedSec * 1000),
          );
        }, BOUNCE_IN_MS),
      );
    };

    tick();
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [items, speedSec]);

  const m = items[idx];
  if (!m) return null;

  return (
    <div className="flex h-full items-center justify-center overflow-hidden px-2">
      <p
        key={`${idx}-${bounceClass}`}
        className={cn(
          "line-clamp-1 text-center text-xs text-zinc-100",
          bounceClass,
        )}
      >
        🍺 {m.user.nickname}：{m.content}
      </p>
    </div>
  );
}
