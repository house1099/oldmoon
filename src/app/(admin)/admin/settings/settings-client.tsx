"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  getSystemSettingsAction,
  updateSystemSettingAction,
  getStreakRewardSettingsAdminAction,
  updateStreakRewardAction,
} from "@/services/admin.action";
import {
  getProfileBannerSettingsAction,
  updateProfileBannerSettingsAction,
} from "@/services/profile-change.action";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type SettingsMap = Record<string, string>;

const PLATFORM_SETTING_FIELDS = [
  { key: "interests_max_select", label: "興趣最多可選數量", type: "number", fallback: "6" },
  { key: "skills_max_select", label: "技能最多可選數量", type: "number", fallback: "4" },
  { key: "mood_max_length", label: "心情字數上限", type: "number", fallback: "50" },
  {
    key: "tavern_message_max_length",
    label: "酒館訊息字數上限",
    type: "number",
    fallback: "50",
  },
  { key: "registration_open", label: "開放新用戶註冊", type: "boolean", fallback: "true" },
  { key: "maintenance_mode", label: "維護模式", type: "boolean", fallback: "false" },
  { key: "like_require_mutual", label: "需互讚才能申請血盟", type: "boolean", fallback: "true" },
] as const;

const FRONTEND_DISPLAY_FIELDS: {
  key: string;
  label: string;
  description: string;
  fallback: string;
  min: number;
  max: number;
}[] = [
  {
    key: "broadcast_message_max_length",
    label: "廣播字數上限",
    description: "玩家廣播訊息最多幾字",
    fallback: "50",
    min: 1,
    max: 200,
  },
  {
    key: "chat_message_max_length",
    label: "私訊字數上限",
    description: "私訊最多幾字",
    fallback: "500",
    min: 1,
    max: 1000,
  },
  {
    key: "inventory_max_slots",
    label: "背包最大格數",
    description: "玩家背包上限格數",
    fallback: "48",
    min: 16,
    max: 200,
  },
  {
    key: "bag_expansion_slots_per_use",
    label: "每次擴充格數",
    description: "購買背包擴充每次增加幾格",
    fallback: "4",
    min: 1,
    max: 20,
  },
  {
    key: "bio_field_max_length",
    label: "自介字數上限",
    description: "自白欄位最多幾字",
    fallback: "200",
    min: 50,
    max: 500,
  },
  {
    key: "nickname_max_length",
    label: "暱稱字數上限",
    description: "暱稱最多幾字",
    fallback: "32",
    min: 2,
    max: 50,
  },
];

function normalizeBoolean(value: string | undefined, fallback: string) {
  const raw = (value ?? fallback).toLowerCase();
  return raw === "true";
}

type StreakFormRow = {
  day: number;
  exp: string;
  coins: string;
  coinsMax: string;
  specialLabel: string;
};

function BroadcastStylePreview({ style }: { style: string }) {
  const st = (style || "glow").trim();
  const shell = cn(
    "flex h-10 w-full items-center gap-1.5 overflow-hidden rounded-lg border px-2 text-[11px] shadow-sm",
    st === "glow" &&
      "border-amber-500/50 bg-amber-950/90 shadow-[0_2px_12px_rgba(251,191,36,0.35)]",
    st === "flicker" &&
      "border-amber-500/50 bg-amber-950/90 shadow-[0_2px_12px_rgba(251,191,36,0.35)]",
    st === "fullscreen" &&
      "border-amber-500/50 bg-amber-950/90 shadow-[0_2px_12px_rgba(251,191,36,0.35)]",
    st === "fire" &&
      "border-orange-500/60 bg-gradient-to-r from-red-950 to-orange-950 shadow-[0_2px_12px_rgba(249,115,22,0.45)]",
    st === "lightning" &&
      "border-blue-400/60 bg-gradient-to-r from-blue-950 to-violet-950 shadow-[0_2px_12px_rgba(96,165,250,0.45)]",
    st === "flow" && "border-violet-500/40 bb-broadcast-flow-bg shadow-md",
  );
  const nick = cn(
    "shrink-0 font-semibold",
    st === "glow" && "text-amber-300",
    st === "flicker" && "text-amber-300 animate-broadcast-flicker-text",
    st === "fire" && "text-orange-300",
    st === "lightning" && "text-blue-200",
    st === "flow" &&
      "font-bold text-white [text-shadow:0_0_8px_rgba(255,255,255,0.7)]",
    st === "fullscreen" && "text-amber-300",
  );
  const msg = cn(
    "min-w-0 truncate",
    st === "glow" && "text-amber-100",
    st === "flicker" && "text-amber-100",
    st === "fire" && "text-orange-100",
    st === "lightning" && "text-blue-100",
    st === "flow" && "font-bold text-white",
    st === "fullscreen" && "text-amber-100",
  );
  return (
    <div className={shell}>
      {st === "fire" ? (
        <span className="text-xs animate-broadcast-fire-emoji" aria-hidden>
          🔥
        </span>
      ) : null}
      {st === "lightning" ? (
        <span className="text-xs animate-broadcast-lightning-emoji" aria-hidden>
          ⚡
        </span>
      ) : null}
      <span aria-hidden>📢</span>
      <span className={nick}>預覽暱稱</span>
      <span className={msg}>：廣播預覽文字</span>
      {st === "lightning" ? (
        <span className="text-xs animate-broadcast-lightning-emoji" aria-hidden>
          ⚡
        </span>
      ) : null}
      {st === "fire" ? (
        <span className="text-xs animate-broadcast-fire-emoji" aria-hidden>
          🔥
        </span>
      ) : null}
    </div>
  );
}

