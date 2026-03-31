import { cn } from "@/lib/utils";

export type TitleBadgeRowProps = {
  title: string | null | undefined;
  imageUrl?: string | null;
  /** 列表卡片：16px；Modal／標題列：20px */
  size?: "sm" | "md";
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

  const imgSz = size === "md" ? "h-5 w-5" : "h-4 w-4";

  return (
    <span
      className={cn("inline-flex min-w-0 items-center gap-1", className)}
      title={t ?? undefined}
    >
      {url ? (
        <img
          src={url}
          alt=""
          aria-hidden
          className={cn("shrink-0 rounded-md object-contain", imgSz)}
        />
      ) : null}
      {t ? (
        <span
          className={cn(
            "max-w-[5.5rem] truncate rounded-full bg-violet-600/60 px-2 py-0.5 text-[10px] leading-none text-violet-200",
            size === "md" && "max-w-[10rem] text-xs py-0.5",
            pillClassName,
          )}
        >
          {t.length > 8 ? `${t.slice(0, 8)}…` : t}
        </span>
      ) : null}
    </span>
  );
}
