"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RegistrationStepIndicator } from "@/components/auth/registration-step-indicator";
import TagSelector from "@/components/register/TagSelector";
import { SKILL_CATEGORIES } from "@/lib/constants/tags";
import { completeRegistration } from "@/services/register.action";

export default function SkillsPage() {
  const router = useRouter();
  const [skillsOffer, setSkillsOffer] = useState<string[]>([]);
  const [skillsWant, setSkillsWant] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  function readInterestsFromSession(): string[] {
    try {
      const raw = sessionStorage.getItem("reg_interests");
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      return Array.isArray(parsed) &&
        parsed.every((t): t is string => typeof t === "string")
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  async function handleComplete() {
    setSubmitting(true);
    const interests = readInterestsFromSession();

    const result = await completeRegistration({
      interests,
      skills_offer: skillsOffer,
      skills_want: skillsWant,
    });
    try {
      sessionStorage.removeItem("reg_interests");
    } catch {
      /* ignore */
    }
    setSubmitting(false);
    if (result.ok) {
      setShowWelcomeModal(true);
    } else {
      toast.error(result.error ?? "儲存失敗，請稍後再試");
    }
  }

  async function handleSkip() {
    setSubmitting(true);
    const interests = readInterestsFromSession();

    const result = await completeRegistration({
      interests,
      skills_offer: [],
      skills_want: [],
    });
    try {
      sessionStorage.removeItem("reg_interests");
    } catch {
      /* ignore */
    }
    setSubmitting(false);
    if (result.ok) {
      setShowWelcomeModal(true);
    } else {
      toast.error(result.error ?? "儲存失敗，請稍後再試");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="glass-panel mx-auto max-w-lg space-y-5 p-6">
        <RegistrationStepIndicator activeStep={5} />

        <div className="space-y-1 text-center">
          <h2 className="text-lg font-bold text-white">⚔️ 技能市集</h2>
          <p className="text-xs text-zinc-400">
            分享你的技能，或找到學習夥伴
          </p>
          <p className="text-xs text-zinc-500">
            可以跳過，之後在個人頁面隨時補填
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-amber-400">
              ⚡ 我能教
            </span>
            <span className="text-xs text-zinc-500">
              已選 {skillsOffer.length} 個
            </span>
          </div>
          <TagSelector
            categories={SKILL_CATEGORIES}
            selected={skillsOffer}
            onChange={setSkillsOffer}
            customAllowed
            maxCustom={3}
          />
        </div>

        <div className="border-t border-white/10" />

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-sky-400">
              📖 我想學
            </span>
            <span className="text-xs text-zinc-500">
              已選 {skillsWant.length} 個
            </span>
          </div>
          <TagSelector
            categories={SKILL_CATEGORIES}
            selected={skillsWant}
            onChange={setSkillsWant}
            customAllowed
            maxCustom={3}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/register/interests")}
            disabled={submitting}
            className="flex-1 rounded-full bg-zinc-800 py-4 text-sm font-medium text-white transition-all hover:bg-zinc-700 active:scale-95 disabled:opacity-40"
          >
            上一步
          </button>
          <button
            type="button"
            onClick={() => void handleComplete()}
            disabled={submitting}
            className="flex-1 rounded-full bg-violet-600 py-4 text-sm font-medium text-white transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-40"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                儲存中…
              </span>
            ) : (
              "完成並進入公會"
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleSkip()}
          disabled={submitting}
          className="w-full py-3 text-sm text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-40"
        >
          跳過技能，直接完成 →
        </button>
      </div>

      {showWelcomeModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm space-y-6 p-8 text-center">
            <div className="space-y-2">
              <p className="text-5xl">🎉</p>
              <h2 className="text-xl font-bold text-white">
                歡迎加入傳奇公會！
              </h2>
              <p className="text-sm text-zinc-400">
                你的冒險者名冊已建立完成
              </p>
            </div>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  router.push("/");
                  router.refresh();
                }}
                className="w-full rounded-full bg-violet-600 py-4 text-sm font-bold text-white transition-all hover:bg-violet-500 active:scale-95"
              >
                ⚔️ 進入傳奇公會
              </button>
              <button
                type="button"
                onClick={() => {
                  router.push("/register/matchmaking");
                  router.refresh();
                }}
                className="w-full rounded-full border border-rose-500/40 py-4 text-sm text-rose-300 transition-all hover:bg-rose-500/10 active:scale-95"
              >
                💕 繼續填寫月老配對資料
              </button>
              <p className="text-xs text-zinc-600">
                月老配對讓專屬月老為你媒合對象
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
