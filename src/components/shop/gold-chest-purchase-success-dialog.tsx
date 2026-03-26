"use client";

import Lottie from "lottie-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type GoldChestPurchaseSuccessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Increment when opening so Lottie remounts and plays from frame 0 once. */
  playbackKey: number;
  animationData: object | null;
};

export function GoldChestPurchaseSuccessDialog({
  open,
  onOpenChange,
  playbackKey,
  animationData,
}: GoldChestPurchaseSuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center text-center">
          <DialogTitle>購買成功</DialogTitle>
          <DialogDescription className="text-zinc-400">
            已使用金幣完成購買（測試流程）
          </DialogDescription>
        </DialogHeader>
        <div className="flex min-h-[200px] items-center justify-center">
          {animationData ? (
            <Lottie
              key={playbackKey}
              animationData={animationData}
              loop={false}
              className="h-[220px] w-[220px] max-w-full"
            />
          ) : (
            <p className="text-sm text-zinc-500">載入動畫中…</p>
          )}
        </div>
        <div className="flex justify-center">
          <Button type="button" onClick={() => onOpenChange(false)}>
            太好了
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
