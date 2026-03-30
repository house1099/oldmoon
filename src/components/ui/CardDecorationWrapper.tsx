"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CardDecorationConfig } from "@/lib/utils/card-decoration";
import { ShopCardFrameOverlay } from "@/components/ui/ShopCardFrameOverlay";

export type CardDecorationWrapperProps = {
  children: ReactNode;
  decoration: CardDecorationConfig;
  className?: string;
  /** 與 `LevelCardEffect`／內層卡片圓角一致 */
  borderRadiusClass?: "rounded-2xl" | "rounded-3xl";
};

export function CardDecorationWrapper({
  children,
  decoration,
  className,
  borderRadiusClass = "rounded-2xl",
}: CardDecorationWrapperProps) {
  const bg = decoration.cardBgImageUrl?.trim() || null;
  const corner = decoration.cardCornerImageUrl?.trim() || null;
  const mascot = decoration.cardMascotImageUrl?.trim() || null;

  return (
    <div className={cn("relative", className)}>
      {bg ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-0 overflow-hidden",
            borderRadiusClass,
          )}
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bg}
            alt=""
            className="h-full w-full object-cover opacity-90"
          />
        </div>
      ) : null}
      <div className="relative z-10">{children}</div>
      <ShopCardFrameOverlay
        imageUrl={decoration.cardFrameImageUrl}
        effectKey={decoration.cardFrameEffectKey}
        layout={decoration.cardFrameLayout ?? null}
        borderRadiusClass={borderRadiusClass}
        className="z-[11]"
      />
      {corner ? (
        <div
          className={cn(
            "pointer-events-none absolute right-0 top-0 z-[12] w-[22%] max-w-[72px]",
            borderRadiusClass,
          )}
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={corner} alt="" className="h-auto w-full object-contain" />
        </div>
      ) : null}
      {mascot ? (
        <div
          className={cn(
            "pointer-events-none absolute -bottom-1 -right-1 z-[13] w-[28%] max-w-[96px]",
            borderRadiusClass,
          )}
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mascot} alt="" className="h-auto w-full object-contain" />
        </div>
      ) : null}
    </div>
  );
}
