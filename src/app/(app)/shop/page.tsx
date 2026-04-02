"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Gem, Loader2, Moon, Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import type { GiftRecipientSearchRow } from "@/lib/repositories/server/rewards.repository";
import {
  searchGiftRecipientCandidatesAction,
  confirmGiftsToUserBatchAction,
} from "@/services/gift.action";

function resolveItemImageUrl(raw: string): string {
  const src = raw.trim();
  if (!src) return src;
  if (src.startsWith("/")) return src;
  if (src.startsWith("https://") && src.includes("cloudinary.com")) {
    /** `c_fit` 保留透明 PNG 邊緣，避免 `c_fill` 裁切與鋪滿感 */
    return src.replace("/upload/", "/upload/w_160,h_160,c_fit,q_auto,f_auto/");
  }
  return src;
}
import { Button } from "@/components/ui/button";
import {
  getMyCoinsAction,
  getFreeToPremiumRateAction,
  getMyCoinTransactionsAction,
  convertMyCoinsAction,
} from "@/services/coin.action";
import {
  getShopItemsAction,
  getShopDailyRemainingAction,
  purchaseItemAction,
  notifyShopGiftBuyerRecordAction,
  type ShopItemDto,
} from "@/services/shop.action";
import type { DrawResult } from "@/services/prize-engine";
import type { CoinTransactionRow } from "@/types/database.types";
import { GuildLootBoxReveal } from "@/components/loot-box/guild-loot-box-reveal";

const SOURCE_LABEL: Record<CoinTransactionRow["source"], string> = {
  checkin: "簽到",
  loot_box: "公會盲盒",
  admin_grant: "管理贈與",
  admin_deduct: "管理扣除",
  admin_adjust: "管理調整",
  shop_purchase: "商城消費",
  shop_resell: "商城回收",
  refund: "退款",
  convert_in: "兌換入帳",
  convert_out: "兌換扣款",
  topup: "儲值",
  market_trade_buy: "玩家市場購買",
  market_trade_sell: "玩家市場售出",
  fishing: "釣魚",
};

const ITEM_TYPE_EMOJI: Record<string, string> = {
  avatar_frame: "🖼️",
  card_frame: "🖼️",
  title: "🏷️",
  broadcast: "📢",
  bag_expansion: "🎒",
  rename_card: "✏️",
  loot_box: "🎁",
  fishing_bait: "🪱",
  fishing_rod: "🎣",
  exp_boost: "⚡",
  coins_pack: "💰",
};

/** 與後台 `shop-admin-client` ITEM_TYPE_LABELS 對齊，供前台篩選顯示 */
const ITEM_TYPE_LABELS: Record<string, string> = {
  avatar_frame: "頭像框",
  card_frame: "卡片外框",
  title: "稱號",
  broadcast: "廣播券",
  bag_expansion: "背包擴充包",
  loot_box: "盲盒",
  rename_card: "改名卡",
  fishing_bait: "釣餌",
  fishing_rod: "釣竿",
  exp_boost: "EXP加成券",
  coins_pack: "探險幣包",
};

const SHOP_CATEGORY_KEYS = Object.keys(ITEM_TYPE_EMOJI);

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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

