"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { UserCard } from "@/components/cards/UserCard";
import UserCardSkeleton from "@/components/ui/UserCardSkeleton";
import { getMarketUsersAction } from "@/services/market.service";
import type { MarketUserWithScores } from "@/services/market.service";
import type { UserRow } from "@/lib/repositories/server/user.repository";

export function MarketContent() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<MarketUserWithScores[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const result = await getMarketUsersAction(query);
    setUsers(result.ok ? result.users : []);
    setLoading(false);
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const perfectCount = users.filter((u) => u.isPerfectMatch).length;

  return (
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
              <h2 className="bg-gradient-to-r from-slate-100 via-amber-100 to-slate-200/90 bg-clip-text font-serif text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
                技能市集
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                雙向標籤契合時為「靈魂伴侶」完美匹配 — 白金光暈標示緣分
              </p>
            </div>
          </div>
        </div>
        <div className="text-right text-xs text-slate-500/95">
          <p>{loading ? "載入中…" : `共 ${users.length} 位冒險者`}</p>
          {!loading && perfectCount > 0 ? (
            <p className="mt-1 text-amber-200/85">
              ✦ 完美匹配 {perfectCount} 位
            </p>
          ) : null}
        </div>
      </header>

      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋技能或冒險者名稱..."
          className="w-full rounded-full border border-white/10 bg-zinc-900/60 py-3 pl-11 pr-4 text-base text-white placeholder:text-zinc-600 transition-colors focus:border-white/30 focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <UserCardSkeleton key={i} />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="rounded-xl border border-dashed border-violet-500/30 bg-slate-950/50 px-6 py-16 text-center text-muted-foreground">
          市集裡還沒有其他冒險者 — 晚點再來逛逛吧 🐱
        </p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {users.map((row) => {
            const { isPerfectMatch, ...rest } = row;
            const cardUser = { ...rest } as Record<string, unknown>;
            delete cardUser._complementScore;
            delete cardUser._similarScore;
            return (
              <li key={rest.id}>
                <UserCard
                  user={cardUser as UserRow}
                  perfectMatch={isPerfectMatch}
                  variant="market"
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
