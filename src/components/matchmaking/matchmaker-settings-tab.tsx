"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoadingButton from "@/components/ui/LoadingButton";
import { useMyProfile } from "@/hooks/useMyProfile";
import { cn } from "@/lib/utils";
import {
  AGE_MODE_LABELS,
  ALL_TAIWAN_CITIES,
  formatRegionPrefSummary,
  parseRegionPref,
  TAIWAN_REGIONS,
} from "@/lib/utils/matchmaker-region";
import { getMatchmakerAgeMaxAction } from "@/services/system-settings.action";
import { updateMyProfile } from "@/services/profile-update.action";

export function MatchmakerSettingsTab() {
  const router = useRouter();
  const { profile, mutate: mutateProfile } = useMyProfile();

  const [ageMax, setAgeMax] = useState(30);
  const [matchmakerOptIn, setMatchmakerOptIn] = useState(true);
  const [matchmakerOptInSaving, setMatchmakerOptInSaving] = useState(false);

  const [relationshipConfirmOpen, setRelationshipConfirmOpen] = useState(false);
  const [pendingRelationshipStatus, setPendingRelationshipStatus] = useState<
    "single" | "not_single"
  >("single");
  const [savingRelationship, setSavingRelationship] = useState(false);

  const [ageMode, setAgeMode] = useState<"older" | "younger" | "both">("both");
  const [olderInput, setOlderInput] = useState("10");
  const [youngerInput, setYoungerInput] = useState("10");
  const [savingOlder, setSavingOlder] = useState(false);
  const [savingYounger, setSavingYounger] = useState(false);

  const [regionPrefModalOpen, setRegionPrefModalOpen] = useState(false);
  const [regionDraftAll, setRegionDraftAll] = useState(true);
  const [regionDraftSet, setRegionDraftSet] = useState<Set<string>>(
    () => new Set(),
  );
  const [savingRegionPref, setSavingRegionPref] = useState(false);

  useEffect(() => {
    void getMatchmakerAgeMaxAction().then(setAgeMax).catch(() => setAgeMax(30));
  }, []);

  useEffect(() => {
    if (!profile) return;
    setMatchmakerOptIn(profile.matchmaker_opt_in ?? true);
    setAgeMode(profile.matchmaker_age_mode ?? "both");
    setOlderInput(String(profile.matchmaker_age_older ?? 10));
    setYoungerInput(String(profile.matchmaker_age_younger ?? 10));
  }, [profile]);

  const openRegionPrefModal = useCallback(() => {
    if (!profile) return;
    const prefs = parseRegionPref(profile.matchmaker_region_pref ?? '["all"]');
    if (prefs.includes("all") || prefs.length === 0) {
      setRegionDraftAll(true);
      setRegionDraftSet(new Set());
    } else {
      setRegionDraftAll(false);
      const next = new Set<string>();
      const allowed = ALL_TAIWAN_CITIES as readonly string[];
      for (const p of prefs) {
        if (typeof p === "string" && allowed.includes(p)) next.add(p);
      }
      setRegionDraftSet(next);
    }
    setRegionPrefModalOpen(true);
  }, [profile]);

  function toggleRegionCity(city: string) {
    setRegionDraftAll(false);
    setRegionDraftSet((prev) => {
      const n = new Set(prev);
      if (n.has(city)) n.delete(city);
      else n.add(city);
      return n;
    });
  }

  async function onMatchmakerOptInChange(checked: boolean) {
    const prev = matchmakerOptIn;
    setMatchmakerOptIn(checked);
    setMatchmakerOptInSaving(true);
    try {
      const result = await updateMyProfile({ matchmaker_opt_in: checked });
      if (result.ok === false) {
        setMatchmakerOptIn(prev);
        toast.error(result.error ?? "❌ 操作失敗，請稍後再試");
        return;
      }
      toast.success(checked ? "已開啟月老配對池" : "已關閉月老配對池");
      router.refresh();
      await mutateProfile();
    } finally {
      setMatchmakerOptInSaving(false);
    }
  }

  async function confirmRelationshipChange() {
    setSavingRelationship(true);
    try {
      const result = await updateMyProfile({
        relationship_status: pendingRelationshipStatus,
      });
      if (result.ok === false) {
        toast.error(result.error ?? "❌ 操作失敗，請稍後再試");
        return;
      }
      toast.success("感情狀態已更新");
      setRelationshipConfirmOpen(false);
      await mutateProfile();
      router.refresh();
    } finally {
      setSavingRelationship(false);
    }
  }

  async function saveRegionPref() {
    const json =
      regionDraftAll || regionDraftSet.size === 0
        ? '["all"]'
        : JSON.stringify(Array.from(regionDraftSet));
    setSavingRegionPref(true);
    try {
      const result = await updateMyProfile({ matchmaker_region_pref: json });
      if (result.ok === false) {
        toast.error(result.error ?? "❌ 操作失敗，請稍後再試");
        return;
      }
      toast.success("地區偏好已更新");
      setRegionPrefModalOpen(false);
      await mutateProfile();
      router.refresh();
    } finally {
      setSavingRegionPref(false);
    }
  }

  async function applyAgeMode(mode: "older" | "younger" | "both") {
    if (mode === ageMode) return;
    setAgeMode(mode);
    const result = await updateMyProfile({ matchmaker_age_mode: mode });
    if (result.ok === false) {
      toast.error(result.error ?? "更新失敗");
      if (profile) setAgeMode(profile.matchmaker_age_mode ?? "both");
      return;
    }
    toast.success("年齡模式已更新");
    await mutateProfile();
    router.refresh();
  }

  async function confirmOlderPref() {
    const digits = olderInput.replace(/\D/g, "");
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n) || n < 1 || n > ageMax) {
      toast.error(`請輸入 1～${ageMax} 的正整數`);
      return;
    }
    setSavingOlder(true);
    try {
      const result = await updateMyProfile({ matchmaker_age_older: n });
      if (result.ok === false) {
        toast.error(result.error ?? "❌ 操作失敗，請稍後再試");
        return;
      }
      toast.success("年長差距已更新");
      await mutateProfile();
      router.refresh();
    } finally {
      setSavingOlder(false);
    }
  }

  async function confirmYoungerPref() {
    const digits = youngerInput.replace(/\D/g, "");
    const n = parseInt(digits, 10);
    if (!Number.isFinite(n) || n < 1 || n > ageMax) {
      toast.error(`請輸入 1～${ageMax} 的正整數`);
      return;
    }
    setSavingYounger(true);
    try {
      const result = await updateMyProfile({ matchmaker_age_younger: n });
      if (result.ok === false) {
        toast.error(result.error ?? "❌ 操作失敗，請稍後再試");
        return;
      }
      toast.success("年輕差距已更新");
      await mutateProfile();
      router.refresh();
    } finally {
      setSavingYounger(false);
    }
  }

  async function confirmBothPrefs() {
    const o = parseInt(olderInput.replace(/\D/g, ""), 10);
    const y = parseInt(youngerInput.replace(/\D/g, ""), 10);
    if (!Number.isFinite(o) || o < 1 || o > ageMax) {
      toast.error(`年長差距須為 1～${ageMax}`);
      return;
    }
    if (!Number.isFinite(y) || y < 1 || y > ageMax) {
      toast.error(`年輕差距須為 1～${ageMax}`);
      return;
    }
    setSavingOlder(true);
    setSavingYounger(true);
    try {
      const result = await updateMyProfile({
        matchmaker_age_older: o,
        matchmaker_age_younger: y,
      });
      if (result.ok === false) {
        toast.error(result.error ?? "❌ 操作失敗，請稍後再試");
        return;
      }
      toast.success("年齡偏好已更新");
      await mutateProfile();
      router.refresh();
    } finally {
      setSavingOlder(false);
      setSavingYounger(false);
    }
  }

  if (!profile) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">載入中…</p>
    );
  }

  const busyBase =
    matchmakerOptInSaving ||
    savingRelationship ||
    savingOlder ||
    savingYounger ||
    savingRegionPref;

  return (
    <div className="space-y-3 px-4 pb-8">
      <div className="mb-3 rounded-2xl border border-zinc-800/40 bg-zinc-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-1 items-baseline gap-2">
            <p className="whitespace-nowrap text-sm font-medium text-white">
              月老配對池
            </p>
            <p className="text-xs text-zinc-500">
              關閉後將不會出現在其他人的月老魚結果中
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={matchmakerOptIn}
            aria-label={matchmakerOptIn ? "月老配對池：開啟" : "月老配對池：關閉"}
            disabled={busyBase}
            onClick={() => void onMatchmakerOptInChange(!matchmakerOptIn)}
            className={cn(
              "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50",
              matchmakerOptIn ? "bg-blue-500" : "bg-zinc-600",
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200",
                matchmakerOptIn ? "translate-x-6" : "translate-x-1",
              )}
            />
          </button>
        </div>
      </div>

      <div className="mb-3 rounded-2xl border border-zinc-800/40 bg-zinc-900/60 p-4">
        <div className="mb-2 flex flex-wrap items-baseline gap-2">
          <p className="whitespace-nowrap text-sm font-medium text-white">
            感情狀態
          </p>
          <p className="text-xs text-zinc-500">僅用於月老配對，不公開顯示</p>
        </div>
        <div className="space-y-2">
          <div className="flex gap-3">
            <button
              type="button"
              disabled={busyBase}
              onClick={() => {
                if (profile.relationship_status === "single") return;
                setPendingRelationshipStatus("single");
                setRelationshipConfirmOpen(true);
              }}
              className={cn(
                "flex-1 rounded-full px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50",
                profile.relationship_status === "single"
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400",
              )}
            >
              💚 單身中
            </button>
            <button
              type="button"
              disabled={busyBase}
              onClick={() => {
                if (profile.relationship_status === "not_single") return;
                setPendingRelationshipStatus("not_single");
                setRelationshipConfirmOpen(true);
              }}
              className={cn(
                "flex-1 rounded-full px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50",
                profile.relationship_status === "not_single"
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-800 text-zinc-400",
              )}
            >
              💔 非單身
            </button>
          </div>
        </div>
      </div>

      <div className="mb-3 rounded-2xl border border-zinc-800/40 bg-zinc-900/60 p-4">
        <div className="mb-2 flex flex-wrap items-baseline gap-2">
          <p className="whitespace-nowrap text-sm font-medium text-white">
            年齡偏好
          </p>
          <p className="text-xs text-zinc-500">後台設定最大差距為 {ageMax} 歲</p>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["older", AGE_MODE_LABELS.older],
                ["younger", AGE_MODE_LABELS.younger],
                ["both", AGE_MODE_LABELS.both],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                disabled={busyBase}
                onClick={() => void applyAgeMode(key)}
                className={cn(
                  "rounded-full border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50",
                  ageMode === key
                    ? "border-violet-400 bg-violet-600/80 text-white"
                    : "border-zinc-700 bg-zinc-800/60 text-zinc-400",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {ageMode === "older" ? (
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-zinc-300">
                比我年長最多
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={olderInput}
                onChange={(e) =>
                  setOlderInput(e.target.value.replace(/\D/g, "").slice(0, 2))
                }
                className="min-w-0 w-16 rounded-full border border-white/10 bg-zinc-900/60 px-3 py-2 text-center text-sm text-white outline-none focus:border-white/30"
              />
              <span className="text-sm text-zinc-400">歲</span>
              <Button
                type="button"
                size="sm"
                disabled={busyBase}
                onClick={() => void confirmOlderPref()}
                className="rounded-full bg-violet-600"
              >
                確認
              </Button>
            </div>
          ) : null}

          {ageMode === "younger" ? (
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-zinc-300">
                比我年輕最多
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={youngerInput}
                onChange={(e) =>
                  setYoungerInput(e.target.value.replace(/\D/g, "").slice(0, 2))
                }
                className="min-w-0 w-16 rounded-full border border-white/10 bg-zinc-900/60 px-3 py-2 text-center text-sm text-white outline-none focus:border-white/30"
              />
              <span className="text-sm text-zinc-400">歲</span>
              <Button
                type="button"
                size="sm"
                disabled={busyBase}
                onClick={() => void confirmYoungerPref()}
                className="rounded-full bg-violet-600"
              >
                確認
              </Button>
            </div>
          ) : null}

          {ageMode === "both" ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-zinc-300">比我年長最多</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={olderInput}
                  onChange={(e) =>
                    setOlderInput(e.target.value.replace(/\D/g, "").slice(0, 2))
                  }
                  className="w-16 rounded-full border border-white/10 bg-zinc-900/60 px-3 py-2 text-center text-sm text-white outline-none focus:border-white/30"
                />
                <span className="text-sm text-zinc-400">歲</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-zinc-300">比我年輕最多</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={youngerInput}
                  onChange={(e) =>
                    setYoungerInput(
                      e.target.value.replace(/\D/g, "").slice(0, 2),
                    )
                  }
                  className="w-16 rounded-full border border-white/10 bg-zinc-900/60 px-3 py-2 text-center text-sm text-white outline-none focus:border-white/30"
                />
                <span className="text-sm text-zinc-400">歲</span>
                <Button
                  type="button"
                  size="sm"
                  disabled={busyBase}
                  onClick={() => void confirmBothPrefs()}
                  className="rounded-full bg-violet-600"
                >
                  確認
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mb-3 rounded-2xl border border-zinc-800/40 bg-zinc-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="whitespace-nowrap text-sm font-medium text-white">
              地區偏好
            </p>
            <p className="text-xs text-zinc-500">
              {formatRegionPrefSummary(
                profile.matchmaker_region_pref ?? '["all"]',
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={busyBase}
            onClick={openRegionPrefModal}
            className="shrink-0 whitespace-nowrap rounded-full border border-zinc-700/60 px-3 py-1.5 text-sm text-violet-300 transition hover:bg-white/5 disabled:opacity-50"
          >
            設定 ›
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          以上設定僅用於月老釣魚配對，不會公開顯示在你的個人卡片上
        </p>
      </div>

      <MatchmakerProfileForm profile={profile} mutateProfile={mutateProfile} busy={busyBase} />

      <AlertDialog
        open={relationshipConfirmOpen}
        onOpenChange={setRelationshipConfirmOpen}
      >
        <AlertDialogContent className="border-zinc-700 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>確認變更感情狀態？</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {pendingRelationshipStatus === "single"
                ? "將設為 💚 單身中。"
                : "將設為 💔 非單身。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800">
              取消
            </AlertDialogCancel>
            <button
              type="button"
              disabled={savingRelationship}
              onClick={() => void confirmRelationshipChange()}
              className="inline-flex h-10 items-center justify-center rounded-md bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:pointer-events-none disabled:opacity-50"
            >
              {savingRelationship ? "處理中…" : "確認"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={regionPrefModalOpen} onOpenChange={setRegionPrefModalOpen}>
        <DialogContent className="flex max-h-[min(85vh,560px)] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden border-zinc-700 bg-zinc-950 p-0 text-zinc-100 sm:max-w-md">
          <DialogHeader className="shrink-0 border-b border-white/10 px-4 pb-3 pt-4">
            <DialogTitle className="text-zinc-100">選擇偏好地區</DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              可複選，未選擇任何地區視為全台不限
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <button
              type="button"
              onClick={() => {
                setRegionDraftAll(true);
                setRegionDraftSet(new Set());
              }}
              className={cn(
                "w-full rounded-full border px-4 py-3 text-sm font-medium transition-colors",
                regionDraftAll
                  ? "border-violet-400 bg-violet-600/80 text-white"
                  : "border-zinc-700 bg-zinc-800/60 text-zinc-400",
              )}
            >
              全台不限
            </button>

            {(
              [
                ["north", "北部", TAIWAN_REGIONS.north],
                ["central", "中部", TAIWAN_REGIONS.central],
                ["south", "南部", TAIWAN_REGIONS.south],
                ["east", "東部／離島", TAIWAN_REGIONS.east],
              ] as const
            ).map(([key, label, cities]) => (
              <div key={key} className="space-y-2">
                <p className="text-xs text-zinc-500">{label}</p>
                <div className="flex flex-wrap gap-2">
                  {cities.map((city) => {
                    const selected =
                      !regionDraftAll && regionDraftSet.has(city);
                    return (
                      <button
                        key={city}
                        type="button"
                        onClick={() => toggleRegionCity(city)}
                        className={cn(
                          "rounded-full border px-3 py-2 text-xs transition-colors",
                          selected
                            ? "border-violet-400 bg-violet-600/80 text-white"
                            : "border-zinc-700 bg-zinc-800/60 text-zinc-400",
                        )}
                      >
                        {city}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="shrink-0 border-t border-white/10 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <LoadingButton
              className="w-full rounded-full bg-violet-600 py-2.5 text-white hover:bg-violet-500"
              loading={savingRegionPref}
              loadingText="儲存中…"
              onClick={() => void saveRegionPref()}
            >
              確認儲存
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 配對條件設定表單 ──

const ZODIAC_LIST = [
  "牡羊座", "金牛座", "雙子座", "巨蟹座", "獅子座", "處女座",
  "天秤座", "天蠍座", "射手座", "摩羯座", "水瓶座", "雙魚座",
] as const;

const DIET_OPTIONS = [
  "葷食(無禁忌)", "不吃牛", "不吃海鮮", "葷不排斥素",
  "方便素/鍋邊素", "嚴格素食(蛋奶素/全素)", "素不排斥葷",
] as const;

const PET_OPTIONS = ["無", "貓", "狗", "兔", "鼠", "鳥", "魚", "爬蟲/蛇/蜥蜴"] as const;
const ACCEPT_PET_OPTIONS = ["都可以", "貓", "狗", "兔鼠鳥魚等小動物", "爬蟲"] as const;

type UserRow = NonNullable<ReturnType<typeof useMyProfile>["profile"]>;

function MatchmakerProfileForm({
  profile,
  mutateProfile,
  busy,
}: {
  profile: UserRow;
  mutateProfile: () => Promise<unknown>;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const save = useCallback(
    async (patch: Parameters<typeof updateMyProfile>[0]) => {
      const result = await updateMyProfile(patch);
      if (result.ok) {
        toast.success("已更新");
        await mutateProfile();
      } else {
        toast.error(result.error ?? "更新失敗");
      }
    },
    [mutateProfile],
  );

  const myPetsSet = useMemo(() => {
    const raw = profile.my_pets ?? "";
    if (!raw) return new Set<string>();
    return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
  }, [profile.my_pets]);

  const acceptPetsSet = useMemo(() => {
    const raw = profile.accept_pets ?? "";
    if (!raw) return new Set<string>();
    return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
  }, [profile.accept_pets]);

  const excludeZodiacSet = useMemo(() => {
    const raw = profile.exclude_zodiac ?? "";
    if (!raw) return new Set<string>();
    return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
  }, [profile.exclude_zodiac]);

  function toggleMulti(
    current: Set<string>,
    value: string,
    fieldName: "my_pets" | "accept_pets" | "exclude_zodiac",
  ) {
    const next = new Set(current);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    const joined = Array.from(next).join(",");
    void save({ [fieldName]: joined || "" });
  }

  const cardCls =
    "rounded-2xl border border-zinc-800/40 bg-zinc-900/60 p-4 space-y-3";
  const labelCls = "text-sm font-medium text-white";
  const subLabelCls = "text-xs text-zinc-500";
  const selectCls =
    "w-full rounded-full border border-white/10 bg-zinc-900/60 px-4 py-2.5 text-sm text-white outline-none focus:border-white/30 appearance-none";

  const capsule = (selected: boolean) =>
    cn(
      "rounded-full border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50",
      selected
        ? "border-violet-400 bg-violet-600/80 text-white"
        : "border-zinc-700 bg-zinc-800/60 text-zinc-400",
    );

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center justify-between rounded-2xl border border-zinc-800/40 bg-zinc-900/60 px-4 py-3"
      >
        <div className="text-left">
          <p className="text-sm font-medium text-white">
            💘 配對條件設定（選填）
          </p>
          {!expanded && (
            <p className="mt-0.5 text-xs text-zinc-500">
              填寫越完整，配對越精準。未填寫的條件不會影響配對
            </p>
          )}
        </div>
        <span className="shrink-0 text-zinc-500">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="space-y-3">
          {/* 飲食習慣 */}
          <div className={cardCls}>
            <p className={labelCls}>🥗 飲食習慣</p>
            <select
              className={selectCls}
              disabled={busy}
              value={profile.diet_type ?? ""}
              onChange={(e) => void save({ diet_type: e.target.value })}
            >
              <option value="">請選擇</option>
              {DIET_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* 抽菸習慣 */}
          <div className={cardCls}>
            <p className={labelCls}>🚬 抽菸習慣</p>
            <div>
              <p className={subLabelCls}>自身抽菸</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {(["我不抽菸", "我抽電子菸/加熱菸", "我抽傳統紙菸"] as const).map(
                  (opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={busy}
                      className={capsule(profile.smoking_habit === opt)}
                      onClick={() => void save({ smoking_habit: opt })}
                    >
                      {opt}
                    </button>
                  ),
                )}
              </div>
            </div>
            <div>
              <p className={subLabelCls}>接受對方</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {(["都可以接受", "只要不是傳統紙菸", "絕對無法接受"] as const).map(
                  (opt) => (
                    <button
                      key={opt}
                      type="button"
                      disabled={busy}
                      className={capsule(profile.accept_smoking === opt)}
                      onClick={() => void save({ accept_smoking: opt })}
                    >
                      {opt}
                    </button>
                  ),
                )}
              </div>
            </div>
          </div>

          {/* 寵物 */}
          <div className={cardCls}>
            <p className={labelCls}>🐾 寵物</p>
            <div>
              <p className={subLabelCls}>自身寵物（可複選）</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {PET_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={busy}
                    className={capsule(myPetsSet.has(opt))}
                    onClick={() => toggleMulti(myPetsSet, opt, "my_pets")}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={subLabelCls}>接受對方寵物（可複選）</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {ACCEPT_PET_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={busy}
                    className={capsule(acceptPetsSet.has(opt))}
                    onClick={() =>
                      toggleMulti(acceptPetsSet, opt, "accept_pets")
                    }
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 自身狀況 */}
          <div className={cardCls}>
            <p className={labelCls}>👨‍👩‍👦 自身狀況</p>
            <div>
              <p className={subLabelCls}>自身</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {(["單身且無子女", "單親且有子女"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={busy}
                    className={capsule(profile.has_children === opt)}
                    onClick={() => void save({ has_children: opt })}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={subLabelCls}>接受對方</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {(["可以接受", "暫不考慮"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={busy}
                    className={capsule(profile.accept_single_parent === opt)}
                    onClick={() => void save({ accept_single_parent: opt })}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 生育意願 */}
          <div className={cardCls}>
            <p className={labelCls}>🍼 生育意願</p>
            <div>
              <p className={subLabelCls}>自身意願</p>
              <select
                className={cn(selectCls, "mt-1")}
                disabled={busy}
                value={profile.fertility_self ?? ""}
                onChange={(e) => void save({ fertility_self: e.target.value })}
              >
                <option value="">請選擇</option>
                <option value="希望有小孩">希望有小孩</option>
                <option value="不想要小孩">不想要小孩</option>
                <option value="隨緣都可以">隨緣都可以</option>
              </select>
            </div>
            <div>
              <p className={subLabelCls}>希望對方</p>
              <select
                className={cn(selectCls, "mt-1")}
                disabled={busy}
                value={profile.fertility_pref ?? ""}
                onChange={(e) => void save({ fertility_pref: e.target.value })}
              >
                <option value="">請選擇</option>
                <option value="一定要想要小孩">一定要想要小孩</option>
                <option value="一定要不想要小孩">一定要不想要小孩</option>
                <option value="隨緣都沒關係">隨緣都沒關係</option>
              </select>
            </div>
          </div>

          {/* 婚姻觀念 */}
          <div className={cardCls}>
            <p className={labelCls}>💍 婚姻觀念</p>
            <div className="flex flex-wrap gap-2">
              {(["堅持不婚主義", "遇到對的人不排斥結婚"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  disabled={busy}
                  className={capsule(profile.marriage_view === opt)}
                  onClick={() => void save({ marriage_view: opt })}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* 星座 */}
          <div className={cardCls}>
            <p className={labelCls}>♈ 星座</p>
            <div>
              <p className={subLabelCls}>我的星座</p>
              <select
                className={cn(selectCls, "mt-1")}
                disabled={busy}
                value={profile.zodiac ?? ""}
                onChange={(e) => void save({ zodiac: e.target.value })}
              >
                <option value="">請選擇</option>
                {ZODIAC_LIST.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
            <div>
              <p className={subLabelCls}>排除星座（可複選）</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className={capsule(excludeZodiacSet.has("不介意"))}
                  onClick={() =>
                    toggleMulti(excludeZodiacSet, "不介意", "exclude_zodiac")
                  }
                >
                  不介意
                </button>
                {ZODIAC_LIST.map((z) => (
                  <button
                    key={z}
                    type="button"
                    disabled={busy}
                    className={capsule(excludeZodiacSet.has(z))}
                    onClick={() =>
                      toggleMulti(excludeZodiacSet, z, "exclude_zodiac")
                    }
                  >
                    {z}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 三觀量表 */}
          <div className={cardCls}>
            <p className={labelCls}>🧭 三觀（1-5）</p>
            <p className={subLabelCls}>
              選擇最符合你的數值，僅在後台開啟三觀篩選時生效
            </p>
            <VScaleRow
              label="V1 金錢觀"
              hint="1=AA制 ↔ 5=全包"
              value={profile.v1_money}
              disabled={busy}
              onSelect={(n) => void save({ v1_money: n })}
            />
            <VScaleRow
              label="V3 黏人程度"
              hint="1=很獨立 ↔ 5=超黏"
              value={profile.v3_clingy}
              disabled={busy}
              onSelect={(n) => void save({ v3_clingy: n })}
            />
            <VScaleRow
              label="V4 衝突處理"
              hint="1=需冷靜 ↔ 5=必講開"
              value={profile.v4_conflict}
              disabled={busy}
              onSelect={(n) => void save({ v4_conflict: n })}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function VScaleRow({
  label,
  hint,
  value,
  disabled,
  onSelect,
}: {
  label: string;
  hint: string;
  value: number | null;
  disabled: boolean;
  onSelect: (n: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <p className="text-xs font-medium text-zinc-300">{label}</p>
        <p className="text-[10px] text-zinc-600">{hint}</p>
      </div>
      <div className="mt-1 flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(n)}
            className={cn(
              "h-9 w-9 rounded-full border text-xs font-medium transition-colors disabled:opacity-50",
              value === n
                ? "border-violet-400 bg-violet-600/80 text-white"
                : "border-zinc-700 bg-zinc-800/60 text-zinc-400",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export const MatchmakerSettingsPanel = MatchmakerSettingsTab;
