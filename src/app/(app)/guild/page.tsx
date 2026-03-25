"use client";

import { useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import {
  getMyAlliancesAction,
  getPendingRequestsAction,
  respondAllianceAction,
} from "@/services/alliance.action";
import { getOrCreateConversationAction } from "@/services/chat.action";
import type {
  MyAllianceListItem,
  PendingAllianceRequestItem,
} from "@/services/alliance.action";
import {
  getMyNotificationsAction,
  markAllNotificationsReadAction,
  clearAllNotificationsAction,
} from "@/services/notification.action";
import type { NotificationListItem } from "@/services/notification.action";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import Avatar from "@/components/ui/Avatar";
import ChatModal from "@/components/chat/ChatModal";
import { SWR_KEYS } from "@/lib/swr/keys";
import { createClient } from "@/lib/supabase/client";
import { useConversations, useUnreadNotificationCount } from "@/hooks/useChat";

const tabs = ["血盟", "聊天", "信件"] as const;

type ConversationListItem = {
  id: string;
  user_a: string;
  user_b: string;
  last_message: string | null;
  last_message_at: string;
  created_at: string;
  partner: UserRow | null;
};

export default function GuildPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("血盟");
  const { count: unreadNotifCount } = useUnreadNotificationCount();

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
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              ) : null}
              {t === "信件" && unreadNotifCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
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

type AllianceChatTarget = {
  convId: string;
  partner: MyAllianceListItem["partner"];
};

function AllianceList() {
  const [chatTarget, setChatTarget] = useState<AllianceChatTarget | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [chatOpeningId, setChatOpeningId] = useState<string | null>(null);

  const {
    data: alliancesData,
    isLoading: alliancesLoading,
    mutate: mutateAlliances,
  } = useSWR(SWR_KEYS.myAlliances, () => getMyAlliancesAction(), {
    revalidateOnFocus: false,
  });

  const {
    data: pendingData,
    isLoading: pendingLoading,
    mutate: mutatePending,
  } = useSWR(SWR_KEYS.pendingAlliances, () => getPendingRequestsAction(), {
    revalidateOnFocus: false,
  });

  const alliances: MyAllianceListItem[] = alliancesData ?? [];
  const pending: PendingAllianceRequestItem[] = pendingData ?? [];
  const loading = alliancesLoading || pendingLoading;

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

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
            <button
              key={a.id}
              type="button"
              disabled={chatOpeningId === a.partner.id}
              onClick={async () => {
                setChatOpeningId(a.partner.id);
                try {
                  const result = await getOrCreateConversationAction(
                    a.partner.id,
                  );
                  if (result.ok && result.conversation) {
                    setChatTarget({
                      convId: result.conversation.id,
                      partner: a.partner,
                    });
                  } else {
                    toast.error(result.error ?? "無法開啟對話");
                  }
                } finally {
                  setChatOpeningId(null);
                }
              }}
              className="flex w-full items-center justify-between rounded-2xl border-b border-white/5 p-2 text-left transition-all last:border-0 hover:bg-white/5 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar
                  src={a.partner.avatar_url}
                  nickname={a.partner.nickname}
                  size={40}
                />
                <div className="min-w-0">
                  <p className="text-sm text-white">{a.partner.nickname}</p>
                  {a.partner.instagram_handle ? (
                    <p className="text-xs text-violet-400">
                      @{a.partner.instagram_handle}
                    </p>
                  ) : null}
                </div>
              </div>
              <span className="shrink-0 text-xs text-amber-400/70">
                {chatOpeningId === a.partner.id ? "開啟中…" : "⚔️ 血盟"}
              </span>
            </button>
          ))
        )}
      </div>

      {chatTarget ? (
        <ChatModal
          open={!!chatTarget}
          onClose={() => setChatTarget(null)}
          conversationId={chatTarget.convId}
          targetUser={{
            id: chatTarget.partner.id,
            nickname: chatTarget.partner.nickname,
            avatar_url: chatTarget.partner.avatar_url,
          }}
          currentUserId={currentUserId}
        />
      ) : null}
    </div>
  );
}

