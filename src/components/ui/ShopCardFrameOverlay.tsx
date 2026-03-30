"use client";

import { cn } from "@/lib/utils";
import {
  shopFrameLayoutStyle,
  type ShopFrameLayout,
} from "@/lib/utils/avatar-frame-layout";
import { rewardEffectClassName } from "@/lib/utils/reward-effects";
import { CARD_FRAME_OVERLAY_PERCENT } from "@/lib/constants/shop-card-frame-preview";

export type ShopCardFrameOverlayProps = {
  imageUrl?: string | null;
  effectKey?: string | null;
  layout?: ShopFrameLayout | null;
  borderRadiusClass: "rounded-2xl" | "rounded-3xl";
  className?: string;
};

export function ShopCardFrameOverlay({
  imageUrl,
  effectKey,
  layout,
  borderRadiusClass,
  className,
}: ShopCardFrameOverlayProps) {
  const src = imageUrl?.trim() || null;
  const fx = effectKey?.trim() || null;
  const layoutStyle = shopFrameLayoutStyle(layout ?? null);
  const pct = CARD_FRAME_OVERLAY_PERCENT;

  if (!src && !fx) return null;

  if (!src) {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[1]",
          borderRadiusClass,
          rewardEffectClassName(fx),
          className,
        )}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[1] overflow-visible",
        borderRadiusClass,
        rewardEffectClassName(fx),
        className,
      )}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 商城卡框 PNG 疊圖 */}
      <img
        src={src}
        alt=""
        loading="eager"
        fetchPriority="high"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 max-w-none -translate-x-1/2 -translate-y-1/2 select-none object-contain"
        style={{
          width: `${pct}%`,
          height: `${pct}%`,
          ...layoutStyle,
        }}
      />
    </div>
  );
}
