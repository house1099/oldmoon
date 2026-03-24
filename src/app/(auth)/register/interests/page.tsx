"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TagSelector from "@/components/register/TagSelector";
import { RegistrationStepIndicator } from "@/components/auth/registration-step-indicator";
import {
  INTEREST_CATEGORIES,
  SKILL_CATEGORIES,
} from "@/lib/constants/tags";
import { completeRegistration } from "@/services/register.action";

export default function InterestsPage() {
  const router = useRouter();
  const [interests, setInterests] = useState<string[]>([]);
  const [wantSkills, setWantSkills] = useState(false);
  const [skillsOffer, setSkillsOffer] = useState<string[]>([]);
  const [skillsWant, setSkillsWant] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"offer" | "want">("offer");
  const [submitting, setSubmitting] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("reg_interests");
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.every((t): t is string => typeof t === "string")
      ) {
        setInterests(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function handleComplete() {
    if (interests.length === 0) {
      setError("請至少選擇 1 個興趣");
      return;
    }
    setSubmitting(true);
    setError("");
    const result = await completeRegistration({
      interests,
      skills_offer: wantSkills ? skillsOffer : [],
      skills_want: wantSkills ? skillsWant : [],
    });
    setSubmitting(false);
    if (result.ok) {
      try {
        sessionStorage.removeItem("reg_interests");
      } catch {
        /* ignore */
      }
      setShowWelcomeModal(true);
    } else {
      setError(result.error ?? "儲存失敗，請稍後再試");
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="glass-panel mx-auto max-w-lg space-y-5 p-6">
        <RegistrationStepIndicator activeStep={4} />

        <div className="space-y-1 text-center">
          <h2 className="text-lg font-bold text-white">🏡 興趣與技能</h2>
          <p className="text-xs text-zinc-400">
            選擇你的興趣，讓公會更了解你
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-violet-400">
              興趣村莊
            </p>
            <span className="text-xs text-zinc-500">
              已選 {interests.length} 個（至少 1 個）
            </span>
          </div>
          <TagSelector
            categories={INTEREST_CATEGORIES}
            selected={interests}
            onChange={(tags) => {
              setInterests(tags);
              setError("");
            }}
            customAllowed
            maxCustom={3}
            maxSelect={12}
          />
        </div>

        <button
          type="button"
          onClick={() => setWantSkills(!wantSkills)}
          className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 transition-all ${
            wantSkills
              ? "border-amber-500/40 bg-amber-500/10"
              : "border-white/10 bg-zinc-900/40 hover:border-white/20"
          }`}
        >
          <div
            className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all ${
              wantSkills
                ? "border-amber-500 bg-amber-500"
                : "border-zinc-600"
            }`}
          >
            {wantSkills ? (
              <span className="text-xs font-bold text-white">✓</span>
            ) : null}
          </div>
          <div className="text-left">
            <p
              className={`text-sm font-medium transition-colors ${
                wantSkills ? "text-amber-300" : "text-zinc-300"
              }`}
            >
              ⚔️ 我也想在技能市集交流
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              分享你的技能或找人學習
            </p>
          </div>
        </button>

        {wantSkills ? (
          <div className="animate-in fade-in slide-in-from-top-2 space-y-3 duration-200">
            <div className="flex rounded-full bg-zinc-900/60 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("offer")}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                  activeTab === "offer"
                    ? "bg-amber-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                ⚡ 我能教
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("want")}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${
                  activeTab === "want"
                    ? "bg-sky-600 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                📖 我想學
              </button>
            </div>

            {activeTab === "offer" ? (
              <TagSelector
                categories={SKILL_CATEGORIES}
                selected={skillsOffer}
                onChange={setSkillsOffer}
                customAllowed
                maxCustom={3}
              />
            ) : null}
            {activeTab === "want" ? (
              <TagSelector
                categories={SKILL_CATEGORIES}
                selected={skillsWant}
                onChange={setSkillsWant}
                customAllowed
                maxCustom={3}
              />
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="text-center text-xs text-rose-400">{error}</p>
        ) : null}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-full bg-zinc-800 py-4 text-sm font-medium text-white transition-all hover:bg-zinc-700 active:scale-95"
          >
            上一步
          </button>
          <button
            type="button"
            onClick={() => void handleComplete()}
            disabled={submitting || interests.length === 0}
            className="flex-1 rounded-full bg-violet-600 py-4 text-sm font-medium text-white transition-all hover:bg-violet-500 disabled:opacity-40 active:scale-95"
          >
            {submitting ? "儲存中…" : "完成"}
          </button>
        </div>
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
                  setShowWelcomeModal(false);
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
                  setShowWelcomeModal(false);
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
