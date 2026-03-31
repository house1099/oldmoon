"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { mutate as globalMutate } from "swr";
import { X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { rewardEffectClassName } from "@/lib/utils/reward-effects";
import { SWR_KEYS } from "@/lib/swr/keys";
import { useMyProfile } from "@/hooks/useMyProfile";
import {
  buyListingAction,
  cancelListingAction,
  createListingAction,
  getActiveListingsAction,
  getMyListingsAction,
  getRecentSoldListingsAction,
  type MarketListingWithDetail,
  type RecentSoldItem,
} from "@/services/market-listing.action";
import { getMyRewardsAction } from "@/services/rewards.action";
import type { UserRewardWithEffect } from "@/lib/repositories/server/rewards.repository";
import { toast } from "sonner";
import type { MarketListingStatus } from "@/types/database.types";

function toThumbImageUrl(raw: string, width: number, height: number): string {
  const src = raw.trim();
  if (!src) return src;
  if (src.startsWith("/")) return src;
  if (src.includes("cloudinary.com")) {
    return src.replace(
      "/upload/",
      `/upload/w_${width},h_${height},c_fill,q_auto,f_auto/`,
    );
  }
  return src;
}

function hallItemTypeEmoji(itemType: string): string {
  switch (itemType) {
    case "avatar_frame":
      return "🖼️";
    case "card_frame":
      return "🃏";
    case "title":
      return "🏅";
    case "broadcast":
      return "📢";
    case "rename_card":
      return "✏️";
    default:
      return "🎁";
  }
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  title: "稱號",
  avatar_frame: "頭像框",
  card_frame: "卡片框",
  broadcast: "廣播券",
  loot_box: "盲盒",
  bag_expansion: "背包擴充",
  rename_card: "改名卡",
};

function itemTypeBadgeLabel(itemType: string): string {
  return ITEM_TYPE_LABELS[itemType] ?? "道具";
}

function currencyLabel(t: "free_coins" | "premium_coins"): string {
  return t === "premium_coins" ? "純金" : "探險幣";
}

function tickerCoinSymbol(t: "free_coins" | "premium_coins"): string {
  return t === "premium_coins" ? "💎" : "🪙";
}

function buildTickerLine(items: RecentSoldItem[]): string {
  return items
    .map(
      (i) =>
        `${i.itemLabel} 成交 ${i.price}${tickerCoinSymbol(i.currencyType)}`,
    )
    .join("　·　");
}

function statusBadge(status: MarketListingStatus): {
  text: string;
  className: string;
} {
  switch (status) {
    case "active":
      return { text: "上架中", className: "bg-emerald-500/20 text-emerald-200" };
    case "sold":
      return { text: "已售出", className: "bg-sky-500/20 text-sky-200" };
    case "cancelled":
      return { text: "已下架", className: "bg-zinc-500/25 text-zinc-400" };
    case "expired":
      return { text: "已過期", className: "bg-zinc-500/25 text-zinc-400" };
    default:
      return { text: status, className: "bg-zinc-500/25 text-zinc-400" };
  }
}

function HallListingPreview({
  imageUrl,
  effectKey,
  itemType,
}: {
  imageUrl: string | null;
  effectKey: string | null;
  itemType: string;
}) {
  const thumb = imageUrl?.trim();
  if (thumb) {
    const src = toThumbImageUrl(thumb, 80, 80);
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
        <Image
          src={src}
          alt=""
          width={40}
          height={40}
          className="object-contain"
          sizes="40px"
          unoptimized={src.startsWith("/")}
        />
      </div>
    );
  }
  const fx = rewardEffectClassName(effectKey ?? undefined);
  if (fx) {
    return (
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800",
          fx,
        )}
        aria-hidden
      />
    );
  }
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-lg leading-none"
      aria-hidden
    >
      {hallItemTypeEmoji(itemType)}
    </div>
  );
}

function RewardRowPreview({ row }: { row: UserRewardWithEffect }) {
  const thumb = row.image_url?.trim();
  if (thumb) {
    const src = toThumbImageUrl(thumb, 80, 80);
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
        <Image
          src={src}
          alt=""
          width={40}
          height={40}
          className="object-contain"
          sizes="40px"
          unoptimized={src.startsWith("/")}
        />
      </div>
    );
  }
  const fx = rewardEffectClassName(row.effect_key ?? undefined);
  if (fx) {
    return (
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800",
          fx,
        )}
        aria-hidden
      />
    );
  }
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-lg leading-none"
      aria-hidden
    >
      {hallItemTypeEmoji(row.reward_type)}
    </div>
  );
}

