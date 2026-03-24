"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import TagSelector from "@/components/register/TagSelector";
import { INTEREST_CATEGORIES, SKILL_CATEGORIES } from "@/lib/constants/tags";
import { updateMyProfile } from "@/services/profile-update.action";

type TabId = "interests" | "skills_offer" | "skills_want";

type Props = {
  initialInterests: string[];
  initialSkillsOffer: string[];
  initialSkillsWant: string[];
};

export function EditTagsClient({
  initialInterests,
  initialSkillsOffer,
  initialSkillsWant,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("interests");
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [skillsOffer, setSkillsOffer] = useState<string[]>(initialSkillsOffer);
  const [skillsWant, setSkillsWant] = useState<string[]>(initialSkillsWant);
  const [saving, setSaving] = useState(false);

  async function saveInterests() {
    setSaving(true);
    try {
      const result = await updateMyProfile({ interests });
      if (result.ok === false) {
        toast.error(result.error);
        return;
      }
      toast.success("興趣標籤已儲存");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function saveSkillsOffer() {
    setSaving(true);
    try {
      const result = await updateMyProfile({ skills_offer: skillsOffer });
      if (result.ok === false) {
        toast.error(result.error);
        return;
      }
      toast.success("能教標籤已儲存");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function saveSkillsWant() {
    setSaving(true);
    try {
      const result = await updateMyProfile({ skills_want: skillsWant });
      if (result.ok === false) {
        toast.error(result.error);
        return;
      }
      toast.success("想學標籤已儲存");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-white">編輯標籤</h1>
        <p className="text-sm text-zinc-400">興趣、能教、想學分開儲存</p>
      </div>

      <div className="flex gap-2 rounded-full bg-zinc-900/60 p-1">
        {(["interests", "skills_offer", "skills_want"] as const).map((tab) => (
          <button
            type="button"
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-full py-2 text-xs font-medium transition-all ${
              activeTab === tab
                ? "bg-white text-zinc-900"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {tab === "interests"
              ? "🏡 興趣"
              : tab === "skills_offer"
                ? "⚔️ 能教"
                : "📚 想學"}
          </button>
        ))}
      </div>

      {activeTab === "interests" ? (
        <div className="space-y-4">
          <TagSelector
            categories={INTEREST_CATEGORIES}
            selected={interests}
            onChange={setInterests}
            customAllowed
            maxCustom={3}
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveInterests()}
            className="w-full rounded-full bg-violet-600 py-3 font-medium text-white transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-40"
          >
            {saving ? "儲存中…" : "儲存興趣"}
          </button>
        </div>
      ) : null}

      {activeTab === "skills_offer" ? (
        <div className="space-y-4">
          <TagSelector
            categories={SKILL_CATEGORIES}
            selected={skillsOffer}
            onChange={setSkillsOffer}
            customAllowed
            maxCustom={3}
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveSkillsOffer()}
            className="w-full rounded-full bg-violet-600 py-3 font-medium text-white transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-40"
          >
            {saving ? "儲存中…" : "儲存能教"}
          </button>
        </div>
      ) : null}

      {activeTab === "skills_want" ? (
        <div className="space-y-4">
          <TagSelector
            categories={SKILL_CATEGORIES}
            selected={skillsWant}
            onChange={setSkillsWant}
            customAllowed
            maxCustom={3}
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveSkillsWant()}
            className="w-full rounded-full bg-violet-600 py-3 font-medium text-white transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-40"
          >
            {saving ? "儲存中…" : "儲存想學"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
