"use client";

import { useCallback, useState } from "react";
import { TavernMarquee } from "@/components/tavern/TavernMarquee";
import { AppShellMotion } from "@/components/layout/app-shell-motion";

export function AppBroadcastChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const [broadcastPadPx, setBroadcastPadPx] = useState(0);
  const onBar = useCallback((px: number) => {
    setBroadcastPadPx(px);
  }, []);

  return (
    <>
      <TavernMarquee onBroadcastBarPx={onBar} />
      <AppShellMotion broadcastExtraTopPx={broadcastPadPx}>
        {children}
      </AppShellMotion>
    </>
  );
}
