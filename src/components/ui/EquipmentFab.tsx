"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function EquipmentFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="開啟裝備欄"
        className="fixed bottom-44 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-zinc-600/50 bg-zinc-800 text-xl shadow-lg shadow-black/30 transition-transform active:scale-95"
      >
        ⚔️
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="z-50 w-80">
          <SheetHeader>
            <SheetTitle className="text-zinc-100">⚔️ 裝備欄</SheetTitle>
            <p className="text-xs text-zinc-500">
              收集道具，強化你的冒險之旅
            </p>
          </SheetHeader>

          <div className="grid grid-cols-4 gap-2 p-4">
            {Array.from({ length: 16 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toast("📚 課程詳情即將開放，敬請期待！")}
                className="relative aspect-square overflow-hidden rounded-xl border border-zinc-700/40 bg-zinc-800/60 transition-colors hover:border-zinc-600/60"
              >
                <div className="flex h-full flex-col items-center justify-center gap-1">
                  <div className="text-lg">🔒</div>
                </div>
                <div className="absolute right-1 top-1 h-3 w-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm" />
              </button>
            ))}
          </div>

          <div className="px-4 pb-4">
            <p className="text-center text-xs text-zinc-600">
              道具將於商城開放後陸續加入
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
