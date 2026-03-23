import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Layer 5：依 `users.level` 套用冒險者卡外框動畫。
 * - Master（領袖）：`level >= 11`（預留雲端上限擴充；目前 SSOT 最高 Lv10 時不觸發）
 * - Lv10／9／8／7／6／5：專屬光暈
 * - Lv1–4：沿用公會預設呼吸邊框
 */
export function getLevelFrameClassNames(level: number): string {
  if (level >= 11) return "level-frame-master border-red-500/45";
  if (level === 10) return "level-frame-lv10 border-amber-400/55";
  if (level === 9) return "level-frame-lv9 border-sky-400/50";
  if (level === 8) return "level-frame-lv8 border-slate-200/50";
  if (level === 7) return "level-frame-lv7 border-amber-500/45";
  if (level === 6) return "level-frame-lv6 border-slate-300/45";
  if (level === 5) return "level-frame-lv5 border-emerald-500/45";
  return "guild-breathe-ring border-violet-500/40";
}

export type LevelFrameProps = ComponentPropsWithoutRef<"div"> & {
  level: number;
};

export function LevelFrame({
  level,
  className,
  children,
  ...rest
}: LevelFrameProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border-2",
        getLevelFrameClassNames(level),
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
