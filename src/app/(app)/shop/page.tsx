"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getMyCoinsAction,
  getFreeToPremiumRateAction,
  getMyCoinTransactionsAction,
  convertMyCoinsAction,
} from "@/services/coin.action";
import type { CoinTransactionRow } from "@/types/database.types";

const SOURCE_LABEL: Record<CoinTransactionRow["source"], string> = {
  checkin: "簽到",
  admin_grant: "管理贈與",
  admin_deduct: "管理扣除",
  shop_purchase: "商城消費",
  refund: "退款",
  convert_in: "兌換入帳",
  convert_out: "兌換扣款",
  topup: "儲值",
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

export default function ShopPage() {
  const [premium, setPremium] = useState(0);
  const [free, setFree] = useState(0);
  const [rate, setRate] = useState(0.01);
  const [loading, setLoading] = useState(true);

  const [convertOpen, setConvertOpen] = useState(false);
  const [convertAmount, setConvertAmount] = useState("10");
  const [convertBusy, setConvertBusy] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txList, setTxList] = useState<CoinTransactionRow[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txLoading, setTxLoading] = useState(false);

  const refreshBalance = useCallback(async () => {
    const b = await getMyCoinsAction();
    setPremium(b.premium_coins);
    setFree(b.free_coins);
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
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
    <div className="min-h-screen bg-zinc-950 px-4 py-8 pb-16">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div>
          <h1 className="text-xl font-bold text-white">冒險者商店</h1>
          <p className="mt-1 text-sm text-zinc-500">錢包與金幣紀錄</p>
        </div>

        <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/60 p-4">
          <p className="mb-3 text-xs text-zinc-500">我的錢包</p>
          <div className="flex gap-4">
            <div className="flex-1 rounded-xl bg-zinc-800/60 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-amber-300">
                {premium}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">💎 純金</p>
            </div>
            <div className="flex-1 rounded-xl bg-zinc-800/60 p-3 text-center">
              <p className="text-2xl font-bold tabular-nums text-violet-300">
                {free}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">🪙 探險幣</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openConvertModal}
          className="flex w-full items-center justify-between rounded-2xl border border-zinc-700/40 bg-zinc-900/60 p-3 text-left transition hover:bg-zinc-900/80"
        >
          <div className="flex items-center gap-2">
            <span aria-hidden>🔄</span>
            <span className="text-sm text-zinc-300">探險幣兌換純金</span>
          </div>
          <span className="text-xs text-zinc-500">
            {rate * 100}% 轉換率
          </span>
        </button>

        <button
          type="button"
          onClick={() => void openHistoryModal()}
          className="flex w-full items-center justify-between rounded-2xl border border-zinc-700/40 bg-zinc-900/60 p-3 text-left transition hover:bg-zinc-900/80"
        >
          <div className="flex items-center gap-2">
            <span aria-hidden>📋</span>
            <span className="text-sm text-zinc-300">金幣紀錄</span>
          </div>
          <span className="text-xs text-zinc-500">查看流水</span>
        </button>

        <div className="rounded-2xl border border-zinc-800/30 bg-zinc-900/40 p-6 text-center">
          <p className="text-sm text-zinc-500">🛍️ 商城即將開放</p>
          <p className="mt-1 text-xs text-zinc-600">
            敬請期待更多精彩商品
          </p>
        </div>
      </div>

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
              type="number"
              min={10}
              value={convertAmount}
              onChange={(e) => setConvertAmount(e.target.value)}
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
