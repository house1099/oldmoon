"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

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
  backgroundSize: "100% 200%",
};

export function AppShellMotion({
  children,
  broadcastExtraTopPx = 0,
}: {
  children: React.ReactNode;
  /** 固定頂部廣播橫幅額外高度（px），無廣播時為 0 */
  broadcastExtraTopPx?: number;
}) {
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

  const topPadExpr =
    broadcastExtraTopPx > 0
      ? `calc(2rem + ${broadcastExtraTopPx}px + env(safe-area-inset-top, 0px))`
      : "calc(2rem + env(safe-area-inset-top, 0px))";

  return (
    <>
      <div
        className="dark flex min-h-[100dvh] flex-col bg-[radial-gradient(ellipse_100%_55%_at_50%_0%,rgba(88,28,135,0.38),#020617_52%)] text-foreground"
        style={
          {
            "--nav-reserve": NAV_BOTTOM_RESERVE,
            paddingTop: topPadExpr,
          } as CSSProperties
        }
      >
        <div className="relative flex min-h-0 flex-1 flex-col pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]">
          {/* pb 預留區填色，避免切頁時透出外層 radial 藍帶 */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-zinc-950"
            style={{ height: NAV_BOTTOM_RESERVE }}
            aria-hidden
          />
          <div className="relative z-[2] flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </div>

      {/* 過場雙扇門 — fixed 定位覆蓋整個視口，不受頁面高度影響 */}
      <div
        className={cn(
          "fixed inset-0 z-[9999] pointer-events-none",
          stage !== "idle" && "pointer-events-auto",
        )}
        aria-hidden
      >
        <div
          className={cn(
            "fixed top-0 left-0 right-0 h-1/2 z-[9999] bg-black will-change-transform transition-transform pointer-events-none",
            stage === "idle" && "-translate-y-full",
            stage === "closing" && "translate-y-0 ease-in",
            stage === "opening" && "-translate-y-full ease-in-out",
          )}
          style={{
            ...splashBg,
            backgroundPosition: "center top",
            transitionDuration:
              transitionMs > 0 ? `${transitionMs}ms` : undefined,
          }}
        />
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 h-1/2 z-[9999] bg-black will-change-transform transition-transform pointer-events-none",
            stage === "idle" && "translate-y-full",
            stage === "closing" && "translate-y-0 ease-in",
            stage === "opening" && "translate-y-full ease-in-out",
          )}
          style={{
            ...splashBg,
            backgroundPosition: "center bottom",
            transitionDuration:
              transitionMs > 0 ? `${transitionMs}ms` : undefined,
          }}
        />
      </div>
    </>
  );
}
