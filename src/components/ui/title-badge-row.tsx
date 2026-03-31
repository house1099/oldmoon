import { cn } from "@/lib/utils";

export type TitleBadgeRowProps = {
  title: string | null | undefined;
  imageUrl?: string | null;
  /** 列表：16px；Modal：20px；`lg`／`xl`：放大；**`card`**：探索 UserCard 底列（約 **sm×1.1**，不擠標籤） */
  size?: "sm" | "md" | "lg" | "xl" | "card";
  className?: string;
  pillClassName?: string;
};

/** 稱號胸章（左）＋文字膠囊；無文字且無圖則不渲染 */
export function TitleBadgeRow({
  title,
  imageUrl,
  size = "sm",
  className,
  pillClassName,
}: TitleBadgeRowProps) {
  const t = title?.trim() || null;
  const url = imageUrl?.trim() || null;
  if (!t && !url) return null;

  const imgSz =
    size === "xl"
      ? "h-[1.65rem] w-[1.65rem]"
      : size === "lg"
        ? "h-[1.3rem] w-[1.3rem]"
        : size === "card"
          ? "h-[1.1rem] w-[1.1rem]"
          : size === "md"
            ? "h-5 w-5"
            : "h-4 w-4";

  const gapClass =
    size === "xl" || size === "lg" ? "gap-1.5" : "gap-1";

  const pillText =
    t == null
      ? null
      : size === "lg" || size === "xl" || size === "card"
        ? t
        : t.length > 8
          ? `${t.slice(0, 8)}…`
          : t;

  return (
    <span
      className={cn("inline-flex min-w-0 items-center", gapClass, className)}
      title={t ?? undefined}
    >
      {url ? (
        <img
          src={url}
          alt=""
          aria-hidden
          className={cn("shrink-0 rounded-[5px] object-contain", imgSz)}
        />
      ) : null}
      {t && pillText ? (
        <span
          className={cn(
            "max-w-[5.5rem] truncate rounded-full bg-violet-600/60 px-2 py-0.5 text-[10px] font-semibold leading-none text-violet-200",
            size === "md" && "max-w-[10rem] text-xs py-0.5",
            size === "lg" &&
              "max-w-[min(11rem,calc(100vw-4rem))] px-3 py-1.5 text-[13px] font-medium leading-snug tracking-tight text-zinc-100",
            size === "xl" &&
              "max-w-[min(12rem,calc(100vw-4rem))] px-3 py-1.5 text-sm font-medium leading-snug tracking-tight text-zinc-100",
            size === "card" &&
              "max-w-[min(7.5rem,calc(100vw-8rem))] px-2 py-0.5 text-[11px] font-medium leading-snug tracking-tight text-zinc-100",
            pillClassName,
          )}
        >
          {pillText}
        </span>
      ) : null}
    </span>
  );
}
