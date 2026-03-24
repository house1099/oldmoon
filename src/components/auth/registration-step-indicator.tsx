import { cn } from "@/lib/utils";

type RegistrationStepIndicatorProps = {
  /** 目前步驟 1〜5（僅該數字為紫色高亮） */
  activeStep: 1 | 2 | 3 | 4 | 5;
  className?: string;
};

export function RegistrationStepIndicator({
  activeStep,
  className,
}: RegistrationStepIndicatorProps) {
  return (
    <div
      className={cn(
        "glass-panel mb-6 flex items-center justify-center gap-2 px-4 py-4",
        className,
      )}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
              activeStep === n
                ? "bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/45"
                : "bg-zinc-800/80 text-zinc-500",
            )}
          >
            {n}
          </div>
          {n < 5 ? (
            <div
              className={cn(
                "h-px w-6",
                activeStep > n ? "bg-violet-400/40" : "bg-zinc-700/60",
              )}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
