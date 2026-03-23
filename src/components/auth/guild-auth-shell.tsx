import { cn } from "@/lib/utils";

type GuildAuthShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** 例如註冊問卷較寬時使用 `max-w-lg` */
  className?: string;
};

export function GuildAuthShell({
  title,
  subtitle,
  children,
  className,
}: GuildAuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="bg-gradient-to-r from-amber-100 via-violet-200 to-amber-50/90 bg-clip-text font-serif text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className={cn("glass-panel w-full p-6 sm:p-8", className ?? "max-w-md")}>
        {children}
      </div>
    </div>
  );
}
