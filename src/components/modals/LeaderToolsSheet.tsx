"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Loader2, ExternalLink } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { getMemberProfileByIdAction } from "@/services/profile.action";
import {
  adjustExpAction,
  banUserAction,
  unbanUserAction,
  generateInvitationCodeAction,
} from "@/services/admin.action";
import { insertMailboxNotificationAction } from "@/services/notification.action";
import { instagramProfileUrlFromHandle } from "@/lib/utils/instagram";
import type { UserRow } from "@/types/database.types";

type Props = {
  open: boolean;
  onClose: () => void;
  targetUserId: string;
  targetNickname: string;
  currentUserId: string;
  onBanSuccess?: () => void;
};

export default function LeaderToolsSheet({
  open,
  onClose,
  targetUserId,
  targetNickname,
  currentUserId,
  onBanSuccess,
}: Props) {
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [expDelta, setExpDelta] = useState(10);
  const [expReason, setExpReason] = useState("");
  const [expPending, setExpPending] = useState(false);
  const [invitePending, setInvitePending] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [showBanConfirm, setShowBanConfirm] = useState(false);
  const [showUnbanConfirm, setShowUnbanConfirm] = useState(false);
  const [banPending, setBanPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getMemberProfileByIdAction(targetUserId).then((data) => {
      if (data) setProfile(data);
      setLoading(false);
    });
  }, [open, targetUserId]);

  if (!open) return null;

  const isSelf = targetUserId === currentUserId;
  const igHandle = profile?.instagram_handle?.trim() || null;
  const igUrl = igHandle ? instagramProfileUrlFromHandle(igHandle) : null;
  const igDisplay = igHandle?.replace(/^@+/, "") ?? null;

  async function handleGrantExp() {
    if (!expReason.trim()) {
      toast.error("請輸入發放理由");
      return;
    }
    setExpPending(true);
    const res = await adjustExpAction(targetUserId, expDelta, expReason.trim());
    setExpPending(false);
    if (res.ok) {
      toast.success(`已發放 +${expDelta} EXP 給 ${targetNickname}`);
      setExpReason("");
    } else {
      toast.error(res.error);
    }
  }

  async function handleSendInvitation() {
    setInvitePending(true);
    try {
      const codeRes = await generateInvitationCodeAction({
        expiresInDays: 30,
        note: `領袖發給 ${targetNickname}`,
      });
      if (!codeRes.ok) {
        toast.error(codeRes.error);
        return;
      }
      await insertMailboxNotificationAction({
        user_id: targetUserId,
        type: "invitation_code",
        from_user_id: currentUserId,
        message: `🎟️ 你收到一組邀請碼：${codeRes.data.code}，有效期 30 天，快分享給好友加入公會吧！`,
        is_read: false,
      });
      toast.success(`邀請碼已透過信件發送給 ${targetNickname} 📬`);
    } catch (e) {
      console.error(e);
      toast.error("信件發送失敗，請稍後再試");
    } finally {
      setInvitePending(false);
    }
  }

  async function handleBan() {
    if (!banReason.trim()) {
      toast.error("請輸入放逐理由");
      return;
    }
    setBanPending(true);
    const res = await banUserAction(targetUserId, banReason.trim());
    setBanPending(false);
    if (res.ok) {
      toast.success(`已放逐 ${targetNickname}`);
      setShowBanConfirm(false);
      onBanSuccess?.();
      onClose();
    } else {
      toast.error(res.error);
    }
  }

  async function handleUnban() {
    setBanPending(true);
    const res = await unbanUserAction(targetUserId);
    setBanPending(false);
    if (res.ok) {
      toast.success(`已解除 ${targetNickname} 的放逐`);
      setShowUnbanConfirm(false);
      setProfile((p) => (p ? { ...p, status: "active" } : p));
    } else {
      toast.error(res.error);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[400] bg-black/50"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-y-0 right-0 z-[410] w-80 max-w-[calc(100vw-2rem)] bg-zinc-950 border-l border-zinc-800 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur">
          <h2 className="text-sm font-bold text-amber-100">
            ⚡ 領袖快捷操作
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target user */}
        <div className="flex items-center gap-3 border-b border-zinc-800/50 px-4 py-3">
          <Avatar
            src={profile?.avatar_url ?? null}
            nickname={targetNickname}
            size={36}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {targetNickname}
            </p>
            {profile && (
              <p className="text-xs text-zinc-500">
                Lv.{profile.level} · {profile.total_exp} EXP ·{" "}
                {profile.status}
              </p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {/* Section 1: Instagram */}
            <div className="px-4 py-4 space-y-2">
              <p className="text-xs font-semibold text-zinc-400">
                📸 Instagram
              </p>
              {igHandle ? (
                <div className="space-y-2">
                  <p className="text-sm text-white font-medium">
                    @{igDisplay}
                  </p>
                  {igUrl && (
                    <a
                      href={igUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 w-full rounded-lg border border-violet-500/30 bg-violet-600/15 px-3 py-2 text-xs text-violet-300 hover:bg-violet-600/25 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      在 Instagram 開啟
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-zinc-600">此用戶尚未綁定 IG</p>
              )}
            </div>

            {/* Section 2: Quick EXP */}
            <div className="px-4 py-4 space-y-3">
              <p className="text-xs font-semibold text-zinc-400">
                ⭐ 快速發放 EXP
              </p>
              <input
                type="number"
                min={1}
                max={1000}
                value={expDelta}
                onChange={(e) =>
                  setExpDelta(
                    Math.max(1, Math.min(1000, Number(e.target.value))),
                  )
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                placeholder="EXP 數量"
              />
              <input
                type="text"
                value={expReason}
                onChange={(e) => setExpReason(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
                placeholder="理由（必填）"
              />
              <button
                onClick={handleGrantExp}
                disabled={expPending || !expReason.trim()}
                className="w-full rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50 transition-colors"
              >
                {expPending ? "發放中…" : "發放 EXP"}
              </button>
            </div>

            {/* Section 3: Send Invitation Code */}
            <div className="px-4 py-4 space-y-3">
              <p className="text-xs font-semibold text-zinc-400">
                📨 發送邀請碼
              </p>
              <button
                onClick={handleSendInvitation}
                disabled={invitePending}
                className="w-full rounded-lg border border-amber-500/30 bg-amber-600/15 py-2 text-sm font-medium text-amber-300 hover:bg-amber-600/25 disabled:opacity-50 transition-colors"
              >
                {invitePending ? "發送中…" : "產生並發送邀請碼"}
              </button>
              <p className="text-xs text-zinc-600">
                自動產生 30 天邀請碼並透過信件（通知）送給對方
              </p>
            </div>

            {/* Section 4: Ban */}
            {!isSelf && (
              <div className="px-4 py-4 space-y-3">
                <p className="text-xs font-semibold text-zinc-400">
                  🚫 黑名單
                </p>
                {profile?.status === "banned" ? (
                  <button
                    onClick={() => setShowUnbanConfirm(true)}
                    className="w-full rounded-lg bg-emerald-700 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition-colors"
                  >
                    解除放逐
                  </button>
                ) : (
                  <button
                    onClick={() => setShowBanConfirm(true)}
                    className="w-full rounded-lg bg-red-700 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
                  >
                    放逐此用戶
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ban Confirm Dialog */}
      {showBanConfirm && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowBanConfirm(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white">
              確定要放逐 {targetNickname}？
            </h3>
            <p className="text-sm text-zinc-400">
              此操作將立即封鎖其帳號
            </p>
            <input
              type="text"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="放逐理由（必填）"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowBanConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800"
              >
                取消
              </button>
              <button
                onClick={handleBan}
                disabled={banPending || !banReason.trim()}
                className="px-4 py-2 rounded-lg bg-red-700 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {banPending ? "處理中…" : "確認放逐"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unban Confirm Dialog */}
      {showUnbanConfirm && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowUnbanConfirm(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-white">
              確定要解除 {targetNickname} 的放逐？
            </h3>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUnbanConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:bg-zinc-800"
              >
                取消
              </button>
              <button
                onClick={handleUnban}
                disabled={banPending}
                className="px-4 py-2 rounded-lg bg-emerald-700 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {banPending ? "處理中…" : "確認解除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
