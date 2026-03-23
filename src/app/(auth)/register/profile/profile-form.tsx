"use client";

import { useRouter } from "next/navigation";
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
import { cn } from "@/lib/utils";
import {
  CORE_VALUES_QUESTIONS,
  GENDER_OPTIONS,
  INTEREST_TAG_OPTIONS,
  OFFLINE_INTENT_OPTIONS,
  ORIENTATION_OPTIONS,
  REGION_OPTIONS,
  type GenderValue,
  type InterestTagValue,
  type OfflineIntentValue,
  type OrientationValue,
  type RegionValue,
} from "@/lib/constants/adventurer-questionnaire";
import { instagramHandleSchema } from "@/lib/validation/instagram-handle";
import { adventurerNicknameSchema } from "@/lib/validation/nickname";

/** 青色霓虹聚焦（與公會 Energy 風格疊加） */
const CYAN_FOCUS =
  "guild-energy-focus focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_22px_rgba(34,211,238,0.45)]";

type ProfileFormProps = {
  /** Google OAuth 等略過註冊 Step1 時為 true，需在名冊補填 IG */
  needsProfileInstagram: boolean;
};

export function ProfileForm({ needsProfileInstagram }: ProfileFormProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [nickname, setNickname] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [instagramError, setInstagramError] = useState<string | null>(null);
  const [gender, setGender] = useState<GenderValue>(GENDER_OPTIONS[0].value);
  const [region, setRegion] = useState<RegionValue>(REGION_OPTIONS[0].value);
  const [orientation, setOrientation] = useState<OrientationValue>(
    ORIENTATION_OPTIONS[0].value,
  );
  const [offlineIntent, setOfflineIntent] = useState<OfflineIntentValue>(
    OFFLINE_INTENT_OPTIONS[0].value,
  );
  const [coreValues, setCoreValues] = useState<[string, string, string]>([
    "",
    "",
    "",
  ]);
  const [interests, setInterests] = useState<InterestTagValue[]>([]);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function setCoreAt(index: 0 | 1 | 2, value: string) {
    setCoreValues((prev) => {
      const next = [...prev] as [string, string, string];
      next[index] = value;
      return next;
    });
  }

  function toggleInterest(tag: InterestTagValue) {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  const step2Ok = coreValues.every((v) => v.length > 0);
  const step3Ok = interests.length >= 1 && interests.length <= 12;

  function goNext() {
    if (step === 1) {
      const nick = adventurerNicknameSchema.safeParse(nickname);
      if (!nick.success) {
        const msg = nick.error.issues[0]?.message ?? "暱稱無效";
        setNicknameError(msg);
        toast.error(msg);
        return;
      }
      setNicknameError(null);
      if (needsProfileInstagram) {
        const ig = instagramHandleSchema.safeParse(instagramHandle);
        if (!ig.success) {
          const msg = ig.error.issues[0]?.message ?? "IG 帳號無效";
          setInstagramError(msg);
          toast.error(msg);
          return;
        }
        setInstagramError(null);
      }
    }
    if (step === 2 && !step2Ok) {
      toast.error("請完成三題核心價值觀。");
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nick = adventurerNicknameSchema.safeParse(nickname);
    if (!nick.success) {
      const msg = nick.error.issues[0]?.message ?? "暱稱無效";
      setNicknameError(msg);
      toast.error(msg);
      setStep(1);
      return;
    }
    setNicknameError(null);
    if (needsProfileInstagram) {
      const ig = instagramHandleSchema.safeParse(instagramHandle);
      if (!ig.success) {
        const msg = ig.error.issues[0]?.message ?? "IG 帳號無效";
        setInstagramError(msg);
        toast.error(msg);
        setStep(1);
        return;
      }
      setInstagramError(null);
    }
    if (!step3Ok) {
      toast.error("請選擇 1～12 個興趣標籤。");
      return;
    }
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
        coreValues: [...coreValues],
        interests: [...interests],
        instagramHandleFromForm: needsProfileInstagram
          ? instagramHandle
          : undefined,
      });
      if (result.ok === false) {
        toast.error(result.error);
        return;
      }
      toast.success("名冊已建立，歡迎進入公會！");
      router.push("/");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <GuildAuthShell
      className="max-w-lg"
      title="冒險者名冊"
      subtitle="分步填寫，讓公會更懂你"
    >
      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                step >= n
                  ? "bg-cyan-500/25 text-cyan-200 ring-1 ring-cyan-400/50"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {n}
            </div>
            {n < 3 ? (
              <div
                className={cn(
                  "h-px w-6",
                  step > n ? "bg-cyan-400/50" : "bg-border",
                )}
              />
            ) : null}
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {step === 1 ? (
          <>
            <div className="space-y-2">
              <label
                htmlFor="nickname"
                className="text-sm font-medium text-foreground"
              >
                暱稱
              </label>
              <Input
                id="nickname"
                name="nickname"
                required
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setNicknameError(null);
                }}
                onBlur={() => {
                  const r = adventurerNicknameSchema.safeParse(nickname);
                  if (!r.success) {
                    setNicknameError(
                      r.error.issues[0]?.message ?? "暱稱含有不當用語",
                    );
                  }
                }}
                placeholder="在公會使用的稱呼"
                maxLength={32}
                className={cn(
                  CYAN_FOCUS,
                  nicknameError
                    ? "border-destructive/70 focus-visible:border-destructive focus-visible:ring-destructive/50"
                    : null,
                )}
                aria-invalid={Boolean(nicknameError)}
              />
              {nicknameError ? (
                <p className="text-xs text-destructive">{nicknameError}</p>
              ) : null}
            </div>

            {needsProfileInstagram ? (
              <div className="space-y-2">
                <label
                  htmlFor="profile-ig"
                  className="text-sm font-medium text-foreground"
                >
                  IG 帳號（必填）
                </label>
                <p className="text-xs text-muted-foreground">
                  你使用 Google 等方式註冊，請在此補上 IG，供公會名冊使用。
                </p>
                <Input
                  id="profile-ig"
                  name="instagram"
                  type="text"
                  autoComplete="username"
                  required
                  value={instagramHandle}
                  onChange={(e) => {
                    setInstagramHandle(e.target.value);
                    setInstagramError(null);
                  }}
                  onBlur={() => {
                    const r = instagramHandleSchema.safeParse(instagramHandle);
                    if (!r.success) {
                      setInstagramError(
                        r.error.issues[0]?.message ?? "IG 帳號不可含有空白",
                      );
                    }
                  }}
                  placeholder="不含空白，例：oldmoon.guild"
                  className={cn(
                    CYAN_FOCUS,
                    instagramError
                      ? "border-destructive/70 focus-visible:border-destructive focus-visible:ring-destructive/50"
                      : null,
                  )}
                  aria-invalid={Boolean(instagramError)}
                />
                {instagramError ? (
                  <p className="text-xs text-destructive">{instagramError}</p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <span
                id="gender-label"
                className="text-sm font-medium text-foreground"
              >
                性別
              </span>
              <Select
                name="gender"
                value={gender}
                onValueChange={(v) =>
                  setGender((v ?? GENDER_OPTIONS[0].value) as GenderValue)
                }
              >
                <SelectTrigger
                  id="gender"
                  className={cn("w-full", CYAN_FOCUS)}
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
              <span
                id="region-label"
                className="text-sm font-medium text-foreground"
              >
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
                  className={cn("w-full", CYAN_FOCUS)}
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
          </>
        ) : null}

        {step === 2 ? (
          <>
            {/*
              性向（異性／同性／雙性）寫入 DB `users.orientation`；
              此欄位為隱私資料，後續不在公會公開介面展示。
            */}
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
                  className={cn("w-full", CYAN_FOCUS)}
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
              <span
                id="offline-label"
                className="text-sm font-medium text-foreground"
              >
                線下意願
              </span>
              <Select
                name="offlineIntent"
                value={offlineIntent}
                onValueChange={(v) =>
                  setOfflineIntent(
                    (v ??
                      OFFLINE_INTENT_OPTIONS[0].value) as OfflineIntentValue,
                  )
                }
              >
                <SelectTrigger
                  id="offline"
                  className={cn("w-full", CYAN_FOCUS)}
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

            <div className="space-y-4 border-t border-border/60 pt-4">
              <p className="text-sm font-medium text-amber-100/90">
                核心價值觀（各選一項）
              </p>
              {CORE_VALUES_QUESTIONS.map((q, qi) => (
                <fieldset key={q.key} className="space-y-2">
                  <legend className="text-sm text-foreground/90">
                    {q.question}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {q.options.map((o) => {
                      const selected = coreValues[qi] === o.value;
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() =>
                            setCoreAt(qi as 0 | 1 | 2, o.value)
                          }
                          className={cn(
                            "rounded-lg border px-3 py-2 text-left text-sm transition-all focus-visible:outline-none",
                            CYAN_FOCUS,
                            selected
                              ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.25)]"
                              : "border-border/80 bg-background/40 text-muted-foreground hover:border-cyan-500/30 hover:text-foreground",
                          )}
                        >
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              技能與興趣（點選標籤，至少 1 個、最多 12 個）
            </p>
            <p className="text-xs text-muted-foreground">
              已選 {interests.length} 個
            </p>
            <div className="flex flex-wrap gap-2">
              {INTEREST_TAG_OPTIONS.map((o) => {
                const on = interests.includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => toggleInterest(o.value)}
                    className={cn(
                      "tag-gold rounded-full px-3 py-1.5 text-xs transition-all focus-visible:outline-none",
                      CYAN_FOCUS,
                      on &&
                        "border-cyan-400/60 bg-cyan-950/40 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.28)]",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 pt-2">
          {step < 3 ? (
            <div className="flex gap-2">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={goBack}
                  disabled={loading}
                >
                  上一步
                </Button>
              ) : null}
              <Button
                type="button"
                className="flex-1"
                onClick={goNext}
                disabled={loading}
              >
                下一步
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={goBack}
                disabled={loading}
              >
                上一步
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "⏳ 傳輸中..." : "完成並進入公會"}
              </Button>
            </div>
          )}
        </div>
      </form>
    </GuildAuthShell>
  );
}
