"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { GuildTabProvider } from "@/contexts/guild-tab-context";

type DoorStage = "idle" | "closing" | "opening";

/** 與 **`Navbar` fixed** 預留、`app-shell` **`pb-[calc(5.25rem+…)]`** 一致；門板下緣不進入底欄區。 */
const NAV_BOTTOM_RESERVE =
  "calc(5.25rem + env(safe-area-inset-bottom, 0px))" as const;

/** 關門 ms + 等待 ms + 開門 ms（開門約 1.8s） */
const CLOSE_MS = 150;
const HOLD_MS = 150;
const OPEN_MS = 1800;
const OPEN_AT_MS = CLOSE_MS + HOLD_MS;
const IDLE_AT_MS = OPEN_AT_MS + OPEN_MS;

export function AppShellMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [stage, setStage] = useState<DoorStage>("idle");

  useEffect(() => {
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

  const leftDoorClass = cn(
    "absolute left-0 top-0 z-30 w-1/2 bg-black bg-no-repeat will-change-transform",
    "bottom-[var(--nav-reserve)] transition-transform",
    stage === "closing" && "translate-x-0 duration-150 ease-in",
    stage === "opening" && "-translate-x-full ease-in-out",
    stage === "idle" && "-translate-x-full",
    stage === "idle" && "pointer-events-none",
  );

  const rightDoorClass = cn(
    "absolute right-0 top-0 z-30 w-1/2 bg-black bg-no-repeat will-change-transform",
    "bottom-[var(--nav-reserve)] transition-transform",
    stage === "closing" && "translate-x-0 duration-150 ease-in",
    stage === "opening" && "translate-x-full ease-in-out",
    stage === "idle" && "translate-x-full",
    stage === "idle" && "pointer-events-none",
  );

  const doorTransitionMs =
    stage === "closing" ? 150 : stage === "opening" ? OPEN_MS : 0;

  return (
    <GuildTabProvider>
      <div
        className="dark min-h-screen bg-[radial-gradient(ellipse_100%_55%_at_50%_0%,rgba(88,28,135,0.38),#020617_52%)] text-foreground"
        style={
          { "--nav-reserve": NAV_BOTTOM_RESERVE } as CSSProperties
        }
      >
        <div className="relative min-h-screen overflow-hidden pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]">
          <div
            className={leftDoorClass}
            style={{
              backgroundImage: "url(/images/splash.png)",
              backgroundPosition: "left center",
              backgroundSize: "200% 100%",
              transitionDuration:
                doorTransitionMs > 0 ? `${doorTransitionMs}ms` : undefined,
            }}
            aria-hidden
          />
          <div
            className={rightDoorClass}
            style={{
              backgroundImage: "url(/images/splash.png)",
              backgroundPosition: "right center",
              backgroundSize: "200% 100%",
              transitionDuration:
                doorTransitionMs > 0 ? `${doorTransitionMs}ms` : undefined,
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
