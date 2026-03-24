"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RegistrationStepIndicator } from "@/components/auth/registration-step-indicator";
import TagSelector from "@/components/register/TagSelector";
import { INTEREST_CATEGORIES } from "@/lib/constants/tags";

export default function InterestsPage() {
  const router = useRouter();
  const [interests, setInterests] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
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
    setError("");
    setSubmitting(true);
    try {
      sessionStorage.setItem("reg_interests", JSON.stringify(interests));
    } catch {
      /* ignore */
    }
    router.push("/register/skills");
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="glass-panel mx-auto max-w-lg space-y-5 p-6">
        <RegistrationStepIndicator activeStep={4} />

        <div className="space-y-1 text-center">
          <h2 className="text-lg font-bold text-white">🏡 興趣村莊</h2>
          <p className="text-xs text-zinc-400">
            選擇你的興趣，讓公會更了解你
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-violet-400">興趣村莊</p>
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

        {error ? (
          <p className="text-center text-xs text-rose-400">{error}</p>
        ) : null}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/register/profile")}
            disabled={submitting}
            className="flex-1 rounded-full bg-zinc-800 py-4 text-sm font-medium text-white transition-all hover:bg-zinc-700 active:scale-95 disabled:opacity-40"
          >
            上一步
          </button>
          <button
            type="button"
            onClick={() => void handleComplete()}
            disabled={submitting || interests.length === 0}
            className="flex-1 rounded-full bg-violet-600 py-4 text-sm font-medium text-white transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-40 disabled:active:scale-100"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                儲存中…
              </span>
            ) : (
              "下一步"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
