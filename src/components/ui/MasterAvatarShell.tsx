"use client";

import type { ReactNode } from "react";
import Avatar, {
  MASTER_AVATAR_FRAME_OVERLAY_PERCENT,
  MASTER_AVATAR_INNER_PHOTO_DIAMETER_SCALE,
} from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import {
  shopFrameLayoutStyle,
  type ShopFrameLayout,
} from "@/lib/utils/avatar-frame-layout";

const MASTER_FRAME_SRC = "/frames/master-avatar-frame.png";

export type MasterAvatarShellProps = {
  role?: string | null;
  size: number;
  src?: string | null;
  nickname?: string | null;
  className?: string;
  avatarClassName?: string;
  frameImageUrl?: string | null;
  frameEffectKey?: string | null;
  frameLayout?: ShopFrameLayout | null;
  children?: ReactNode;
};

/**
 * 外層版面錨點為 **size×size**。
 * - **無**商城頭像框且**非**領袖：一般圓形頭貼 **size**。
 * - **有**商城頭像框 **或** **領袖**（鑽石金框）：與金框素材同一套幾何——臉圓直徑 **size×MASTER_AVATAR_INNER_PHOTO_DIAMETER_SCALE**；商城框 **MASTER_AVATAR_FRAME_OVERLAY_PERCENT%** 置中；領袖再加金框 PNG 於最上層。
 */
export function MasterAvatarShell({
  role,
  size,
  src,
  nickname,
  className,
  avatarClassName,
  frameImageUrl,
  frameEffectKey,
  frameLayout,
  children,
}: MasterAvatarShellProps) {
  const isMaster = role === "master";
  const shopFrameSrc = frameImageUrl?.trim() || null;
  const useOrnamentLayout = Boolean(shopFrameSrc) || isMaster;

  const innerPhotoSize = useOrnamentLayout
    ? Math.max(1, Math.round(size * MASTER_AVATAR_INNER_PHOTO_DIAMETER_SCALE))
    : size;

  const shopOverlayStyle = shopFrameLayoutStyle(frameLayout ?? null);
  const framePct = MASTER_AVATAR_FRAME_OVERLAY_PERCENT;

  if (!useOrnamentLayout) {
    return (
      <div className={cn("relative shrink-0", className)}>
        <Avatar
          size={size}
          src={src}
          nickname={nickname}
          frameImageUrl={undefined}
          frameEffectKey={frameEffectKey}
          frameLayout={undefined}
          className={avatarClassName}
        />
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn("relative shrink-0", className, "!overflow-visible")}
      style={{ width: size, height: size }}
    >
      <div
        className="relative flex h-full w-full items-center justify-center overflow-visible"
        style={{ width: "100%", height: "100%" }}
      >
        <div
          className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
          style={{ width: innerPhotoSize, height: innerPhotoSize }}
        >
          <Avatar
            size={innerPhotoSize}
            src={src}
            nickname={nickname}
            frameImageUrl={undefined}
            frameEffectKey={frameEffectKey}
            frameLayout={undefined}
            className={cn("h-full w-full border-0 bg-transparent", avatarClassName)}
          />
        </div>

        {shopFrameSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- 商城頭像框 PNG
          <img
            src={shopFrameSrc}
            alt=""
            className="pointer-events-none absolute left-1/2 top-1/2 z-[15] max-w-none -translate-x-1/2 -translate-y-1/2 select-none object-contain"
            style={{
              width: `${framePct}%`,
              height: `${framePct}%`,
              ...shopOverlayStyle,
            }}
          />
        ) : null}

        {isMaster ? (
          // eslint-disable-next-line @next/next/no-img-element -- 本地鑽石金框
          <img
            src={MASTER_FRAME_SRC}
            alt="Master Frame"
            className="pointer-events-none absolute top-1/2 left-1/2 z-20 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain select-none"
            style={{
              width: `${framePct}%`,
              height: `${framePct}%`,
            }}
          />
        ) : null}

        {children}
      </div>
    </div>
  );
}
