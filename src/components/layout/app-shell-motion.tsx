"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { GuildTabProvider } from "@/contexts/guild-tab-context";

type DoorStage = "idle" | "closing" | "opening";

export function AppShellMotion({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [stage, setStage] = useState<DoorStage>("idle");

  useEffect(() => {
    setStage("closing");

    const openTimer = window.setTimeout(() => {
      setStage("opening");
    }, 300);

    const idleTimer = window.setTimeout(() => {
      setStage("idle");
    }, 800);

    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(idleTimer);
    };
  }, [pathname]);

  const leftDoorClass = cn(
    "absolute inset-y-0 left-0 z-[9999] w-1/2 bg-no-repeat will-change-transform",
    stage === "closing" &&
      "translate-x-0 transition-transform duration-150 ease-in",
    stage === "opening" &&
      "-translate-x-full transition-transform duration-500 ease-in-out",
    stage === "idle" && "-translate-x-full",
    stage === "idle" && "pointer-events-none",
  );

  const rightDoorClass = cn(
    "absolute inset-y-0 right-0 z-[9999] w-1/2 bg-no-repeat will-change-transform",
    stage === "closing" &&
      "translate-x-0 transition-transform duration-150 ease-in",
    stage === "opening" &&
      "translate-x-full transition-transform duration-500 ease-in-out",
    stage === "idle" && "translate-x-full",
    stage === "idle" && "pointer-events-none",
  );

  return (
    <GuildTabProvider>
      <div className="dark min-h-screen bg-[radial-gradient(ellipse_100%_55%_at_50%_0%,rgba(88,28,135,0.38),#020617_52%)] text-foreground">
        <div className="relative min-h-screen overflow-hidden pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))]">
          <div
            className={leftDoorClass}
            style={{
              backgroundImage: "url(/images/splash.png)",
              backgroundPosition: "left center",
              backgroundSize: "200% 100%",
            }}
            aria-hidden
          />
          <div
            className={rightDoorClass}
            style={{
              backgroundImage: "url(/images/splash.png)",
              backgroundPosition: "right center",
              backgroundSize: "200% 100%",
            }}
            aria-hidden
          />
          {children}
        </div>
        <Navbar />
      </div>
    </GuildTabProvider>
  );
}
