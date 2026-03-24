import { cn } from "@/lib/utils";

type RegistrationStepIndicatorProps = {
  /** 目前步驟 1〜5 */
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
        "glass-panel mb-6 flex items-center justify-center gap-1 px-2 py-3 sm:px-3",
        className,
      )}
    >
      {[1, 2, 3, 4, 5].map((step, i) => (
        <div key={step} className="flex items-center gap-1">
          <div
            className={cn(
              "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
              activeStep === step
                ? "bg-violet-600 text-white"
                : activeStep > step
                  ? "bg-violet-900/60 text-violet-300"
                  : "bg-zinc-800 text-zinc-500",
            )}
          >
            {step}
          </div>
          {i < 4 ? (
            <div
              className={cn(
                "h-px w-4 flex-shrink-0",
                activeStep > step ? "bg-violet-500" : "bg-zinc-700",
              )}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
