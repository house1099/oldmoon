"use client";

import type { ReactNode } from "react";
import Avatar, { MASTER_AVATAR_FRAME_OVERLAY_PERCENT } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { ShopFrameLayout } from "@/lib/utils/avatar-frame-layout";

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
 * `role === "master"`：外層固定 **size×size**；內層 **100%** + **flex** 置中、**overflow-visible**；
 * 圓形頭貼 **z-10**；金框 **z-20**、**max-w-none** + 百分比寬高，以中心向外擴展。
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
  const framePct = MASTER_AVATAR_FRAME_OVERLAY_PERCENT;

  if (!isMaster) {
    return (
      <div className={cn("relative shrink-0", className)}>
        <Avatar
          size={size}
          src={src}
          nickname={nickname}
          frameImageUrl={frameImageUrl}
          frameEffectKey={frameEffectKey}
          frameLayout={frameLayout}
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
      {/* 1. 最外層定位容器 (必須 overflow-visible) */}
      <div
        className="relative flex h-full w-full items-center justify-center overflow-visible"
        style={{ width: "100%", height: "100%" }}
      >
        {/* 2. 底層：圓形大頭貼照 (z-10) */}
        <div className="relative z-10 h-full w-full overflow-hidden rounded-full">
          <Avatar
            size={size}
            src={src}
            nickname={nickname}
            frameImageUrl={frameImageUrl}
            frameEffectKey={frameEffectKey}
            frameLayout={frameLayout}
            className={cn("h-full w-full border-0 bg-transparent", avatarClassName)}
          />
        </div>

        {/* 3. 頂層：金屬裝飾框 (z-20) */}
        {/* eslint-disable-next-line @next/next/no-img-element -- 本地裝飾框 */}
        <img
          src={MASTER_FRAME_SRC}
          alt="Master Frame"
          className="pointer-events-none absolute top-1/2 left-1/2 z-20 max-w-none -translate-x-1/2 -translate-y-1/2 object-contain select-none"
          style={{
            width: `${framePct}%`,
            height: `${framePct}%`,
          }}
        />
        {children}
      </div>
    </div>
  );
}
