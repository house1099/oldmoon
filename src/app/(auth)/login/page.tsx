import { Suspense } from "react";
import { LoginForm } from "./login-form";

function LoginFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-background via-violet-950/20 to-background px-4">
      <div
        className="guild-breathe-ring rounded-xl border-2 border-violet-500/45 bg-card/80 px-10 py-8 shadow-[0_0_40px_rgba(139,92,246,0.2)] backdrop-blur-sm"
        role="status"
        aria-live="polite"
      >
        <p className="bg-gradient-to-r from-amber-100 via-violet-200 to-amber-100/80 bg-clip-text text-center font-serif text-lg font-medium tracking-wide text-transparent animate-pulse">
          ⏳ 傳輸中…
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          公會結界正在同步你的誓約之印
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
