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
 * `role === "master"` 時在圓形頭像外疊加雷框 PNG + 閃電 Lottie；其餘角色等同一般 Avatar 外層包一層 relative。
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
      className={cn("relative shrink-0 overflow-visible", className)}
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 z-0 overflow-hidden rounded-full">
        <Avatar
          size={size}
          src={src}
          nickname={nickname}
          className={cn("border-0 bg-transparent", avatarClassName)}
        />
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element -- 本地裝飾框 */}
      <img
        src={THUNDER_FRAME_SRC}
        alt=""
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 z-[10] -translate-x-1/2 -translate-y-1/2 object-contain select-none"
        style={{ width: `${framePct}%`, height: `${framePct}%` }}
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 z-[11] -translate-x-1/2 -translate-y-1/2"
        style={{ width: `${lightningPct}%`, height: `${lightningPct}%` }}
        aria-hidden
      >
        <Lottie
          animationData={lightningAnimation}
          loop
          className="h-full w-full"
        />
      </div>
      {children}
    </div>
  );
}
