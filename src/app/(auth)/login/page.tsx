import { Suspense } from "react";
import { LoginForm } from "./login-form";

function LoginFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-6">
      <div
        className="glass-panel w-full max-w-md px-6 py-10 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="font-serif text-lg font-medium tracking-wide text-zinc-100 animate-pulse">
          ⏳ 傳輸中…
        </p>
        <p className="mt-2 text-xs text-zinc-400">
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
