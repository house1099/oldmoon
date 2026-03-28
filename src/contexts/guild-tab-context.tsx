"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type GuildSubTab = "血盟" | "聊天" | "信件";

type GuildTabContextValue = {
  guildSubTab: GuildSubTab | null;
  setGuildSubTab: (tab: GuildSubTab | null) => void;
  /** 從他處（如浮動工具列）要求切到公會子分頁；由 `/guild` 頁面 consume 後清除 */
  guildNavTick: number;
  requestGuildSubTab: (tab: GuildSubTab) => void;
  takePendingGuildSubTab: () => GuildSubTab | null;
};

const GuildTabContext = createContext<GuildTabContextValue | null>(null);

export function GuildTabProvider({ children }: { children: ReactNode }) {
  const [guildSubTab, setGuildSubTab] = useState<GuildSubTab | null>(null);
  const pendingRef = useRef<GuildSubTab | null>(null);
  const [guildNavTick, setGuildNavTick] = useState(0);

  const requestGuildSubTab = useCallback((tab: GuildSubTab) => {
    pendingRef.current = tab;
    setGuildNavTick((t) => t + 1);
  }, []);

  const takePendingGuildSubTab = useCallback((): GuildSubTab | null => {
    const v = pendingRef.current;
    pendingRef.current = null;
    return v;
  }, []);

  const value = useMemo(
    () => ({
      guildSubTab,
      setGuildSubTab,
      guildNavTick,
      requestGuildSubTab,
      takePendingGuildSubTab,
    }),
    [guildSubTab, guildNavTick, requestGuildSubTab, takePendingGuildSubTab],
  );
  return (
    <GuildTabContext.Provider value={value}>{children}</GuildTabContext.Provider>
  );
}

export function useGuildTabContext(): GuildTabContextValue | null {
  return useContext(GuildTabContext);
}
