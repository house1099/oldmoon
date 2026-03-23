import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { UserCard } from "@/components/cards/UserCard";
import { getAuthStatus } from "@/services/auth.service";
import { getMarketUsers } from "@/services/market.service";

export default async function MarketPage() {
  const auth = await getAuthStatus();

  if (auth.kind !== "authenticated") {
    redirect("/login?next=/market");
  }

  const entries = await getMarketUsers(auth.userId);
  const perfectCount = entries.filter((e) => e.isPerfectMatch).length;

  return (
    <main className="relative min-h-screen px-4 pb-20 pt-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-400/40 bg-slate-950/80 shadow-inner"
                aria-hidden
              >
                <Sparkles className="h-6 w-6 text-slate-100/90" />
              </span>
              <div>
                <h1 className="bg-gradient-to-r from-slate-100 via-amber-100 to-slate-200/90 bg-clip-text font-serif text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
                  技能市集
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  雙向標籤契合時為「靈魂伴侶」完美匹配 — 白金光暈標示緣分
                </p>
              </div>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500/95">
            <p>共 {entries.length} 位冒險者</p>
            {perfectCount > 0 ? (
              <p className="mt-1 text-amber-200/85">
                ✦ 完美匹配 {perfectCount} 位
              </p>
            ) : null}
          </div>
        </header>

        {entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-violet-500/30 bg-slate-950/50 px-6 py-16 text-center text-muted-foreground">
            市集裡還沒有其他冒險者 — 晚點再來逛逛吧 🐱
          </p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {entries.map(({ user, isPerfectMatch }) => (
              <li key={user.id}>
                <UserCard user={user} perfectMatch={isPerfectMatch} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
