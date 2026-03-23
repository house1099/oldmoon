import Link from "next/link";
import { getAuthStatus } from "@/services/auth.service";

function formatRegisteredAt(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** 公會介面用：等級與累積聲望合成的 RPG 風格信譽值 */
function reputationScore(level: number, totalExp: number): number {
  return level * 1000 + totalExp;
}

export default async function AppHomePage() {
  const auth = await getAuthStatus();

  if (auth.kind !== "authenticated") {
    return null;
  }

  const { nickname, level, total_exp, created_at } = auth.profile;
  const rep = reputationScore(level, total_exp);

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-10 px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <p className="font-serif text-xl font-medium tracking-wide text-amber-100/95 sm:text-2xl">
          🐱 歡迎回到公會，冒險者 {nickname}！
        </p>

        <dl className="w-full rounded-xl border border-white/10 bg-black/25 px-4 py-4 text-left text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                冒險等級
              </dt>
              <dd className="mt-0.5 font-mono text-lg text-amber-200/95">
                Lv.{level}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                信譽分數
              </dt>
              <dd className="mt-0.5 font-mono text-lg text-cyan-300/95 tabular-nums">
                {rep.toLocaleString("zh-TW")}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                註冊時間
              </dt>
              <dd className="mt-0.5 text-zinc-200/95">
                {formatRegisteredAt(created_at)}
              </dd>
            </div>
          </div>
        </dl>

        <Link
          href="/village"
          className="group relative w-full max-w-sm overflow-hidden rounded-xl border border-white/25 px-6 py-4 text-center text-base font-semibold tracking-wide text-slate-900 shadow-[0_4px_24px_rgba(255,255,255,0.12),inset_0_1px_0_rgba(255,255,255,0.85)] transition-[transform,box-shadow] duration-200 hover:scale-[1.02] hover:shadow-[0_6px_32px_rgba(255,255,255,0.18),inset_0_1px_0_rgba(255,255,255,0.9)] active:scale-[0.99]"
          style={{
            background:
              "linear-gradient(165deg, #f8fafc 0%, #e2e8f0 22%, #ffffff 45%, #cbd5e1 72%, #94a3b8 100%)",
          }}
        >
          <span
            className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay transition-opacity duration-200 group-hover:opacity-55"
            style={{
              background:
                "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.95) 42%, transparent 58%)",
            }}
            aria-hidden
          />
          <span className="relative">🏘️ 進入興趣村莊</span>
        </Link>
      </div>
    </main>
  );
}
