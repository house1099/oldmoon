"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Send } from "lucide-react";
import useSWR from "swr";
import Avatar from "@/components/ui/Avatar";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useTavern } from "@/hooks/useTavern";
import {
  deleteTavernMessageAction,
  getMyTavernBanStatusAction,
  sendTavernMessageAction,
} from "@/services/tavern.action";
import { getMemberProfileByIdAction } from "@/services/profile.action";
import type { TavernMessageDto } from "@/types/database.types";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import { UserDetailModal } from "@/components/modals/UserDetailModal";
import { cn } from "@/lib/utils";
import { getRoleDisplay } from "@/lib/utils/role-display";

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
  const [tavernProfileUser, setTavernProfileUser] = useState<UserRow | null>(
    null,
  );
  const [tavernProfileOpen, setTavernProfileOpen] = useState(false);
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
      setTavernProfileOpen(false);
      setTavernProfileUser(null);
    }
  }, [open]);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const openUserProfile = useCallback(
    async (userId: string) => {
      if (!userId || userId === myId) return;
      const data = await getMemberProfileByIdAction(userId);
      if (data) {
        setTavernProfileUser(data);
        setTavernProfileOpen(true);
      }
    },
    [myId],
  );

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
        className="fixed inset-0 z-[500] flex flex-col bg-zinc-950/95 backdrop-blur-xl"
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

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-2">
          <div className="mx-auto flex max-w-lg flex-col gap-3">
            {messages.map((m) => {
              const mine = m.user_id === myId;
              const msgRole = getRoleDisplay(m.user.role);
              const avatarEl = (
                <Avatar
                  src={m.user.avatar_url}
                  nickname={m.user.nickname}
                  size={32}
                />
              );

              if (mine) {
                return (
                  <div
                    key={m.id}
                    className="flex items-end gap-2 justify-end"
                  >
                    <div className="flex flex-col items-end">
                      <div
                        role={isMaster ? "button" : undefined}
                        tabIndex={isMaster ? 0 : undefined}
                        className="touch-manipulation bg-violet-700/80 text-white rounded-2xl rounded-tr-sm px-3 py-2 max-w-[70vw] text-sm"
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
                      <p className="text-[10px] text-zinc-600 mt-0.5 text-right">
                        {formatMsgTime(m.created_at)}
                      </p>
                    </div>
                    <div className="shrink-0">{avatarEl}</div>
                  </div>
                );
              }

              return (
                <div
                  key={m.id}
                  className="flex items-end gap-2 justify-start"
                >
                  <button
                    type="button"
                    className="shrink-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      void openUserProfile(m.user_id);
                    }}
                    aria-label={`查看 ${m.user.nickname} 的資料`}
                  >
                    {avatarEl}
                  </button>
                  <div>
                    <p className="text-xs text-zinc-400 mb-0.5 flex min-w-0 flex-wrap items-baseline gap-x-1">
                      {msgRole.crown ? (
                        <span className="shrink-0" aria-hidden>
                          {msgRole.crown}
                        </span>
                      ) : null}
                      <span
                        className={cn("min-w-0 truncate", msgRole.nameClass)}
                      >
                        {m.user.nickname}
                      </span>
                      <span className="shrink-0">· Lv.{m.user.level}</span>
                    </p>
                    <div
                      role={isMaster ? "button" : undefined}
                      tabIndex={isMaster ? 0 : undefined}
                      className="touch-manipulation bg-zinc-800/80 text-zinc-100 rounded-2xl rounded-tl-sm px-3 py-2 max-w-[70vw] text-sm"
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
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {formatMsgTime(m.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-zinc-800/50 bg-zinc-900/90 backdrop-blur-xl px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
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
          <p className="text-[10px] text-zinc-600 text-right mb-1">
            {input.length}/50
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="w-10 h-10 rounded-full bg-zinc-800/80 flex items-center justify-center text-lg flex-shrink-0 active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
              disabled={isBanned}
              onClick={() => setStickersOpen((v) => !v)}
              aria-label="貼圖"
            >
              😊
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 50))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSend(input, "text");
                }
              }}
              placeholder={
                isBanned
                  ? "你已被禁止在酒館發言"
                  : "在酒館說點什麼..."
              }
              maxLength={50}
              disabled={isBanned}
              className="flex-1 bg-zinc-800/60 border border-zinc-700/40 rounded-full px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50 transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              disabled={isBanned || sending || !input.trim()}
              onClick={() => void handleSend(input, "text")}
              className="w-10 h-10 rounded-full bg-amber-600 hover:bg-amber-500 active:scale-95 flex items-center justify-center flex-shrink-0 transition-all shadow-lg shadow-amber-900/30 disabled:opacity-40 disabled:active:scale-100"
              aria-label="發送"
            >
              <Send className="w-4 h-4 text-white" />
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

      {tavernProfileUser ? (
        <UserDetailModal
          user={tavernProfileUser}
          open={tavernProfileOpen}
          onOpenChange={(o) => {
            setTavernProfileOpen(o);
            if (!o) setTavernProfileUser(null);
          }}
        />
      ) : null}
    </>,
    document.body,
  );
}
