"use client";

import { useState } from "react";

export interface TagSelectorCategory {
  id: string;
  label: string;
  tags: string[];
}

export interface TagSelectorProps {
  categories: TagSelectorCategory[];
  selected: string[];
  onChange: (tags: string[]) => void;
  maxSelect?: number;
  customAllowed?: boolean;
  maxCustom?: number;
  /** 預設展開的分類 id；傳 `null` 表示全部收折。未傳時預設展開第一個分類 */
  defaultOpenCategory?: string | null;
}

export default function TagSelector({
  categories,
  selected,
  onChange,
  maxSelect,
  customAllowed = false,
  maxCustom = 3,
  defaultOpenCategory,
}: TagSelectorProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(
    defaultOpenCategory !== undefined
      ? defaultOpenCategory
      : (categories[0]?.id ?? null),
  );
  const [customInput, setCustomInput] = useState("");
  const builtInTags = categories.flatMap((c) => c.tags);
  const customTags = selected.filter((t) => !builtInTags.includes(t));

  function toggleTag(tag: string) {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      if (maxSelect !== undefined && selected.length >= maxSelect) return;
      onChange([...selected, tag]);
    }
  }

  function addCustomTag() {
    const val = customInput.trim();
    if (!val || customTags.length >= maxCustom) return;
    if (selected.includes(val)) return;
    if (maxSelect !== undefined && selected.length >= maxSelect) return;
    onChange([...selected, val]);
    setCustomInput("");
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
          {selected.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className="flex items-center gap-1 rounded-full border border-violet-400/50 bg-violet-500/30 px-3 py-1 text-xs text-violet-200 transition-all active:scale-95"
            >
              {tag} ✕
            </button>
          ))}
        </div>
      ) : null}

      {categories.map((cat) => (
        <div
          key={cat.id}
          className="overflow-hidden rounded-2xl border border-white/10"
        >
          <button
            type="button"
            onClick={() =>
              setOpenCategory(openCategory === cat.id ? null : cat.id)
            }
            className="flex w-full items-center justify-between bg-zinc-900/60 px-4 py-3 text-sm font-medium text-white"
          >
            <span>{cat.label}</span>
            <span
              className={`text-xs transition-transform duration-200 ${
                openCategory === cat.id ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>
          {openCategory === cat.id ? (
            <div className="flex flex-wrap gap-2 bg-zinc-950/40 p-4">
              {cat.tags.map((tag) => {
                const isSelected = selected.includes(tag);
                const isDisabled =
                  !isSelected &&
                  maxSelect !== undefined &&
                  selected.length >= maxSelect;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    disabled={isDisabled}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
                      isSelected
                        ? "border-violet-400 bg-violet-600 text-white"
                        : isDisabled
                          ? "cursor-not-allowed border-zinc-700 bg-zinc-800/50 text-zinc-600"
                          : "border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:border-violet-500/50"
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

      {customAllowed ? (
        <div className="space-y-1">
          <p className="px-1 text-xs text-zinc-500">
            自訂標籤（最多 {maxCustom} 個）
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomTag();
                }
              }}
              placeholder="輸入自訂標籤..."
              maxLength={10}
              className="flex-1 rounded-full border border-white/10 bg-zinc-900/60 px-4 py-2 text-base text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
            />
            <button
              type="button"
              onClick={addCustomTag}
              disabled={
                !customInput.trim() ||
                customTags.length >= maxCustom ||
                (maxSelect !== undefined && selected.length >= maxSelect)
              }
              className="rounded-full bg-white/10 px-4 py-2 text-sm text-white transition-all hover:bg-white/20 disabled:opacity-40"
            >
              新增
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
