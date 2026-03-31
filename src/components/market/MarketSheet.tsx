"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { mutate as globalMutate } from "swr";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { cn } from "@/lib/utils";
import { SWR_KEYS } from "@/lib/swr/keys";
import { useMyProfile } from "@/hooks/useMyProfile";
import {
  buyListingAction,
  cancelListingAction,
  getActiveListingsAction,
  getMyListingsAction,
  type MarketListingWithDetail,
} from "@/services/market-listing.action";
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

function itemTypeEmoji(itemType: string): string {
  switch (itemType) {
    case "title":
      return "👑";
    case "avatar_frame":
      return "✨";
    case "card_frame":
      return "🎴";
    case "broadcast":
      return "📢";
    case "loot_box":
      return "🎁";
    case "bag_expansion":
      return "🎒";
    default:
      return "📦";
  }
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  title: "稱號",
  avatar_frame: "頭像框",
  card_frame: "資料卡框",
  broadcast: "廣播券",
  loot_box: "盲盒",
  bag_expansion: "背包擴充",
  rename_card: "改名卡",
};

function currencyLabel(t: "free_coins" | "premium_coins"): string {
  return t === "premium_coins" ? "純金" : "探險幣";
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

  const [currencyFilter, setCurrencyFilter] =
    useState<CurrencyFilter>("all");
  const [sortFilter, setSortFilter] = useState<SortFilter>("newest");

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

  const [buyTarget, setBuyTarget] = useState<MarketListingWithDetail | null>(
    null,
  );
  const [buyBusy, setBuyBusy] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<MarketListingWithDetail | null>(
    null,
  );
  const [cancelBusy, setCancelBusy] = useState(false);

  async function confirmBuy() {
    if (!buyTarget || buyBusy) return;
    setBuyBusy(true);
    try {
      const r = await buyListingAction(buyTarget.id);
      if (!r.ok) {
        toast.error(
          r.error === "insufficient_balance"
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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="z-[70] flex w-[min(100vw,24rem)] flex-col border-l border-zinc-800 bg-[#18181b] px-0 pb-0 pt-[max(1.5rem,env(safe-area-inset-top,0px))] text-zinc-100"
        >
          <SheetHeader className="space-y-1 border-b border-zinc-800/80 px-4 pb-4 pt-0 text-left">
            <SheetTitle className="text-lg text-zinc-100">🏪 玩家市集</SheetTitle>
            <p className="text-xs font-normal text-zinc-400">
              瀏覽上架道具，或管理你的賣出清單
            </p>
          </SheetHeader>

          <Tabs defaultValue="hall" className="flex min-h-0 flex-1 flex-col">
            <TabsList
              variant="line"
              className="mx-3 mt-2 h-9 w-auto shrink-0 rounded-full border border-zinc-700/50 bg-zinc-900/60 p-0.5"
            >
              <TabsTrigger
                value="hall"
                className="rounded-full px-3 py-1 text-xs data-active:bg-zinc-700/80"
              >
                市場大廳
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
              className="mt-0 min-h-0 flex-1 overflow-y-auto px-3 pb-6 pt-3"
            >
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
                    const typeLabel =
                      ITEM_TYPE_LABELS[L.shop_item.item_type] ??
                      L.shop_item.item_type;
                    const isPrem = L.currency_type === "premium_coins";
                    return (
                      <li
                        key={L.id}
                        className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/35 px-3 py-2.5"
                      >
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-800/50">
                          {L.shop_item.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={toThumbImageUrl(
                                L.shop_item.image_url,
                                112,
                                112,
                              )}
                              alt=""
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <span className="text-2xl" aria-hidden>
                              {itemTypeEmoji(L.shop_item.item_type)}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-zinc-100">
                            {L.shop_item.label}
                          </p>
                          <span className="mt-0.5 inline-block rounded-md bg-zinc-800/80 px-1.5 py-0.5 text-[10px] text-zinc-400">
                            {typeLabel}
                          </span>
                          <p className="mt-1 truncate text-xs text-zinc-500">
                            賣家：{L.seller.nickname}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span
                            className={cn(
                              "text-sm font-bold tabular-nums",
                              isPrem ? "text-violet-300" : "text-amber-200",
                            )}
                          >
                            {L.price}{" "}
                            <span className="text-[10px] font-medium">
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
                    const typeLabel =
                      ITEM_TYPE_LABELS[L.shop_item.item_type] ??
                      L.shop_item.item_type;
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
