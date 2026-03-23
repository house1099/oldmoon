"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DAILY_CHECKIN_ALREADY_TODAY } from "@/lib/constants/daily-checkin";
import { formatTaipeiDateKeyForDisplay } from "@/lib/utils/date";
import {
  claimDailyCheckin,
  getDailyCheckinCooldownInfo,
} from "@/services/daily-checkin.action";
import { updateMyProfile } from "@/services/profile-update.action";
import { uploadAvatarToCloudinary } from "@/lib/utils/cloudinary";
import { getCroppedImg } from "@/lib/utils/cropImage";
import { createClient } from "@/lib/supabase/client";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck,
  Camera,
  ChevronRight,
  Lock,
  LogOut,
  PencilLine,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CORE_VALUES_QUESTIONS,
  INTEREST_TAG_OPTIONS,
} from "@/lib/constants/adventurer-questionnaire";
import { LEVEL_MIN_EXP_BY_LEVEL, getLevelTierByExp } from "@/lib/constants/levels";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import { cn } from "@/lib/utils";

const EDIT_FOCUS =
  "guild-energy-focus focus-visible:border-cyan-400 focus-visible:ring-cyan-400 text-zinc-100 placeholder:text-zinc-500";

function formatRegisteredAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function reputationScore(level: number, totalExp: number): number {
  return level * 1000 + totalExp;
}

function levelProgressPercent(level: number, totalExp: number): number {
  if (level >= 10) return 100;
  const cur = LEVEL_MIN_EXP_BY_LEVEL[level - 1] ?? 0;
  const next = LEVEL_MIN_EXP_BY_LEVEL[level] ?? cur;
  if (next <= cur) return 100;
  return Math.min(
    100,
    Math.max(0, ((totalExp - cur) / (next - cur)) * 100),
  );
}

function isMoodFresh(moodAt: string | null): boolean {
  if (!moodAt) return false;
  const t = new Date(moodAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < 24 * 60 * 60 * 1000;
}

function interestLabel(slug: string): string {
  return INTEREST_TAG_OPTIONS.find((o) => o.value === slug)?.label ?? slug;
}

function coreValueLabels(values: string[] | null): string[] {
  if (!values?.length) return [];
  return values.map((slug, i) => {
    const q = CORE_VALUES_QUESTIONS[i];
    const opt = q?.options.find((o) => o.value === slug);
    return opt?.label ?? slug;
  });
}

function normalizeTotalExp(v: UserRow["total_exp"]): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeLevel(v: UserRow["level"]): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(10, Math.floor(n));
}

