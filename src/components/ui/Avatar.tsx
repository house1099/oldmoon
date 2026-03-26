"use client";

import { useEffect } from "react";
import Image from "next/image";
import { FRAME_SIZE_PERCENT } from "@/lib/constants/master-avatar-frame";

export {
  FRAME_SIZE_PERCENT,
  MASTER_AVATAR_FRAME_OVERLAY_PERCENT,
  MASTER_AVATAR_HOLE_TO_FRAME_ASSET_RATIO,
  MASTER_AVATAR_LIGHTNING_OVERLAY_PERCENT,
} from "@/lib/constants/master-avatar-frame";

/**
 * 霸道測試：Master 裝飾框 `<img>` 用，確認 PNG 是否會畫在視窗上（正式上線前應移除或還原）。
 * 勿加 `opacity-0` / `hidden`。
 */
export const MASTER_AVATAR_FRAME_BRUTE_TEST_IMG_CLASSNAME =
  "fixed inset-0 z-[100] h-[300px] w-[300px]";

let didLogFramePercent = false;

interface AvatarProps {
  src?: string | null;
  nickname?: string | null;
  size?: number;
  className?: string;
}

export default function Avatar({
  src,
  nickname,
  size = 48,
  className = "",
}: AvatarProps) {
  const trimmed = src?.trim() || null;

  useEffect(() => {
    if (didLogFramePercent) return;
    didLogFramePercent = true;
    console.log("當前框框比例:", FRAME_SIZE_PERCENT);
  }, []);

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
      </div>
    );
  }

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-zinc-700 ${className}`}
      style={{ width: size, height: size }}
      data-frame-size-percent={FRAME_SIZE_PERCENT}
    >
      <span
        className="font-medium text-white"
        style={{ fontSize: size * 0.35 }}
      >
        {nickname?.[0]?.toUpperCase() ?? "?"}
      </span>
    </div>
  );
}
