"use client";

import type { ReactNode } from "react";
import Avatar, {
  MASTER_AVATAR_FRAME_BRUTE_TEST_IMG_CLASSNAME,
  MASTER_AVATAR_FRAME_OVERLAY_PERCENT,
  MASTER_AVATAR_HOLE_TO_FRAME_ASSET_RATIO,
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
 * `role === "master"`：外層 **overflow-visible**；Lottie 暫時移除。
 * 圓形照片 **z-10**；PNG **z-20**（`pointer-events-none`）。
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
    <div className={cn("relative shrink-0", className, "!overflow-visible")}>
      <div
        className="relative isolate !overflow-visible"
        style={{ width: size, height: size }}
      >
        <div
          className="absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-full"
          style={{ width: photoDiameter, height: photoDiameter }}
        >
          <Avatar
            size={photoDiameter}
            src={src}
            nickname={nickname}
            className={cn("border-0 bg-transparent", avatarClassName)}
          />
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- 本地裝飾框 */}
        <img
          src={MASTER_FRAME_SRC}
          alt=""
          aria-hidden
          className={cn(
            MASTER_AVATAR_FRAME_BRUTE_TEST_IMG_CLASSNAME,
            "pointer-events-none object-contain select-none",
          )}
        />
        {children}
      </div>
    </div>
  );
}
