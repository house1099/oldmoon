"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Sparkles, UserRound } from "lucide-react";
import {
  GENDER_OPTIONS,
  INTEREST_TAG_OPTIONS,
  LEGACY_REGION_MAP,
  REGION_OPTIONS,
  resolveLegacyLabel,
  resolveOfflineOkLabel,
} from "@/lib/constants/adventurer-questionnaire";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import {
  requestAllianceAction,
  respondAllianceAction,
  dissolveAllianceAction,
} from "@/services/alliance.action";
import {
  type ModalSocialStatus,
  getModalSocialStatusAction,
  toggleLikeAction,
} from "@/services/social.action";
import { getOrCreateConversationAction } from "@/services/chat.action";
import ChatModal from "@/components/chat/ChatModal";
import LoadingButton from "@/components/ui/LoadingButton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import Avatar from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { instagramProfileUrlFromHandle } from "@/lib/utils/instagram";
import { useSWRConfig } from "swr";
import { SWR_KEYS } from "@/lib/swr/keys";
import { useMyProfile } from "@/hooks/useMyProfile";
import LeaderToolsSheet from "@/components/modals/LeaderToolsSheet";

function tagLabel(slug: string): string {
  return INTEREST_TAG_OPTIONS.find((o) => o.value === slug)?.label ?? slug;
}

function isRecentlyActive(lastSeen: string | null, withinMs: number): boolean {
  if (!lastSeen) return false;
  const t = new Date(lastSeen).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < withinMs;
}

