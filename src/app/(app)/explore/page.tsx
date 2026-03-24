"use client";

import { useState } from "react";
import { MarketContent } from "@/components/explore/MarketContent";
import { VillageContent } from "@/components/explore/VillageContent";

export default function ExplorePage() {
  const [tab, setTab] = useState<"village" | "market">("village");

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-xs rounded-full bg-zinc-900/60 p-1">
          <button
            type="button"
            onClick={() => setTab("village")}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
              tab === "village"
                ? "bg-violet-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            🏡 興趣村莊
          </button>
          <button
            type="button"
            onClick={() => setTab("market")}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
              tab === "market"
                ? "bg-amber-600 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            ⚔️ 技能市集
          </button>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-8">
        {tab === "village" ? <VillageContent /> : null}
        {tab === "market" ? <MarketContent /> : null}
      </div>
    </div>
  );
}
