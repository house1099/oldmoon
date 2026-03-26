import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function LevelBadge({
  level,
  className,
}: {
  level: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-amber-600/50 bg-amber-950/55 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-100/95",
        className,
      )}
      title="等級"
    >
      <Sparkles className="h-3 w-3 shrink-0 text-amber-300/90" />
      Lv.{level}
    </span>
  );
}
