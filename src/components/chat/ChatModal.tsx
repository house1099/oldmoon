"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useMessages } from "@/hooks/useChat";
import { sendMessageAction, submitReportAction } from "@/services/chat.action";
import Avatar from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";

export interface ChatModalProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  targetUser: {
    id: string;
    nickname: string;
    avatar_url?: string | null;
  };
  currentUserId: string;
}

export default function ChatModal({
  open,
  onClose,
  conversationId,
  targetUser,
  currentUserId,
}: ChatModalProps) {
  const { messages, mutate } = useMessages(open ? conversationId : null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

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
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, conversationId, mutate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    setSending(true);
    const result = await sendMessageAction(conversationId, input.trim());
    if (result.ok) {
      setInput("");
      void mutate();
    } else {
      toast.error(result.error ?? "❌ 操作失敗，請稍後再試");
    }
    setSending(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950">
      <div
        className="flex items-center gap-3 border-b border-white/10 bg-zinc-950/90 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-zinc-400 transition-colors hover:text-white"
          aria-label="返回"
        >
          ←
        </button>
        <Avatar
          src={targetUser.avatar_url}
          nickname={targetUser.nickname}
          size={36}
        />
        <span className="flex-1 font-medium text-white">
          {targetUser.nickname}
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
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
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
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div
        className="border-t border-white/10 bg-zinc-950/90 px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
      >
        <div className="flex items-end gap-2">
          <input
            type="text"
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
            className="flex-1 rounded-full border border-white/10 bg-zinc-800/60 px-4 py-3 text-base text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
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
        </div>
      </div>

      {showReport ? (
        <div className="fixed inset-0 z-[110] flex items-end">
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
}
