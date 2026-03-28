"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
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
import { Button } from "@/components/ui/button";
import {
  getMyCoinsAction,
  getFreeToPremiumRateAction,
  getMyCoinTransactionsAction,
  convertMyCoinsAction,
} from "@/services/coin.action";
import {
  getShopItemsAction,
  purchaseItemAction,
  type ShopItemDto,
} from "@/services/shop.action";
import type { CoinTransactionRow } from "@/types/database.types";

const SOURCE_LABEL: Record<CoinTransactionRow["source"], string> = {
  checkin: "簽到",
  loot_box: "公會盲盒",
  admin_grant: "管理贈與",
  admin_deduct: "管理扣除",
  shop_purchase: "商城消費",
  refund: "退款",
  convert_in: "兌換入帳",
  convert_out: "兌換扣款",
  topup: "儲值",
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

export default function ShopPage() {
  const [premium, setPremium] = useState(0);
  const [free, setFree] = useState(0);
  const [rate, setRate] = useState(0.01);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"free_coins" | "premium_coins">("free_coins");
  const [items, setItems] = useState<ShopItemDto[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<ShopItemDto | null>(null);
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
      if (item.isOnSale && item.remainingSeconds > 0) {
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

  function switchTab(t: "free_coins" | "premium_coins") {
    setTab(t);
    void loadItems(t);
  }

  const ERROR_LABELS: Record<string, string> = {
    daily_limit_reached: "今日已達購買上限",
    insufficient_balance: tab === "free_coins" ? "探險幣不足" : "純金不足",
  };

  async function handlePurchase() {
    if (!purchaseTarget) return;
    setPurchasing(true);
    const res = await purchaseItemAction(purchaseTarget.id, 1);
    setPurchasing(false);
    if (!res.ok) {
      toast.error(ERROR_LABELS[res.error] ?? res.error);
      setPurchaseTarget(null);
      return;
    }
    toast.success(`🛍️ 購買成功！已存入背包`);
    setPurchaseTarget(null);
    await refreshBalance();
    void loadItems(tab);
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

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 pb-32">
      <div className="mx-auto w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold text-white">⚔️ 傳奇商城</h1>

        {/* Balance */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-2xl border border-zinc-800/40 bg-zinc-900/60 backdrop-blur-sm p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-violet-300">{free}</p>
            <p className="mt-0.5 text-xs text-zinc-500">🪙 探險幣</p>
          </div>
          <div className="flex-1 rounded-2xl border border-zinc-800/40 bg-zinc-900/60 backdrop-blur-sm p-3 text-center">
            <p className="text-2xl font-bold tabular-nums text-amber-300">{premium}</p>
            <p className="mt-0.5 text-xs text-zinc-500">💎 純金</p>
          </div>
        </div>

        {/* Quick actions */}
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

        {/* Tab */}
        <div className="flex rounded-full border border-zinc-800 bg-zinc-900/80 p-1">
          <button
            type="button"
            onClick={() => switchTab("free_coins")}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
              tab === "free_coins"
                ? "bg-violet-600/80 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            🪙 探險幣商店
          </button>
          <button
            type="button"
            onClick={() => switchTab("premium_coins")}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
              tab === "premium_coins"
                ? "bg-amber-600/80 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            💎 純金商店
          </button>
        </div>

        {/* Items grid */}
        {itemsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800/30 bg-zinc-900/40 p-8 text-center">
            <p className="text-sm text-zinc-500">暫無商品</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => {
              const emoji = ITEM_TYPE_EMOJI[item.item_type] ?? "📦";
              const currencyEmoji = item.currency_type === "premium_coins" ? "💎" : "🪙";
              const balance = item.currency_type === "premium_coins" ? premium : free;
              const canAfford = balance >= item.price;
              const cd = countdowns[item.id];

              return (
                <div
                  key={item.id}
                  className="flex flex-col rounded-2xl border border-zinc-800/40 bg-zinc-900/60 backdrop-blur-sm p-3"
                >
                  <div className="mb-2 text-center text-3xl">{emoji}</div>
                  <p className="font-semibold text-zinc-100 text-sm">{item.name}</p>
                  {item.description && (
                    <p className="mt-0.5 text-xs text-zinc-400 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {item.isOnSale && cd != null && cd > 0 && (
                    <p className="mt-1 text-xs font-mono text-red-400">
                      ⏱ {formatCountdown(cd)}
                    </p>
                  )}
                  {item.isOnSale && item.original_price != null && (
                    <p className="text-xs text-zinc-500 line-through">
                      {currencyEmoji} {item.original_price}
                    </p>
                  )}

                  {item.daily_limit != null && (
                    <p className="mt-1 text-[11px] text-zinc-500">
                      每日限購 {item.daily_limit} 個
                    </p>
                  )}

                  <div className="mt-auto pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-zinc-200">
                        {currencyEmoji} {item.price}
                      </span>
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => setPurchaseTarget(item)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                          canAfford
                            ? "bg-violet-600/80 text-white hover:bg-violet-500/80"
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        }`}
                      >
                        {canAfford
                          ? "購買"
                          : item.currency_type === "premium_coins"
                            ? "純金不足"
                            : "探險幣不足"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Purchase confirm */}
      <AlertDialog
        open={!!purchaseTarget}
        onOpenChange={(o) => !o && setPurchaseTarget(null)}
      >
        <AlertDialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>確認購買？</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {purchaseTarget && (
                <>
                  商品：{purchaseTarget.name} × 1
                  <br />
                  扣除：
                  {purchaseTarget.currency_type === "premium_coins" ? "💎 純金" : "🪙 探險幣"}{" "}
                  {purchaseTarget.price}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={purchasing}
              onClick={(e) => {
                e.preventDefault();
                void handlePurchase();
              }}
              className="bg-violet-600 text-white hover:bg-violet-500"
            >
              {purchasing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "確認購買"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </div>
  );
}
