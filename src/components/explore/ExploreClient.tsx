"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { getMarketUsersAction } from "@/services/market.service";
import type { VillageUserWithScore } from "@/services/village.service";
import type { MarketUserWithScores } from "@/services/market.service";
import { getVillageUsersAction } from "@/services/village.service";
import { MarketContent } from "@/components/explore/MarketContent";
import { VillageContent } from "@/components/explore/VillageContent";
import { SWR_KEYS } from "@/lib/swr/keys";

interface ExploreClientProps {
  initialVillageUsers: VillageUserWithScore[];
}

export default function ExploreClient({
  initialVillageUsers,
}: ExploreClientProps) {
  const [tab, setTab] = useState<"village" | "market">("village");
  const [query, setQuery] = useState("");

  const { data: villageUsers } = useSWR(
    SWR_KEYS.villageUsers,
    () => getVillageUsersAction().then((r) => r.users ?? []),
    {
      fallbackData: initialVillageUsers,
      revalidateOnFocus: false,
      revalidateOnMount: false,
      revalidateIfStale: false,
    },
  );

  const { data: marketUsers, isLoading: marketLoading } = useSWR(
    SWR_KEYS.marketUsers(query),
    () => getMarketUsersAction(query).then((r) => r.users ?? []),
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      keepPreviousData: true,
      revalidateIfStale: false,
    },
  );

  const handleMarketQueryChange = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const villageList = villageUsers ?? initialVillageUsers;
  const marketList = useMemo(() => marketUsers ?? [], [marketUsers]);

  const villageFramePreloadKey = villageList
    .map(
      (u) =>
        `${u.id}:${u.equippedTitleImageUrl ?? ""}:${u.equippedAvatarFrameImageUrl ?? ""}:${u.cardDecoration?.cardFrameImageUrl ?? ""}:${u.equippedCardFrameImageUrl ?? ""}`,
    )
    .join(";");

  const marketFramePreloadKey = marketList
    .map(
      (u: MarketUserWithScores) =>
        `${u.id}:${u.equippedTitleImageUrl ?? ""}:${u.equippedAvatarFrameImageUrl ?? ""}:${u.cardDecoration?.cardFrameImageUrl ?? ""}:${u.equippedCardFrameImageUrl ?? ""}`,
    )
    .join(";");

  function preloadUserRewardImages(
    user: VillageUserWithScore | MarketUserWithScores,
  ) {
    if (user.equippedTitleImageUrl) {
      const img = new Image();
      img.src = user.equippedTitleImageUrl;
    }
    if (user.equippedAvatarFrameImageUrl) {
      const img = new Image();
      img.src = user.equippedAvatarFrameImageUrl;
    }
    const cardUrl =
      user.cardDecoration?.cardFrameImageUrl ?? user.equippedCardFrameImageUrl;
    if (cardUrl) {
      const img = new Image();
      img.src = cardUrl;
    }
  }

  useEffect(() => {
    const village = villageUsers ?? initialVillageUsers;
    village.forEach(preloadUserRewardImages);
    marketList.forEach(preloadUserRewardImages);
  }, [
    villageFramePreloadKey,
    marketFramePreloadKey,
    villageUsers,
    initialVillageUsers,
    marketList,
  ]);

  return (
    <div className="min-h-[100dvh] bg-zinc-950">
      <div className="border-b border-white/10 bg-zinc-950 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
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
        <div className={tab === "village" ? "block" : "hidden"}>
          <VillageContent users={villageList} />
        </div>
        <div className={tab === "market" ? "block" : "hidden"}>
          <MarketContent
            users={marketList}
            loading={marketLoading}
            query={query}
            onQueryChange={handleMarketQueryChange}
          />
        </div>
      </div>
    </div>
  );
}
