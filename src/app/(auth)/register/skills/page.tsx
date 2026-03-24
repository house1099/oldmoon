"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import TagSelector from "@/components/register/TagSelector";
import { SKILL_CATEGORIES } from "@/lib/constants/tags";
import { completeRegistration } from "@/services/register.action";

export default function SkillsPage() {
  const router = useRouter();
  const [skillsOffer, setSkillsOffer] = useState<string[]>([]);
  const [skillsWant, setSkillsWant] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"offer" | "want">("offer");
  const [submitting, setSubmitting] = useState(false);

  async function handleComplete(joinMatchmaking: boolean) {
    setSubmitting(true);
    try {
      let interests: string[] = [];
      try {
        const raw = sessionStorage.getItem("reg_interests");
        interests = raw ? (JSON.parse(raw) as unknown) : [];
        if (!Array.isArray(interests)) interests = [];
      } catch {
        interests = [];
      }

      if (interests.length === 0) {
        toast.error("請先完成興趣村莊標籤");
        router.push("/register/interests");
        return;
      }

      const result = await completeRegistration({
        interests,
        skills_offer: skillsOffer,
        skills_want: skillsWant,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      sessionStorage.removeItem("reg_interests");

      if (joinMatchmaking) {
        router.push("/register/matchmaking");
      } else {
        router.push("/");
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="glass-panel mx-auto max-w-lg space-y-5 p-6">
        <div className="flex items-center justify-center gap-3">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  step <= 4
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-700 text-zinc-400"
                }`}
              >
                {step}
              </div>
              {step < 4 ? <div className="h-px w-6 bg-zinc-700" /> : null}
            </div>
          ))}
        </div>

        <div className="space-y-1 text-center">
          <h2 className="text-lg font-bold text-white">⚔️ 技能市集</h2>
          <p className="text-xs text-zinc-400">
            技能可以之後再填，也可以直接跳過
          </p>
        </div>

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
            onClick={() => void handleComplete(false)}
            disabled={submitting}
            className="flex-1 rounded-full bg-violet-600 py-4 text-sm font-medium text-white transition-all hover:bg-violet-500 disabled:opacity-40 active:scale-95"
          >
            {submitting ? "儲存中…" : "完成並進入公會"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => void handleComplete(true)}
          disabled={submitting}
          className="w-full rounded-full border border-rose-500/40 py-3 text-sm text-rose-300 transition-all hover:bg-rose-500/10 active:scale-95 disabled:opacity-40"
        >
          💕 繼續填寫月老配對資料
        </button>

        <p className="text-center text-xs text-zinc-600">
          月老配對讓月老為你媒合專屬對象
        </p>
      </div>
    </div>
  );
}
