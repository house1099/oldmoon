"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { TagCategory } from "@/lib/constants/interests";

export type TagSelectorVariant = "violet" | "amber" | "sky";

const VARIANT_SELECTED: Record<TagSelectorVariant, string> = {
  violet:
    "bg-violet-500/60 border border-violet-400 text-white",
  amber:
    "bg-amber-500/60 border border-amber-400 text-white",
  sky: "bg-sky-500/60 border border-sky-400 text-white",
};

type Props = {
  categories: TagCategory[];
  selected: string[];
  onChange: (tags: string[]) => void;
  maxCustom?: number;
  variant?: TagSelectorVariant;
};

export function TagSelector({
  categories,
  selected,
  onChange,
  maxCustom = 3,
  variant = "violet",
}: Props) {
  const [openCategory, setOpenCategory] = useState<string | null>(
    categories[0]?.id ?? null,
  );
  const [customInput, setCustomInput] = useState("");

  const builtInTags = categories.flatMap((c) => c.tags);
  const customTags = selected.filter((t) => !builtInTags.includes(t));
  const selectedClass = VARIANT_SELECTED[variant];

  function toggle(tag: string) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  }

  function addCustom() {
    const val = customInput.trim();
    if (!val || selected.includes(val)) return;
    if (customTags.length >= maxCustom) {
      toast.error(`自訂標籤最多 ${maxCustom} 個`);
      return;
    }
    onChange([...selected, val]);
    setCustomInput("");
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400">
        已選 <span className="font-medium text-white">{selected.length}</span>{" "}
        個
      </p>

      {categories.map((cat) => (
        <div key={cat.id} className="glass-panel overflow-hidden">
          <button
            type="button"
            onClick={() =>
              setOpenCategory(openCategory === cat.id ? null : cat.id)
            }
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-white"
          >
            <span>
              {cat.emoji} {cat.label}
            </span>
            <span
              className={`text-zinc-400 transition-transform duration-200 ${
                openCategory === cat.id ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>
          {openCategory === cat.id ? (
            <div className="flex flex-wrap gap-2 px-4 pb-4">
              {cat.tags.map((tag) => {
                const isSelected = selected.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggle(tag)}
                    className={`rounded-full border px-3 py-1 text-xs transition-all active:scale-95 ${
                      isSelected
                        ? selectedClass
                        : "border-white/10 bg-zinc-800/60 text-zinc-300"
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ))}

      <div className="glass-panel space-y-3 p-4">
        <p className="text-xs text-zinc-400">
          自訂標籤（最多 {maxCustom} 個，已用 {customTags.length} 個）
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="輸入自訂標籤..."
            maxLength={10}
            disabled={customTags.length >= maxCustom}
            className="flex-1 rounded-full border border-white/10 bg-zinc-900/60 px-4 py-2 text-base text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none disabled:opacity-40"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customInput.trim() || customTags.length >= maxCustom}
            className="rounded-full bg-white/10 px-4 py-2 text-sm text-white transition-all hover:bg-white/20 active:scale-95 disabled:opacity-40"
          >
            +
          </button>
        </div>
        {customTags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {customTags.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => toggle(tag)}
                className="rounded-full border border-emerald-500/40 bg-emerald-500/30 px-3 py-1 text-xs text-emerald-200 active:scale-95"
              >
                {tag} ✕
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
