import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Castle } from "lucide-react";
import { UserCard } from "@/components/cards/UserCard";
import { getAuthStatus } from "@/services/auth.service";
import { getVillageUsers } from "@/services/village.service";

export default async function VillagePage() {
  const auth = await getAuthStatus();

  if (auth.kind !== "authenticated") {
    redirect("/login?next=/village");
  }

  const adventurers = await getVillageUsers(auth.userId);

  return (
    <main className="relative min-h-screen px-4 pb-20 pt-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-2 text-sm text-violet-300/90 transition-colors hover:text-amber-200/95"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              返回公會大廳
            </Link>
            <div className="flex items-center gap-3">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-700/45 bg-slate-950/80 shadow-inner"
                aria-hidden
              >
                <Castle className="h-6 w-6 text-amber-200/85" />
              </span>
              <div>
                <h1 className="bg-gradient-to-r from-amber-100 via-violet-200 to-amber-50/90 bg-clip-text font-serif text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
                  興趣村莊
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  在此遇見同路的冒險者 — 以公會之力串起緣分
                </p>
              </div>
            </div>
          </div>
          <p className="text-right text-xs text-slate-500/95">
            共 {adventurers.length} 位其他冒險者
          </p>
        </header>

        {adventurers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-violet-500/30 bg-slate-950/50 px-6 py-16 text-center text-muted-foreground">
            村莊裡還沒有其他冒險者，或大家尚未上線 — 晚點再來逛逛吧 🐱
          </p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {adventurers.map((a) => (
              <li key={a.id}>
                <UserCard user={a} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
