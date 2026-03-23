"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
  const [saving, setSaving] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  useEffect(() => {
    setBio(profile.bio ?? "");
    setIgPublic(profile.ig_public);
    setMood(profile.mood ?? "");
  }, [profile]);

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await updateMyProfile({
        bio,
        ig_public: igPublic,
        mood,
      });
      if (result.ok === false) {
        toast.error(result.error);
        return;
      }
      toast.success("資料已同步至公會名冊");
      setEditOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onCheckin() {
    setCheckinLoading(true);
    try {
      const result = await claimDailyCheckin();
      if (result.ok === false) {
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
    <main className="flex w-full flex-col gap-4">
      <section className="glass-panel relative p-5 sm:p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #fff 0, transparent 45%), radial-gradient(circle at 80% 80%, #a78bfa 0, transparent 40%)",
          }}
          aria-hidden
        />

        <div className="relative flex w-full flex-col items-center gap-4 text-center">
          <div className="relative mx-auto">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-cyan-400/40 via-slate-200/30 to-violet-500/40 blur-md" />
            <div className="relative mx-auto size-24 overflow-hidden rounded-full border-2 border-slate-200/50 bg-gradient-to-b from-slate-800/80 to-black shadow-[inset_0_2px_12px_rgba(255,255,255,0.12)] sm:size-28">
              {avatarSrc ? (
                <Image
                  src={avatarSrc}
                  alt=""
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-gradient-to-b from-slate-600/40 to-slate-900 font-serif text-2xl text-amber-50 sm:text-3xl">
                  {initial}
                </span>
              )}
            </div>
          </div>

          <div className="w-full space-y-1">
            <p className="font-serif text-lg tracking-wide text-zinc-100 sm:text-xl">
              {profile.nickname}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-zinc-100">
              <span
                className="inline-flex items-center rounded-md border border-slate-200/40 bg-gradient-to-b from-slate-100/20 to-slate-400/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-zinc-100"
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

      <section className="glass-panel overflow-hidden p-0">
        <p className="border-b border-white/10 px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-400">
          我的狀態
        </p>
        <Accordion className="px-2 pb-1">
          <AccordionItem value="mood" className="border-white/10">
            <AccordionTrigger className="px-2 text-zinc-100 hover:no-underline">
              今日心情
            </AccordionTrigger>
            <AccordionContent className="px-2 text-zinc-200">
              {moodVisible ? (
                <p className="text-sm leading-relaxed">{profile.mood}</p>
              ) : (
                <p className="text-sm text-zinc-500">
                  💭 今天還沒寫心情喵～（可從「修改資料」補上）
                </p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="bio" className="border-white/10">
            <AccordionTrigger className="px-2 text-zinc-100 hover:no-underline">
              自白
            </AccordionTrigger>
            <AccordionContent className="px-2 text-zinc-200">
              {profile.bio?.trim() ? (
                <p className="text-sm leading-relaxed">{profile.bio}</p>
              ) : (
                <p className="text-sm text-zinc-500">尚未寫下冒險宣言…</p>
              )}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="rep" className="border-white/10">
            <AccordionTrigger className="px-2 text-zinc-100 hover:no-underline">
              信譽與紀錄
            </AccordionTrigger>
            <AccordionContent className="px-2 text-zinc-200">
              <p className="font-mono text-lg text-cyan-300 tabular-nums">
                {rep.toLocaleString("zh-TW")}
              </p>
              <p className="mt-1 text-xs text-zinc-500">Lv×1000 + total_exp</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-zinc-500">
                註冊時間
              </p>
              <p className="text-sm text-zinc-200">
                {formatRegisteredAt(profile.created_at)}
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="tags" className="border-white/10 border-b-0">
            <AccordionTrigger className="px-2 text-zinc-100 hover:no-underline">
              興趣與價值觀
            </AccordionTrigger>
            <AccordionContent className="px-2 text-zinc-200">
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
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      <Button
        type="button"
        variant="outline"
        className="w-full border-violet-500/35 bg-violet-950/30 text-zinc-100 hover:bg-violet-950/45 hover:text-zinc-50"
        onClick={() => setEditOpen(true)}
      >
        修改資料
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[min(90vh,560px)] max-w-[calc(100%-2rem)] gap-0 overflow-hidden border-white/10 bg-zinc-950/98 p-0 text-zinc-100 sm:max-w-md">
          <DialogHeader className="border-b border-white/10 px-4 pb-3 pt-4">
            <DialogTitle className="text-zinc-100">修改冒險者資料</DialogTitle>
            <DialogDescription className="text-zinc-400">
              自介、IG 公開與今日心情；儲存後將同步至公會名冊。
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={onSaveProfile}
            className="flex max-h-[min(70vh,480px)] flex-col gap-4 overflow-y-auto px-4 py-4"
          >
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
            </div>

            <div className="flex items-start gap-3 rounded-lg border border-cyan-500/25 bg-cyan-950/20 px-3 py-3">
              <input
                id="profile-ig-public"
                type="checkbox"
                checked={igPublic}
                onChange={(e) => setIgPublic(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-cyan-500/50 accent-cyan-400"
              />
              <label
                htmlFor="profile-ig-public"
                className="cursor-pointer text-left text-sm text-zinc-100"
              >
                <span className="font-medium">IG 公開顯示</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  開啟後於公會名片揭露 IG（@
                  {profile.instagram_handle ?? "—"}）
                </span>
              </label>
            </div>

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
                儲存後 24 小時內會顯示在「今日心情」
              </p>
            </div>

            <DialogFooter className="flex-col gap-2 border-t border-white/10 bg-black/20 px-0 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/15 text-zinc-100 sm:w-auto"
                onClick={() => setEditOpen(false)}
              >
                取消
              </Button>
              <Button
                type="submit"
                className="w-full border-violet-500/35 bg-violet-950/50 text-zinc-100 sm:w-auto"
                disabled={saving}
              >
                {saving ? "⏳ 同步中…" : "儲存變更"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        size="lg"
        disabled={checkinLoading}
        onClick={onCheckin}
        className="w-full border border-amber-200/30 bg-gradient-to-r from-amber-500/20 via-violet-600/25 to-cyan-600/20 text-zinc-100 shadow-[0_0_24px_rgba(251,191,36,0.15)] hover:from-amber-400/30 hover:to-cyan-500/25"
      >
        {checkinLoading ? "⏳ 時空連線中..." : "每日簽到（+1 EXP）"}
      </Button>

      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full border-red-500/35 bg-red-950/20 text-zinc-100 hover:bg-red-950/35 hover:text-zinc-50",
        )}
        disabled={logoutLoading}
        onClick={onLogout}
      >
        {logoutLoading ? "⏳ 時空連線中..." : "🚫 結束連線 (登出)"}
      </Button>
    </main>
  );
}
