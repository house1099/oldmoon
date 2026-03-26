"use client";

import { useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import {
  getMyAlliancesAction,
  getPendingRequestsAction,
  respondAllianceAction,
} from "@/services/alliance.action";
import type {
  MyAllianceListItem,
  PendingAllianceRequestItem,
} from "@/services/alliance.action";
import type { ConversationListItemDto } from "@/services/chat.action";
import {
  getMyNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  clearAllNotificationsAction,
} from "@/services/notification.action";
import type { NotificationListItem } from "@/services/notification.action";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import Avatar from "@/components/ui/Avatar";
import ChatModal from "@/components/chat/ChatModal";
import { UserDetailModal } from "@/components/modals/UserDetailModal";
import { SWR_KEYS } from "@/lib/swr/keys";
import { createClient } from "@/lib/supabase/client";
import {
  useConversations,
  useUnreadChatCount,
  useUnreadNotificationCount,
} from "@/hooks/useChat";
import { useGuildTabContext } from "@/contexts/guild-tab-context";
import { getMemberProfileByIdAction } from "@/services/profile.action";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const tabs = ["血盟", "聊天", "信件"] as const;

function GuildTabCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-zinc-950"
      aria-hidden
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

function formatConversationPreview(
  me: string,
  lastMessage: string | null,
  lastSenderId: string | null,
): string {
  if (!lastMessage) {
    return "開始對話";
  }
  if (lastSenderId === me) {
    return `你：${lastMessage}`;
  }
  if (lastSenderId) {
    return `對方：${lastMessage}`;
  }
  return lastMessage;
}

export default function GuildPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("血盟");
  const guildTabCtx = useGuildTabContext();
  const { count: unreadNotifCount } = useUnreadNotificationCount();
  const { count: unreadChatConvCount } = useUnreadChatCount();

  useEffect(() => {
    guildTabCtx?.setGuildSubTab(tab);
    return () => guildTabCtx?.setGuildSubTab(null);
  }, [tab, guildTabCtx]);

  const { data: pendingData } = useSWR(
    SWR_KEYS.pendingAlliances,
    () => getPendingRequestsAction(),
    { revalidateOnFocus: false },
  );
  const pendingCount = pendingData?.length ?? 0;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] backdrop-blur-xl">
        <h1 className="mb-3 text-center text-base font-bold text-white">
          冒險團
        </h1>
        <div className="flex gap-1 rounded-full bg-zinc-900/60 p-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-label={
                t === "血盟" && pendingCount > 0
                  ? `血盟，${pendingCount} 筆待確認`
                  : t === "聊天" && unreadChatConvCount > 0
                    ? `聊天，${unreadChatConvCount} 個對話有未讀`
                    : t === "信件" && unreadNotifCount > 0
                      ? `信件，${unreadNotifCount} 則未讀`
                      : t
              }
              className={`relative flex-1 rounded-full py-2 text-xs font-medium transition-all ${
                tab === t
                  ? "bg-white/15 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t}
              {t === "血盟" ? (
                <GuildTabCountBadge count={pendingCount} />
              ) : null}
              {t === "聊天" ? (
                <GuildTabCountBadge count={unreadChatConvCount} />
              ) : null}
              {t === "信件" ? (
                <GuildTabCountBadge count={unreadNotifCount} />
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
  const [allianceDetailUser, setAllianceDetailUser] = useState<UserRow | null>(
    null,
  );
  const [profileLoadingId, setProfileLoadingId] = useState<string | null>(null);

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
              disabled={profileLoadingId === a.partner.id}
              onClick={async () => {
                setProfileLoadingId(a.partner.id);
                try {
                  const profile = await getMemberProfileByIdAction(
                    a.partner.id,
                  );
                  if (!profile) {
                    toast.error("無法載入對方資料");
                    return;
                  }
                  setAllianceDetailUser(profile);
                } finally {
                  setProfileLoadingId(null);
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
                {profileLoadingId === a.partner.id ? "載入中…" : "⚔️ 血盟"}
              </span>
            </button>
          ))
        )}
      </div>

      {allianceDetailUser ? (
        <UserDetailModal
          user={allianceDetailUser}
          open
          onOpenChange={(open) => {
            if (!open) {
              setAllianceDetailUser(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function ChatList() {
  const { mutate: globalMutate } = useSWRConfig();
  const { conversations, isLoading, mutate: mutateConversations } =
    useConversations();
  const [activeConv, setActiveConv] = useState<ConversationListItemDto | null>(
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

  const list: ConversationListItemDto[] = conversations;

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
            className={`glass-panel flex w-full items-center gap-3 p-4 text-left transition-all hover:bg-white/5 active:scale-[0.99] ${
              conv.hasUnreadFromPartner
                ? "border-rose-500/25 bg-rose-950/15 ring-1 ring-rose-500/20"
                : ""
            }`}
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
                {formatConversationPreview(
                  currentUserId,
                  conv.last_message,
                  conv.last_message_sender_id,
                )}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="text-xs text-zinc-600">
                {conv.last_message_at
                  ? new Date(conv.last_message_at).toLocaleDateString("zh-TW", {
                      month: "short",
                      day: "numeric",
                    })
                  : ""}
              </span>
              {conv.hasUnreadFromPartner ? (
                <span
                  className="rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-200 ring-1 ring-rose-500/35"
                  title="未讀訊息"
                >
                  未讀
                </span>
              ) : null}
            </div>
          </button>
        ))}
      </div>

      {activeConv ? (
        <ChatModal
          open={!!activeConv}
          onClose={() => {
            setActiveConv(null);
            void mutateConversations();
            void globalMutate(SWR_KEYS.unreadChatConversations);
          }}
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

const NOTIF_TYPE_LABEL: Record<string, string> = {
  like: "💖 對你送出了緣分",
  alliance_request: "⚔️ 申請與你結為血盟",
  alliance_accepted: "🎉 接受了你的血盟申請",
  alliance_dissolved: "💔 解除了血盟",
  new_message: "💬 傳了一則訊息給你",
  system: "📢 系統通知",
  invitation_code: "🎟️ 寄給你一組邀請碼",
};

function formatNotificationTimeTaipei(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function notificationDetailDescription(
  notif: NotificationListItem,
): string {
  const nick = notif.fromUser?.nickname?.trim() || "對方";
  switch (notif.type) {
    case "like":
      return `💘 ${nick} 對你送出了緣分`;
    case "alliance_request":
      return `⚔️ ${nick} 向你申請血盟`;
    case "alliance_accepted":
      return `🎉 ${nick} 接受了你的血盟申請`;
    case "system":
      return (notif.message ?? "").trim();
    case "invitation_code":
      return (notif.message ?? "").trim();
    default:
      return (
        (notif.message ?? "").trim() ||
        NOTIF_TYPE_LABEL[notif.type] ||
        ""
      );
  }
}

function MailBox() {
  const { mutate: mutateGlobal } = useSWRConfig();
  const { data: notifications, isLoading, mutate } = useSWR(
    SWR_KEYS.notifications,
    () => getMyNotificationsAction(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 3000,
    },
  );
  const [detailNotif, setDetailNotif] =
    useState<NotificationListItem | null>(null);
  const [notifProfileUser, setNotifProfileUser] = useState<UserRow | null>(
    null,
  );
  const [notifProfileLoading, setNotifProfileLoading] = useState(false);

  function handleNotificationDialogOpenChange(open: boolean) {
    if (open) return;
    setDetailNotif((current) => {
      if (current && current.is_read === false) {
        void (async () => {
          const r = await markNotificationReadAction(current.id);
          if (r.ok) {
            await mutate();
            void mutateGlobal(SWR_KEYS.unreadNotifications);
          }
        })();
      }
      return null;
    });
  }

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
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass-panel flex animate-pulse items-center gap-3 p-4"
          >
            <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-700/80" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-3/4 max-w-[220px] rounded bg-zinc-700/80" />
              <div className="h-3 w-24 rounded bg-zinc-800/80" />
            </div>
          </div>
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
            const isUnread = !notif.is_read;
            const actionText =
              NOTIF_TYPE_LABEL[notif.type] ?? notif.message ?? "";
            return (
              <button
                key={notif.id}
                type="button"
                onClick={() => setDetailNotif(notif)}
                className={`glass-panel flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-all ${
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
              </button>
            );
          })}
        </div>
      )}

      <Dialog
        open={detailNotif !== null}
        onOpenChange={handleNotificationDialogOpenChange}
      >
        {detailNotif ? (
          <DialogContent
            overlayClassName="z-[200]"
            className="z-[210] max-w-[calc(100%-2rem)] gap-0 border-zinc-800 bg-zinc-950 p-0 text-zinc-100 sm:max-w-md"
            showCloseButton
          >
            <DialogHeader className="border-b border-white/10 px-4 pb-3 pt-4">
              <DialogTitle className="text-base font-semibold text-white">
                通知詳情
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 px-4 py-4">
              <div className="flex items-center gap-3">
                <Avatar
                  src={detailNotif.fromUser?.avatar_url}
                  nickname={detailNotif.fromUser?.nickname}
                  size={48}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {detailNotif.fromUser?.nickname ?? "系統"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatNotificationTimeTaipei(detailNotif.created_at)}
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-zinc-200">
                {notificationDetailDescription(detailNotif) || "—"}
              </p>
            </div>
            <DialogFooter className="flex-col gap-2 border-t border-white/10 bg-zinc-950/80 px-4 py-4 sm:flex-col">
              {detailNotif.from_user_id ? (
                <Button
                  type="button"
                  disabled={notifProfileLoading}
                  className="w-full rounded-full bg-violet-600 text-white hover:bg-violet-500"
                  onClick={async () => {
                    if (!detailNotif.from_user_id) return;
                    setNotifProfileLoading(true);
                    try {
                      const profile = await getMemberProfileByIdAction(
                        detailNotif.from_user_id,
                      );
                      if (!profile) {
                        toast.error("無法載入對方資料");
                        return;
                      }
                      setNotifProfileUser(profile);
                    } finally {
                      setNotifProfileLoading(false);
                    }
                  }}
                >
                  {notifProfileLoading ? "載入中…" : "查看對方資料"}
                </Button>
              ) : null}
            </DialogFooter>
          </DialogContent>
        ) : null}
      </Dialog>

      {notifProfileUser ? (
        <UserDetailModal
          user={notifProfileUser}
          open
          onOpenChange={(open) => {
            if (!open) setNotifProfileUser(null);
          }}
        />
      ) : null}
    </div>
  );
}
