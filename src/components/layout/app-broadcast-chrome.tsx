"use client";

import { useCallback, useState } from "react";
import {
  BroadcastBanner,
  BROADCAST_COMPACT_HEIGHT_PX,
} from "@/components/broadcast/BroadcastBanner";
import { AppShellMotion } from "@/components/layout/app-shell-motion";

export function AppBroadcastChrome({
  children,
  initialHasBroadcast = false,
}: {
  children: React.ReactNode;
  /** RSC 初次載入時是否已有廣播（減少頂部間距閃爍） */
  initialHasBroadcast?: boolean;
}) {
  const [broadcastPadPx, setBroadcastPadPx] = useState(() =>
    initialHasBroadcast ? BROADCAST_COMPACT_HEIGHT_PX : 0,
  );
  const onBar = useCallback((visible: boolean) => {
    setBroadcastPadPx(visible ? BROADCAST_COMPACT_HEIGHT_PX : 0);
  }, []);

  return (
    <>
      <BroadcastBanner
        initialHasBroadcast={initialHasBroadcast}
        onCompactVisibleChange={onBar}
      />
      <AppShellMotion broadcastExtraTopPx={broadcastPadPx}>
        {children}
      </AppShellMotion>
    </>
  );
}
