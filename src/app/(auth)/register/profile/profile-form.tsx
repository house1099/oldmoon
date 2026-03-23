"use client";

import { useState } from "react";
import { toast } from "sonner";
import { completeAdventurerProfile } from "@/services/adventurer-profile.action";
import { GuildAuthShell } from "@/components/auth/guild-auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GENDER_OPTIONS,
  OFFLINE_INTENT_OPTIONS,
  ORIENTATION_OPTIONS,
  REGION_OPTIONS,
  type GenderValue,
  type OfflineIntentValue,
  type OrientationValue,
  type RegionValue,
} from "@/lib/constants/adventurer-questionnaire";

/**
 * 選單：`SelectItem` 的 `value` 為英文 slug（送 Server Action／DB），
 * 顯示文字為繁體中文，定義於 `@/lib/constants/adventurer-questionnaire` 的 `label`。
 */
export function ProfileForm() {
  const [nickname, setNickname] = useState("");
  const [gender, setGender] = useState<GenderValue>(GENDER_OPTIONS[0].value);
  const [region, setRegion] = useState<RegionValue>(REGION_OPTIONS[0].value);
  const [orientation, setOrientation] = useState<OrientationValue>(
    ORIENTATION_OPTIONS[0].value,
  );
  const [offlineIntent, setOfflineIntent] = useState<OfflineIntentValue>(
    OFFLINE_INTENT_OPTIONS[0].value,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    console.log("表單開始送出...");
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
          <span id="gender-label" className="text-sm font-medium text-foreground">
            性別
          </span>
          <Select
            name="gender"
            value={gender}
            onValueChange={(v) => setGender((v ?? GENDER_OPTIONS[0].value) as GenderValue)}
          >
            <SelectTrigger
              id="gender"
              className="w-full"
              aria-labelledby="gender-label"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GENDER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <span id="region-label" className="text-sm font-medium text-foreground">
            地區
          </span>
          <Select
            name="region"
            value={region}
            onValueChange={(v) =>
              setRegion((v ?? REGION_OPTIONS[0].value) as RegionValue)
            }
          >
            <SelectTrigger
              id="region"
              className="w-full"
              aria-labelledby="region-label"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REGION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <span
            id="orientation-label"
            className="text-sm font-medium text-foreground"
          >
            性向
          </span>
          <Select
            name="orientation"
            value={orientation}
            onValueChange={(v) =>
              setOrientation(
                (v ?? ORIENTATION_OPTIONS[0].value) as OrientationValue,
              )
            }
          >
            <SelectTrigger
              id="orientation"
              className="w-full"
              aria-labelledby="orientation-label"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORIENTATION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <span id="offline-label" className="text-sm font-medium text-foreground">
            線下意願
          </span>
          <Select
            name="offlineIntent"
            value={offlineIntent}
            onValueChange={(v) =>
              setOfflineIntent(
                (v ?? OFFLINE_INTENT_OPTIONS[0].value) as OfflineIntentValue,
              )
            }
          >
            <SelectTrigger
              id="offline"
              className="w-full"
              aria-labelledby="offline-label"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OFFLINE_INTENT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" className="mt-2 w-full" size="lg" disabled={loading}>
          {loading ? "提交中…" : "完成並進入公會"}
        </Button>
      </form>
    </GuildAuthShell>
  );
}
