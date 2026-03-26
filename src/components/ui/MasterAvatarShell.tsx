"use client";

import type { ReactNode } from "react";
import Lottie from "lottie-react";
import lightningAnimation from "@/assets/animations/yellow-circle.json";
import Avatar, {
  MASTER_AVATAR_FRAME_OVERLAY_PERCENT,
  MASTER_AVATAR_LIGHTNING_OVERLAY_PERCENT,
} from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";

const THUNDER_FRAME_SRC = "/frames/thunder-frame.png";

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
 * `role === "master"`：雷框／Lottie 在 **頭像下層**（z 較低），圓形照片在最上層，避免 PNG 壓臉；
 * 裝飾仍可依百分比大於 100% 向外超出 `size`（父層需 `overflow-visible`）。
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
      {/* eslint-disable-next-line @next/next/no-img-element -- 本地裝飾框 */}
      <img
        src={THUNDER_FRAME_SRC}
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 object-contain select-none"
        style={{ width: `${framePct}%`, height: `${framePct}%` }}
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 z-[2] -translate-x-1/2 -translate-y-1/2"
        style={{ width: `${lightningPct}%`, height: `${lightningPct}%` }}
        aria-hidden
      >
        <Lottie
          animationData={lightningAnimation}
          loop
          className="h-full w-full"
        />
      </div>
      <div className="absolute inset-0 z-[10] overflow-hidden rounded-full">
        <Avatar
          size={size}
          src={src}
          nickname={nickname}
          className={cn("border-0 bg-transparent", avatarClassName)}
        />
      </div>
      {children}
    </div>
  );
}
