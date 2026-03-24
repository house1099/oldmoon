"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TagSelector } from "@/components/onboarding/TagSelector";
import { SKILL_CATEGORIES } from "@/lib/constants/skills";
import { updateMyProfile } from "@/services/profile-update.action";

export default function SkillsWantPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleNext() {
    if (selected.length === 0) return;
    setSaving(true);
    try {
      const result = await updateMyProfile({ skills_want: selected });
      if (result.ok === false) {
        toast.error(result.error);
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen space-y-6 bg-zinc-950 px-4 py-8">
      <div className="space-y-1">
        <p className="text-xs text-zinc-500">步驟 5 / 5</p>
        <h1 className="text-xl font-bold text-white">你想學什麼？</h1>
        <p className="text-sm text-zinc-400">選擇你想學習的技能</p>
      </div>

      <TagSelector
        categories={SKILL_CATEGORIES}
        selected={selected}
        onChange={setSelected}
        variant="sky"
      />

      <button
        type="button"
        onClick={() => void handleNext()}
        disabled={selected.length === 0 || saving}
        className="w-full rounded-full bg-violet-600 py-3 font-medium text-white transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-40"
      >
        {saving ? "儲存中…" : "完成，進入公會！"}
      </button>
    </div>
  );
}
