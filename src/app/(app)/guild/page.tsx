"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  getMyAlliancesAction,
  getPendingRequestsAction,
  respondAllianceAction,
} from "@/services/alliance.action";
import type {
  MyAllianceListItem,
  PendingAllianceRequestItem,
} from "@/services/alliance.action";
import Avatar from "@/components/ui/Avatar";
import { SWR_KEYS } from "@/lib/swr/keys";

const tabs = ["血盟", "聊天", "信件"] as const;

export default function GuildPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("血盟");

  const { data: pendingData } = useSWR(
    SWR_KEYS.pendingAlliances,
    () => getPendingRequestsAction(),
    { revalidateOnFocus: false },
  );
  const pendingCount = pendingData?.length ?? 0;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/90 px-4 py-3 backdrop-blur-xl">
        <h1 className="mb-3 text-center text-base font-bold text-white">
          冒險團
        </h1>
        <div className="flex gap-1 rounded-full bg-zinc-900/60 p-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`relative flex-1 rounded-full py-2 text-xs font-medium transition-all ${
                tab === t
                  ? "bg-white/15 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t}
              {t === "血盟" && pendingCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        <div className={tab === "血盟" ? "block" : "hidden"}>
          <AllianceList />
        </div>
        <div className={tab === "聊天" ? "block" : "hidden"}>
          <ChatList />
        </div>
        <div className={tab === "信件" ? "block" : "hidden"}>
          <MailBox />
        </div>
      </div>
    </div>
  );
}

function AllianceList() {
  const { data: alliancesData, isLoading: alliancesLoading, mutate: mutateAlliances } =
    useSWR(SWR_KEYS.myAlliances, () => getMyAlliancesAction(), {
      revalidateOnFocus: false,
    });

  const { data: pendingData, isLoading: pendingLoading, mutate: mutatePending } =
    useSWR(SWR_KEYS.pendingAlliances, () => getPendingRequestsAction(), {
      revalidateOnFocus: false,
    });

  const alliances: MyAllianceListItem[] = alliancesData ?? [];
  const pending: PendingAllianceRequestItem[] = pendingData ?? [];
  const loading = alliancesLoading || pendingLoading;

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-2xl bg-zinc-800/50"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 ? (
        <div className="glass-panel space-y-3 p-4">
          <p className="text-xs font-semibold text-amber-400">
            待確認申請（{pending.length}）
          </p>
          {pending.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar
                  src={r.requester.avatar_url}
                  nickname={r.requester.nickname}
                  size={40}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">
                    {r.requester.nickname}
                  </p>
                  <p className="text-xs text-zinc-500">申請成為血盟</p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await respondAllianceAction(r.id, "accepted");
                    if (!res.ok) return;
                    await Promise.all([mutatePending(), mutateAlliances()]);
                  }}
                  className="rounded-full bg-amber-600 px-3 py-1.5 text-xs text-white transition-all hover:bg-amber-500 active:scale-95"
                >
                  接受
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await respondAllianceAction(r.id, "dissolved");
                    if (!res.ok) return;
                    await mutatePending();
                  }}
                  className="rounded-full bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-all hover:bg-zinc-700 active:scale-95"
                >
                  拒絕
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="glass-panel space-y-3 p-4">
        <p className="text-xs font-semibold text-zinc-400">
          血盟夥伴（{alliances.length}）
        </p>
        {alliances.length === 0 ? (
          <div className="space-y-2 py-8 text-center">
            <p className="text-3xl">⚔️</p>
            <p className="text-sm text-zinc-500">還沒有血盟夥伴</p>
            <p className="text-xs text-zinc-600">
              去探索頁送出緣分，互讚後可申請血盟
            </p>
          </div>
        ) : (
          alliances.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between border-b border-white/5 py-2 last:border-0"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  src={a.partner?.avatar_url}
                  nickname={a.partner?.nickname}
                  size={40}
                />
                <div>
                  <p className="text-sm text-white">{a.partner.nickname}</p>
                  {a.partner.instagram_handle ? (
                    <p className="text-xs text-violet-400">
                      @{a.partner.instagram_handle}
                    </p>
                  ) : null}
                </div>
              </div>
              <span className="text-xs text-amber-400/70">⚔️ 血盟</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ChatList() {
  return (
    <div className="space-y-2 py-12 text-center">
      <p className="text-3xl">💬</p>
      <p className="text-sm text-zinc-400">點擊血盟夥伴開始聊天</p>
    </div>
  );
}

function MailBox() {
  return (
    <div className="space-y-2 py-12 text-center">
      <p className="text-3xl">📨</p>
      <p className="text-sm text-zinc-400">尚無信件</p>
    </div>
  );
}
