"use client";

import { useState } from "react";

const tabs = ["血盟", "聊天", "信件"] as const;

export default function GuildPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("血盟");

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
              className={`flex-1 rounded-full py-2 text-xs font-medium transition-all ${
                tab === t
                  ? "bg-white/15 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4">
        {tab === "血盟" ? <AllianceList /> : null}
        {tab === "聊天" ? <ChatList /> : null}
        {tab === "信件" ? <MailBox /> : null}
      </div>
    </div>
  );
}

function AllianceList() {
  return (
    <div className="rounded-xl border border-dashed border-violet-500/25 bg-zinc-900/30 px-6 py-12 text-center text-sm text-zinc-400">
      血盟列表（Phase 2.2 將接線 getMyAlliancesAction／getPendingRequestsAction）
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
