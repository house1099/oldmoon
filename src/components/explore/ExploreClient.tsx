"use client";

import { useCallback, useState } from "react";
import { getMarketUsersAction } from "@/services/market.service";
import type { VillageUserWithScore } from "@/services/village.service";
import { MarketContent } from "@/components/explore/MarketContent";
import { VillageContent } from "@/components/explore/VillageContent";

interface ExploreClientProps {
  initialVillageUsers: VillageUserWithScore[];
}

export default function ExploreClient({
  initialVillageUsers,
}: ExploreClientProps) {
  const [tab, setTab] = useState<"village" | "market">("village");
  const [marketUsers, setMarketUsers] = useState<
    Awaited<ReturnType<typeof getMarketUsersAction>>["users"]
  >([]);
  const [marketLoaded, setMarketLoaded] = useState(false);
  const [marketLoading, setMarketLoading] = useState(false);
  const [query, setQuery] = useState("");

  async function handleTabChange(newTab: "village" | "market") {
    setTab(newTab);
    if (newTab === "market" && !marketLoaded) {
      setMarketLoading(true);
      const result = await getMarketUsersAction("");
      setMarketUsers(result.users ?? []);
      setMarketLoaded(true);
      setMarketLoading(false);
    }
  }

  const handleMarketQueryChange = useCallback(async (q: string) => {
    setQuery(q);
    const result = await getMarketUsersAction(q);
    setMarketUsers(result.users ?? []);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/90 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="mx-auto flex max-w-xs rounded-full bg-zinc-900/60 p-1">
          <button
            type="button"
            onClick={() => handleTabChange("village")}
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
            onClick={() => handleTabChange("market")}
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
        {tab === "village" ? (
          <VillageContent users={initialVillageUsers} />
        ) : null}
        {tab === "market" ? (
          <MarketContent
            users={marketUsers}
            loading={marketLoading}
            query={query}
            onQueryChange={handleMarketQueryChange}
          />
        ) : null}
      </div>
    </div>
  );
}