function ChatList() {
  const { conversations, isLoading } = useConversations();
  const [activeConv, setActiveConv] = useState<ConversationListItem | null>(
    null,
  );
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  if (isLoading) {
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

  const list = conversations as ConversationListItem[];

  if (list.length === 0) {
    return (
      <div className="space-y-2 py-12 text-center">
        <p className="text-3xl">💬</p>
        <p className="text-sm text-zinc-400">還沒有對話</p>
        <p className="text-xs text-zinc-600">
          去探索頁點擊「聊聊」開始對話
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {list.map((conv) => (
          <button
            key={conv.id}
            type="button"
            onClick={() => setActiveConv(conv)}
            className="glass-panel flex w-full items-center gap-3 p-4 text-left transition-all hover:bg-white/5 active:scale-[0.99]"
          >
            <Avatar
              src={conv.partner?.avatar_url}
              nickname={conv.partner?.nickname}
              size={44}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">
                {conv.partner?.nickname ?? "未知用戶"}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {conv.last_message ?? "開始對話"}
              </p>
            </div>
            <span className="shrink-0 text-xs text-zinc-600">
              {conv.last_message_at
                ? new Date(conv.last_message_at).toLocaleDateString("zh-TW", {
                    month: "short",
                    day: "numeric",
                  })
                : ""}
            </span>
          </button>
        ))}
      </div>

      {activeConv ? (
        <ChatModal
          open={!!activeConv}
          onClose={() => setActiveConv(null)}
          conversationId={activeConv.id}
          targetUser={{
            id:
              activeConv.partner?.id ??
              (activeConv.user_a === currentUserId
                ? activeConv.user_b
                : activeConv.user_a),
            nickname: activeConv.partner?.nickname ?? "未知用戶",
            avatar_url: activeConv.partner?.avatar_url ?? null,
          }}
          currentUserId={currentUserId}
        />
      ) : null}
    </>
  );
}

const NOTIF_KIND_LABEL: Record<string, string> = {
  like: "💖 對你送出了緣分",
  alliance_request: "⚔️ 申請與你結為血盟",
  alliance_accepted: "🎉 接受了你的血盟申請",
  alliance_dissolved: "💔 解除了血盟",
  new_message: "💬 傳了一則訊息給你",
  system: "📢 系統通知",
};

function MailBox() {
  const { mutate: mutateGlobal } = useSWRConfig();
  const { data: notifications, isLoading, mutate } = useSWR(
    SWR_KEYS.notifications,
    () => getMyNotificationsAction(),
    { revalidateOnFocus: true },
  );

  async function handleMarkAllRead() {
    const r = await markAllNotificationsReadAction();
    if (!r.ok) {
      toast.error("❌ 操作失敗，請稍後再試");
      return;
    }
    await mutate();
    void mutateGlobal(SWR_KEYS.unreadNotifications);
  }

  async function handleClearAll() {
    const r = await clearAllNotificationsAction();
    if (!r.ok) {
      toast.error("❌ 操作失敗，請稍後再試");
      return;
    }
    await mutate();
    void mutateGlobal(SWR_KEYS.unreadNotifications);
  }

  if (isLoading) {
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

  const rows: NotificationListItem[] = notifications ?? [];

  return (
    <div className="space-y-4">
      {rows.length > 0 ? (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            className="rounded-full bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:text-white"
          >
            全部已讀
          </button>
          <button
            type="button"
            onClick={() => void handleClearAll()}
            className="rounded-full bg-zinc-800/60 px-3 py-1.5 text-xs text-rose-400 transition-colors hover:text-rose-300"
          >
            清除全部
          </button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="space-y-2 py-12 text-center">
          <p className="text-3xl">📭</p>
          <p className="text-sm text-zinc-400">沒有新通知</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((notif) => {
            const isUnread = notif.read_at == null;
            const actionText =
              NOTIF_KIND_LABEL[notif.kind] ?? notif.body ?? notif.title ?? "";
            return (
              <div
                key={notif.id}
                className={`glass-panel flex items-center gap-3 p-4 transition-all ${
                  isUnread ? "border-violet-500/30 bg-violet-950/20" : ""
                }`}
              >
                <Avatar
                  src={notif.fromUser?.avatar_url}
                  nickname={notif.fromUser?.nickname}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white">
                    <span className="font-medium">
                      {notif.fromUser?.nickname ?? "系統"}
                    </span>{" "}
                    {actionText}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {new Date(notif.created_at).toLocaleDateString("zh-TW", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {isUnread ? (
                  <div className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