export type UserDetailModalProps = {
  user: UserRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UserDetailModal({
  user,
  open,
  onOpenChange,
}: UserDetailModalProps) {
  const { mutate: globalMutate } = useSWRConfig();
  const { profile: myProfile } = useMyProfile();
  const [showLeaderTools, setShowLeaderTools] = useState(false);
  const [socialStatus, setSocialStatus] = useState<ModalSocialStatus>({
    isLiked: false,
    isLikedByThem: false,
    isMutualLike: false,
    allianceStatus: "none",
    allianceId: null,
    currentUserId: null,
  });
  const [socialLoading, setSocialLoading] = useState(true);
  const [likePending, setLikePending] = useState(false);
  const [allianceRequesting, setAllianceRequesting] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatOpening, setChatOpening] = useState(false);
  useEffect(() => {
    if (!open) {
      setShowChat(false);
      setConversationId(null);
      return;
    }
    setSocialLoading(true);
    let cancelled = false;
    void getModalSocialStatusAction(user.id).then((status) => {
      if (cancelled) return;
      setSocialStatus(status);
      setSocialLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, user.id]);

  const isTargetMoodActive = user.mood_at
    ? Date.now() - new Date(user.mood_at).getTime() < 24 * 60 * 60 * 1000
    : false;

  const {
    isLiked,
    isMutualLike,
    allianceStatus,
    allianceId,
  } = socialStatus;

  const showInstagram =
    Boolean(user.instagram_handle?.trim()) &&
    (user.ig_public === true || allianceStatus === "accepted");

  const active = isRecentlyActive(user.last_seen_at, 15 * 60 * 1000);
  const genderLabel = resolveLegacyLabel(user.gender, GENDER_OPTIONS);
  const regionLabel = resolveLegacyLabel(
    user.region,
    REGION_OPTIONS,
    LEGACY_REGION_MAP,
  );
  const offlineLabel = resolveOfflineOkLabel(user.offline_ok);

  function applyToggleToasts(
    liked: boolean,
    isMatch: boolean,
  ) {
    if (isMatch) {
      toast.success("🎉 互有緣分！", {
        description:
          "你與對方都按下了有緣分 — 星光交織，命運在此刻對齊 ✦",
        duration: 6500,
        className:
          "border border-amber-400/40 bg-gradient-to-br from-violet-950 via-slate-950 to-amber-950/90 text-amber-50 shadow-xl shadow-amber-900/20",
      });
      return;
    }
    if (liked) {
      toast.success("💖 緣分已送出！");
    } else {
      toast.success("緣分已取消");
    }
  }

  async function handleToggleLike() {
    if (socialLoading || likePending) return;
    if (isLiked) {
      setShowCancelSheet(true);
      return;
    }
    setLikePending(true);
    try {
      const result = await toggleLikeAction(user.id);
      if (!result.success) {
        toast.error("❌ 操作失敗，請稍後再試");
        return;
      }
      const updated = await getModalSocialStatusAction(user.id);
      setSocialStatus(updated);
      applyToggleToasts(result.liked, result.isMatch);
    } finally {
      setLikePending(false);
    }
  }

  async function confirmCancelLike() {
    setLikePending(true);
    try {
      const result = await toggleLikeAction(user.id);
      if (!result.success) {
        toast.error("❌ 操作失敗，請稍後再試");
        return;
      }
      const updated = await getModalSocialStatusAction(user.id);
      setSocialStatus(updated);
      applyToggleToasts(result.liked, result.isMatch);
    } finally {
      setLikePending(false);
    }
  }

  async function handleRequestAlliance() {
    if (allianceRequesting) return;
    setAllianceRequesting(true);
    try {
      const r = await requestAllianceAction(user.id);
      if (r.ok) {
        const updated = await getModalSocialStatusAction(user.id);
        setSocialStatus(updated);
        toast.success("⚔️ 血盟申請已送出");
      } else {
        toast.error(r.error ?? "申請失敗");
      }
    } finally {
      setAllianceRequesting(false);
    }
  }

  async function handleRespondAlliance(action: "accepted" | "dissolved") {
    if (!allianceId) return;
    const res = await respondAllianceAction(allianceId, action);
    if (!res.ok) {
      toast.error(res.error ?? "操作失敗");
      return;
    }
    const updated = await getModalSocialStatusAction(user.id);
    setSocialStatus(updated);
    if (action === "accepted") {
      toast.success("⚔️ 血盟成立！");
    }
  }

  async function handleDissolveAlliance() {
    const res = await dissolveAllianceAction(user.id);
    if (!res.ok) {
      toast.error(res.error ?? "解除失敗");
      return;
    }
    const updated = await getModalSocialStatusAction(user.id);
    setSocialStatus(updated);
    toast("血盟已解除");
  }

  async function handleOpenChat() {
    if (chatOpening) return;
    setChatOpening(true);
    try {
      const result = await getOrCreateConversationAction(user.id);
      if (result.ok && result.conversation) {
        setConversationId(result.conversation.id);
        setShowChat(true);
      } else {
        toast.error(result.error ?? "無法開啟對話");
      }
    } finally {
      setChatOpening(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton
          overlayClassName="z-[600]"
          className="z-[610] max-w-[calc(100%-2rem)] gap-0 overflow-hidden border border-amber-900/45 bg-zinc-950 p-0 text-slate-200 sm:max-w-md"
        >
          <DialogHeader className="relative border-b border-amber-900/35 bg-zinc-950/95 px-4 pb-4 pt-5">
            <div className="flex gap-4 pr-8">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-zinc-800 bg-slate-900/90">
                <Avatar
                  src={user.avatar_url}
                  nickname={user.nickname}
                  size={80}
                  className="bg-slate-900"
                />
                <span
                  className={cn(
                    "absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-950",
                    active
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]"
                      : "bg-slate-600",
                  )}
                  title={active ? "近期活躍" : "離線或未更新活躍狀態"}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <DialogTitle className="font-serif text-lg font-semibold tracking-tight text-amber-50/95">
                  {user.nickname}
                </DialogTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 rounded-md border border-amber-600/50 bg-amber-950/55 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-amber-100/95"
                    title="等級"
                  >
                    <Sparkles className="h-3 w-3 text-amber-300/90" />
                    Lv.{user.level}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {active ? "活躍中" : "未上線或較少活動"}
                  </span>
                </div>
                <dl className="space-y-1 text-xs text-slate-300/95">
                  <div className="flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 shrink-0 text-violet-400/90" />
                    <dt className="sr-only">性別</dt>
                    <dd>{genderLabel}</dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-violet-400/90" />
                    <dt className="sr-only">地區</dt>
                    <dd className="truncate">{regionLabel}</dd>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <dt className="sr-only">線下意願</dt>
                    <dd className="text-slate-400/90">{offlineLabel}</dd>
                  </div>
                </dl>
                {user.mood?.trim() && isTargetMoodActive ? (
                  <div className="bg-violet-950/40 border border-violet-500/20 rounded-xl px-3 py-2 mt-2">
                    <p className="text-xs text-violet-300 mb-0.5">✨ 今日心情</p>
                    <p className="text-sm text-zinc-200">{user.mood}</p>
                  </div>
                ) : null}
                {user.activity_status === "resting" ? (
                  <div className="bg-amber-950/40 border border-amber-500/20 rounded-xl px-3 py-2 mt-2">
                    <p className="text-xs text-amber-300">
                      💤 此冒險者正在休息中
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[min(52vh,420px)] space-y-4 overflow-y-auto px-4 py-4">
            <div className="mx-auto w-full max-w-[min(100%,22rem)] space-y-4 sm:max-w-full">
              <div className="space-y-3">
                {user.bio_village?.trim() ? (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-400">興趣自白</p>
                    <p className="text-sm leading-relaxed text-white">
                      {user.bio_village}
                    </p>
                  </div>
                ) : null}
                {user.bio_market?.trim() ? (
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-400">技能自白</p>
                    <p className="text-sm leading-relaxed text-white">
                      {user.bio_market}
                    </p>
                  </div>
                ) : null}
                {!user.bio_village?.trim() && !user.bio_market?.trim() ? (
                  <p className="text-xs text-zinc-500">
                    這位冒險者尚未留下自白。
                  </p>
                ) : null}
              </div>

              <Separator className="bg-amber-900/35" />

              <div className="space-y-3">
                {user.interests && user.interests.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-violet-400">
                      興趣村莊
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {user.interests.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-violet-500/40 bg-violet-500/20 px-3 py-1 text-xs text-violet-200"
                        >
                          {tagLabel(tag)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(user.skills_offer?.length ?? 0) > 0 ||
                (user.skills_want?.length ?? 0) > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-amber-400">
                      技能市集
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {user.skills_offer?.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 text-xs text-amber-200"
                        >
                          {tag}
                        </span>
                      ))}
                      {user.skills_want?.map((tag) => (
                        <span
                          key={`want-${tag}`}
                          className="rounded-full border border-sky-500/40 bg-sky-500/20 px-3 py-1 text-xs text-sky-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-3 border-t border-amber-900/35 bg-zinc-950 px-6 pb-8 pt-4">
            <div className="flex w-full max-w-[min(100%,22rem)] flex-row items-center justify-center gap-4 sm:max-w-full">
              <button
                type="button"
                disabled={chatOpening}
                onClick={() => void handleOpenChat()}
                className="flex h-11 min-h-[2.75rem] min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-white/10 py-3 text-sm text-white transition-all hover:bg-white/20 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
              >
                {chatOpening ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    開啟中…
                  </span>
                ) : (
                  "💬 聊聊"
                )}
              </button>
              <LoadingButton
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-medium transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-60",
                  isLiked
                    ? "bg-rose-500/80 text-white"
                    : "bg-white/10 text-white hover:bg-white/20",
                )}
                loading={socialLoading || likePending}
                loadingText="處理中…"
                disabled={socialLoading}
                onClick={handleToggleLike}
                aria-label={isLiked ? "已送出緣分，點擊可收回" : "送出緣分"}
              >
                {isLiked ? "💖 已送出緣分" : "🤍 送出緣分"}
              </LoadingButton>
            </div>

            {isMutualLike ? (
              <div className="mt-1 w-full max-w-[min(100%,22rem)] sm:max-w-full">
                {socialLoading ? (
                  <div className="h-10 animate-pulse rounded-full bg-zinc-800/50" />
                ) : allianceStatus === "none" ? (
                  <button
                    type="button"
                    onClick={() => void handleRequestAlliance()}
                    disabled={allianceRequesting}
                    className="w-full rounded-full border border-amber-500/40 py-3 text-sm text-amber-300 transition-all hover:bg-amber-500/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {allianceRequesting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" />
                        處理中…
                      </span>
                    ) : (
                      "⚔️ 申請血盟"
                    )}
                  </button>
                ) : allianceStatus === "pending_sent" ? (
                  <div className="w-full rounded-full bg-zinc-800/50 py-3 text-center text-sm text-zinc-500">
                    ⏳ 血盟申請已送出
                  </div>
                ) : allianceStatus === "pending_received" ? (
                  <button
                    type="button"
                    onClick={() => void handleRespondAlliance("accepted")}
                    className="w-full rounded-full bg-amber-600 py-3 text-sm font-medium text-white transition-all hover:bg-amber-500 active:scale-95"
                  >
                    ⚔️ 確認血盟申請
                  </button>
                ) : allianceStatus === "accepted" ? (
                  <div className="flex items-center justify-between rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2.5">
                    <span className="text-xs font-medium text-amber-400">
                      ⚔️ 血盟夥伴
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDissolveAlliance()}
                      className="text-xs text-zinc-600 transition-colors hover:text-rose-400"
                    >
                      解除
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {showInstagram && user.instagram_handle
              ? (() => {
                  const igUrl = instagramProfileUrlFromHandle(
                    user.instagram_handle,
                  );
                  const display = user.instagram_handle
                    .trim()
                    .replace(/^@+/, "");
                  return (
                    <div className="flex w-full max-w-[min(100%,22rem)] flex-col gap-2 px-1 sm:max-w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">Instagram</span>
                        <span className="text-sm font-medium text-white">
                          @{display}
                        </span>
                      </div>
                      {igUrl ? (
                        <a
                          href={igUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full rounded-full border border-violet-500/40 bg-violet-600/20 py-2.5 text-center text-sm font-medium text-violet-200 transition-colors hover:bg-violet-600/35"
                        >
                          在 Instagram 開啟
                        </a>
                      ) : null}
                    </div>
                  );
                })()
              : null}

            {myProfile?.role === "master" && (
              <>
                <Separator className="bg-amber-900/35" />
                <div className="flex w-full max-w-[min(100%,22rem)] flex-col gap-2 sm:max-w-full">
                  <p className="text-center text-xs text-zinc-400">
                    信譽分{" "}
                    <span className="font-semibold text-zinc-200">
                      {user.reputation_score ?? 100}
                    </span>
                    {(user.reputation_score ?? 100) < 30 ? (
                      <span className="text-xs text-red-400 ml-1">
                        ⚠️ 建議封鎖
                      </span>
                    ) : null}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowLeaderTools(true)}
                    className="w-full rounded-full border border-amber-500/30 bg-amber-600/10 py-2.5 text-center text-sm font-medium text-amber-300 transition-colors hover:bg-amber-600/20"
                  >
                    ⚡ 領袖工具
                  </button>
                </div>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showCancelSheet && (
        <div
          className="fixed inset-0 z-[615]"
          onClick={() => setShowCancelSheet(false)}
        >
          <div className="absolute inset-0 bg-black/60" />

          <div
            className="absolute bottom-0 left-0 right-0 space-y-3 rounded-t-3xl border-t border-white/10 bg-zinc-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" />

            <p className="text-center font-medium text-white">
              確定取消緣分？
            </p>
            <p className="text-center text-sm text-zinc-400">
              取消後對方將不再收到你的緣分通知
            </p>

            <button
              type="button"
              disabled={likePending}
              onClick={async () => {
                await confirmCancelLike();
                setShowCancelSheet(false);
              }}
              className="w-full rounded-full bg-rose-600 py-4 text-sm font-medium text-white transition-all hover:bg-rose-500 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
            >
              {likePending ? "處理中…" : "確定取消"}
            </button>

            <button
              type="button"
              onClick={() => setShowCancelSheet(false)}
              className="w-full rounded-full bg-zinc-800 py-4 text-sm font-medium text-zinc-300 transition-all hover:bg-zinc-700 active:scale-95"
            >
              再想想
            </button>
          </div>
        </div>
      )}

      {showChat && conversationId ? (
        <ChatModal
          open={showChat}
          onClose={() => {
            setShowChat(false);
            void globalMutate(SWR_KEYS.conversations);
            void globalMutate(SWR_KEYS.unreadChatConversations);
          }}
          conversationId={conversationId}
          targetUser={{
            id: user.id,
            nickname: user.nickname,
            avatar_url: user.avatar_url,
          }}
          currentUserId={socialStatus.currentUserId ?? ""}
        />
      ) : null}

      {showLeaderTools && (
        <LeaderToolsSheet
          open={showLeaderTools}
          onClose={() => setShowLeaderTools(false)}
          targetUserId={user.id}
          targetNickname={user.nickname}
          currentUserId={socialStatus.currentUserId ?? ""}
          onBanSuccess={() => onOpenChange(false)}
        />
      )}
    </>
  );
}
