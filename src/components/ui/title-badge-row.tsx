import { cn } from "@/lib/utils";

export type TitleBadgeRowProps = {
  title: string | null | undefined;
  imageUrl?: string | null;
  /** 列表卡片：16px；Modal／標題列：20px；探索 UserCard：約 1.3× sm（胸章＋字級） */
  size?: "sm" | "md" | "lg";
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
    size === "lg"
      ? "h-[1.3rem] w-[1.3rem]"
      : size === "md"
        ? "h-5 w-5"
        : "h-4 w-4";

  const gapClass = size === "lg" ? "gap-1.5" : "gap-1";

  const pillText =
    t == null
      ? null
      : size === "lg"
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
            pillClassName,
          )}
        >
          {pillText}
        </span>
      ) : null}
    </span>
  );
}
