"use client";

import { useEffect, useState } from "react";
import { Coins } from "lucide-react";
import Lottie from "lottie-react";
import { Button } from "@/components/ui/button";
import { GoldChestPurchaseSuccessDialog } from "@/components/shop/gold-chest-purchase-success-dialog";

const GOLD_CHEST_JSON_URL = "/animations/goldchest.json";
const CHEST_PRICE = 100;

export default function ShopPage() {
  const [coins, setCoins] = useState(500);
  const [animationData, setAnimationData] = useState<object | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successPlaybackKey, setSuccessPlaybackKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(GOLD_CHEST_JSON_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as object;
        if (!cancelled) setAnimationData(data);
      } catch (e) {
        console.error("Shop: failed to load gold chest Lottie", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function handlePurchase() {
    if (coins < CHEST_PRICE) return;
    setCoins((c) => c - CHEST_PRICE);
    setSuccessPlaybackKey((k) => k + 1);
    setSuccessOpen(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10">
      <GoldChestPurchaseSuccessDialog
        open={successOpen}
        onOpenChange={setSuccessOpen}
        playbackKey={successPlaybackKey}
        animationData={animationData}
      />

      <div className="glass-panel w-full max-w-sm space-y-6 p-8 text-center">
        <div>
          <h2 className="text-xl font-bold text-white">冒險者商店</h2>
          <p className="mt-1 text-sm text-zinc-400">購買測試（前端模擬）</p>
        </div>

        <div className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-amber-200">
          <Coins className="size-5 shrink-0" aria-hidden />
          <span className="text-sm font-medium tabular-nums">
            持有金幣：<span className="text-white">{coins}</span>
          </span>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-sm font-medium text-zinc-200">黃金寶箱</p>
          <p className="mt-0.5 text-xs text-zinc-500">開啟後可獲得測試獎勵</p>
          <div className="mx-auto mt-3 flex h-40 w-40 items-center justify-center">
            {animationData ? (
              <Lottie
                animationData={animationData}
                loop
                className="h-full w-full"
              />
            ) : (
              <div className="text-xs text-zinc-500">載入中…</div>
            )}
          </div>
          <p className="mt-3 text-lg font-semibold text-amber-400">
            {CHEST_PRICE} 金幣
          </p>
        </div>

        <Button
          type="button"
          className="w-full"
          size="lg"
          disabled={coins < CHEST_PRICE || !animationData}
          onClick={handlePurchase}
        >
          {coins < CHEST_PRICE ? "金幣不足" : "購買"}
        </Button>
      </div>
    </div>
  );
}
