"use client";

import type { ReactNode } from "react";
import Lottie from "lottie-react";
import lightningAnimation from "@/assets/animations/yellow-circle.json";
import Avatar, {
  MASTER_AVATAR_FRAME_OVERLAY_PERCENT,
  MASTER_AVATAR_HOLE_TO_FRAME_ASSET_RATIO,
  MASTER_AVATAR_LIGHTNING_OVERLAY_PERCENT,
} from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

const MASTER_FRAME_SRC = "/frames/master-avatar-frame.png";

export type MasterAvatarShellProps = {
  role?: string | null;
  size: number;
  src?: string | null;
  nickname?: string | null;
  className?: string;
  avatarClassName?: string;
  children?: ReactNode;
};

/**
 * `role === "master"`：圓形照片 **z-10** 在下；Lottie **z-15**；PNG 金邊框 **z-20** 在上（`pointer-events-none` 可穿透點擊臉部）。
 * 裝飾百分比可大於 100% 向外超出 `size`（父層需 `overflow-visible`）。
 */
export function MasterAvatarShell({
  role,
  size,
  src,
  nickname,
  className,
  avatarClassName,
  children,
}: MasterAvatarShellProps) {
  const isMaster = role === "master";
  const framePct = MASTER_AVATAR_FRAME_OVERLAY_PERCENT;
  const lightningPct = MASTER_AVATAR_LIGHTNING_OVERLAY_PERCENT;
  const frameDisplayPx = size * (framePct / 100);
  const photoDiameter = Math.max(
    1,
    Math.round(frameDisplayPx * MASTER_AVATAR_HOLE_TO_FRAME_ASSET_RATIO),
  );

  if (!isMaster) {
    return (
      <div className={cn("relative shrink-0", className)}>
        <Avatar
          size={size}
          src={src}
          nickname={nickname}
          className={avatarClassName}
        />
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn("relative isolate shrink-0 overflow-visible", className)}
      style={{ width: size, height: size }}
    >
      <div
        className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
        style={{ width: photoDiameter, height: photoDiameter }}
      >
        <Avatar
          size={photoDiameter}
          src={src}
          nickname={nickname}
          className={cn("border-0 bg-transparent", avatarClassName)}
        />
      </div>
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 z-[15] -translate-x-1/2 -translate-y-1/2"
        style={{ width: `${lightningPct}%`, height: `${lightningPct}%` }}
        aria-hidden
      >
        <Lottie
          animationData={lightningAnimation}
          loop
          className="h-full w-full"
        />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- 本地裝飾框 */}
      <img
        src={MASTER_FRAME_SRC}
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 object-contain select-none"
        style={{ width: `${framePct}%`, height: `${framePct}%` }}
      />
      {children}
    </div>
  );
}
