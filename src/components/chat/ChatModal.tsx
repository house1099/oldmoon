"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import useSWR from "swr";
import { useSWRConfig } from "swr";
import { useMessages } from "@/hooks/useChat";
import { useMyProfile } from "@/hooks/useMyProfile";
import { sendMessageAction, submitReportAction } from "@/services/chat.action";
import { getMemberProfileByIdAction } from "@/services/profile.action";
import { getMyRewardsAction } from "@/services/rewards.action";
import { MasterAvatarShell } from "@/components/ui/MasterAvatarShell";
import { TitleBadgeRow } from "@/components/ui/title-badge-row";
import { createClient } from "@/lib/supabase/client";
import { SWR_KEYS } from "@/lib/swr/keys";
import { cn } from "@/lib/utils";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import type { ShopFrameLayout } from "@/lib/utils/avatar-frame-layout";

const UserDetailModal = dynamic(
  () =>
    import("@/components/modals/UserDetailModal").then((m) => m.UserDetailModal),
  { ssr: false },
);

export interface ChatModalProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  targetUser: {
    id: string;
    nickname: string;
    avatar_url?: string | null;
    role?: string | null;
    equippedTitle?: string | null;
    equippedTitleImageUrl?: string | null;
    equippedAvatarFrameEffectKey?: string | null;
    equippedAvatarFrameImageUrl?: string | null;
    equippedAvatarFrameLayout?: ShopFrameLayout | null;
  };
  currentUserId: string;
  /**
   * 主聊天層 z-index，預設 700。從 UserDetailModal（z-800+）內開啟時請傳 900，底層遮罩為 zIndex−10。
   */
  zIndex?: number;
}

