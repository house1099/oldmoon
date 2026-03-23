import { cn } from "@/lib/utils";

type GuildAuthShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** 例如註冊問卷較寬時使用 `max-w-lg` */
  className?: string;
};

/**
 * 單一 `.glass-panel` 收納標題與表單，避免標題與卡片上下大面積分離。
 */
export function GuildAuthShell({
  title,
  subtitle,
  children,
  className,
}: GuildAuthShellProps) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-6 sm:py-8">
      <div
        className={cn(
          "glass-panel w-full text-zinc-100",
          className ?? "max-w-md",
        )}
      >
        <div className="border-b border-white/10 px-5 pb-4 pt-5 text-center sm:px-6 sm:pt-6">
          <h1 className="font-serif text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1.5 text-sm text-zinc-300">{subtitle}</p>
          ) : null}
        </div>
        <div className="space-y-4 px-5 py-5 sm:px-6 sm:pb-6">{children}</div>
      </div>
    </div>
  );
}
