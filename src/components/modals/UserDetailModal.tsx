"use client";

import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  MapPin,
  MessageCircle,
  User,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  GENDER_OPTIONS,
  INTEREST_TAG_OPTIONS,
  LEGACY_REGION_MAP,
  REGION_OPTIONS,
  resolveLegacyLabel,
  resolveOfflineOkLabel,
} from "@/lib/constants/adventurer-questionnaire";
import { LEVEL_TIERS } from "@/lib/constants/levels";
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import Avatar from "@/components/ui/Avatar";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { cn } from "@/lib/utils";
import { getRoleDisplay } from "@/lib/utils/role-display";
import { instagramProfileUrlFromHandle } from "@/lib/utils/instagram";
import { useSWRConfig } from "swr";
import { SWR_KEYS } from "@/lib/swr/keys";
import { useMyProfile } from "@/hooks/useMyProfile";
import LeaderToolsSheet from "@/components/modals/LeaderToolsSheet";

function tagLabel(slug: string): string {
  return INTEREST_TAG_OPTIONS.find((o) => o.value === slug)?.label ?? slug;
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

  const isMoodActive = user.mood_at
    ? Date.now() - new Date(user.mood_at).getTime() < 24 * 60 * 60 * 1000
    : false;

  const { isLiked, isMutualLike, allianceStatus, allianceId } = socialStatus;

  const showInstagram =
    Boolean(user.instagram_handle?.trim()) &&
    (user.ig_public === true || allianceStatus === "accepted");

  const genderLabel = resolveLegacyLabel(user.gender, GENDER_OPTIONS);
  const regionLabel = resolveLegacyLabel(
    user.region,
    REGION_OPTIONS,
    LEGACY_REGION_MAP,
  );
  const offlineLabel = resolveOfflineOkLabel(user.offline_ok);
  const { crown: roleCrown, nameClass: roleNameClass } = getRoleDisplay(
    user.role,
  );

  const levelIdx = Math.min(
    Math.max(user.level, 1),
    LEVEL_TIERS.length,
  );
  const levelTitle = LEVEL_TIERS[levelIdx - 1]?.title ?? "見習冒險者";

  const isCurrentUserMaster = myProfile?.role === "master";

  const likeLoading = likePending;

  function openInstagram() {
    const igUrl = instagramProfileUrlFromHandle(user.instagram_handle ?? "");
    if (igUrl) {
      window.open(igUrl, "_blank", "noopener,noreferrer");
    }
  }

  function openLeaderTools() {
    setShowLeaderTools(true);
  }

  function applyToggleToasts(liked: boolean, isMatch: boolean) {
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

  async function handleChat() {
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

  let allianceButton: ReactNode = null;
  if (isMutualLike) {
    allianceButton = (
      <div className="w-full">
        {socialLoading ? (
          <div className="h-10 animate-pulse rounded-2xl bg-zinc-800/50" />
        ) : allianceStatus === "none" ? (
          <button
            type="button"
            onClick={() => void handleRequestAlliance()}
            disabled={allianceRequesting}
            className="w-full rounded-2xl border border-amber-500/40 py-3 text-sm text-amber-300 transition-all hover:bg-amber-500/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="w-full rounded-2xl bg-zinc-800/50 py-3 text-center text-sm text-zinc-500">
            ⏳ 血盟申請已送出
          </div>
        ) : allianceStatus === "pending_received" ? (
          <button
            type="button"
            onClick={() => void handleRespondAlliance("accepted")}
            className="w-full rounded-2xl bg-amber-600 py-3 text-sm font-medium text-white transition-all hover:bg-amber-500 active:scale-95"
          >
            ⚔️ 確認血盟申請
          </button>
        ) : allianceStatus === "accepted" ? (
          <div className="flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5">
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
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="z-[600]"
          className={cn(
            "z-[610] flex max-h-[88vh] w-full max-w-sm flex-col gap-0 overflow-hidden rounded-3xl border border-zinc-800/60 bg-zinc-950 p-0",
          )}
        >
          <DialogTitle className="sr-only">{user.nickname} 的冒險者資料</DialogTitle>

          <div className="relative flex-shrink-0 bg-gradient-to-b from-zinc-900/80 to-zinc-950 px-5 pb-4 pt-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800/80 text-zinc-400 transition-colors hover:text-zinc-200"
              aria-label="關閉"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4 pr-2">
              <div className="relative shrink-0">
                <Avatar
                  size={80}
                  src={user.avatar_url}
                  nickname={user.nickname}
                  className="ring-2 ring-zinc-700/50"
                />
                <span
                  className={cn(
                    "absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-zinc-950",
                    user.activity_status === "active"
                      ? "bg-emerald-500"
                      : "bg-zinc-600",
                  )}
                  aria-hidden
                />
              </div>

              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {roleCrown ? <span aria-hidden>{roleCrown}</span> : null}
                  <h2
                    className={cn("truncate text-xl font-bold", roleNameClass)}
                  >
                    {user.nickname}
                  </h2>
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <LevelBadge level={user.level} />
                  <span className="text-xs text-zinc-500">{levelTitle}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <User className="h-3 w-3 shrink-0" />
                    {genderLabel}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {regionLabel}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <Wifi className="h-3 w-3 shrink-0" />
                    {offlineLabel}
                  </span>
                </div>
                {user.activity_status === "resting" ? (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-500">
                    💤 休息中
                  </span>
                ) : null}
              </div>
            </div>

            {isMoodActive && user.mood ? (
              <div className="mt-3 flex items-start gap-2 rounded-2xl border border-violet-500/20 bg-violet-950/40 px-3 py-2.5">
                <span className="shrink-0 text-sm text-violet-400">✨</span>
                <div>
                  <p className="mb-0.5 text-[10px] font-medium text-violet-400">
                    今日心情
                  </p>
                  <p className="text-sm leading-snug text-zinc-200">
                    {user.mood}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            {user.bio_village?.trim() ? (
              <div>
                <p className="mb-1.5 text-[10px] font-medium text-violet-400">
                  🏡 興趣自白
                </p>
                <p className="text-sm leading-relaxed text-zinc-300">
                  {user.bio_village}
                </p>
              </div>
            ) : null}

            {user.bio_market?.trim() ? (
              <div>
                <p className="mb-1.5 text-[10px] font-medium text-amber-400">
                  ⚔️ 技能自白
                </p>
                <p className="text-sm leading-relaxed text-zinc-300">
                  {user.bio_market}
                </p>
              </div>
            ) : null}

            {!user.bio_village?.trim() && !user.bio_market?.trim() ? (
              <p className="text-sm italic text-zinc-600">
                這位冒險者尚未留下自白。
              </p>
            ) : null}

            {(user.interests ?? []).length > 0 ? (
              <div>
                <p className="mb-2 text-[10px] font-medium text-violet-400">
                  🏡 興趣村莊
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(user.interests ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-violet-700/30 bg-violet-950/60 px-3 py-1 text-xs text-violet-300"
                    >
                      {tagLabel(tag)}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {((user.skills_offer ?? []).length > 0 ||
              (user.skills_want ?? []).length > 0) && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-medium text-amber-400">
                  ⚔️ 技能市集
                </p>
                {(user.skills_offer ?? []).length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-[10px] text-amber-500">我能教</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(user.skills_offer ?? []).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-amber-700/30 bg-amber-950/50 px-3 py-1 text-xs text-amber-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {(user.skills_want ?? []).length > 0 ? (
                  <div>
                    <p className="mb-1.5 text-[10px] text-sky-500">我想學</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(user.skills_want ?? []).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-sky-700/30 bg-sky-950/50 px-3 py-1 text-xs text-sky-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {showInstagram ? (
              <div className="flex items-center justify-between rounded-2xl border border-zinc-800/40 bg-zinc-900/60 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-pink-400">📸</span>
                  <div>
                    <p className="mb-0.5 text-[10px] text-zinc-500">
                      Instagram
                    </p>
                    <p className="text-sm text-zinc-200">
                      @
                      {user.instagram_handle
                        ?.trim()
                        .replace(/^@+/, "") ?? ""}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={openInstagram}
                  className="rounded-full bg-gradient-to-r from-pink-600 to-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-transform active:scale-95"
                >
                  開啟
                </button>
              </div>
            ) : null}

            {isCurrentUserMaster ? (
              <div className="flex items-center justify-between rounded-xl bg-zinc-900/40 px-3 py-2.5">
                <span className="text-xs text-zinc-500">信譽分</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-600 to-emerald-500"
                      style={{
                        width: `${user.reputation_score ?? 100}%`,
                      }}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      (user.reputation_score ?? 100) < 30
                        ? "text-red-400"
                        : "text-zinc-300",
                    )}
                  >
                    {user.reputation_score ?? 100}
                    {(user.reputation_score ?? 100) < 30 ? (
                      <span className="ml-1">⚠️</span>
                    ) : null}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex-shrink-0 space-y-2.5 border-t border-zinc-800/60 bg-zinc-950 px-5 py-4">
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => void handleChat()}
                disabled={chatOpening}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-zinc-800/80 py-3 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700/80 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
              >
                {chatOpening ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400/30 border-t-zinc-200" />
                    開啟中…
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4" />
                    聊聊
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleToggleLike}
                disabled={likeLoading || socialLoading}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium transition-all active:scale-95 disabled:opacity-60",
                  isLiked
                    ? "bg-gradient-to-r from-pink-600 to-rose-500 text-white shadow-lg shadow-pink-900/30"
                    : "bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700/80",
                )}
              >
                {socialLoading || likeLoading ? (
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-4 w-4 animate-spin rounded-full border-2",
                        isLiked
                          ? "border-white/30 border-t-white"
                          : "border-zinc-400/30 border-t-zinc-200",
                      )}
                    />
                    處理中…
                  </span>
                ) : isLiked ? (
                  "💖 已送出緣分"
                ) : (
                  "🤍 送出緣分"
                )}
              </button>
            </div>

            {allianceButton}

            {isCurrentUserMaster ? (
              <button
                type="button"
                onClick={openLeaderTools}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-700/40 bg-gradient-to-r from-amber-900/60 to-orange-900/60 py-3 text-sm font-medium text-amber-300 transition-all hover:border-amber-600/60 active:scale-95"
              >
                <Zap className="h-4 w-4" />
                領袖工具
              </button>
            ) : null}
          </div>
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
