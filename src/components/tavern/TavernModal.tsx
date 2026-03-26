"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import useSWR from "swr";
import Avatar from "@/components/ui/Avatar";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useTavern } from "@/hooks/useTavern";
import {
  deleteTavernMessageAction,
  getMyTavernBanStatusAction,
  sendTavernMessageAction,
} from "@/services/tavern.action";
import type { TavernMessageDto } from "@/types/database.types";

const STICKERS = [
  "😂",
  "🥰",
  "😎",
  "🤔",
  "😭",
  "🥳",
  "😤",
  "🫡",
  "👍",
  "👎",
  "❤️",
  "💔",
  "🔥",
  "✨",
  "💪",
  "🎉",
  "🍺",
  "⚔️",
  "🐱",
  "🌙",
] as const;

function formatMsgTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("zh-TW", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function TavernModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { profile } = useMyProfile();
  const { messages, mutate } = useTavern();
  const { data: isBanned = false, mutate: mutateBan } = useSWR(
    open ? "tavern-my-ban" : null,
    () => getMyTavernBanStatusAction(),
    { revalidateOnFocus: false },
  );

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [stickersOpen, setStickersOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TavernMessageDto | null>(
    null,
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMaster = profile?.role === "master";
  const myId = profile?.id;

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, messages]);

  useEffect(() => {
    if (!open) {
      setInput("");
      setStickersOpen(false);
      setDeleteTarget(null);
    }
  }, [open]);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleSend = async (content: string, type: "text" | "emoji") => {
    const trimmed = content.trim();
    if (!trimmed || sending || isBanned) return;
    setSending(true);
    const result = await sendTavernMessageAction(trimmed, type);
    setSending(false);
    if (result.success) {
      setInput("");
      setStickersOpen(false);
      void mutate();
    } else {
      toast.error(result.error ?? "發送失敗");
      if (result.error?.includes("禁止")) {
        void mutateBan();
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTavernMessageAction(deleteTarget.id);
      toast.success("已刪除訊息");
      void mutate();
    } catch (e) {
      toast.error((e as Error).message ?? "刪除失敗");
    } finally {
      setDeleteTarget(null);
    }
  };

  const startLongPress = useCallback(
    (msg: TavernMessageDto) => {
      if (!isMaster) return;
      clearLongPress();
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        setDeleteTarget(msg);
      }, 550);
    },
    [isMaster, clearLongPress],
  );

  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[500] flex flex-col bg-zinc-950/95 backdrop-blur-xl pb-[calc(5rem+env(safe-area-inset-bottom,0px))]"
        aria-modal="true"
        role="dialog"
        aria-labelledby="tavern-modal-title"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-800/60 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
          <h2
            id="tavern-modal-title"
            className="text-base font-semibold text-zinc-100"
          >
            🍺 酒館廣場
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-lg text-zinc-400 transition-colors hover:bg-zinc-800/80 hover:text-zinc-100"
            aria-label="關閉"
          >
            ✕
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <div className="mx-auto flex max-w-lg flex-col gap-3">
            {messages.map((m) => {
              const mine = m.user_id === myId;
              return (
                <div
                  key={m.id}
                  className={`flex gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className="shrink-0">
                    <Avatar
                      src={m.user.avatar_url}
                      nickname={m.user.nickname}
                      size={32}
                    />
                  </div>
                  <div
                    className={`flex min-w-0 max-w-[85%] flex-col gap-0.5 ${mine ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 px-0.5">
                      <span className="text-xs text-zinc-400">
                        {m.user.nickname}
                      </span>
                      <span className="rounded-full bg-zinc-800/80 px-1.5 py-0 text-[10px] font-medium text-zinc-500">
                        Lv.{m.user.level}
                      </span>
                    </div>
                    <div
                      role={isMaster ? "button" : undefined}
                      tabIndex={isMaster ? 0 : undefined}
                      className={`touch-manipulation rounded-2xl bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 ${mine ? "rounded-br-md" : "rounded-bl-md"}`}
                      onPointerDown={() => startLongPress(m)}
                      onPointerUp={clearLongPress}
                      onPointerLeave={clearLongPress}
                      onPointerCancel={clearLongPress}
                      onContextMenu={(e) => {
                        if (!isMaster) return;
                        e.preventDefault();
                        setDeleteTarget(m);
                      }}
                      onKeyDown={(e) => {
                        if (!isMaster) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDeleteTarget(m);
                        }
                      }}
                    >
                      {m.content}
                    </div>
                    <span className="text-[10px] text-zinc-600">
                      {formatMsgTime(m.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-800/60 bg-zinc-950/90 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
          {stickersOpen && (
            <div className="mb-2 grid grid-cols-8 gap-1 rounded-xl bg-zinc-900/80 p-2">
              {STICKERS.map((em) => (
                <button
                  key={em}
                  type="button"
                  className="rounded-lg p-1.5 text-xl hover:bg-zinc-800 disabled:opacity-40"
                  disabled={isBanned || sending}
                  onClick={() => void handleSend(em, "emoji")}
                >
                  {em}
                </button>
              ))}
            </div>
          )}
          <div className="mx-auto flex max-w-lg items-end gap-2">
            <button
              type="button"
              className="shrink-0 rounded-xl bg-zinc-800/80 px-2 py-2 text-lg text-zinc-200 disabled:opacity-40"
              disabled={isBanned}
              onClick={() => setStickersOpen((v) => !v)}
              aria-label="貼圖"
            >
              😊
            </button>
            <div className="min-w-0 flex-1">
              {isBanned ? (
                <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-500">
                  你已被禁止發言
                </p>
              ) : (
                <>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value.slice(0, 50))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend(input, "text");
                      }
                    }}
                    placeholder="在酒館說點什麼..."
                    maxLength={50}
                    rows={1}
                    className="w-full resize-none rounded-2xl border border-zinc-700/80 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-600/50 focus:outline-none focus:ring-1 focus:ring-amber-600/30"
                  />
                  <p className="mt-0.5 text-right text-[10px] text-zinc-600">
                    {input.length}/50
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              disabled={isBanned || sending || !input.trim()}
              onClick={() => void handleSend(input, "text")}
              className="shrink-0 rounded-xl bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-40"
            >
              發送
            </button>
          </div>
        </div>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[520] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tavern-delete-title"
            className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl"
          >
            <h3
              id="tavern-delete-title"
              className="text-base font-semibold text-zinc-100"
            >
              刪除此訊息？
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              此操作無法復原，確定要刪除這則酒館訊息嗎？
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 py-2 text-sm font-medium text-zinc-200"
                onClick={() => setDeleteTarget(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-500"
                onClick={() => void confirmDelete()}
              >
                刪除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  );
}
