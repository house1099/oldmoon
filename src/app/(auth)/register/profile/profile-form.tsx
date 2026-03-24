"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { completeAdventurerProfile } from "@/services/adventurer-profile.action";
import { GuildAuthShell } from "@/components/auth/guild-auth-shell";
import {
  guildAuthFieldErrorClass,
  guildAuthInputStandaloneClass,
} from "@/components/auth/auth-styles";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  CORE_VALUES_QUESTIONS,
  GENDER_OPTIONS,
  INTEREST_TAG_OPTIONS,
  OFFLINE_INTENT_OPTIONS,
  ORIENTATION_OPTIONS,
  OVERSEAS_REGION_OPTION_VALUE,
  REGION_OPTIONS,
  type GenderValue,
  type InterestTagValue,
  type OfflineIntentValue,
  type OrientationValue,
  type RegionSelectValue,
} from "@/lib/constants/adventurer-questionnaire";
import { instagramHandleSchema } from "@/lib/validation/instagram-handle";
import { adventurerNicknameSchema } from "@/lib/validation/nickname";

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
  const [gender, setGender] = useState<GenderValue | "">("");
  const [region, setRegion] = useState<RegionSelectValue | "">("");
  const [overseasDetail, setOverseasDetail] = useState("");
  const [orientation, setOrientation] = useState<OrientationValue | "">("");
  const [offlineIntent, setOfflineIntent] = useState<OfflineIntentValue | "">(
    "",
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

  function resolveRegionForSubmit(): string | null {
    if (!region) return null;
    if (region === OVERSEAS_REGION_OPTION_VALUE) {
      const t = overseasDetail.trim();
      if (!t) return null;
      return `海外・${t}`;
    }
    return region;
  }

  const nativeSelectClass =
    "w-full bg-zinc-900/60 border border-white/10 rounded-2xl px-4 py-4 text-base focus:outline-none focus:border-white/30 appearance-none";

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
      if (!gender) {
        toast.error("請選擇性別。");
        return;
      }
      if (!region) {
        toast.error("請選擇地區。");
        return;
      }
      if (region === OVERSEAS_REGION_OPTION_VALUE) {
        if (!overseasDetail.trim()) {
          toast.error("請填寫海外地區或城市。");
          return;
        }
      }
    }
    if (step === 2) {
      if (!orientation) {
        toast.error("請選擇性向。");
        return;
      }
      if (!offlineIntent) {
        toast.error("請選擇線下意願。");
        return;
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
    if (!gender || !orientation || !offlineIntent) {
      toast.error("請完成問卷必填項目。");
      if (!gender || !region) setStep(1);
      else setStep(2);
      return;
    }
    const resolvedRegion = resolveRegionForSubmit();
    if (!resolvedRegion) {
      toast.error(
        region === OVERSEAS_REGION_OPTION_VALUE
          ? "請填寫海外地區或城市。"
          : "請選擇地區。",
      );
      setStep(1);
      return;
    }
    setLoading(true);
    try {
      const result = await completeAdventurerProfile({
        nickname,
        questionnaire: {
          gender: gender as GenderValue,
          region: resolvedRegion,
          orientation: orientation as OrientationValue,
          offlineIntent: offlineIntent as OfflineIntentValue,
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
      toast.success("名冊已建立，接著選擇興趣與技能標籤！");
      router.push("/register/interests");
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
      <div className="glass-panel mb-6 flex items-center justify-center gap-2 px-4 py-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                step >= n
                  ? "bg-violet-500/25 text-violet-100 ring-1 ring-violet-400/45"
                  : "bg-zinc-800/80 text-zinc-500",
              )}
            >
              {n}
            </div>
            {n < 3 ? (
              <div
                className={cn(
                  "h-px w-6",
                  step > n ? "bg-violet-400/40" : "bg-zinc-700/60",
                )}
              />
            ) : null}
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        {step === 1 ? (
          <>
            <div className="space-y-2">
              <label
                htmlFor="nickname"
                className="text-sm font-medium text-zinc-100"
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
                  guildAuthInputStandaloneClass,
                  nicknameError &&
                    "border-red-500/50 focus-visible:ring-red-500/40",
                )}
                aria-invalid={Boolean(nicknameError)}
              />
              {nicknameError ? (
                <p className={guildAuthFieldErrorClass}>{nicknameError}</p>
              ) : null}
            </div>

            {needsProfileInstagram ? (
              <div className="glass-panel space-y-2 rounded-2xl border border-white/10 p-4">
                <label
                  htmlFor="profile-ig"
                  className="text-sm font-medium text-zinc-100"
                >
                  IG 帳號（必填）
                </label>
                <p className="text-xs text-zinc-400">
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
                    guildAuthInputStandaloneClass,
                    instagramError &&
                      "border-red-500/50 focus-visible:ring-red-500/40",
                  )}
                  aria-invalid={Boolean(instagramError)}
                />
                {instagramError ? (
                  <p className={guildAuthFieldErrorClass}>{instagramError}</p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <label
                htmlFor="gender"
                className="text-sm font-medium text-zinc-100"
              >
                性別
              </label>
              <select
                id="gender"
                name="gender"
                value={gender}
                onChange={(e) =>
                  setGender(e.target.value as GenderValue | "")
                }
                className={cn(
                  nativeSelectClass,
                  gender ? "text-white" : "text-zinc-600",
                )}
              >
                <option value="" disabled>
                  請選擇性別
                </option>
                {GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="region"
                className="text-sm font-medium text-zinc-100"
              >
                地區
              </label>
              <select
                id="region"
                name="region"
                value={region}
                onChange={(e) => {
                  const next = e.target.value as RegionSelectValue | "";
                  setRegion(next);
                  if (next !== OVERSEAS_REGION_OPTION_VALUE) {
                    setOverseasDetail("");
                  }
                }}
                className={cn(
                  nativeSelectClass,
                  region ? "text-white" : "text-zinc-600",
                )}
              >
                <option value="" disabled>
                  請選擇地區
                </option>
                {REGION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {region === OVERSEAS_REGION_OPTION_VALUE ? (
                <div className="space-y-1.5 pt-1">
                  <label
                    htmlFor="overseas-region"
                    className="text-xs text-zinc-400"
                  >
                    請填寫所在國家／城市
                  </label>
                  <Input
                    id="overseas-region"
                    value={overseasDetail}
                    onChange={(e) => setOverseasDetail(e.target.value)}
                    placeholder="例：日本東京"
                    maxLength={80}
                    className={guildAuthInputStandaloneClass}
                  />
                </div>
              ) : null}
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
              <label
                htmlFor="orientation"
                className="text-sm font-medium text-zinc-100"
              >
                性向
              </label>
              <select
                id="orientation"
                name="orientation"
                value={orientation}
                onChange={(e) =>
                  setOrientation(e.target.value as OrientationValue | "")
                }
                className={cn(
                  nativeSelectClass,
                  orientation ? "text-white" : "text-zinc-600",
                )}
              >
                <option value="" disabled>
                  請選擇性向
                </option>
                {ORIENTATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="offline"
                className="text-sm font-medium text-zinc-100"
              >
                線下意願
              </label>
              <select
                id="offline"
                name="offlineIntent"
                value={offlineIntent}
                onChange={(e) =>
                  setOfflineIntent(e.target.value as OfflineIntentValue | "")
                }
                className={cn(
                  nativeSelectClass,
                  offlineIntent ? "text-white" : "text-zinc-600",
                )}
              >
                <option value="" disabled>
                  請選擇
                </option>
                {OFFLINE_INTENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="glass-panel space-y-4 rounded-2xl border border-white/10 p-4 pt-5">
              <p className="text-sm font-medium text-violet-100">
                核心價值觀（各選一項）
              </p>
              {CORE_VALUES_QUESTIONS.map((q, qi) => (
                <fieldset key={q.key} className="space-y-2">
                  <legend className="text-sm text-zinc-200">
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
                            "rounded-xl border px-3 py-2 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500/50",
                            selected
                              ? "border-violet-400/55 bg-violet-950/45 text-violet-50 shadow-md shadow-violet-950/25"
                              : "border-zinc-700/80 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
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
          <div className="glass-panel space-y-3 rounded-2xl border border-white/10 p-4">
            <p className="text-sm font-medium text-zinc-100">
              技能與興趣（點選標籤，至少 1 個、最多 12 個）
            </p>
            <p className="text-xs text-zinc-400">
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
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500/50",
                      on
                        ? "border-violet-400/55 bg-violet-950/50 text-violet-100 shadow-md shadow-violet-950/20"
                        : "tag-gold border-amber-600/45",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex gap-3 border-t border-white/10 pt-4">
          {step < 3 ? (
            <>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={goBack}
                  disabled={loading}
                  className="flex-1 rounded-full bg-zinc-800 py-4 text-sm font-medium text-white transition-all hover:bg-zinc-700 active:scale-95 disabled:opacity-40"
                >
                  上一步
                </button>
              ) : null}
              <button
                type="button"
                onClick={goNext}
                disabled={loading}
                className={cn(
                  "rounded-full bg-violet-600 py-4 text-sm font-medium text-white transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-40",
                  step > 1 ? "flex-1" : "w-full",
                )}
              >
                下一步
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={goBack}
                disabled={loading}
                className="flex-1 rounded-full bg-zinc-800 py-4 text-sm font-medium text-white transition-all hover:bg-zinc-700 active:scale-95 disabled:opacity-40"
              >
                上一步
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-full bg-violet-600 py-4 text-sm font-medium text-white transition-all hover:bg-violet-500 active:scale-95 disabled:opacity-40"
              >
                {loading ? "⏳ 傳輸中..." : "完成並進入公會"}
              </button>
            </>
          )}
        </div>
      </form>
    </GuildAuthShell>
  );
}
