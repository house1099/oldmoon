"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { claimDailyCheckin } from "@/services/daily-checkin.action";
import { updateMyProfile } from "@/services/profile-update.action";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CORE_VALUES_QUESTIONS,
  INTEREST_TAG_OPTIONS,
} from "@/lib/constants/adventurer-questionnaire";
import { LEVEL_MIN_EXP_BY_LEVEL, getLevelTierByExp } from "@/lib/constants/levels";
import type { UserRow } from "@/lib/repositories/server/user.repository";

const EDIT_FOCUS =
  "guild-energy-focus focus-visible:border-cyan-400 focus-visible:ring-cyan-400";

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
  const [saving, setSaving] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

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
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pb-10 pt-8">
      <section className="guild-breathe-ring relative overflow-hidden rounded-2xl border border-slate-300/25 bg-gradient-to-b from-zinc-900/90 via-black/50 to-violet-950/30 p-6 shadow-[0_0_40px_rgba(148,163,184,0.12)] backdrop-blur-md">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #fff 0, transparent 45%), radial-gradient(circle at 80% 80%, #a78bfa 0, transparent 40%)",
          }}
          aria-hidden
        />

        <div className="relative flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-cyan-400/40 via-slate-200/30 to-violet-500/40 blur-md" />
            <div className="relative size-28 overflow-hidden rounded-full border-2 border-slate-200/50 bg-gradient-to-b from-slate-800/80 to-black shadow-[inset_0_2px_12px_rgba(255,255,255,0.12)]">
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
                <span className="flex h-full w-full items-center justify-center bg-gradient-to-b from-slate-600/40 to-slate-900 font-serif text-3xl text-amber-50">
                  {initial}
                </span>
              )}
            </div>
          </div>

          <div className="text-center">
            <p className="font-serif text-xl tracking-wide text-slate-50">
              {profile.nickname}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <span
                className="inline-flex items-center rounded-md border border-slate-200/40 bg-gradient-to-b from-slate-100/20 to-slate-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-100 shadow-[0_0_16px_rgba(226,232,240,0.15)]"
                title="等級徽章"
              >
                Lv.{profile.level}
              </span>
              <span className="text-sm text-violet-200/90">
                {tier.symbol} {tier.title}
              </span>
            </div>
          </div>

          <div className="w-full space-y-1.5">
            <div className="flex justify-between text-xs text-slate-400">
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

          <dl className="grid w-full grid-cols-2 gap-3 border-t border-white/10 pt-4 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                信譽分數
              </dt>
              <dd className="font-mono text-base text-cyan-300 tabular-nums drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]">
                {rep.toLocaleString("zh-TW")}
              </dd>
              <p className="mt-0.5 text-[0.65rem] text-slate-500">
                Lv×1000 + total_exp
              </p>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">
                註冊時間
              </dt>
              <dd className="text-slate-200">
                {formatRegisteredAt(profile.created_at)}
              </dd>
            </div>
          </dl>

          <div className="w-full rounded-xl border border-violet-500/20 bg-black/25 px-3 py-3 text-left">
            <p className="text-xs font-medium uppercase tracking-wider text-violet-300/80">
              每日心情
            </p>
            {moodVisible ? (
              <p className="mt-1.5 text-sm leading-relaxed text-slate-200">
                {profile.mood}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-slate-400">
                💭 今天還沒寫心情喵～
              </p>
            )}
          </div>
        </div>
      </section>

      <Tabs defaultValue="status" className="w-full gap-4">
        <TabsList
          variant="line"
          className="w-full justify-stretch border-b border-white/10 bg-transparent p-0"
        >
          <TabsTrigger
            value="status"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-cyan-400 data-[state=active]:bg-transparent data-[state=active]:text-cyan-100 data-[state=active]:shadow-[0_0_18px_rgba(34,211,238,0.2)]"
          >
            我的狀態
          </TabsTrigger>
          <TabsTrigger
            value="edit"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-violet-400 data-[state=active]:bg-transparent data-[state=active]:text-violet-100 data-[state=active]:shadow-[0_0_18px_rgba(167,139,250,0.2)]"
          >
            修改資料
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="flex flex-col gap-5 pt-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              自白
            </p>
            {profile.bio?.trim() ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {profile.bio}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-500">尚未寫下冒險宣言…</p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              標籤
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {interestSlugs.length ? (
                interestSlugs.map((slug) => (
                  <span key={slug} className="tag-gold text-[0.7rem]">
                    {interestLabel(slug)}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">尚未標記</span>
              )}
            </div>
          </div>

          {coreLabels.length ? (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                價值觀印記
              </p>
              <ul className="mt-2 space-y-1 text-left text-xs text-slate-300">
                {coreLabels.map((label, i) => (
                  <li key={i}>· {label}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <Button
            type="button"
            size="lg"
            disabled={checkinLoading}
            onClick={onCheckin}
            className="w-full border border-amber-200/30 bg-gradient-to-r from-amber-500/20 via-violet-600/25 to-cyan-600/20 text-amber-50 shadow-[0_0_24px_rgba(251,191,36,0.15)] hover:from-amber-400/30 hover:to-cyan-500/25"
          >
            {checkinLoading ? "⏳ 時空連線中..." : "每日簽到（+1 EXP）"}
          </Button>

          <Link
            href="/village"
            className="group relative w-full overflow-hidden rounded-xl border border-white/25 px-6 py-4 text-center text-base font-semibold tracking-wide text-slate-900 shadow-[0_4px_24px_rgba(255,255,255,0.12),inset_0_1px_0_rgba(255,255,255,0.85)] transition-[transform,box-shadow] duration-200 hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background:
                "linear-gradient(165deg, #f8fafc 0%, #e2e8f0 22%, #ffffff 45%, #cbd5e1 72%, #94a3b8 100%)",
            }}
          >
            <span
              className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay transition-opacity duration-200 group-hover:opacity-55"
              style={{
                background:
                  "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.95) 42%, transparent 58%)",
              }}
              aria-hidden
            />
            <span className="relative">🏘️ 進入興趣村莊</span>
          </Link>
        </TabsContent>

        <TabsContent value="edit" className="space-y-4 pt-2">
          <form
            onSubmit={onSaveProfile}
            className="space-y-4 rounded-xl border border-white/10 bg-black/25 p-4 backdrop-blur-sm"
          >
            <div className="space-y-2">
              <label
                htmlFor="profile-bio"
                className="text-sm font-medium text-slate-200"
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
              <p className="text-xs text-slate-500">{bio.length}/500</p>
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-cyan-500/20 bg-cyan-950/15 px-3 py-3">
              <input
                type="checkbox"
                checked={igPublic}
                onChange={(e) => setIgPublic(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-cyan-500/50 accent-cyan-400"
              />
              <span>
                <span className="text-sm font-medium text-slate-100">
                  IG 公開顯示
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  開啟後於公會名片揭露 IG（@{profile.instagram_handle ?? "—"}）
                </span>
              </span>
            </label>

            <div className="space-y-2">
              <label
                htmlFor="profile-mood"
                className="text-sm font-medium text-slate-200"
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
              <p className="text-xs text-slate-500">
                儲存後 24 小時內會顯示在頂部「每日心情」
              </p>
            </div>

            <Button
              type="submit"
              className="w-full border border-violet-400/30 bg-violet-950/40 shadow-[0_0_20px_rgba(139,92,246,0.2)]"
              disabled={saving}
            >
              {saving ? "⏳ 時空連線中..." : "儲存變更"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full border-red-500/35 bg-red-950/20 text-red-100 hover:bg-red-950/35 hover:text-red-50",
        )}
        disabled={logoutLoading}
        onClick={onLogout}
      >
        {logoutLoading ? "⏳ 時空連線中..." : "🚫 結束連線 (登出)"}
      </Button>
    </main>
  );
}