type CurrencyFilter = "all" | "free_coins" | "premium_coins";
type SortFilter = "newest" | "price_asc" | "price_desc";

export function MarketSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile } = useMyProfile();
  const me = profile?.id ?? null;

  const [mainTab, setMainTab] = useState<"hall" | "mine">("hall");
  const [currencyFilter, setCurrencyFilter] =
    useState<CurrencyFilter>("all");
  const [sortFilter, setSortFilter] = useState<SortFilter>("newest");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState<"pick" | "price">("pick");
  const [pickedReward, setPickedReward] =
    useState<UserRewardWithEffect | null>(null);
  const [uploadCurrency, setUploadCurrency] = useState<
    "free_coins" | "premium_coins"
  >("free_coins");
  const [uploadPriceStr, setUploadPriceStr] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);

  const hallKey = useMemo(
    () =>
      open
        ? ([
            "market-hall",
            currencyFilter,
            sortFilter,
          ] as const)
        : null,
    [open, currencyFilter, sortFilter],
  );

  const hallFetcher = useCallback(async () => {
    return getActiveListingsAction({
      currencyType:
        currencyFilter === "all" ? undefined : currencyFilter,
      sortBy: sortFilter,
    });
  }, [currencyFilter, sortFilter]);

  const {
    data: hallList = [],
    isLoading: hallLoading,
    mutate: mutateHall,
  } = useSWR(open ? hallKey : null, hallFetcher, { revalidateOnFocus: false });

  const {
    data: myList = [],
    isLoading: myLoading,
    mutate: mutateMy,
  } = useSWR(open ? SWR_KEYS.myMarketListings : null, getMyListingsAction, {
    revalidateOnFocus: false,
  });

  const recentSoldKey =
    open && mainTab === "hall" ? SWR_KEYS.marketRecentSold : null;
  const { data: recentSold = [] } = useSWR(
    recentSoldKey,
    getRecentSoldListingsAction,
    { refreshInterval: 60_000, revalidateOnFocus: false },
  );

  const uploadRewardsKey =
    open && uploadOpen ? (["market-upload-rewards"] as const) : null;
  const {
    data: rewardsPayload,
    isLoading: rewardsLoading,
    mutate: mutateRewardsPayload,
  } = useSWR(uploadRewardsKey, getMyRewardsAction, { revalidateOnFocus: false });

  const activeListingRewardIds = useMemo(() => {
    const s = new Set<string>();
    for (const L of myList) {
      if (L.status === "active") s.add(L.user_reward_id);
    }
    return s;
  }, [myList]);

  const eligibleUploadRewards = useMemo(() => {
    const rows = rewardsPayload?.allRewards;
    if (!rows) return [];
    return rows.filter(
      (r) =>
        r.shop_item_id != null &&
        r.allow_player_trade === true &&
        !activeListingRewardIds.has(r.id),
    );
  }, [rewardsPayload, activeListingRewardIds]);

  const [buyTarget, setBuyTarget] = useState<MarketListingWithDetail | null>(
    null,
  );
  const [buyBusy, setBuyBusy] = useState(false);
  const [cancelTarget, setCancelTarget] =
    useState<MarketListingWithDetail | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  const tickerLine = useMemo(
    () => (recentSold.length ? buildTickerLine(recentSold) : ""),
    [recentSold],
  );

  function resetUploadDialog() {
    setUploadStep("pick");
    setPickedReward(null);
    setUploadPriceStr("");
    setUploadCurrency("free_coins");
  }

  async function confirmBuy() {
    if (!buyTarget || buyBusy) return;
    setBuyBusy(true);
    try {
      const r = await buyListingAction(buyTarget.id);
      if (!r.ok) {
        toast.error(
          r.error === "market_disabled"
            ? "拍賣場目前已關閉"
            : r.error === "insufficient_balance"
              ? "餘額不足"
              : r.error === "cannot_buy_own_listing"
                ? "無法購買自己的上架"
                : r.error === "listing_expired"
                  ? "此上架已過期"
                  : r.error === "listing_not_active"
                    ? "此上架已失效"
                    : r.error ?? "購買失敗",
        );
        return;
      }
      toast.success("購買成功");
      setBuyTarget(null);
      await Promise.all([
        mutateHall(),
        mutateMy(),
        globalMutate(SWR_KEYS.myMarketListings),
        globalMutate(SWR_KEYS.marketRecentSold),
      ]);
    } finally {
      setBuyBusy(false);
    }
  }

  async function confirmCancel() {
    if (!cancelTarget || cancelBusy) return;
    setCancelBusy(true);
    try {
      const r = await cancelListingAction(cancelTarget.id);
      if (!r.ok) {
        toast.error(r.error ?? "下架失敗");
        return;
      }
      toast.success("已下架");
      setCancelTarget(null);
      await Promise.all([
        mutateHall(),
        mutateMy(),
        globalMutate(SWR_KEYS.myMarketListings),
      ]);
    } finally {
      setCancelBusy(false);
    }
  }

  async function confirmUploadListing() {
    if (!pickedReward || uploadBusy) return;
    const price = parseInt(uploadPriceStr.trim(), 10);
    if (!Number.isFinite(price) || price < 1) {
      toast.error("請輸入至少 1 的正整數價格");
      return;
    }
    setUploadBusy(true);
    try {
      const r = await createListingAction({
        rewardId: pickedReward.id,
        price,
        currencyType: uploadCurrency,
      });
      if (!r.ok) {
        toast.error(
          r.error === "market_disabled"
            ? "拍賣場目前已關閉"
            : (r.error ?? "上架失敗"),
        );
        return;
      }
      toast.success("上架成功！");
      setUploadOpen(false);
      resetUploadDialog();
      await Promise.all([
        mutateHall(),
        mutateMy(),
        globalMutate(SWR_KEYS.myMarketListings),
        mutateRewardsPayload(),
      ]);
    } finally {
      setUploadBusy(false);
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="z-[70] flex w-[min(100vw,24rem)] flex-col border-l border-zinc-800 bg-[#18181b] px-0 pb-0 pt-0 text-zinc-100"
        >
          <div
            className="flex shrink-0 items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top,0px))]"
          >
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
              aria-label="關閉"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold text-zinc-100">
              🏪 自由市場
            </span>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="shrink-0 rounded-full bg-violet-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-violet-500"
            >
              ＋ 上架
            </button>
          </div>

          <Tabs
            value={mainTab}
            onValueChange={(v) => setMainTab(v as "hall" | "mine")}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList
              variant="line"
              className="mx-3 mt-0 h-9 w-auto shrink-0 rounded-full border border-zinc-700/50 bg-zinc-900/60 p-0.5"
            >
              <TabsTrigger
                value="hall"
                className="rounded-full px-3 py-1 text-xs data-active:bg-zinc-700/80"
              >
                拍賣市集
              </TabsTrigger>
              <TabsTrigger
                value="mine"
                className="rounded-full px-3 py-1 text-xs data-active:bg-zinc-700/80"
              >
                我的上架
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="hall"
              className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="flex h-8 shrink-0 items-stretch border-b border-zinc-800 bg-zinc-900/80">
                <span className="flex shrink-0 items-center px-2 text-xs text-zinc-400">
                  📊 行情
                </span>
                <div className="min-w-0 flex-1 overflow-hidden">
                  {recentSold.length === 0 ? (
                    <div className="flex h-full items-center text-xs text-zinc-500">
                      尚無成交紀錄
                    </div>
                  ) : (
                    <div className="flex h-full items-center overflow-hidden">
                      <div className="inline-flex animate-market-ticker">
                        <span className="whitespace-nowrap pr-8 text-xs text-zinc-300">
                          {tickerLine}
                        </span>
                        <span className="whitespace-nowrap pr-8 text-xs text-zinc-300">
                          {tickerLine}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-3">
                <div className="mb-3 flex flex-col gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    幣種
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["all", "全部"],
                        ["free_coins", "探險幣"],
                        ["premium_coins", "純金"],
                      ] as const
                    ).map(([v, label]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setCurrencyFilter(v)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          currencyFilter === v
                            ? "border-amber-500/50 bg-amber-500/15 text-amber-100"
                            : "border-zinc-700/60 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800/60",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    排序
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["newest", "最新"],
                        ["price_asc", "價格↑"],
                        ["price_desc", "價格↓"],
                      ] as const
                    ).map(([v, label]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setSortFilter(v)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          sortFilter === v
                            ? "border-violet-500/45 bg-violet-500/15 text-violet-100"
                            : "border-zinc-700/60 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800/60",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {hallLoading ? (
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-24 animate-pulse rounded-xl bg-zinc-800/40"
                      />
                    ))}
                  </div>
                ) : hallList.length === 0 ? (
                  <p className="py-8 text-center text-sm text-zinc-500">
                    目前沒有上架中的道具
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {hallList.map((L) => {
                      const own = me != null && L.seller_id === me;
                      const typeLabel = itemTypeBadgeLabel(L.shop_item.item_type);
                      const isPrem = L.currency_type === "premium_coins";
                      return (
                        <li
                          key={L.id}
                          className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/35 px-3 py-2.5"
                        >
                          <HallListingPreview
                            imageUrl={L.shop_item.image_url}
                            effectKey={L.shop_item.effect_key}
                            itemType={L.shop_item.item_type}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-zinc-100">
                              {L.shop_item.label}
                            </p>
                            <span className="mt-0.5 inline-block rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400">
                              {typeLabel}
                            </span>
                            <p className="mt-1 truncate text-xs text-zinc-500">
                              by @{L.seller.nickname}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <span
                              className={cn(
                                "text-sm font-bold tabular-nums",
                                isPrem
                                  ? "text-violet-400"
                                  : "text-amber-400",
                              )}
                            >
                              {L.price}{" "}
                              <span className="text-[10px] font-semibold opacity-90">
                                {currencyLabel(L.currency_type)}
                              </span>
                            </span>
                            {own ? (
                              <Button
                                type="button"
                                size="sm"
                                disabled
                                className="h-8 bg-zinc-800 text-zinc-500"
                              >
                                自己的
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 bg-amber-600 text-white hover:bg-amber-500"
                                onClick={() => setBuyTarget(L)}
                              >
                                購買
                              </Button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="mine"
              className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-3"
            >
              {myLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-20 animate-pulse rounded-xl bg-zinc-800/40"
                    />
                  ))}
                </div>
              ) : myList.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  你還沒有上架任何道具
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {myList.map((L) => {
                    const b = statusBadge(L.status);
                    const typeLabel = itemTypeBadgeLabel(L.shop_item.item_type);
                    return (
                      <li
                        key={L.id}
                        className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/35 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-zinc-100">
                              {L.shop_item.label}
                            </p>
                            <span
                              className={cn(
                                "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                                b.className,
                              )}
                            >
                              {b.text}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-zinc-500">
                            {typeLabel} · {currencyLabel(L.currency_type)}{" "}
                            {L.price}
                          </p>
                          {L.status === "sold" &&
                          L.seller_received != null &&
                          L.seller_received > 0 ? (
                            <p className="mt-1 text-xs text-sky-300">
                              已售出 +{L.seller_received}{" "}
                              {currencyLabel(L.currency_type)}
                            </p>
                          ) : null}
                        </div>
                        {L.status === "active" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 border-zinc-600 bg-transparent text-zinc-200 hover:bg-zinc-800"
                            onClick={() => setCancelTarget(L)}
                          >
                            下架
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <Dialog
        open={uploadOpen}
        onOpenChange={(o) => {
          setUploadOpen(o);
          if (!o) resetUploadDialog();
        }}
      >
        <DialogContent className="border border-zinc-700 bg-zinc-950 text-zinc-100 sm:max-w-sm">
          {uploadStep === "pick" ? (
            <>
              <DialogHeader>
                <DialogTitle>選擇要上架的道具</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  僅顯示未使用、允許玩家交易且尚未上架中的道具。
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[min(60vh,320px)] overflow-y-auto py-2">
                {rewardsLoading ? (
                  <p className="py-6 text-center text-sm text-zinc-500">
                    載入中…
                  </p>
                ) : rewardsPayload == null ? (
                  <p className="py-6 text-center text-sm text-zinc-500">
                    無法載入背包
                  </p>
                ) : eligibleUploadRewards.length === 0 ? (
                  <p className="py-6 text-center text-sm text-zinc-400">
                    目前沒有可上架的道具，可至商城購買道具後再來
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {eligibleUploadRewards.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setPickedReward(row);
                            setUploadStep("price");
                          }}
                          className="flex w-full items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5 text-left transition-colors hover:bg-zinc-800/80"
                        >
                          <RewardRowPreview row={row} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-zinc-100">
                              {row.label}
                            </p>
                            <span className="mt-0.5 inline-block rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400">
                              {itemTypeBadgeLabel(row.reward_type)}
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>設定價格</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  確認後道具將上架於拍賣市集。
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-mt-1 w-fit px-0 text-zinc-400 hover:text-zinc-200"
                  onClick={() => {
                    setUploadStep("pick");
                    setPickedReward(null);
                    setUploadPriceStr("");
                  }}
                >
                  ← 返回選擇
                </Button>
                {pickedReward ? (
                  <div className="flex items-center gap-3">
                    <RewardRowPreview row={pickedReward} />
                    <p className="min-w-0 flex-1 text-sm font-semibold text-zinc-100">
                      {pickedReward.label}
                    </p>
                  </div>
                ) : null}
                <div>
                  <p className="mb-1.5 text-xs text-zinc-500">幣種</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setUploadCurrency("free_coins")}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        uploadCurrency === "free_coins"
                          ? "border-amber-500/50 bg-amber-500/15 text-amber-100"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400",
                      )}
                    >
                      探險幣
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadCurrency("premium_coins")}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        uploadCurrency === "premium_coins"
                          ? "border-violet-500/45 bg-violet-500/15 text-violet-100"
                          : "border-zinc-700 bg-zinc-900 text-zinc-400",
                      )}
                    >
                      純金
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-zinc-500">
                    價格
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={uploadPriceStr}
                    onChange={(e) => {
                      const d = e.target.value.replace(/\D/g, "");
                      setUploadPriceStr(d);
                    }}
                    placeholder="正整數"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  賣家實收：
                  <span className="font-semibold text-zinc-300">
                    {(() => {
                      const n = parseInt(uploadPriceStr, 10);
                      return Number.isFinite(n) && n >= 1 ? n : "—";
                    })()}
                  </span>
                  幣（手續費 0%）
                </p>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-zinc-400"
                    onClick={() => setUploadOpen(false)}
                  >
                    取消
                  </Button>
                  <Button
                    type="button"
                    disabled={
                      uploadBusy ||
                      !pickedReward ||
                      !/^[1-9]\d*$/.test(uploadPriceStr.trim())
                    }
                    className="bg-violet-600 text-white hover:bg-violet-500"
                    onClick={() => void confirmUploadListing()}
                  >
                    {uploadBusy ? "上架中…" : "確認上架"}
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={buyTarget != null}
        onOpenChange={(o) => {
          if (!o) setBuyTarget(null);
        }}
      >
        <AlertDialogContent className="border-zinc-700 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>確認購買</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {buyTarget ? (
                <>
                  道具「{buyTarget.shop_item.label}」
                  <br />
                  價格 {buyTarget.price}{" "}
                  {currencyLabel(buyTarget.currency_type)}
                  <br />
                  賣家：{buyTarget.seller.nickname}
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 bg-zinc-900 text-zinc-200">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-500"
              disabled={buyBusy}
              onClick={(e) => {
                e.preventDefault();
                void confirmBuy();
              }}
            >
              {buyBusy ? "處理中…" : "確認購買"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={cancelTarget != null}
        onOpenChange={(o) => {
          if (!o) setCancelTarget(null);
        }}
      >
        <AlertDialogContent className="border-zinc-700 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>確認下架？</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {cancelTarget
                ? `將下架「${cancelTarget.shop_item.label}」，道具會回到背包。`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 bg-zinc-900 text-zinc-200">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-zinc-600 text-white hover:bg-zinc-500"
              disabled={cancelBusy}
              onClick={(e) => {
                e.preventDefault();
                void confirmCancel();
              }}
            >
              {cancelBusy ? "處理中…" : "確認下架"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
