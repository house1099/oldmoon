"use client";

import { useEffect } from "react";
import Image from "next/image";
import { FRAME_SIZE_PERCENT } from "@/lib/constants/master-avatar-frame";
import {
  shopFrameLayoutStyle,
  type ShopFrameLayout,
} from "@/lib/utils/avatar-frame-layout";
import { rewardEffectClassName } from "@/lib/utils/reward-effects";

export {
  FRAME_SIZE_PERCENT,
  MASTER_AVATAR_FRAME_OVERLAY_PERCENT,
  MASTER_AVATAR_HOLE_TO_FRAME_ASSET_RATIO,
  MASTER_AVATAR_INNER_PHOTO_DIAMETER_SCALE,
} from "@/lib/constants/master-avatar-frame";

let didLogFramePercent = false;

interface AvatarProps {
  src?: string | null;
  nickname?: string | null;
  size?: number;
  frameImageUrl?: string | null;
  frameEffectKey?: string | null;
  /** 商城 `metadata.frame_layout`，用於微調框圖對齊 */
  frameLayout?: ShopFrameLayout | null;
  className?: string;
}

export default function Avatar({
  src,
  nickname,
  size = 48,
  frameImageUrl,
  frameEffectKey,
  frameLayout,
  className = "",
}: AvatarProps) {
  const trimmed = src?.trim() || null;

  useEffect(() => {
    if (didLogFramePercent) return;
    didLogFramePercent = true;
    console.log("當前框框比例:", FRAME_SIZE_PERCENT);
  }, []);

  const frameEffectClass = rewardEffectClassName(frameEffectKey);
  const frameSrc = frameImageUrl?.trim() || null;
  const frameTransformStyle = shopFrameLayoutStyle(frameLayout ?? null);

  if (trimmed) {
    const optimizedSrc = trimmed.includes("cloudinary.com")
      ? trimmed.replace(
          "/upload/",
          `/upload/w_${size * 2},h_${size * 2},c_fill,q_auto,f_auto/`,
        )
      : trimmed;
    const isCloudinary = trimmed.includes("cloudinary.com");

    return (
      <div
        className={`relative flex-shrink-0 overflow-hidden rounded-full bg-zinc-700 ${className}`}
        style={{ width: size, height: size }}
        data-frame-size-percent={FRAME_SIZE_PERCENT}
      >
        {isCloudinary ? (
          <Image
            src={optimizedSrc}
            alt={nickname ?? "冒險者"}
            fill
            sizes={`${size}px`}
            className="object-cover"
            loading="lazy"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- 非 Cloudinary 遠端圖未列入 next.config
          <img
            src={trimmed}
            alt={nickname ?? "冒險者"}
            className="h-full w-full object-cover"
          />
        )}
        {frameSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- 支援本地/Cloudinary 框架圖
          <img
            src={frameSrc}
            alt=""
            loading="eager"
            fetchPriority="high"
            className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain"
            style={frameTransformStyle}
          />
        ) : null}
        {frameEffectClass ? (
          <div
            className={`pointer-events-none absolute inset-0 z-[11] rounded-full ${frameEffectClass}`}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-shrink-0 items-center justify-center rounded-full bg-zinc-700 ${className}`}
      style={{ width: size, height: size }}
      data-frame-size-percent={FRAME_SIZE_PERCENT}
    >
      <span
        className="font-medium text-white"
        style={{ fontSize: size * 0.35 }}
      >
        {nickname?.[0]?.toUpperCase() ?? "?"}
      </span>
      {frameSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- 支援本地/Cloudinary 框架圖
        <img
          src={frameSrc}
          alt=""
          loading="eager"
          fetchPriority="high"
          className="pointer-events-none absolute inset-0 z-10 h-full w-full object-contain"
          style={frameTransformStyle}
        />
      ) : null}
      {frameEffectClass ? (
        <div
          className={`pointer-events-none absolute inset-0 z-[11] rounded-full ${frameEffectClass}`}
        />
      ) : null}
    </div>
  );
}