export default function AdminSettingsClient({ isMaster }: { isMaster: boolean }) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingsMap>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [streakRows, setStreakRows] = useState<StreakFormRow[]>([]);
  const [streakLoading, setStreakLoading] = useState(false);
  const [streakSaving, setStreakSaving] = useState(false);

  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerForce, setBannerForce] = useState(false);
  const [bannerLoading, setBannerLoading] = useState(false);
  const [bannerSavingKey, setBannerSavingKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await getSystemSettingsAction();
      if (!cancelled) {
        if (!res.ok) {
          toast.error(res.error || "讀取設定失敗");
          setLoading(false);
          return;
        }
        const map: SettingsMap = {};
        for (const row of res.data) {
          map[row.key] = row.value;
        }
        setSettings(map);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isMaster) return;
    let cancelled = false;
    void (async () => {
      setStreakLoading(true);
      const res = await getStreakRewardSettingsAdminAction();
      if (cancelled) return;
      if (!res.ok) {
        toast.error(res.error || "讀取七日獎勵失敗");
        setStreakLoading(false);
        return;
      }
      setStreakRows(
        res.data.map((r) => ({
          day: r.day,
          exp: String(r.exp),
          coins: String(r.coins),
          coinsMax: r.coinsMax == null ? "" : String(r.coinsMax),
          specialLabel: r.specialLabel ?? "",
        })),
      );
      setStreakLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isMaster]);

  useEffect(() => {
    if (!isMaster) return;
    let cancelled = false;
    void (async () => {
      setBannerLoading(true);
      try {
        const s = await getProfileBannerSettingsAction();
        if (cancelled) return;
        setBannerEnabled(s.enabled);
        setBannerTitle(s.title);
        setBannerForce(s.force);
      } catch {
        if (!cancelled) toast.error("讀取 Banner 設定失敗");
      } finally {
        if (!cancelled) setBannerLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isMaster]);

  const saveAllStreakRewards = async () => {
    setStreakSaving(true);
    try {
      for (const row of streakRows) {
        const exp = Number(row.exp);
        const coins = Number(row.coins);
        const maxRaw = row.coinsMax.trim();
        const coins_max =
          maxRaw === "" ? null : Number(maxRaw);
        const res = await updateStreakRewardAction(row.day, {
          exp,
          coins,
          coins_max,
          special_label:
            row.day === 7
              ? "公會盲盒"
              : row.specialLabel.trim() === ""
                ? null
                : row.specialLabel.trim(),
        });
        if (!res.ok) {
          toast.error(res.error || `第 ${row.day} 天儲存失敗`);
          return;
        }
      }
      toast.success("七日報到獎勵已更新");
    } finally {
      setStreakSaving(false);
    }
  };

  const saveBannerEnabled = async (enabled: boolean) => {
    setBannerSavingKey("enabled");
    try {
      const res = await updateProfileBannerSettingsAction({ enabled });
      if (!res.ok) {
        toast.error("更新失敗");
        return;
      }
      setBannerEnabled(enabled);
      toast.success("已更新");
    } finally {
      setBannerSavingKey(null);
    }
  };

  const saveBannerTitle = async () => {
    const t = bannerTitle.trim();
    if (!t) {
      toast.error("請填寫標題");
      return;
    }
    setBannerSavingKey("title");
    try {
      const res = await updateProfileBannerSettingsAction({ title: t });
      if (!res.ok) {
        toast.error("更新失敗");
        return;
      }
      setBannerTitle(t);
      toast.success("標題已儲存");
    } finally {
      setBannerSavingKey(null);
    }
  };

  const saveBannerForce = async (force: boolean) => {
    setBannerSavingKey("force");
    try {
      const res = await updateProfileBannerSettingsAction({ force });
      if (!res.ok) {
        toast.error("更新失敗");
        return;
      }
      setBannerForce(force);
      toast.success("已更新");
    } finally {
      setBannerSavingKey(null);
    }
  };

  const saveSetting = async (key: string, value: string) => {
    setSavingKey(key);
    const res = await updateSystemSettingAction(key, value);
    setSavingKey(null);
    if (!res.ok) {
      toast.error(res.error || "更新失敗");
      return;
    }
    toast.success("設定已更新");
  };

  const saveBroadcastBundle = async () => {
    setSavingKey("broadcast_bundle");
    const style = String(settings.broadcast_style ?? "glow").trim() || "glow";
    const speedRaw = (settings.broadcast_speed ?? "10").replace(/[^0-9]/g, "");
    const speed = speedRaw.length > 0 ? speedRaw : "10";
    const results = await Promise.allSettled([
      updateSystemSettingAction("broadcast_style", style),
      updateSystemSettingAction("broadcast_speed", speed),
    ]);
    setSavingKey(null);
    for (const r of results) {
      if (r.status === "rejected") {
        toast.error("儲存廣播設定失敗");
        return;
      }
      if (!r.value.ok) {
        toast.error(r.value.error || "儲存廣播設定失敗");
        return;
      }
    }
    toast.success("廣播樣式與輪播速度已更新");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-gray-900">系統設定</h1>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">平台規則設定</h2>
        <div className="space-y-3">
          {PLATFORM_SETTING_FIELDS.map((field) => {
            const rawValue = settings[field.key] ?? field.fallback;
            const isBool = field.type === "boolean";
            return (
              <div
                key={field.key}
                className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-gray-700">{field.label}</p>
                  <button
                    type="button"
                    disabled={savingKey === field.key}
                    onClick={() => void saveSetting(field.key, String(settings[field.key] ?? rawValue))}
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                  >
                    {savingKey === field.key ? "儲存中..." : "儲存"}
                  </button>
                </div>
                {isBool ? (
                  <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={normalizeBoolean(rawValue, field.fallback)}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          [field.key]: String(e.target.checked),
                        }))
                      }
                    />
                    {normalizeBoolean(rawValue, field.fallback) ? "啟用" : "停用"}
                  </label>
                ) : (
                  <div className="mt-2 max-w-xs">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={rawValue}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          [field.key]: e.target.value.replace(/[^0-9]/g, ""),
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                    <p className="mt-1 text-[10px] text-gray-500">
                      請填 0 以上的整數（依業務合理範圍設定，例如字數上限 1–500）
                    </p>
                  </div>
                )}
              </div>
            );
          })}

        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">📱 前台顯示設定</h2>
        <p className="text-xs text-gray-500">
          調整前台玩家可見的字數上限、背包格數等。儲存後約 60 秒內前台快取更新。
        </p>
        <div className="space-y-3">
          {FRONTEND_DISPLAY_FIELDS.map((field) => {
            const rawValue = settings[field.key] ?? field.fallback;
            const numValue = Number(rawValue) || Number(field.fallback);
            return (
              <div
                key={field.key}
                className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700">{field.label}</p>
                    <p className="mt-0.5 text-[10px] text-gray-500">
                      {field.description}（目前 {numValue}，範圍 {field.min}–{field.max}）
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={savingKey === field.key}
                    onClick={() => {
                      const n = Number(settings[field.key] ?? rawValue);
                      if (!Number.isFinite(n) || n < field.min || n > field.max) {
                        toast.error(`${field.label}需介於 ${field.min}–${field.max}`);
                        return;
                      }
                      void saveSetting(field.key, String(n));
                    }}
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                  >
                    {savingKey === field.key ? "儲存中..." : "儲存"}
                  </button>
                </div>
                <div className="mt-2 max-w-xs">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={rawValue}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      setSettings((prev) => ({ ...prev, [field.key]: v }));
                    }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">
          🍺 酒館跑馬燈設定
        </h2>
        <p className="text-xs text-gray-500">
          首頁內容區頂部酒館訊息（與全站廣播橫幅分離）。變更後約 60 秒內前台快取更新。
        </p>
        <div className="space-y-3">
          <label className="block text-sm text-gray-700">
            播放模式
            <select
              value={settings.tavern_marquee_mode ?? "scroll"}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  tavern_marquee_mode: e.target.value,
                }))
              }
              className="mt-1 block w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="scroll">scroll — 橫向滑動跑馬燈</option>
              <option value="fade">fade — 淡入淡出輪播</option>
              <option value="bounce">bounce — 彈跳出現</option>
            </select>
          </label>
          <button
            type="button"
            disabled={savingKey === "tavern_marquee_mode"}
            onClick={() =>
              void saveSetting(
                "tavern_marquee_mode",
                String(settings.tavern_marquee_mode ?? "scroll"),
              )
            }
            className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {savingKey === "tavern_marquee_mode" ? "儲存中…" : "儲存播放模式"}
          </button>
        </div>
        <div className="space-y-2 border-t border-gray-100 pt-4">
          <label className="block text-sm text-gray-700">
            {(settings.tavern_marquee_mode ?? "scroll") === "scroll"
              ? "滾動時間（秒，建議 10–60）"
              : "每則顯示秒數（建議 3–15）"}
            <input
              type="text"
              inputMode="numeric"
              value={settings.tavern_marquee_speed ?? "20"}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  tavern_marquee_speed: e.target.value.replace(/[^0-9]/g, ""),
                }))
              }
              className="mt-1 block w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <p className="text-xs text-gray-500">
            {(settings.tavern_marquee_mode ?? "scroll") === "scroll"
              ? "數字越小，橫向滑動越快跑完全程。"
              : "fade：淡入後停留再淡出切下一則；bounce：彈入後停留再彈出。"}
          </p>
          <button
            type="button"
            disabled={savingKey === "tavern_marquee_speed"}
            onClick={() =>
              void saveSetting(
                "tavern_marquee_speed",
                String(settings.tavern_marquee_speed ?? "20"),
              )
            }
            className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            {savingKey === "tavern_marquee_speed" ? "儲存中…" : "儲存播放速度"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">
          📢 廣播橫幅設定
        </h2>
        <p className="text-xs text-gray-500">
          全站固定頂部廣播（無廣播時不顯示）。儲存後會 revalidate{" "}
          <code className="rounded bg-gray-100 px-1">system_settings</code>。
        </p>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-3">
            <label className="block text-sm text-gray-700">
              廣播樣式
              <select
                value={settings.broadcast_style ?? "glow"}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    broadcast_style: e.target.value,
                  }))
                }
                className="mt-1 block w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="glow">glow — 金色發光橫幅</option>
                <option value="flicker">flicker — 閃爍跳動</option>
                <option value="fullscreen">fullscreen — 全屏強制覆蓋</option>
                <option value="fire">fire — 火焰特效</option>
                <option value="lightning">lightning — 閃電特效</option>
                <option value="flow">flow — 流光特效</option>
              </select>
            </label>
            <label className="block text-sm text-gray-700">
              每則廣播顯示秒數（建議 5–30）
              <input
                type="text"
                inputMode="numeric"
                value={settings.broadcast_speed ?? "10"}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    broadcast_speed: e.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
                className="mt-1 block w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              disabled={savingKey === "broadcast_bundle"}
              onClick={() => void saveBroadcastBundle()}
              className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
            >
              {savingKey === "broadcast_bundle" ? "儲存中…" : "儲存廣播設定"}
            </button>
          </div>
          <div className="w-full shrink-0 lg:w-80">
            <p className="mb-2 text-xs font-medium text-gray-600">即時預覽</p>
            <BroadcastStylePreview
              style={settings.broadcast_style ?? "glow"}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">簽到與盲盒</h2>
        <p className="text-sm text-gray-500">
          每日 EXP／探險幣可由下方「七日報到獎勵」調整；第 7 天盲盒內容請至獎池管理。
        </p>
        {isMaster ? (
          <Link
            href="/admin/prizes"
            className="inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            前往獎池管理
          </Link>
        ) : null}
      </section>

      {isMaster ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">
            七日報到獎勵設定
          </h2>
          {streakLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {streakRows.map((row) => (
                  <div
                    key={row.day}
                    className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 space-y-2"
                  >
                    <p className="text-sm font-medium text-gray-800">
                      Day {row.day}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <label className="block text-xs text-gray-600">
                        EXP
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.exp}
                          onChange={(e) =>
                            setStreakRows((prev) =>
                              prev.map((r) =>
                                r.day === row.day
                                  ? {
                                      ...r,
                                      exp: e.target.value.replace(
                                        /[^0-9]/g,
                                        "",
                                      ),
                                    }
                                  : r,
                              ),
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                        />
                        <span className="mt-0.5 block text-[10px] text-gray-500">
                          0 以上整數
                        </span>
                      </label>
                      <label className="block text-xs text-gray-600">
                        探險幣
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.coins}
                          onChange={(e) =>
                            setStreakRows((prev) =>
                              prev.map((r) =>
                                r.day === row.day
                                  ? {
                                      ...r,
                                      coins: e.target.value.replace(
                                        /[^0-9]/g,
                                        "",
                                      ),
                                    }
                                  : r,
                              ),
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                        />
                        <span className="mt-0.5 block text-[10px] text-gray-500">
                          0 以上整數
                        </span>
                      </label>
                      <label className="block text-xs text-gray-600">
                        幣最大值（可空＝固定）
                        <input
                          type="text"
                          inputMode="numeric"
                          value={row.coinsMax}
                          onChange={(e) =>
                            setStreakRows((prev) =>
                              prev.map((r) =>
                                r.day === row.day
                                  ? {
                                      ...r,
                                      coinsMax: e.target.value.replace(
                                        /[^0-9]/g,
                                        "",
                                      ),
                                    }
                                  : r,
                              ),
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                        />
                        <span className="mt-0.5 block text-[10px] text-gray-500">
                          空白=固定幣數；有值則隨機介於幣與此上限
                        </span>
                      </label>
                      <label className="block text-xs text-gray-600">
                        特殊獎勵說明
                        {row.day === 7 ? (
                          <input
                            type="text"
                            readOnly
                            value="公會盲盒"
                            className="mt-1 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-700"
                          />
                        ) : (
                          <input
                            type="text"
                            value={row.specialLabel}
                            onChange={(e) =>
                              setStreakRows((prev) =>
                                prev.map((r) =>
                                  r.day === row.day
                                    ? { ...r, specialLabel: e.target.value }
                                    : r,
                                ),
                              )
                            }
                            placeholder="選填"
                            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                          />
                        )}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={streakSaving || streakRows.length === 0}
                onClick={() => void saveAllStreakRewards()}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {streakSaving ? "儲存中…" : "儲存所有獎勵設定"}
              </button>
            </>
          )}
        </section>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">等級門檻調整（僅 master）</h2>
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          ⚠️ 調整等級門檻會影響所有用戶的等級計算
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 10 }, (_, i) => {
            const level = i + 1;
            const key = `level_threshold_${level}`;
            return (
              <div key={key} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                <p className="text-sm text-gray-700">Lv.{level} EXP 門檻</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={settings[key] ?? String((level - 1) * 100)}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        [key]: e.target.value.replace(/[^0-9]/g, ""),
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={savingKey === key}
                    onClick={() => void saveSetting(key, String(settings[key] ?? String((level - 1) * 100)))}
                    className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                  >
                    {savingKey === key ? "儲存中..." : "儲存"}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-gray-500">
                  0 以上整數（累積 EXP 門檻）
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {isMaster ? (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">
            📢 資料補填通知 Banner
          </h2>
          {bannerLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
                <p className="text-sm text-gray-700">Banner 開關</p>
                <Switch
                  checked={bannerEnabled}
                  disabled={bannerSavingKey === "enabled"}
                  onCheckedChange={(v) => void saveBannerEnabled(v)}
                />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">Banner 標題</p>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    maxLength={50}
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value.slice(0, 50))}
                    className="min-w-[200px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    placeholder="顯示於全站橫幅"
                  />
                  <button
                    type="button"
                    disabled={bannerSavingKey === "title"}
                    onClick={() => void saveBannerTitle()}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                  >
                    {bannerSavingKey === "title" ? "儲存中…" : "儲存"}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700">強制模式</p>
                  <p className="mt-1 text-xs text-gray-500">
                    開啟後所有用戶都會看到 Banner 且無法關閉，關閉後僅資料不完整的用戶看到
                  </p>
                </div>
                <Switch
                  checked={bannerForce}
                  disabled={bannerSavingKey === "force"}
                  onCheckedChange={(v) => void saveBannerForce(v)}
                />
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
