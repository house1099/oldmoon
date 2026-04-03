"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CatchPanel } from "@/components/matchmaking/catch-panel";
import { FishingPanel } from "@/components/matchmaking/fishing-panel";
import { MatchmakerSettingsPanel } from "@/components/matchmaking/matchmaker-settings-tab";

type MainTab = "fishing" | "catch" | "settings";
type CatchSubTab = "matchmaker" | "items";

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 text-center py-2 text-xs border-b-2 transition-colors ${
        active
          ? "text-violet-400 border-violet-500"
          : "text-zinc-500 border-transparent"
      }`}
    >
      {children}
    </button>
  );
}

export default function MatchmakingPage() {
  const searchParams = useSearchParams();
  const [mainTab, setMainTab] = useState<MainTab>("fishing");
  const [catchTab, setCatchTab] = useState<CatchSubTab>("matchmaker");

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "settings") {
      setMainTab("settings");
    }
  }, [searchParams]);

  return (
    <div className="flex h-[100dvh] flex-col bg-zinc-950 pb-[max(5rem,env(safe-area-inset-bottom))]">
      <div className="pb-1 pt-3 text-center text-base font-medium text-white">
        月老
      </div>

      <div className="mx-4 flex border-b border-zinc-800/60">
        <TabBtn
          active={mainTab === "fishing"}
          onClick={() => setMainTab("fishing")}
        >
          🎣 魚池
        </TabBtn>
        <TabBtn
          active={mainTab === "catch"}
          onClick={() => setMainTab("catch")}
        >
          🐟 魚獲
        </TabBtn>
        <TabBtn
          active={mainTab === "settings"}
          onClick={() => setMainTab("settings")}
        >
          ⚙️ 設定
        </TabBtn>
      </div>

      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain">
        {mainTab === "fishing" ? <FishingPanel /> : null}
        {mainTab === "catch" ? (
          <CatchPanel subTab={catchTab} onSubTabChange={setCatchTab} />
        ) : null}
        {mainTab === "settings" ? <MatchmakerSettingsPanel /> : null}
      </div>
    </div>
  );
}
