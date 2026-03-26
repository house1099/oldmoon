"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { GuildTabProvider } from "@/contexts/guild-tab-context";

type CurtainStage = "idle" | "closing" | "opening";

/** 與 **`Navbar` fixed** 預留、`app-shell` **`pb-[calc(5.25rem+…)]`** 一致；遮罩下緣不進入底欄區。 */
const NAV_BOTTOM_RESERVE =
  "calc(5.25rem + env(safe-area-inset-bottom, 0px))" as const;

/** 由下往上滑入蓋版 ms + 等待 ms + 向上滑出消失 ms */
const CLOSE_MS = 150;
const HOLD_MS = 150;
const OPEN_MS = 1800;
const OPEN_AT_MS = CLOSE_MS + HOLD_MS;
const IDLE_AT_MS = OPEN_AT_MS + OPEN_MS;

export function AppShellMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [stage, setStage] = useState<CurtainStage>("idle");
  /** 關閉段：先置於畫面下緣外，下一幀再滑入（不從中線左右切）。 */
  const [closeArmed, setCloseArmed] = useState(false);

  useEffect(() => {
    setCloseArmed(false);
    setStage("closing");

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setCloseArmed(true));
    });

    const openTimer = window.setTimeout(() => {
      setStage("opening");
    }, OPEN_AT_MS);

    const idleTimer = window.setTimeout(() => {
      setStage("idle");
      setCloseArmed(false);
    }, IDLE_AT_MS);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(openTimer);
      window.clearTimeout(idleTimer);
    };
  }, [pathname]);

  const curtainClass = cn(
    "absolute inset-x-0 top-0 z-30 bg-black bg-cover bg-center bg-no-repeat will-change-transform",
    "bottom-[var(--nav-reserve)] transition-transform",
    stage === "idle" &&
      "pointer-events-none translate-y-full opacity-0 [transition-duration:0ms]",
    stage === "closing" &&
      !closeArmed &&
      "translate-y-full opacity-0 [transition-duration:0ms]",
    stage === "closing" &&
      closeArmed &&
      "translate-y-0 opacity-100 duration-150 ease-in",
    stage === "opening" && "-translate-y-full opacity-100 ease-in-out",
  );

  const transitionMs =
    stage === "closing" && closeArmed
      ? CLOSE_MS
      : stage === "opening"
        ? OPEN_MS
        : 0;

  return (
    <GuildTabProvider>
      <div
        className="dark min-h-screen bg-[radial-gradient(ellipse_100%_55%_at_50%_0%,rgba(88,28,135,0.38),#020617_52%)] text-foreground"
        style={{ "--nav-reserve": NAV_BOTTOM_RESERVE } as CSSProperties}
      >
        <div className="relative min-h-screen overflow-hidden pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]">
          <div
            className={curtainClass}
            style={{
              backgroundImage: "url(/images/splash.png)",
              transitionDuration:
                transitionMs > 0 ? `${transitionMs}ms` : undefined,
            }}
            aria-hidden
          />
          <div className="relative z-0">{children}</div>
        </div>
        <Navbar />
      </div>
    </GuildTabProvider>
  );
}
