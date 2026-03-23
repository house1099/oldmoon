"use client";

import { useState } from "react";
import { toast } from "sonner";
import { completeAdventurerProfile } from "@/services/adventurer-profile.action";
import { GuildAuthShell } from "@/components/auth/guild-auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const selectClass = cn(
  "flex h-8 w-full min-w-0 appearance-none rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm shadow-sm outline-none transition-colors",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "dark:bg-input/30",
);

const GENDER = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "non_binary", label: "非二元" },
  { value: "prefer_not", label: "不便透露" },
] as const;

const REGION = [
  { value: "north_tw", label: "台灣 · 北部" },
  { value: "central_tw", label: "台灣 · 中部" },
  { value: "south_tw", label: "台灣 · 南部" },
  { value: "east_tw", label: "台灣 · 東部" },
  { value: "islands_tw", label: "台灣 · 離島" },
  { value: "overseas", label: "海外" },
  { value: "other", label: "其他" },
] as const;

const ORIENTATION = [
  { value: "straight", label: "異性戀" },
  { value: "gay", label: "男同志" },
  { value: "lesbian", label: "女同志" },
  { value: "bisexual", label: "雙性戀" },
  { value: "pan", label: "泛性戀" },
  { value: "asexual", label: "無性戀" },
  { value: "questioning", label: "探索中" },
  { value: "prefer_not", label: "不便透露" },
] as const;

const OFFLINE = [
  { value: "yes", label: "願意參與線下活動" },
  { value: "online_only", label: "傾向線上互動" },
  { value: "undecided", label: "尚未決定" },
] as const;

export function ProfileForm() {
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<string>(GENDER[0].value);
  const [region, setRegion] = useState<string>(REGION[0].value);
  const [orientation, setOrientation] = useState<string>(ORIENTATION[0].value);
  const [offlineIntent, setOfflineIntent] = useState<string>(OFFLINE[0].value);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await completeAdventurerProfile({
        nickname,
        questionnaire: {
          gender,
          region,
          orientation,
          offlineIntent,
        },
      });
      if (result?.ok === false) {
        toast.error(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <GuildAuthShell
      className="max-w-lg"
      title="冒險者名冊"
      subtitle="補齊資料後，公會大門將為你完全開啟"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="space-y-2">
          <label htmlFor="nickname" className="text-sm font-medium text-foreground">
            暱稱
          </label>
          <Input
            id="nickname"
            name="nickname"
            required
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="在公會使用的稱呼"
            maxLength={32}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="gender" className="text-sm font-medium text-foreground">
            性別
          </label>
          <select
            id="gender"
            name="gender"
            className={selectClass}
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            {GENDER.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="region" className="text-sm font-medium text-foreground">
            地區
          </label>
          <select
            id="region"
            name="region"
            className={selectClass}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            {REGION.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="orientation"
            className="text-sm font-medium text-foreground"
          >
            性向
          </label>
          <select
            id="orientation"
            name="orientation"
            className={selectClass}
            value={orientation}
            onChange={(e) => setOrientation(e.target.value)}
          >
            {ORIENTATION.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="offline" className="text-sm font-medium text-foreground">
            線下意願
          </label>
          <select
            id="offline"
            name="offline"
            className={selectClass}
            value={offlineIntent}
            onChange={(e) => setOfflineIntent(e.target.value)}
          >
            {OFFLINE.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" className="mt-2 w-full" size="lg" disabled={loading}>
          {loading ? "提交中…" : "完成並進入公會"}
        </Button>
      </form>
    </GuildAuthShell>
  );
}
