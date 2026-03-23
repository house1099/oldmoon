"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { DAILY_CHECKIN_ALREADY_TODAY } from "@/lib/constants/daily-checkin";
import { claimDailyCheckin } from "@/services/daily-checkin.action";
import { updateMyProfile } from "@/services/profile-update.action";
import { createClient } from "@/lib/supabase/client";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CORE_VALUES_QUESTIONS,
  INTEREST_TAG_OPTIONS,
} from "@/lib/constants/adventurer-questionnaire";
import { LEVEL_MIN_EXP_BY_LEVEL, getLevelTierByExp } from "@/lib/constants/levels";
import type { UserRow } from "@/lib/repositories/server/user.repository";

const EDIT_FOCUS =
  "guild-energy-focus focus-visible:border-cyan-400 focus-visible:ring-cyan-400 text-zinc-100 placeholder:text-zinc-500";

function formatRegisteredAt(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
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

export function GuildProfileHome({ profile }: { profile: UserRow }) {
  const router = useRouter();
  const tier = getLevelTierByExp(profile.total_exp);
  const rep = reputationScore(profile.level, profile.total_exp);
  const progress = levelProgressPercent(profile.level, profile.total_exp);
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
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    setBio(profile.bio ?? "");
    setIgPublic(profile.ig_public);
    setMood(profile.mood ?? "");
  }, [profile]);

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

  async function onAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    setAvatarBusy(true);
    try {
      const supabase = createClient();
      const rawExt = (file.name.split(".").pop() || "jpg").toLowerCase();
      const ext =
        rawExt.replace(/[^a-z0-9]/g, "").slice(0, 8) || "jpg";
      const objectPath = `${profile.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(objectPath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type || "image/jpeg",
        });
      if (upErr) {
        console.error("❌ avatars storage upload:", upErr);
        toast.error(
          upErr.message || "上傳失敗，請確認已建立 avatars bucket 與上傳權限",
        );
        return;
      }
      const { data: pub } = supabase.storage
        .from("avatars")
        .getPublicUrl(objectPath);
      const result = await updateMyProfile({ avatar_url: pub.publicUrl });
      if (result.ok === false) {
        toast.error(result.error);
        return;
      }
      toast.success("大頭貼已更新");
      router.refresh();
    } finally {
      setAvatarBusy(false);
    }
  }

  async function onCheckin() {
    setCheckinLoading(true);
    try {
      const result = await claimDailyCheckin();
      if (result.ok === false) {
        if (result.error === DAILY_CHECKIN_ALREADY_TODAY) {
          toast.success("今日已簽到過了喵！");
          return;
        }
        toast.error(result.error);
        return;
      }
      toast.success("簽到成功！獲得 +1 EXP");
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

  const avatarSrc = profile.avatar_url?.trim() || null;
  const initial = profile.nickname.slice(0, 1).toUpperCase();
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
            onChange={(e) => void onAvatarFileChange(e)}
          />
          <div className="relative mx-auto">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-cyan-400/35 via-violet-400/25 to-fuchsia-500/35 blur-lg" />
            <div className="group relative mx-auto size-32 sm:size-36">
              <div className="relative mx-auto size-32 overflow-hidden rounded-full border-2 border-white/20 bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[inset_0_2px_14px_rgba(255,255,255,0.1)] ring-offset-2 ring-offset-zinc-950 transition-shadow group-hover:ring-2 group-hover:ring-violet-500/35 sm:size-36">
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
              </div>
              <button
                type="button"
                disabled={avatarBusy}
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 z-[2] flex size-10 items-center justify-center rounded-full border border-white/25 bg-zinc-950/85 text-violet-200 shadow-lg backdrop-blur-md transition hover:border-violet-400/40 hover:bg-violet-950/90 hover:text-white disabled:pointer-events-none disabled:opacity-50"
                aria-label="上傳大頭貼"
              >
                {avatarBusy ? (
                  <span className="text-[10px] font-medium text-zinc-200">
                    …
                  </span>
                ) : (
                  <Camera className="size-4 shrink-0" aria-hidden />
                )}
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
                Lv.{profile.level}
              </span>
              <span className="text-violet-200/95">
                {tier.symbol} {tier.title}
              </span>
            </div>
          </div>

          <div className="w-full max-w-md space-y-1.5">
            <div className="flex justify-between gap-2 text-[11px] text-zinc-400 sm:text-xs">
              <span className="tabular-nums text-cyan-200/90">
                total_exp {profile.total_exp.toLocaleString("zh-TW")}
              </span>
              <span>
                {profile.level < 10
                  ? `下一階 ${LEVEL_MIN_EXP_BY_LEVEL[profile.level]?.toLocaleString("zh-TW")} EXP`
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
          disabled={checkinLoading}
          onClick={onCheckin}
          className="mb-3 flex w-full items-center justify-between rounded-2xl border border-white/5 bg-zinc-900/50 p-4 text-left text-zinc-100 transition hover:border-amber-500/30 hover:bg-zinc-900/70 disabled:pointer-events-none disabled:opacity-60"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-950/40 text-amber-200">
              <CalendarCheck className="size-5" aria-hidden />
            </span>
            <span className="font-medium">
              {checkinLoading ? "連線中…" : "每日簽到（+1 EXP）"}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-zinc-500" aria-hidden />
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

            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
              <div className="flex flex-row items-center justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium text-zinc-100">
                    IG 狀態：{igPublic ? "已公開" : "不公開"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    切換後立即寫入資料庫（@
                    {profile.instagram_handle ?? "—"}）
                  </p>
                </div>
                <Switch
                  checked={igPublic}
                  onCheckedChange={(v) => void onIgPublicChange(v)}
                  disabled={igSaving || Boolean(savingField)}
                  className="shrink-0 data-checked:bg-violet-600"
                  aria-label={
                    igPublic ? "IG 狀態：已公開" : "IG 狀態：不公開"
                  }
                />
              </div>
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
    </main>
  );
}