export function GuildProfileHome({ profile }: { profile: UserRow }) {
  const router = useRouter();
  const totalExpSafe = normalizeTotalExp(profile.total_exp);
  const levelSafe = normalizeLevel(profile.level);
  const tier = getLevelTierByExp(totalExpSafe);
  const rep = reputationScore(levelSafe, totalExpSafe);
  const progress = levelProgressPercent(levelSafe, totalExpSafe);
  const coreLabels = coreValueLabels(profile.core_values);
  const interestSlugs = profile.interests ?? [];

  const [bio, setBio] = useState(profile.bio ?? "");
  const [igPublic, setIgPublic] = useState(profile.ig_public);
  const [mood, setMood] = useState(profile.mood ?? "");
  const [editOpen, setEditOpen] = useState(false);
  const [confirmField, setConfirmField] = useState<"mood" | "bio" | null>(
    null,
  );
  const [savingField, setSavingField] = useState<"mood" | "bio" | null>(null);
  const [igSaving, setIgSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    profile.avatar_url?.trim() || null,
  );
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinDoneToday, setCheckinDoneToday] = useState(false);
  const [checkinNextLabel, setCheckinNextLabel] = useState<string | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    setBio(profile.bio ?? "");
    setIgPublic(profile.ig_public);
    setMood(profile.mood ?? "");
    setAvatarUrl(profile.avatar_url?.trim() || null);
  }, [profile]);

  const syncCheckinCooldown = useCallback(async () => {
    const r = await getDailyCheckinCooldownInfo();
    if (r.ok === false) return;
    setCheckinDoneToday(r.checkedToday);
    setCheckinNextLabel(
      r.checkedToday && r.nextEligibleDateKey
        ? formatTaipeiDateKeyForDisplay(r.nextEligibleDateKey)
        : null,
    );
  }, []);

  useEffect(() => {
    void syncCheckinCooldown();
  }, [profile.id, profile.updated_at, syncCheckinCooldown]);

  useEffect(() => {
    if (!cropOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [cropOpen]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const closeCropModal = useCallback(() => {
    setCropSrc((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return "";
    });
    setCropOpen(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, []);

  async function runConfirmedSave() {
    if (!confirmField) return;
    const field = confirmField;
    setSavingField(field);
    try {
      const payload = field === "mood" ? { mood } : { bio };
      const result = await updateMyProfile(payload);
      if (result.ok === false) {
        toast.error(result.error);
        return;
      }
      const msg = field === "mood" ? "今日心情已更新" : "自白已更新";
      toast.success(msg);
      setConfirmField(null);
      router.refresh();
    } finally {
      setSavingField(null);
    }
  }

  async function onIgPublicChange(checked: boolean) {
    const prev = igPublic;
    setIgPublic(checked);
    setIgSaving(true);
    try {
      const result = await updateMyProfile({ ig_public: checked });
      if (result.ok === false) {
        setIgPublic(prev);
        toast.error(result.error);
        return;
      }
      toast.success("IG 公開狀態已更新");
      router.refresh();
    } finally {
      setIgSaving(false);
    }
  }

  function handleIgToggle() {
    if (igSaving || savingField) return;
    void onIgPublicChange(!igPublic);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔案");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("圖片請小於 5MB");
      return;
    }
    setCropSrc((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropOpen(true);
  }

  async function handleCropConfirm() {
    if (!cropSrc || !croppedAreaPixels) {
      toast.error("請稍候畫面載入完成");
      return;
    }
    setUploading(true);
    try {
      const blob = await getCroppedImg(cropSrc, croppedAreaPixels);
      const mime = blob.type || "image/jpeg";
      const file = new File([blob], "avatar.jpg", { type: mime });
      const cloudUrl = await uploadAvatarToCloudinary(file);
      const result = await updateMyProfile({ avatar_url: cloudUrl });
      if (result.ok === false) {
        toast.error(result.error);
        return;
      }
      setAvatarUrl(cloudUrl);
      toast.success("大頭貼已更新");
      closeCropModal();
      router.refresh();
    } catch (err) {
      console.error("❌ 頭像裁切或上傳:", err);
      toast.error(err instanceof Error ? err.message : "上傳失敗");
    } finally {
      setUploading(false);
    }
  }

  async function onCheckin() {
    setCheckinLoading(true);
    try {
      const result = await claimDailyCheckin();
      if (result.ok === false) {
        if (
          result.error === DAILY_CHECKIN_ALREADY_TODAY ||
          /duplicate/i.test(result.error)
        ) {
          toast.success("今日已經簽到過了喵！");
          await syncCheckinCooldown();
          return;
        }
        toast.error(result.error);
        return;
      }
      toast.success("簽到成功！獲得 +1 EXP 喵！");
      await syncCheckinCooldown();
      router.refresh();
    } finally {
      setCheckinLoading(false);
    }
  }

  async function onLogout() {
    setLogoutLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setLogoutLoading(false);
    }
  }

  const avatarSrc = avatarUrl?.trim() || null;
  const initial = (profile.nickname ?? "?").slice(0, 1).toUpperCase();
  const moodVisible =
    isMoodFresh(profile.mood_at) && (profile.mood?.trim().length ?? 0) > 0;

  return (
    <main className="flex w-full flex-col gap-6">
      <section className="glass-panel relative p-6 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #fff 0, transparent 45%), radial-gradient(circle at 80% 80%, #a78bfa 0, transparent 40%)",
          }}
          aria-hidden
        />

        <div className="relative flex w-full flex-col items-center gap-5 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleAvatarChange(e)}
          />
          <div className="relative mx-auto">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-cyan-400/35 via-violet-400/25 to-fuchsia-500/35 blur-lg" />
            <div className="group relative mx-auto size-32 sm:size-36">
              <button
                type="button"
                disabled={uploading || cropOpen}
                onClick={() => fileInputRef.current?.click()}
                className="relative mx-auto block size-32 cursor-pointer overflow-hidden rounded-full border-2 border-white/20 bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[inset_0_2px_14px_rgba(255,255,255,0.1)] ring-offset-2 ring-offset-zinc-950 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 enabled:group-hover:ring-2 enabled:group-hover:ring-violet-500/35 disabled:cursor-not-allowed sm:size-36"
                aria-label="更換大頭貼"
              >
                {avatarSrc ? (
                  <Image
                    src={avatarSrc}
                    alt=""
                    width={144}
                    height={144}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-gradient-to-b from-zinc-600/50 to-zinc-950 font-serif text-3xl text-amber-50 sm:text-4xl">
                    {initial}
                  </span>
                )}
                {uploading ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                    <span className="text-xs font-medium text-white">
                      上傳中…
                    </span>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="text-xs font-medium text-white">
                      更換
                    </span>
                  </div>
                )}
                <span
                  className="pointer-events-none absolute bottom-0 right-0 z-[2] flex size-10 items-center justify-center rounded-full border border-white/25 bg-zinc-950/85 text-violet-200 shadow-lg backdrop-blur-md"
                  aria-hidden
                >
                  <Camera className="size-4 shrink-0" />
                </span>
              </button>
            </div>
          </div>

          <div className="w-full space-y-2">
            <p className="font-serif text-xl tracking-wide text-zinc-100 sm:text-2xl">
              {profile.nickname}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-sm">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/35 bg-gradient-to-r from-violet-950/80 to-zinc-900/90 px-3 py-1 text-xs font-semibold tabular-nums tracking-wide text-violet-100 shadow-md shadow-violet-950/40"
                title="等級徽章"
              >
                Lv.{levelSafe}
              </span>
              <span className="text-violet-200/95">
                {tier.symbol} {tier.title}
              </span>
            </div>
          </div>

          <div className="w-full max-w-md space-y-1.5">
            <div className="flex justify-between gap-2 text-[11px] text-zinc-400 sm:text-xs">
              <span className="tabular-nums text-cyan-200/90">
                total_exp {totalExpSafe.toLocaleString("zh-TW")}
              </span>
              <span>
                {levelSafe < 10
                  ? `下一階 ${(
                      LEVEL_MIN_EXP_BY_LEVEL[levelSafe] ?? 0
                    ).toLocaleString("zh-TW")} EXP`
                  : "已達傳奇之巔"}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full border border-slate-400/25 bg-zinc-950/80 shadow-inner">
              <div
                className="mercury-exp-fill h-full rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel overflow-hidden p-0 shadow-xl">
        <p className="border-b border-white/10 px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-400">
          我的狀態
        </p>
        <Accordion className="px-2 pb-1">
          <AccordionItem value="mood" className="border-white/10">
            <AccordionTrigger className="px-2 text-zinc-100 hover:no-underline">
              今日心情
            </AccordionTrigger>
            <AccordionContent className="px-2 text-zinc-200">
              <div className="mt-2 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 text-sm leading-relaxed text-zinc-300">
                {moodVisible ? (
                  <p>{profile.mood}</p>
                ) : (
                  <p className="text-zinc-500">
                    💭 今天還沒寫心情喵～（可從「修改資料」補上）
                  </p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="bio" className="border-white/10">
            <AccordionTrigger className="px-2 text-zinc-100 hover:no-underline">
              自白
            </AccordionTrigger>
            <AccordionContent className="px-2 text-zinc-200">
              <div className="mt-2 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 text-sm leading-relaxed text-zinc-300">
                {profile.bio?.trim() ? (
                  <p>{profile.bio}</p>
                ) : (
                  <p className="text-zinc-500">尚未寫下冒險宣言…</p>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="rep" className="border-white/10">
            <AccordionTrigger className="px-2 text-zinc-100 hover:no-underline">
              信譽與紀錄
            </AccordionTrigger>
            <AccordionContent className="px-2 text-zinc-200">
              <div className="mt-2 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 text-sm leading-relaxed text-zinc-300">
                <p className="font-mono text-lg text-cyan-300 tabular-nums">
                  {rep.toLocaleString("zh-TW")}
                </p>
                <p className="mt-1 text-xs text-zinc-500">Lv×1000 + total_exp</p>
                <p className="mt-3 text-xs uppercase tracking-wide text-zinc-500">
                  註冊時間
                </p>
                <p className="text-zinc-200">
                  {formatRegisteredAt(profile.created_at)}
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="tags" className="border-white/10 border-b-0">
            <AccordionTrigger className="px-2 text-zinc-100 hover:no-underline">
              興趣與價值觀
            </AccordionTrigger>
            <AccordionContent className="px-2 text-zinc-200">
              <div className="mt-2 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 text-sm leading-relaxed text-zinc-300">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  興趣標籤
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {interestSlugs.length ? (
                    interestSlugs.map((slug) => (
                      <span key={slug} className="tag-gold text-[0.7rem]">
                        {interestLabel(slug)}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-500">尚未標記</span>
                  )}
                </div>
                {coreLabels.length ? (
                  <>
                    <p className="mt-4 text-xs uppercase tracking-wide text-zinc-500">
                      價值觀印記
                    </p>
                    <ul className="mt-2 space-y-1 text-left text-xs text-zinc-300">
                      {coreLabels.map((label, i) => (
                        <li key={i}>· {label}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <nav className="flex w-full flex-col gap-0" aria-label="個人頁操作">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="mb-3 flex w-full items-center justify-between rounded-2xl border border-white/5 bg-zinc-900/50 p-4 text-left text-zinc-100 transition hover:border-violet-500/25 hover:bg-zinc-900/70"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-violet-950/50 text-violet-200">
              <PencilLine className="size-5" aria-hidden />
            </span>
            <span className="font-medium">修改資料</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-zinc-500" aria-hidden />
        </button>

        <button
          type="button"
          disabled={checkinLoading || checkinDoneToday}
          onClick={onCheckin}
          className={cn(
            "mb-3 flex w-full items-center justify-between rounded-2xl border p-4 text-left transition disabled:pointer-events-none",
            checkinDoneToday
              ? "cursor-not-allowed border-zinc-700/50 bg-zinc-900/40 text-zinc-500 opacity-85 backdrop-blur-sm"
              : "border-white/10 bg-gradient-to-r from-amber-950/55 via-zinc-900/55 to-violet-950/45 text-zinc-100 shadow-md shadow-black/25 hover:border-amber-400/30 hover:from-amber-900/50 hover:via-zinc-900/50 hover:to-violet-900/40",
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                checkinDoneToday
                  ? "bg-zinc-800/80 text-zinc-500"
                  : "bg-amber-950/50 text-amber-200 ring-1 ring-amber-500/25",
              )}
            >
              {checkinDoneToday ? (
                <Lock className="size-5" aria-hidden />
              ) : (
                <CalendarCheck className="size-5" aria-hidden />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium">
                {checkinLoading
                  ? "連線中…"
                  : checkinDoneToday
                    ? "⏳ 回報冷卻中 (約 23 小時)"
                    : "每日簽到（+1 EXP）"}
              </span>
              {checkinDoneToday && checkinNextLabel ? (
                <span className="text-[11px] font-normal leading-snug text-zinc-500">
                  下次可簽到：{checkinNextLabel}（台北曆日切換後）
                </span>
              ) : null}
            </span>
          </span>
          {!checkinDoneToday ? (
            <ChevronRight className="size-5 shrink-0 text-zinc-500" aria-hidden />
          ) : null}
        </button>

        <button
          type="button"
          disabled={logoutLoading}
          onClick={onLogout}
          className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-zinc-900/50 p-4 text-left text-zinc-100 transition hover:border-red-500/35 hover:bg-red-950/25 disabled:pointer-events-none disabled:opacity-60"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-red-950/35 text-red-200">
              <LogOut className="size-5" aria-hidden />
            </span>
            <span className="font-medium">
              {logoutLoading ? "連線中…" : "結束連線（登出）"}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-zinc-500" aria-hidden />
        </button>
      </nav>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b border-white/10 px-4 pb-3 pt-4">
            <DialogTitle className="text-zinc-100">修改冒險者資料</DialogTitle>
            <DialogDescription className="text-zinc-400">
              心情與自白請分別按下「確認修改」。IG 公開開關會立即同步名冊。
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[min(70vh,520px)] flex-col gap-5 overflow-y-auto px-4 py-4">
            <div className="space-y-2">
              <label
                htmlFor="profile-mood"
                className="text-sm font-medium text-zinc-100"
              >
                今日心情
              </label>
              <Textarea
                id="profile-mood"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="寫一句給今天的自己…"
                maxLength={200}
                rows={3}
                className={EDIT_FOCUS}
              />
              <p className="text-xs text-zinc-500">
                確認後 24 小時內會顯示在「今日心情」
              </p>
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full bg-zinc-800 px-4 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 hover:text-zinc-100"
                  disabled={Boolean(savingField)}
                  onClick={() => setConfirmField("mood")}
                >
                  確認修改
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="profile-bio"
                className="text-sm font-medium text-zinc-100"
              >
                自白
              </label>
              <Textarea
                id="profile-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="寫下你的冒險宣言…"
                maxLength={500}
                rows={5}
                className={EDIT_FOCUS}
              />
              <p className="text-xs text-zinc-500">{bio.length}/500</p>
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full bg-zinc-800 px-4 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 hover:text-zinc-100"
                  disabled={Boolean(savingField)}
                  onClick={() => setConfirmField("bio")}
                >
                  確認修改
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-900/60 px-4 py-4">
              <div className="min-w-0 pr-3">
                <p className="text-sm font-medium text-white">
                  IG 狀態：{igPublic ? "公開" : "不公開"}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  切換後立即寫入資料庫（@
                  {profile.instagram_handle ?? "—"}）
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={igPublic}
                aria-label={igPublic ? "IG 狀態：公開" : "IG 狀態：不公開"}
                disabled={igSaving || Boolean(savingField)}
                onClick={handleIgToggle}
                className={cn(
                  "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50",
                  igPublic ? "bg-blue-500" : "bg-zinc-600",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200",
                    igPublic ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          </div>

          <DialogFooter className="flex justify-center border-t border-white/10 bg-black/20 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <Button
              type="button"
              variant="outline"
              className="mx-auto max-w-[80%] border-white/15 text-zinc-100"
              onClick={() => setEditOpen(false)}
            >
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmField !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmField(null);
        }}
      >
        <AlertDialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>更新資料</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              確定要更新此項資料嗎？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-zinc-800 bg-zinc-900/50">
            <AlertDialogCancel className="border-zinc-700 bg-transparent text-zinc-200 hover:bg-zinc-800">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-violet-600 text-white hover:bg-violet-500"
              disabled={Boolean(savingField)}
              onClick={(e) => {
                e.preventDefault();
                void runConfirmedSave();
              }}
            >
              {savingField ? "同步中…" : "確認"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {cropOpen && cropSrc ? (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black"
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-crop-title"
        >
          <div className="glass-panel shrink-0 border-b border-white/10 px-4 py-3 text-center shadow-2xl backdrop-blur-xl">
            <p
              id="avatar-crop-title"
              className="text-sm font-medium tracking-wide text-zinc-100"
            >
              調整頭像
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              拖曳與縮放，圓形區域即為裁切範圍
            </p>
          </div>

          <div className="relative min-h-0 flex-1 w-full bg-black">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <div className="glass-panel shrink-0 border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-md gap-3">
              <button
                type="button"
                disabled={uploading}
                onClick={closeCropModal}
                className="flex-1 rounded-full border border-white/15 bg-zinc-900/70 px-5 py-2.5 text-sm text-zinc-200 transition hover:bg-zinc-800/90 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={uploading || !croppedAreaPixels}
                onClick={() => void handleCropConfirm()}
                className="flex-1 rounded-full border border-violet-400/35 bg-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-950/50 transition hover:bg-violet-500 disabled:pointer-events-none disabled:opacity-45"
              >
                {uploading ? "上傳中…" : "確認裁切"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
