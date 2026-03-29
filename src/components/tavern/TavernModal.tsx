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
import { MasterAvatarShell } from "@/components/ui/MasterAvatarShell";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useTavern } from "@/hooks/useTavern";
import {
  banTavernUserAction,
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
  maxLength = 50,
}: {
  open: boolean;
  onClose: () => void;
  maxLength?: number;
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
  const [actionTarget, setActionTarget] = useState<TavernMessageDto | null>(
    null,
  );
  const [selectedBanHours, setSelectedBanHours] = useState<1 | 3 | 24 | null>(null);
  const [banReason, setBanReason] = useState("");
  const [tavernProfileUser, setTavernProfileUser] = useState<UserRow | null>(
    null,
  );
  const [tavernProfileOpen, setTavernProfileOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canModerate =
    profile?.role === "master" || profile?.role === "moderator";
  const myId = profile?.id;
  const isActionTargetMine = actionTarget?.user_id === myId;

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, messages]);

  useEffect(() => {
    if (!open) {
      setInput("");
      setStickersOpen(false);
      setActionTarget(null);
      setSelectedBanHours(null);
      setBanReason("");
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

  const handleDeleteMessage = async () => {
    if (!actionTarget) return;
    try {
      await deleteTavernMessageAction(actionTarget.id);
      toast.success("已刪除訊息");
      void mutate();
    } catch (e) {
      toast.error((e as Error).message ?? "刪除失敗");
    } finally {
      setActionTarget(null);
    }
  };

  const handleBanUser = async (hours: 1 | 3 | 24, reason: string) => {
    if (!actionTarget) return;
    try {
      await banTavernUserAction({
        userId: actionTarget.user_id,
        reason: reason.trim(),
        durationHours: hours,
      });
      toast.success(`已禁言 ${actionTarget.user.nickname} ${hours} 小時`);
      setActionTarget(null);
      setSelectedBanHours(null);
      setBanReason("");
      void mutate();
    } catch (e) {
      toast.error((e as Error).message ?? "禁言失敗");
    }
  };

  const startLongPress = useCallback(
    (msg: TavernMessageDto, mine: boolean) => {
      if (!mine && !canModerate) return;
      clearLongPress();
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        setActionTarget(msg);
      }, 550);
    },
    [canModerate, clearLongPress],
  );

  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-xl"
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
              const canOpenActionMenu = mine || canModerate;
              const msgRole = getRoleDisplay(m.user.role);
              const avatarEl = (
                <MasterAvatarShell
                  role={m.user.role}
                  src={m.user.avatar_url}
                  nickname={m.user.nickname}
                  size={36}
                  frameImageUrl={m.user.equippedAvatarFrameImageUrl}
                  frameEffectKey={m.user.equippedAvatarFrameEffectKey}
                  frameLayout={m.user.equippedAvatarFrameLayout ?? null}
                />
              );

              if (mine) {
                return (
                  <div
                    key={m.id}
                    className="flex items-start justify-end gap-2 overflow-visible"
                  >
                    <div className="flex min-w-0 flex-col items-end">
                      <div
                        role={canOpenActionMenu ? "button" : undefined}
                        tabIndex={canOpenActionMenu ? 0 : undefined}
                        className="touch-manipulation max-w-[70vw] rounded-2xl rounded-tr-sm bg-violet-700/80 px-3 py-2 text-sm text-white"
                        onPointerDown={() => startLongPress(m, mine)}
                        onPointerUp={clearLongPress}
                        onPointerLeave={clearLongPress}
                        onPointerCancel={clearLongPress}
                        onContextMenu={(e) => {
                          if (!canOpenActionMenu) return;
                          e.preventDefault();
                          setActionTarget(m);
                        }}
                        onKeyDown={(e) => {
                          if (!canOpenActionMenu) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setActionTarget(m);
                          }
                        }}
                      >
                        {m.content}
                      </div>
                      <span className="mt-0.5 text-right text-[10px] text-zinc-600">
                        {formatMsgTime(m.created_at)}
                      </span>
                    </div>
                    <div className="shrink-0 overflow-visible">{avatarEl}</div>
                  </div>
                );
              }

              return (
                <div
                  key={m.id}
                  className="flex items-start justify-start gap-2 overflow-visible"
                >
                  <button
                    type="button"
                    className="shrink-0 cursor-pointer overflow-visible rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      void openUserProfile(m.user_id);
                    }}
                    aria-label={`查看 ${m.user.nickname} 的資料`}
                  >
                    {avatarEl}
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="mb-0.5 flex min-w-0 items-center gap-1 text-xs text-zinc-400">
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
                    </span>
                    <div
                      role={canOpenActionMenu ? "button" : undefined}
                      tabIndex={canOpenActionMenu ? 0 : undefined}
                      className="touch-manipulation max-w-[70vw] rounded-2xl rounded-tl-sm bg-zinc-800/80 px-3 py-2 text-sm text-zinc-100"
                      onPointerDown={() => startLongPress(m, mine)}
                      onPointerUp={clearLongPress}
                      onPointerLeave={clearLongPress}
                      onPointerCancel={clearLongPress}
                      onContextMenu={(e) => {
                        if (!canOpenActionMenu) return;
                        e.preventDefault();
                        setActionTarget(m);
                      }}
                      onKeyDown={(e) => {
                        if (!canOpenActionMenu) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActionTarget(m);
                        }
                      }}
                    >
                      {m.content}
                    </div>
                    <span className="mt-0.5 text-[10px] text-zinc-600">
                      {formatMsgTime(m.created_at)}
                    </span>
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
            {input.length}/{maxLength}
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
              onChange={(e) => setInput(e.target.value.slice(0, maxLength))}
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
              maxLength={maxLength}
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

      {actionTarget ? (
        <div className="fixed inset-0 z-[52] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="flex flex-col gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 p-3">
            <p className="mb-1 text-xs text-zinc-400">
              {isActionTargetMine
                ? "訊息操作"
                : `管理 ${actionTarget.user.nickname}`}
            </p>
            {!isActionTargetMine ? (
              <>
                {[1, 3, 24].map((hours) => (
                  <button
                    type="button"
                    key={hours}
                    onClick={() => setSelectedBanHours(hours as 1 | 3 | 24)}
                    className="py-1.5 text-left text-sm text-amber-400 transition-colors hover:text-amber-300"
                  >
                    🔇 禁言 {hours} 小時
                  </button>
                ))}
                {selectedBanHours ? (
                  <div className="space-y-2 rounded-xl border border-zinc-700/70 bg-zinc-800/60 p-3">
                    <input
                      type="text"
                      placeholder="禁言原因（必填）"
                      value={banReason}
                      onChange={(e) => setBanReason(e.target.value)}
                      className="w-full rounded-xl bg-zinc-800 px-3 py-2 text-sm text-zinc-200"
                    />
                    <button
                      type="button"
                      onClick={() => void handleBanUser(selectedBanHours, banReason)}
                      disabled={!banReason.trim()}
                      className="w-full rounded-xl bg-amber-600 py-2 text-sm text-white disabled:opacity-40"
                    >
                      確認禁言 {selectedBanHours} 小時
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}
            <button
              type="button"
              onClick={() => void handleDeleteMessage()}
              className="mt-1 border-t border-zinc-700/50 pt-2 py-1.5 text-left text-sm text-red-400 transition-colors hover:text-red-300"
            >
              🗑️ 刪除這則訊息
            </button>
            <button
              type="button"
              onClick={() => {
                setActionTarget(null);
                setSelectedBanHours(null);
                setBanReason("");
              }}
              className="pt-1 text-center text-xs text-zinc-500 hover:text-zinc-400"
            >
              取消
            </button>
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
