"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TagSelector from "@/components/register/TagSelector";
import { INTEREST_CATEGORIES } from "@/lib/constants/tags";

export default function InterestsPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
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
        setSelected(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function handleNext() {
    if (selected.length === 0) {
      setError("請至少選擇 1 個興趣");
      return;
    }
    sessionStorage.setItem("reg_interests", JSON.stringify(selected));
    router.push("/register/skills");
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="glass-panel mx-auto max-w-lg space-y-5 p-6">
        <div className="flex items-center justify-center gap-3">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  step <= 3
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
          <h2 className="text-lg font-bold text-white">🏡 興趣村莊</h2>
          <p className="text-xs text-zinc-400">
            選擇你的興趣，遇見同路的冒險者
          </p>
          <p className="text-xs text-zinc-500">
            已選 {selected.length} 個
            {selected.length === 0 ? "（至少選 1 個）" : ""}
          </p>
        </div>

        <TagSelector
          categories={INTEREST_CATEGORIES}
          selected={selected}
          onChange={(tags) => {
            setSelected(tags);
            setError("");
          }}
          customAllowed
          maxCustom={3}
        />

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
            onClick={handleNext}
            className="flex-1 rounded-full bg-violet-600 py-4 text-sm font-medium text-white transition-all hover:bg-violet-500 active:scale-95"
          >
            下一步
          </button>
        </div>
      </div>
    </div>
  );
}
