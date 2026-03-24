"use client";

import { useCallback, useEffect, useState } from "react";
import { Castle } from "lucide-react";
import { UserCard } from "@/components/cards/UserCard";
import UserCardSkeleton from "@/components/ui/UserCardSkeleton";
import { getVillageUsersAction } from "@/services/village.service";
import type { VillageUserWithScore } from "@/services/village.service";
import type { UserRow } from "@/lib/repositories/server/user.repository";

export function VillageContent() {
  const [adventurers, setAdventurers] = useState<VillageUserWithScore[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { ok, users } = await getVillageUsersAction();
    setAdventurers(ok ? users : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-700/45 bg-slate-950/80 shadow-inner"
              aria-hidden
            >
              <Castle className="h-6 w-6 text-amber-200/85" />
            </span>
            <div>
              <h2 className="bg-gradient-to-r from-amber-100 via-violet-200 to-amber-50/90 bg-clip-text font-serif text-2xl font-semibold tracking-tight text-transparent sm:text-3xl">
                興趣村莊
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                在此遇見同路的冒險者 — 以公會之力串起緣分
              </p>
            </div>
          </div>
        </div>
        <p className="text-right text-xs text-slate-500/95">
          {loading ? "載入中…" : `共 ${adventurers.length} 位其他冒險者`}
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <UserCardSkeleton key={i} />
          ))}
        </div>
      ) : adventurers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-violet-500/30 bg-slate-950/50 px-6 py-16 text-center text-muted-foreground">
          村莊裡還沒有其他冒險者，或大家尚未上線 — 晚點再來逛逛吧 🐱
        </p>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {adventurers.map((row) => {
            const cardUser = { ...row } as Record<string, unknown>;
            delete cardUser._score;
            return (
              <li key={row.id}>
                <UserCard user={cardUser as UserRow} variant="village" />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