export default function ShopPage() {
  const router = useRouter();
  const [premium, setPremium] = useState(0);
  const [free, setFree] = useState(0);
  const [rate, setRate] = useState(0.01);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"free_coins" | "premium_coins">("free_coins");
  const [shopCategoryFilter, setShopCategoryFilter] = useState<"all" | string>(
    "all",
  );
  const [items, setItems] = useState<ShopItemDto[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<ShopItemDto | null>(null);
  const [purchaseQty, setPurchaseQty] = useState("1");
  const [dailyRemaining, setDailyRemaining] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const [convertOpen, setConvertOpen] = useState(false);
  const [convertAmount, setConvertAmount] = useState("10");
  const [convertBusy, setConvertBusy] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txList, setTxList] = useState<CoinTransactionRow[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txLoading, setTxLoading] = useState(false);

  const [countdowns, setCountdowns] = useState<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [purchaseIntent, setPurchaseIntent] = useState<
    "normal" | "gift_friend"
  >("normal");
  const [shopGiftRecipient, setShopGiftRecipient] =
    useState<GiftRecipientSearchRow | null>(null);
  const [shopPickRecipientOpen, setShopPickRecipientOpen] = useState(false);
  const [shopPickPendingRecipient, setShopPickPendingRecipient] =
    useState<GiftRecipientSearchRow | null>(null);
  const [shopPickRecipientItem, setShopPickRecipientItem] =
    useState<ShopItemDto | null>(null);
  const [shopRecipientNicknameDraft, setShopRecipientNicknameDraft] =
    useState("");
  const [shopRecipientCandidates, setShopRecipientCandidates] = useState<
    GiftRecipientSearchRow[]
  >([]);
  const [shopRecipientSearchBusy, setShopRecipientSearchBusy] = useState(false);
  /** 最近一次成功搜尋的關鍵字（用於區分「尚未搜尋」與「搜尋無結果」） */
  const [shopRecipientSearchKey, setShopRecipientSearchKey] = useState("");
  const [shopGiftCheckoutOpen, setShopGiftCheckoutOpen] = useState(false);
  const [shopGiftCheckoutSnapshot, setShopGiftCheckoutSnapshot] = useState<{
    target: ShopItemDto;
    qty: number;
    recipient: GiftRecipientSearchRow;
    sub: number;
    currencyEmoji: string;
  } | null>(null);
  const [giftCheckoutBusy, setGiftCheckoutBusy] = useState(false);

  const [shopLootRevealOpen, setShopLootRevealOpen] = useState(false);
  const [shopLootDraws, setShopLootDraws] = useState<DrawResult[]>([]);
  const [shopLootPlaybackKey, setShopLootPlaybackKey] = useState(0);

  const [shopDetailItem, setShopDetailItem] = useState<ShopItemDto | null>(null);

  const refreshBalance = useCallback(async () => {
    const b = await getMyCoinsAction();
    setPremium(b.premium_coins);
    setFree(b.free_coins);
  }, []);

  const loadItems = useCallback(async (currency: "free_coins" | "premium_coins") => {
    setItemsLoading(true);
    const data = await getShopItemsAction(currency);
    setItems(data);
    const cd: Record<string, number> = {};
    for (const item of data) {
      if (item.showSaleCountdown && item.remainingSeconds > 0) {
        cd[item.id] = item.remainingSeconds;
      }
    }
    setCountdowns(cd);
    setItemsLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const [b, r] = await Promise.all([
        getMyCoinsAction(),
        getFreeToPremiumRateAction(),
      ]);
      if (cancelled) return;
      setPremium(b.premium_coins);
      setFree(b.free_coins);
      setRate(r);
      setLoading(false);
      void loadItems("free_coins");
    })();
    return () => {
      cancelled = true;
    };
  }, [loadItems]);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    void supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdowns((prev) => {
        const next: Record<string, number> = {};
        for (const [id, sec] of Object.entries(prev)) {
          if (sec > 1) next[id] = sec - 1;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!purchaseTarget) {
      setPurchaseQty("1");
      setDailyRemaining(null);
      setDailyLimit(null);
      return;
    }
    setPurchaseQty("1");
    void getShopDailyRemainingAction(purchaseTarget.id).then((r) => {
      if (r.ok) {
        setDailyRemaining(r.remaining);
        setDailyLimit(r.dailyLimit);
      } else {
        setDailyRemaining(null);
        setDailyLimit(null);
      }
    });
  }, [purchaseTarget]);

  function switchTab(t: "free_coins" | "premium_coins") {
    setTab(t);
    setShopCategoryFilter("all");
    void loadItems(t);
  }

  const displayItems = useMemo(() => {
    if (shopCategoryFilter === "all") return items;
    return items.filter((i) => i.item_type === shopCategoryFilter);
  }, [items, shopCategoryFilter]);

  const ERROR_LABELS: Record<string, string> = {
    daily_limit_reached: "今日已達購買上限",
    insufficient_balance: tab === "free_coins" ? "探險幣不足" : "純金不足",
  };

  async function handlePurchase() {
    if (!purchaseTarget) return;
    const target = purchaseTarget;
    const intent = purchaseIntent;
    if (dailyRemaining != null && dailyRemaining < 1) {
      toast.error("今日已達購買上限");
      setPurchaseTarget(null);
      setPurchaseIntent("normal");
      setShopGiftRecipient(null);
      return;
    }
    let qty = parseInt(purchaseQty.replace(/[^0-9]/g, "") || "0", 10);
    if (!Number.isFinite(qty) || qty < 1) {
      toast.error("請輸入有效的購買數量");
      return;
    }
    if (dailyRemaining != null) {
      qty = Math.min(qty, dailyRemaining);
    }
    if (qty < 1) {
      toast.error("超過今日可購數量");
      return;
    }

    if (intent === "gift_friend") {
      if (!shopGiftRecipient) {
        toast.error("請先選擇贈送對象");
        return;
      }
      const eff = qty;
      const sub = target.price * eff;
      const currencyEmoji =
        target.currency_type === "premium_coins" ? "💎" : "🪙";
      setShopGiftCheckoutSnapshot({
        target,
        qty: eff,
        recipient: shopGiftRecipient,
        sub,
        currencyEmoji,
      });
      setShopGiftCheckoutOpen(true);
      return;
    }

    setPurchasing(true);
    const res = await purchaseItemAction(target.id, qty);
    setPurchasing(false);
    if (!res.ok) {
      toast.error(ERROR_LABELS[res.error] ?? res.error);
      setPurchaseTarget(null);
      setPurchaseIntent("normal");
      return;
    }
    setPurchaseTarget(null);
    setPurchaseIntent("normal");
    await refreshBalance();
    void loadItems(tab);
    if (res.lootDraws.length > 0) {
      setShopLootDraws(res.lootDraws);
      setShopLootPlaybackKey((k) => k + 1);
      setShopLootRevealOpen(true);
      toast.success(
        res.lootDraws.length === 1
          ? "🎁 公會盲盒開啟中，請觀看動畫"
          : `🎁 已開啟 ${res.lootDraws.length} 個公會盲盒，請觀看動畫與獎項`,
      );
    } else {
      toast.success("🛍️ 購買成功！已存入背包");
    }
  }

  async function handleShopRecipientSearch() {
    const nick = shopRecipientNicknameDraft.trim();
    if (nick.length < 1) return;
    setShopRecipientSearchBusy(true);
    try {
      const r = await searchGiftRecipientCandidatesAction(nick);
      if (!r.ok) {
        toast.error(r.error);
        setShopRecipientCandidates([]);
        setShopRecipientSearchKey("");
        return;
      }
      setShopRecipientCandidates(r.candidates);
      setShopRecipientSearchKey(nick);
    } finally {
      setShopRecipientSearchBusy(false);
    }
  }

  async function executeShopGiftCheckout() {
    const snap = shopGiftCheckoutSnapshot;
    if (!snap || giftCheckoutBusy) return;
    setGiftCheckoutBusy(true);
    try {
      const res = await purchaseItemAction(snap.target.id, snap.qty, {
        skipBuyerMailbox: true,
        sealLootBoxes: snap.target.item_type === "loot_box",
      });
      if (!res.ok) {
        toast.error(ERROR_LABELS[res.error] ?? res.error);
        return;
      }
      if (res.newRewardIds.length === 0) {
        toast.error(
          "此商品無法透過商城直接贈送，請改由背包長按道具贈送。",
        );
        return;
      }
      const g = await confirmGiftsToUserBatchAction(
        res.newRewardIds,
        snap.recipient.id,
      );
      if (!g.ok) {
        toast.error(g.error);
        return;
      }
      await notifyShopGiftBuyerRecordAction({
        itemName: snap.target.name,
        quantity: snap.qty,
        recipientNickname: snap.recipient.nickname,
      });
      toast.success("🎁 已成功購買並贈送！對方將收到信件通知。");
      setShopGiftCheckoutOpen(false);
      setShopGiftCheckoutSnapshot(null);
      setPurchaseTarget(null);
      setPurchaseIntent("normal");
      setShopGiftRecipient(null);
      await refreshBalance();
      void loadItems(tab);
      router.refresh();
    } finally {
      setGiftCheckoutBusy(false);
    }
  }

  const openConvertModal = () => {
    setConvertAmount("10");
    setConvertOpen(true);
  };

  const openHistoryModal = async () => {
    setHistoryOpen(true);
    setTxPage(1);
    setTxLoading(true);
    const res = await getMyCoinTransactionsAction(1);
    setTxList(res.transactions);
    setTxTotal(res.total);
    setTxLoading(false);
  };

  const loadHistoryPage = async (p: number) => {
    setTxLoading(true);
    const res = await getMyCoinTransactionsAction(p);
    setTxList(res.transactions);
    setTxTotal(res.total);
    setTxLoading(false);
  };

  const freeAmt = parseInt(convertAmount, 10);
  const expectedPremium =
    Number.isFinite(freeAmt) && freeAmt >= 0
      ? Math.floor(freeAmt * rate)
      : 0;

  async function onConfirmConvert() {
    if (!Number.isInteger(freeAmt) || freeAmt < 10) {
      toast.error("最少兌換 10 探險幣");
      return;
    }
    setConvertBusy(true);
    const res = await convertMyCoinsAction(freeAmt);
    setConvertBusy(false);
    if (!res.success) {
      toast.error(res.error ?? "兌換失敗");
      return;
    }
    toast.success("兌換成功");
    setConvertOpen(false);
    await refreshBalance();
  }

  const pageSize = 20;
  const txPages = Math.max(1, Math.ceil(txTotal / pageSize));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  const sheetPopupClass =
    "!flex !min-h-0 !flex-col !fixed !bottom-0 !left-1/2 !top-auto !max-h-[85vh] !w-full !max-w-[calc(100%-2rem)] !-translate-x-1/2 !translate-y-0 !gap-0 !overflow-hidden !rounded-t-[24px] !rounded-b-none !border !border-white/[0.08] !border-b-0 !bg-[#18181b] !p-0 !shadow-2xl sm:!max-w-md data-open:zoom-in-95";

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 pb-32">
      <div className="mx-auto w-full max-w-md space-y-5">
        <h1 className="text-xl font-bold text-[#f4f4f5]">⚔️ 傳奇商城</h1>

        {/* WalletBar */}
        <div
          className="flex justify-between gap-4 rounded-2xl border border-white/[0.06] px-4 py-3"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Moon
              className="h-5 w-5 shrink-0 text-[#f59e0b]"
              aria-hidden
              strokeWidth={2}
            />
            <div className="min-w-0">
              <p className="text-lg font-bold tabular-nums text-[#f59e0b]">{free}</p>
              <p className="text-xs text-[#71717a]">探險幣</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Gem
              className="h-5 w-5 shrink-0 text-[#a78bfa]"
              aria-hidden
              strokeWidth={2}
            />
            <div className="min-w-0 text-right sm:text-left">
              <p className="text-lg font-bold tabular-nums text-[#a78bfa]">{premium}</p>
              <p className="text-xs text-[#71717a]">純金</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={openConvertModal}
            className="flex-1 rounded-2xl border border-zinc-700/40 bg-zinc-900/60 p-2.5 text-center text-xs text-zinc-400 transition hover:bg-zinc-900/80"
          >
            🔄 兌換純金
          </button>
          <button
            type="button"
            onClick={() => void openHistoryModal()}
            className="flex-1 rounded-2xl border border-zinc-700/40 bg-zinc-900/60 p-2.5 text-center text-xs text-zinc-400 transition hover:bg-zinc-900/80"
          >
            📋 金幣紀錄
          </button>
        </div>

        <div
          className="flex gap-1 rounded-[50px] p-1"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <button
            type="button"
            onClick={() => switchTab("free_coins")}
            className={`flex-1 rounded-[46px] px-[18px] py-1.5 text-[13px] font-semibold transition-all duration-200 ${
              tab === "free_coins"
                ? "bg-[#7c3aed] text-white"
                : "text-[#71717a]"
            }`}
          >
            🪙 探險幣商店
          </button>
          <button
            type="button"
            onClick={() => switchTab("premium_coins")}
            className={`flex-1 rounded-[46px] px-[18px] py-1.5 text-[13px] font-semibold transition-all duration-200 ${
              tab === "premium_coins"
                ? "bg-[#7c3aed] text-white"
                : "text-[#71717a]"
            }`}
          >
            💎 純金商店
          </button>
        </div>

        <label className="flex items-center gap-2">
          <span className="shrink-0 text-xs text-[#71717a]">商品種類</span>
          <select
            value={shopCategoryFilter}
            onChange={(e) => setShopCategoryFilter(e.target.value)}
            className="min-w-0 flex-1 rounded-2xl border border-zinc-700/50 bg-zinc-900/80 px-3 py-2.5 text-sm text-[#f4f4f5] outline-none transition focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30"
            aria-label="依商品種類篩選"
          >
            <option value="all">全部</option>
            {SHOP_CATEGORY_KEYS.map((key) => (
              <option key={key} value={key}>
                {ITEM_TYPE_LABELS[key] ?? key}
              </option>
            ))}
          </select>
        </label>

        {itemsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[20px] border border-white/[0.08] p-8 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
            <p className="text-sm text-[#71717a]">暫無商品</p>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="rounded-[20px] border border-white/[0.08] p-8 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
            <p className="text-sm text-[#71717a]">此分類暫無商品</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-8">
            {displayItems.map((item) => {
              const emoji = ITEM_TYPE_EMOJI[item.item_type] ?? "📦";
              const isPrem = item.currency_type === "premium_coins";
              const balance = isPrem ? premium : free;
              const canAfford = balance >= item.price;
              const cd = countdowns[item.id];
              const img = item.image_url?.trim();
              const displayImg = img ? resolveItemImageUrl(img) : null;
              const onSale = item.isOnSale;

              return (
                <div
                  key={item.id}
                  className={`flex h-full flex-col overflow-hidden rounded-[20px] p-0 transition-[transform,border-color] duration-150 hover:scale-[1.015] hover:border-[rgba(139,92,246,0.3)] ${
                    onSale
                      ? "border border-[rgba(124,58,237,0.45)] shadow-[inset_0_0_0_1px_rgba(124,58,237,0.15)]"
                      : "border border-white/[0.08]"
                  }`}
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <button
                    type="button"
                    className="flex min-h-0 flex-1 flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    onClick={() => setShopDetailItem(item)}
                  >
                  <div className="relative flex aspect-square items-center justify-center bg-zinc-800/50">
                    {onSale ? (
                      <span
                        className="absolute left-2.5 top-2.5 rounded-md px-[7px] py-0.5 text-[10px] font-bold tracking-wide text-white"
                        style={{ background: "#dc2626" }}
                      >
                        特賣
                      </span>
                    ) : null}
                    {img ? (
                      <Image
                        src={displayImg ?? img}
                        alt=""
                        width={72}
                        height={72}
                        className="h-[72px] w-[72px] object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="text-[48px] leading-none">{emoji}</span>
                    )}
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col px-3.5 pb-2 pt-3">
                    <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-[#f4f4f5]">
                      {item.name}
                    </p>
                    <div className="h-[2.75rem] shrink-0 overflow-hidden">
                      {item.description ? (
                        <p className="line-clamp-2 text-[11px] leading-snug text-[#71717a]">
                          {item.description}
                        </p>
                      ) : (
                        <span className="invisible text-[11px] leading-snug">.</span>
                      )}
                    </div>
                    <div className="flex min-h-[2.75rem] shrink-0 flex-col justify-start gap-0.5">
                      <div className="min-h-[1.125rem] text-[11px]">
                        {item.showSaleCountdown && cd != null && cd > 0 ? (
                          <p className="font-mono text-red-400">⏱ {formatCountdown(cd)}</p>
                        ) : null}
                      </div>
                      <div className="min-h-[1.125rem] text-[11px] text-[#71717a]">
                        {item.daily_limit != null ? <p>每日限購 {item.daily_limit} 個</p> : null}
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                      <span
                        className={`text-[15px] font-bold tabular-nums ${
                          isPrem ? "text-[#a78bfa]" : "text-[#f59e0b]"
                        }`}
                      >
                        {isPrem ? (
                          <>
                            <span className="mr-0.5 inline" aria-hidden>
                              💎
                            </span>
                            {item.price}
                          </>
                        ) : (
                          <>
                            <span className="mr-0.5 inline text-[10px]" aria-hidden>
                              🟡
                            </span>
                            {item.price}
                          </>
                        )}
                      </span>
                      {item.hasDiscountDisplay && item.original_price != null ? (
                        <span className="text-xs tabular-nums text-[#52525b] line-through">
                          {item.original_price}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  </button>
                  <div className="mt-auto flex items-center gap-2 px-3.5 pb-3.5">
                    {item.allow_gift !== false && isLoggedIn ? (
                      <button
                        type="button"
                        disabled={!canAfford}
                        title="贈送"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShopPickRecipientItem(item);
                          setShopPickPendingRecipient(null);
                          setShopRecipientNicknameDraft("");
                          setShopRecipientCandidates([]);
                          setShopRecipientSearchKey("");
                          setShopPickRecipientOpen(true);
                        }}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-white/10 text-base transition-colors duration-150 hover:bg-[rgba(124,58,237,0.2)] active:scale-[0.98] active:opacity-85 ${
                          canAfford
                            ? "cursor-pointer bg-white/[0.06]"
                            : "cursor-not-allowed bg-[#27272a] text-[#52525b]"
                        }`}
                      >
                        🎁
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPurchaseIntent("normal");
                        setShopGiftRecipient(null);
                        setPurchaseTarget(item);
                      }}
                      className={`h-[38px] flex-1 rounded-xl border-none text-[13px] font-semibold text-white transition active:scale-[0.98] active:opacity-85 ${
                        canAfford
                          ? "cursor-pointer bg-gradient-to-br from-[#7c3aed] to-[#6d28d9]"
                          : "cursor-not-allowed bg-[#3f3f46] text-[#71717a]"
                      }`}
                    >
                      {canAfford ? "購買" : isPrem ? "純金不足" : "探險幣不足"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={!!shopDetailItem}
        onOpenChange={(o) => {
          if (!o) setShopDetailItem(null);
        }}
      >
        <DialogContent
          className="max-h-[min(85vh,520px)] text-[#f4f4f5]"
          initialFocus={-1}
        >
          {shopDetailItem ? (
            <>
              <DialogHeader className="space-y-1 pr-6 text-left">
                <DialogTitle className="text-lg font-bold text-[#f4f4f5]">
                  {shopDetailItem.name}
                </DialogTitle>
                <DialogDescription className="text-[13px] text-[#71717a]">
                  {ITEM_TYPE_LABELS[shopDetailItem.item_type] ??
                    shopDetailItem.item_type}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative mx-auto flex aspect-square w-full max-w-[200px] items-center justify-center rounded-2xl bg-zinc-800/50">
                  {shopDetailItem.image_url?.trim() ? (
                    <Image
                      src={
                        resolveItemImageUrl(shopDetailItem.image_url.trim()) ||
                        shopDetailItem.image_url.trim()
                      }
                      alt=""
                      width={160}
                      height={160}
                      className="max-h-[160px] max-w-[160px] object-contain"
                      unoptimized
                    />
                  ) : (
                    <span className="text-6xl leading-none">
                      {ITEM_TYPE_EMOJI[shopDetailItem.item_type] ?? "📦"}
                    </span>
                  )}
                </div>
                {shopDetailItem.description ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#a1a1aa]">
                    {shopDetailItem.description}
                  </p>
                ) : (
                  <p className="text-sm text-[#52525b]">無商品說明</p>
                )}
                <div className="flex flex-wrap items-baseline gap-2 border-t border-white/[0.08] pt-3">
                  <span
                    className={`text-xl font-bold tabular-nums ${
                      shopDetailItem.currency_type === "premium_coins"
                        ? "text-[#a78bfa]"
                        : "text-[#f59e0b]"
                    }`}
                  >
                    {shopDetailItem.currency_type === "premium_coins" ? (
                      <>
                        <span className="mr-0.5" aria-hidden>
                          💎
                        </span>
                        {shopDetailItem.price}
                      </>
                    ) : (
                      <>
                        <span className="mr-0.5 text-sm" aria-hidden>
                          🟡
                        </span>
                        {shopDetailItem.price}
                      </>
                    )}
                  </span>
                  {shopDetailItem.hasDiscountDisplay &&
                  shopDetailItem.original_price != null ? (
                    <span className="text-sm tabular-nums text-[#52525b] line-through">
                      {shopDetailItem.original_price}
                    </span>
                  ) : null}
                  <span className="text-xs text-[#71717a]">
                    {shopDetailItem.currency_type === "premium_coins"
                      ? "純金"
                      : "探險幣"}
                  </span>
                </div>
                {shopDetailItem.showSaleCountdown &&
                countdowns[shopDetailItem.id] != null &&
                countdowns[shopDetailItem.id]! > 0 ? (
                  <p className="font-mono text-sm text-red-400">
                    ⏱ 特賣倒數 {formatCountdown(countdowns[shopDetailItem.id]!)}
                  </p>
                ) : null}
                {shopDetailItem.daily_limit != null ? (
                  <p className="text-xs text-[#71717a]">
                    每日限購 {shopDetailItem.daily_limit} 個
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!purchaseTarget}
        onOpenChange={(o) => {
          if (!o) {
            setPurchaseTarget(null);
            setPurchaseIntent("normal");
            setShopGiftRecipient(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className={`text-[#f4f4f5] ${sheetPopupClass}`}
          initialFocus={-1}
        >
          {purchaseTarget ? (
            <>
              <div
                className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full"
                style={{ background: "rgba(255,255,255,0.15)" }}
              />
              <div className="px-5 pb-3 pt-4">
                <DialogHeader className="space-y-1 text-left">
                  <DialogTitle className="text-lg font-bold text-[#f4f4f5]">
                    {purchaseIntent === "gift_friend"
                      ? "確認數量與金額"
                      : `購買 ${purchaseTarget.name}`}
                  </DialogTitle>
                  <DialogDescription className="text-[13px] text-[#71717a]">
                    {purchaseIntent === "gift_friend"
                      ? "購買並贈送給對方"
                      : "選擇購買數量"}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div
                className="mx-5 mb-4 flex gap-3 rounded-[14px] border border-white/[0.08] p-3"
                style={{ background: "rgba(255,255,255,0.05)" }}
              >
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[22px]"
                  style={{ background: "rgba(124,58,237,0.2)" }}
                >
                  {ITEM_TYPE_EMOJI[purchaseTarget.item_type] ?? "📦"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#f4f4f5]">{purchaseTarget.name}</p>
                  {purchaseTarget.description ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-[#71717a]">
                      {purchaseTarget.description}
                    </p>
                  ) : null}
                </div>
              </div>

              {purchaseIntent === "gift_friend" && shopGiftRecipient ? (
                <div className="flex items-center gap-2 px-5 pb-3">
                  {shopGiftRecipient.avatar_url?.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={toThumbImageUrl(shopGiftRecipient.avatar_url, 56, 56)}
                      alt=""
                      className="h-7 w-7 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400">
                      {(shopGiftRecipient.nickname || "?")[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                  <span className="text-[13px] text-[#f4f4f5]">{shopGiftRecipient.nickname}</span>
                  <button
                    type="button"
                    className="ml-auto text-xs font-medium text-[#7c3aed]"
                    onClick={() => {
                      const it = purchaseTarget;
                      setPurchaseTarget(null);
                      setShopGiftRecipient(null);
                      setShopPickRecipientItem(it);
                      setShopPickPendingRecipient(null);
                      setShopPickRecipientOpen(true);
                    }}
                  >
                    更換
                  </button>
                </div>
              ) : null}

              <div className="max-h-[min(52vh,420px)] overflow-y-auto px-5 pb-4" style={{ overscrollBehavior: "contain" }}>
                <div className="space-y-4 text-sm">
                  {dailyLimit != null && dailyRemaining != null ? (
                    <p className="text-xs text-amber-200/90">今日剩餘可購 {dailyRemaining} 個</p>
                  ) : null}
                  {(() => {
                    const qtyRaw = Math.max(
                      1,
                      parseInt(purchaseQty.replace(/[^0-9]/g, "") || "1", 10),
                    );
                    const effUi =
                      dailyRemaining != null ? Math.min(qtyRaw, dailyRemaining) : qtyRaw;
                    return (
                      <>
                  <div className="flex items-center justify-center gap-5 py-2">
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-xl text-[#f4f4f5] transition active:scale-[0.93]"
                      onClick={() => {
                        const n = Math.max(1, effUi - 1);
                        setPurchaseQty(String(n));
                      }}
                      aria-label="減少數量"
                    >
                      −
                    </button>
                    <span className="min-w-[48px] text-center text-[32px] font-bold tabular-nums text-[#f4f4f5]">
                      {effUi}
                    </span>
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-xl text-[#f4f4f5] transition active:scale-[0.93]"
                      onClick={() => {
                        let next = effUi + 1;
                        if (dailyRemaining != null) next = Math.min(next, dailyRemaining);
                        setPurchaseQty(String(Math.max(1, next)));
                      }}
                      aria-label="增加數量"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pb-3">
                    {([1, 3, 5, 10] as const).map((n) => {
                      const active =
                        effUi === n &&
                        (dailyRemaining == null || n <= dailyRemaining);
                      return (
                        <button
                          key={n}
                          type="button"
                          className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
                            active
                              ? "bg-[#7c3aed] text-white"
                              : "border border-white/10 bg-white/[0.05] text-[#71717a]"
                          }`}
                          onClick={() => {
                            let v: number = n;
                            if (dailyRemaining != null) v = Math.min(v, dailyRemaining);
                            setPurchaseQty(String(Math.max(1, v)));
                          }}
                        >
                          ×{n}
                        </button>
                      );
                    })}
                  </div>
                      </>
                    );
                  })()}
                  {(() => {
                    const qty = Math.max(
                      1,
                      parseInt(purchaseQty.replace(/[^0-9]/g, "") || "1", 10),
                    );
                    const cap =
                      dailyRemaining != null ? Math.min(qty, dailyRemaining) : qty;
                    const eff = dailyRemaining != null ? cap : qty;
                    const sub = purchaseTarget.price * eff;
                    const origSub =
                      purchaseTarget.original_price != null
                        ? purchaseTarget.original_price * eff
                        : null;
                    const currencyEmoji =
                      purchaseTarget.currency_type === "premium_coins" ? "💎" : "🟡";
                    const balance =
                      purchaseTarget.currency_type === "premium_coins" ? premium : free;
                    const canPay = balance >= sub;
                    return (
                      <>
                        <div
                          className="flex items-center justify-between border-t border-white/[0.06] px-0 py-3"
                        >
                          <span className="text-sm text-[#71717a]">合計</span>
                          <span className="text-lg font-bold tabular-nums text-[#a78bfa]">
                            {currencyEmoji} {sub}
                          </span>
                        </div>
                        {origSub != null ? (
                          <p className="-mt-2 text-center text-xs text-[#52525b] line-through">
                            原價 {currencyEmoji} {origSub}
                          </p>
                        ) : null}
                        <div
                          className="border-t border-white/[0.06] px-0 pt-4"
                          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
                        >
                          {purchaseIntent === "gift_friend" ? (
                            <p className="mb-2.5 text-center text-xs text-[#52525b]">
                              🎁 對方將收到信件通知
                            </p>
                          ) : null}
                          <Button
                            type="button"
                            disabled={purchasing || !canPay || eff < 1}
                            onClick={() => void handlePurchase()}
                            className="h-[52px] w-full rounded-[14px] border-none bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-[15px] font-bold text-white hover:opacity-95 active:scale-[0.98]"
                          >
                            {purchasing ? (
                              <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                處理中…
                              </span>
                            ) : !canPay ? (
                              "餘額不足"
                            ) : purchaseIntent === "gift_friend" ? (
                              `確認購買並贈送 ${currencyEmoji} ${sub}`
                            ) : (
                              `確認購買 ${currencyEmoji} ${sub}`
                            )}
                          </Button>
                          <button
                            type="button"
                            className="mt-2 w-full py-2 text-sm text-[#a1a1aa]"
                            onClick={() => setPurchaseTarget(null)}
                            disabled={purchasing}
                          >
                            取消
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={shopLootRevealOpen}
        onOpenChange={setShopLootRevealOpen}
      >
        <DialogContent className="max-w-sm w-[calc(100%-2rem)] overflow-hidden rounded-3xl border border-violet-500/30 bg-zinc-950/90 p-0 text-center shadow-[0_0_28px_rgba(139,92,246,0.2)] backdrop-blur-xl text-[#f4f4f5]">
          <div className="px-5 pb-2 pt-6">
            <span className="inline-flex rounded-full border border-violet-400/40 bg-violet-950/60 px-4 py-1 text-xs font-semibold text-violet-200">
              公會盲盒
            </span>
            <h2 className="mt-4 text-lg font-bold text-white">開獎結果</h2>
            <p className="mt-1 text-xs text-zinc-500">
              獎勵已發放（探險幣／經驗／造型道具等）
            </p>
          </div>

          <div className="px-4 pb-2">
            <GuildLootBoxReveal
              playbackKey={shopLootPlaybackKey}
              draws={shopLootDraws}
            />
          </div>

          <div className="border-t border-white/10 bg-black/20 px-5 py-5">
            <button
              type="button"
              onClick={() => setShopLootRevealOpen(false)}
              className="w-full rounded-full bg-gradient-to-r from-violet-600 to-purple-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition-transform active:scale-95"
            >
              完成
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>探險幣兌換純金</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-zinc-500">
            最少 10 探險幣；轉換率 {rate * 100}%（無條件捨去小數）
          </p>
          <label className="block text-sm text-zinc-400 mt-2">
            探險幣數量
            <input
              type="text"
              value={convertAmount}
              onChange={(e) => setConvertAmount(e.target.value.replace(/[^0-9]/g, ""))}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white"
            />
          </label>
          <p className="text-sm text-amber-200/90">
            預計獲得純金：<span className="font-semibold">{expectedPremium}</span>
          </p>
          <Button
            type="button"
            className="w-full"
            disabled={convertBusy}
            onClick={() => void onConfirmConvert()}
          >
            {convertBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "確認兌換"
            )}
          </Button>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={historyOpen}
        onOpenChange={(o) => {
          setHistoryOpen(o);
          if (!o) setTxPage(1);
        }}
      >
        <DialogContent className="max-h-[85vh] border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>金幣紀錄</DialogTitle>
          </DialogHeader>
          {txLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
            </div>
          ) : (
            <div className="max-h-[55vh] overflow-y-auto space-y-2 text-sm">
              {txList.length === 0 ? (
                <p className="text-center text-zinc-500 py-6">尚無紀錄</p>
              ) : (
                txList.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-zinc-800/60 bg-zinc-900/50 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-zinc-500">
                        {fmtTime(t.created_at)}
                      </span>
                      <span
                        className={`font-medium tabular-nums ${
                          t.amount >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {t.amount >= 0 ? "+" : ""}
                        {t.amount}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                      <span
                        className={
                          t.coin_type === "premium"
                            ? "text-amber-400"
                            : "text-violet-400"
                        }
                      >
                        {t.coin_type === "premium" ? "純金" : "探險幣"}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-400">
                        {SOURCE_LABEL[t.source] ?? t.source}
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="text-zinc-500">
                        餘額 {t.balance_after}
                      </span>
                    </div>
                    {t.note ? (
                      <p className="mt-1 text-xs text-zinc-500">{t.note}</p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          )}
          {txPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={txPage <= 1 || txLoading}
                onClick={() => {
                  const p = txPage - 1;
                  setTxPage(p);
                  void loadHistoryPage(p);
                }}
              >
                上一頁
              </Button>
              <span className="text-xs text-zinc-500">
                {txPage} / {txPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={txPage >= txPages || txLoading}
                onClick={() => {
                  const p = txPage + 1;
                  setTxPage(p);
                  void loadHistoryPage(p);
                }}
              >
                下一頁
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={shopPickRecipientOpen}
        onOpenChange={(o) => {
          setShopPickRecipientOpen(o);
          if (!o) {
            setShopPickRecipientItem(null);
            setShopPickPendingRecipient(null);
            setShopRecipientCandidates([]);
            setShopRecipientNicknameDraft("");
            setShopRecipientSearchKey("");
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className={`text-[#f4f4f5] ${sheetPopupClass}`}
          initialFocus={-1}
        >
          <div
            className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full"
            style={{ background: "rgba(255,255,255,0.15)" }}
          />
          <div className="px-5 pb-3 pt-4">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-lg font-bold text-[#f4f4f5]">
                選擇收禮對象
              </DialogTitle>
              <DialogDescription className="text-[13px] text-[#71717a]">
                搜尋玩家暱稱，選定後前往下一步
              </DialogDescription>
            </DialogHeader>
          </div>

          {shopPickRecipientItem ? (
            <div
              className="mx-5 mb-4 flex gap-3 rounded-[14px] border border-white/[0.08] p-3"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[22px]"
                style={{ background: "rgba(124,58,237,0.2)" }}
              >
                {ITEM_TYPE_EMOJI[shopPickRecipientItem.item_type] ?? "📦"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#f4f4f5]">
                  {shopPickRecipientItem.name}
                </p>
                <p className="mt-0.5 text-xs text-[#71717a]">
                  將購買並贈送此道具
                </p>
              </div>
            </div>
          ) : null}

          <div className="mx-5 mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-[#52525b]" aria-hidden />
            <input
              type="text"
              value={shopRecipientNicknameDraft}
              onChange={(e) => {
                setShopRecipientNicknameDraft(e.target.value.slice(0, 32));
                setShopRecipientSearchKey("");
                setShopRecipientCandidates([]);
                setShopPickPendingRecipient(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleShopRecipientSearch();
              }}
              placeholder="搜尋暱稱…"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-[#f4f4f5] outline-none placeholder:text-[#52525b]"
            />
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto px-5 pb-2"
            style={{ maxHeight: "min(42vh, 320px)", overscrollBehavior: "contain" }}
          >
            {shopRecipientCandidates.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-[#52525b]">
                {shopRecipientSearchKey === shopRecipientNicknameDraft.trim() &&
                shopRecipientNicknameDraft.trim().length >= 1 &&
                !shopRecipientSearchBusy
                  ? "找不到符合的冒險者"
                  : "輸入暱稱後搜尋"}
              </p>
            ) : (
              <div className="space-y-1.5">
                {shopRecipientCandidates.map((c) => {
                  const sel = shopPickPendingRecipient?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150 ${
                        sel
                          ? "border border-[rgba(124,58,237,0.3)] bg-[rgba(124,58,237,0.15)]"
                          : "border border-transparent hover:bg-white/[0.05]"
                      }`}
                      onClick={() => {
                        setShopPickPendingRecipient((prev) =>
                          prev?.id === c.id ? null : c,
                        );
                      }}
                    >
                      {c.avatar_url?.trim() ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={toThumbImageUrl(c.avatar_url, 64, 64)}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs text-[#f4f4f5]">
                          {(c.nickname || "?")[0]?.toUpperCase() ?? "?"}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#f4f4f5]">
                          {c.nickname}
                        </p>
                      </div>
                      <span
                        className="rounded-md px-2 py-0.5 text-[11px] text-[#a78bfa]"
                        style={{ background: "rgba(124,58,237,0.15)" }}
                      >
                        Lv.{c.level}
                      </span>
                      {sel ? (
                        <Check className="ml-1 h-4 w-4 shrink-0 text-[#7c3aed]" aria-hidden />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className="mt-auto border-t border-white/[0.06] px-5 py-3"
            style={{
              paddingBottom: "max(12px, env(safe-area-inset-bottom))",
              background: "#18181b",
            }}
          >
            <Button
              type="button"
              disabled={!shopPickPendingRecipient || !shopPickRecipientItem}
              className="h-[50px] w-full rounded-[14px] border-none bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-[15px] font-bold text-white hover:opacity-95 disabled:bg-[#3f3f46] disabled:text-[#52525b] disabled:opacity-100"
              onClick={() => {
                const it = shopPickRecipientItem;
                const p = shopPickPendingRecipient;
                if (!it || !p) return;
                setShopGiftRecipient(p);
                setShopPickRecipientOpen(false);
                setShopPickRecipientItem(null);
                setShopRecipientCandidates([]);
                setShopRecipientNicknameDraft("");
                setShopPickPendingRecipient(null);
                setPurchaseIntent("gift_friend");
                setPurchaseTarget(it);
              }}
            >
              下一步 →
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={shopGiftCheckoutOpen}
        onOpenChange={(open) => {
          if (!open) {
            setShopGiftCheckoutOpen(false);
            setShopGiftCheckoutSnapshot(null);
          }
        }}
      >
        <AlertDialogContent
          className="max-w-[320px] gap-0 rounded-[20px] border border-white/[0.08] p-6 text-[#f4f4f5]"
          style={{ background: "#1c1c1e" }}
        >
          <AlertDialogHeader className="space-y-2 text-center">
            <AlertDialogTitle className="text-center text-[17px] font-bold text-[#f4f4f5]">
              {shopGiftCheckoutSnapshot
                ? `確認贈送給 ${shopGiftCheckoutSnapshot.recipient.nickname}？`
                : "確認贈送？"}
            </AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line text-center text-[13px] leading-relaxed text-[#71717a]">
              {shopGiftCheckoutSnapshot
                ? `扣除 ${shopGiftCheckoutSnapshot.currencyEmoji} ${shopGiftCheckoutSnapshot.sub}（${shopGiftCheckoutSnapshot.qty} 個「${shopGiftCheckoutSnapshot.target.name}」）\n對方將收到信件通知`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-5 flex-row gap-2 sm:flex-row">
            <AlertDialogCancel
              variant="outline"
              className="h-11 flex-1 rounded-xl border border-white/10 bg-white/[0.06] text-[#a1a1aa] hover:bg-white/10"
              disabled={giftCheckoutBusy}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-11 flex-1 rounded-xl border-none bg-[#7c3aed] font-bold text-white hover:bg-[#6d28d9]"
              disabled={giftCheckoutBusy}
              onClick={(e) => {
                e.preventDefault();
                void executeShopGiftCheckout();
              }}
            >
              {giftCheckoutBusy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  處理中…
                </span>
              ) : (
                "確認"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
