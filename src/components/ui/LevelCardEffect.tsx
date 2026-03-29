"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ShopFrameLayout } from "@/lib/utils/avatar-frame-layout";
import { ShopCardFrameOverlay } from "@/components/ui/ShopCardFrameOverlay";

export interface LevelCardEffectProps {
  level: number;
  role?: string | null;
  shopCardFrameImageUrl?: string | null;
  shopCardFrameEffectKey?: string | null;
  shopCardFrameLayout?: ShopFrameLayout | null;
  children: React.ReactNode;
  className?: string;
}

function normalizeCardLevel(level: number): number {
  const n = Number(level);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(10, Math.floor(n));
}

export function getEffectClass(level: number, role?: string | null) {
  const lv = normalizeCardLevel(level);
  if (role === "master")
    return { border: "effect-master", particles: true as const };
  if (lv >= 10) return { border: "effect-rainbow", particles: true as const };
  if (lv >= 9) return { border: "effect-fire", particles: true as const };
  if (lv >= 7) return { border: "effect-flow-purple", particles: false as const };
  if (lv >= 5) return { border: "effect-flow-cyan", particles: false as const };
  if (lv >= 3) return { border: "effect-breathe-blue", particles: false as const };
  return { border: "border border-zinc-800/60", particles: false as const };
}

function ParticleEffect({
  level,
  role,
}: {
  level: number;
  role?: string | null;
}) {
  const lv = normalizeCardLevel(level);
  const isMaster = role === "master";

  const [dots] = useState(() =>
    Array.from({ length: 6 }, () => ({
      left: Math.random() * 88 + 6,
      top: Math.random() * 88 + 6,
      delay: 1.5 + Math.random(),
      duration: 1.5 + Math.random(),
    })),
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden rounded-2xl"
      aria-hidden
    >
      {dots.map((d, i) => {
        let bg: string;
        if (isMaster) {
          bg = i % 2 === 0 ? "bg-purple-300/80" : "bg-yellow-300/80";
        } else if (lv >= 10) {
          bg = "bg-yellow-300/70";
        } else {
          bg = "bg-orange-400/60";
        }
        return (
          <span
            key={i}
            className={cn(
              "absolute h-1 w-1 rounded-full animate-fade-up-particle",
              bg,
            )}
            style={{
              left: `${d.left}%`,
              top: `${d.top}%`,
              animationDelay: `${d.delay}s`,
              animationDuration: `${d.duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}

export function LevelCardEffect({
  level,
  role,
  shopCardFrameImageUrl,
  shopCardFrameEffectKey,
  shopCardFrameLayout,
  children,
  className,
}: LevelCardEffectProps) {
  const effectClass = getEffectClass(level, role);

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "absolute inset-0 z-0 rounded-2xl pointer-events-none",
          effectClass.border,
        )}
      />
      <ShopCardFrameOverlay
        imageUrl={shopCardFrameImageUrl}
        effectKey={shopCardFrameEffectKey}
        layout={shopCardFrameLayout ?? null}
        borderRadiusClass="rounded-2xl"
      />
      {effectClass.particles ? (
        <ParticleEffect level={level} role={role} />
      ) : null}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
