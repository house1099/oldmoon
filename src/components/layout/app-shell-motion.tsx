"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { GuildTabProvider } from "@/contexts/guild-tab-context";

type SplitStage = "idle" | "closing" | "opening";

/** 與 **`Navbar` fixed** 預留、`app-shell` **`pb-[calc(5.25rem+…)]`** 一致。 */
const NAV_BOTTOM_RESERVE =
  "calc(5.25rem + env(safe-area-inset-bottom, 0px))" as const;

/** 首頁 `/` 無過場；其餘路由：關 100ms → 暫停 1s → 開 1s。 */
const CLOSE_MS = 100;
const HOLD_MS = 1000;
const OPEN_MS = 1000;
const OPEN_AT_MS = CLOSE_MS + HOLD_MS;
const IDLE_AT_MS = OPEN_AT_MS + OPEN_MS;

const splashBg: CSSProperties = {
  backgroundImage: "url(/images/splash.png)",
  backgroundRepeat: "no-repeat",
  /** 半高面板 × 200% 高 = 整張圖等比例鋪滿兩扇，接縫在垂直中線（X），各頁一致、不依賴 cover 裁切。 */
  backgroundSize: "100% 200%",
};

export function AppShellMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [stage, setStage] = useState<SplitStage>("idle");

  useEffect(() => {
    if (pathname === "/") {
      setStage("idle");
      return;
    }

    setStage("closing");

    const openTimer = window.setTimeout(() => {
      setStage("opening");
    }, OPEN_AT_MS);

    const idleTimer = window.setTimeout(() => {
      setStage("idle");
    }, IDLE_AT_MS);

    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(idleTimer);
    };
  }, [pathname]);

  const transitionMs =
    stage === "closing" ? CLOSE_MS : stage === "opening" ? OPEN_MS : 0;

  const topClass = cn(
    "absolute left-0 right-0 top-0 z-30 h-1/2 bg-black will-change-transform transition-transform",
    stage === "idle" && "-translate-y-full pointer-events-none",
    stage === "closing" && "translate-y-0 ease-in",
    stage === "opening" && "-translate-y-full ease-in-out",
  );

  const bottomClass = cn(
    "absolute bottom-0 left-0 right-0 z-30 h-1/2 bg-black will-change-transform transition-transform",
    stage === "idle" && "translate-y-full pointer-events-none",
    stage === "closing" && "translate-y-0 ease-in",
    stage === "opening" && "translate-y-full ease-in-out",
  );

  return (
    <GuildTabProvider>
      <div
        className="dark min-h-screen bg-[radial-gradient(ellipse_100%_55%_at_50%_0%,rgba(88,28,135,0.38),#020617_52%)] text-foreground"
        style={{ "--nav-reserve": NAV_BOTTOM_RESERVE } as CSSProperties}
      >
        <div className="relative min-h-screen overflow-hidden pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]">
          {/* pb 預留區若不填色會透出外層 radial，切頁時與內頁 zinc-950 閃一條藍帶 */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-zinc-950"
            style={{ height: NAV_BOTTOM_RESERVE }}
            aria-hidden
          />
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 top-0 bottom-[var(--nav-reserve)] z-30",
              stage !== "idle" && "pointer-events-auto",
            )}
            aria-hidden
          >
            <div
              className={topClass}
              style={{
                ...splashBg,
                backgroundPosition: "center top",
                transitionDuration:
                  transitionMs > 0 ? `${transitionMs}ms` : undefined,
              }}
            />
            <div
              className={bottomClass}
              style={{
                ...splashBg,
                backgroundPosition: "center bottom",
                transitionDuration:
                  transitionMs > 0 ? `${transitionMs}ms` : undefined,
              }}
            />
          </div>
          <div className="relative z-[2] min-h-0">{children}</div>
        </div>
        <Navbar />
      </div>
    </GuildTabProvider>
  );
}