export default function ChatModal({
  open,
  onClose,
  conversationId,
  targetUser,
  currentUserId,
  zIndex: zIndexProp = 700,
}: ChatModalProps) {
  const { mutate: globalMutate } = useSWRConfig();
  const { messages, mutate, isLoading } = useMessages(
    open ? conversationId : null,
  );
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [peekUser, setPeekUser] = useState<UserRow | null>(null);
  const [avatarLoadingId, setAvatarLoadingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { profile: myProfile } = useMyProfile();
  const { data: myRewards } = useSWR(
    open ? ["chat-modal-my-rewards", currentUserId] : null,
    () => getMyRewardsAction(),
    { revalidateOnFocus: false },
  );
  const myEquippedAvatar = myRewards?.avatarFrames.find((f) => f.is_equipped);

  /**
   * iOS Safari 會掃描整份文件中所有 input／textarea，在鍵盤上方顯示「上一個／下一個／完成」列。
   * 聊天開啟時將 body 下其餘子樹標為 inert，使背景欄位不參與該導覽（須搭配 portal 掛在 body）。
   */
  useLayoutEffect(() => {
    if (!open) return;
    const body = document.body;
    const marked: { el: Element; hadInert: boolean }[] = [];
    for (let i = 0; i < body.children.length; i++) {
      const el = body.children[i];
      if (!(el instanceof HTMLElement)) continue;
      if (el.dataset.chatPortal === "1") continue;
      if (el.hasAttribute("data-no-chat-inert")) continue;
      if (el.querySelector("[data-no-chat-inert]")) continue;
      marked.push({ el, hadInert: el.hasAttribute("inert") });
      el.setAttribute("inert", "");
    }
    return () => {
      for (const { el, hadInert } of marked) {
        if (hadInert) continue;
        el.removeAttribute("inert");
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open || !conversationId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void mutate();
          void globalMutate(SWR_KEYS.conversations);
          void globalMutate(SWR_KEYS.unreadChatConversations);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, conversationId, mutate, globalMutate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!open || !conversationId || isLoading) {
      return;
    }
    void globalMutate(SWR_KEYS.conversations);
    void globalMutate(SWR_KEYS.unreadChatConversations);
  }, [open, conversationId, isLoading, globalMutate]);

  async function handlePeerAvatarClick(senderId: string) {
    if (!senderId || senderId === currentUserId || avatarLoadingId) return;
    setAvatarLoadingId(senderId);
    try {
      const data = await getMemberProfileByIdAction(senderId);
      if (data) {
        setPeekUser(data);
      } else {
        toast.error("無法載入用戶資料");
      }
    } finally {
      setAvatarLoadingId(null);
    }
  }

  async function handleSend() {
    if (!input.trim() || sending) return;
    setSending(true);
    const result = await sendMessageAction(conversationId, input.trim());
    if (result.ok) {
      setInput("");
      void mutate();
      void globalMutate(SWR_KEYS.conversations);
      void globalMutate(SWR_KEYS.unreadChatConversations);
    } else {
      toast.error(result.error ?? "❌ 操作失敗，請稍後再試");
    }
    setSending(false);
  }

  if (!open || typeof document === "undefined") return null;

  const rootZ = zIndexProp;
  const useUnderlay = rootZ > 700;
  const reportZ = rootZ + 20;

  /** 預設 z-700；自訂時 overlay zIndex−10、面板 zIndex，須蓋過 UserDetailModal（z-800+）。Portal 至 body 配合 inert 隔離背景表單（iOS 鍵盤導覽列） */
  const mainChat = (
    <div
      className={
        useUnderlay
          ? "fixed inset-0 flex flex-col bg-zinc-950"
          : "fixed inset-0 z-[700] flex flex-col bg-zinc-950"
      }
      data-chat-portal="1"
      style={useUnderlay ? { zIndex: rootZ } : undefined}
    >
      <div
        className="flex items-center gap-3 overflow-visible border-b border-white/10 bg-zinc-950/90 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-zinc-400 transition-colors hover:text-white"
          aria-label="返回"
        >
          ←
        </button>
        <MasterAvatarShell
          role={targetUser.role}
          src={targetUser.avatar_url}
          nickname={targetUser.nickname}
          size={36}
          frameImageUrl={targetUser.equippedAvatarFrameImageUrl ?? null}
          frameEffectKey={targetUser.equippedAvatarFrameEffectKey ?? null}
          frameLayout={targetUser.equippedAvatarFrameLayout ?? null}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-medium text-white">
            {targetUser.nickname}
          </span>
          <TitleBadgeRow
            title={targetUser.equippedTitle}
            imageUrl={targetUser.equippedTitleImageUrl}
            className="min-w-0 self-start"
          />
        </span>
        <button
          type="button"
          onClick={() => setShowReport(true)}
          className="px-3 py-1 text-sm text-zinc-500 transition-colors hover:text-rose-400"
        >
          檢舉
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          const bubble = (
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                isMe
                  ? "rounded-br-sm bg-violet-600 text-white"
                  : "rounded-bl-sm bg-zinc-800 text-white"
              }`}
            >
              {msg.content}
              <div
                className={`mt-1 text-[10px] ${
                  isMe ? "text-violet-300" : "text-zinc-500"
                }`}
              >
                {new Date(msg.created_at).toLocaleTimeString("zh-TW", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          );

          if (isMe) {
            return (
              <div
                key={msg.id}
                className="flex items-end justify-end gap-2"
              >
                {bubble}
                <div className="shrink-0 overflow-visible" aria-hidden>
                  <MasterAvatarShell
                    role={myProfile?.role}
                    src={myProfile?.avatar_url}
                    nickname={myProfile?.nickname ?? "我"}
                    size={36}
                    frameImageUrl={myEquippedAvatar?.image_url ?? null}
                    frameEffectKey={myEquippedAvatar?.effect_key ?? null}
                    frameLayout={myEquippedAvatar?.frame_layout ?? null}
                  />
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className="flex items-end justify-start gap-2"
            >
              <button
                type="button"
                onClick={() => void handlePeerAvatarClick(msg.sender_id)}
                className={cn(
                  "shrink-0 cursor-pointer overflow-visible rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50",
                  avatarLoadingId !== null && "pointer-events-none",
                  avatarLoadingId === msg.sender_id && "opacity-60",
                )}
                aria-label={`查看 ${targetUser.nickname} 的資料`}
              >
                <MasterAvatarShell
                  role={targetUser.role}
                  src={targetUser.avatar_url}
                  nickname={targetUser.nickname}
                  size={36}
                  frameImageUrl={targetUser.equippedAvatarFrameImageUrl ?? null}
                  frameEffectKey={targetUser.equippedAvatarFrameEffectKey ?? null}
                  frameLayout={targetUser.equippedAvatarFrameLayout ?? null}
                />
              </button>
              {bubble}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div
        className="border-t border-white/10 bg-zinc-950/90 px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
      >
        <form
          className="flex items-end gap-2"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            placeholder="輸入訊息..."
            maxLength={500}
            rows={1}
            enterKeyHint="send"
            inputMode="text"
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
            spellCheck={false}
            className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-full border border-white/10 bg-zinc-800/60 px-4 py-3 text-base leading-snug text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-violet-600 transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-40"
            aria-label="送出"
          >
            {sending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <span className="text-sm text-white">→</span>
            )}
          </button>
        </form>
      </div>

      {showReport ? (
        <div
          className="fixed inset-0 flex items-end"
          style={{ zIndex: reportZ }}
        >
          <div
            role="presentation"
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowReport(false)}
          />
          <div className="relative w-full space-y-3 rounded-t-3xl border-t border-white/10 bg-zinc-900 p-6">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-zinc-700" />
            <p className="text-center font-medium text-white">檢舉原因</p>
            {[
              { value: "scam", label: "🚫 詐騙" },
              { value: "sexual", label: "🔞 色情內容" },
              { value: "harassment", label: "😡 騷擾" },
              { value: "spam", label: "📢 垃圾訊息" },
              { value: "other", label: "⚠️ 其他" },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReportReason(r.value)}
                className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition-all ${
                  reportReason === r.value
                    ? "border-rose-500/40 bg-rose-600/20 text-rose-300"
                    : "border-white/10 bg-zinc-800/60 text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
            <button
              type="button"
              onClick={async () => {
                if (!reportReason) return;
                const res = await submitReportAction({
                  reportedUserId: targetUser.id,
                  conversationId,
                  reason: reportReason,
                });
                if (!res.ok) {
                  toast.error(res.error ?? "❌ 操作失敗，請稍後再試");
                  return;
                }
                toast.success("已送出檢舉並封鎖對方");
                setShowReport(false);
                onClose();
              }}
              disabled={!reportReason}
              className="mt-2 w-full rounded-full bg-rose-600 py-4 text-sm font-medium text-white transition-all active:scale-95 disabled:opacity-40"
            >
              確認檢舉並封鎖
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  return createPortal(
    <>
      {useUnderlay ? (
        <div
          className="fixed inset-0 bg-zinc-950"
          data-chat-portal="1"
          style={{ zIndex: rootZ - 10 }}
          aria-hidden
        />
      ) : null}
      {mainChat}

      {peekUser ? (
        <UserDetailModal
          user={peekUser}
          open
          onOpenChange={(o) => {
            if (!o) setPeekUser(null);
          }}
          stackAboveChatZ={useUnderlay ? rootZ : undefined}
        />
      ) : null}
    </>,
    document.body,
  );
}
