"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type GuildSubTab = "血盟" | "聊天" | "信件";

type GuildTabContextValue = {
  guildSubTab: GuildSubTab | null;
  setGuildSubTab: (tab: GuildSubTab | null) => void;
};

const GuildTabContext = createContext<GuildTabContextValue | null>(null);

export function GuildTabProvider({ children }: { children: ReactNode }) {
  const [guildSubTab, setGuildSubTab] = useState<GuildSubTab | null>(null);
  const value = useMemo(
    () => ({ guildSubTab, setGuildSubTab }),
    [guildSubTab],
  );
  return (
    <GuildTabContext.Provider value={value}>{children}</GuildTabContext.Provider>
  );
}

export function useGuildTabContext(): GuildTabContextValue | null {
  return useContext(GuildTabContext);
}
