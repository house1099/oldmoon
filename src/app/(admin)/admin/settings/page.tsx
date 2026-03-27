"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  getSystemSettingsAction,
  updateSystemSettingAction,
} from "@/services/admin.action";

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

const CHECKIN_RANGE_FIELDS = [
  { key: "checkin_free_coins_min", label: "最少探險幣", fallback: "1" },
  { key: "checkin_free_coins_max", label: "最多探險幣", fallback: "9" },
] as const;

const CHECKIN_MIN_FALLBACK = CHECKIN_RANGE_FIELDS[0].fallback;
const CHECKIN_MAX_FALLBACK = CHECKIN_RANGE_FIELDS[1].fallback;
const DEFAULT_COIN_WEIGHT = "10";

function normalizeBoolean(value: string | undefined, fallback: string) {
  const raw = (value ?? fallback).toLowerCase();
  return raw === "true";
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingsMap>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

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

  const minCoins = useMemo(() => {
    const raw = settings["checkin_free_coins_min"];
    const parsed = parseInt(raw ?? CHECKIN_MIN_FALLBACK, 10);
    return Number.isNaN(parsed) ? parseInt(CHECKIN_MIN_FALLBACK, 10) : parsed;
  }, [settings]);

  const maxCoins = useMemo(() => {
    const raw = settings["checkin_free_coins_max"];
    const parsed = parseInt(raw ?? CHECKIN_MAX_FALLBACK, 10);
    return Number.isNaN(parsed) ? parseInt(CHECKIN_MAX_FALLBACK, 10) : parsed;
  }, [settings]);

  const coinRange = useMemo(() => {
    const low = Math.min(minCoins, maxCoins);
    const high = Math.max(minCoins, maxCoins);

    // UI 安全上限，避免 range 太大導致畫面爆炸
    const start = Math.max(1, low);
    const end = Math.max(start, high);
    const maxUiCoins = 50;
    const cappedEnd = Math.min(end, start + maxUiCoins - 1);

    return Array.from({ length: cappedEnd - start + 1 }, (_, i) => start + i);
  }, [minCoins, maxCoins]);

  const coinWeights = useMemo(() => {
    const defaultWeightNum = parseInt(DEFAULT_COIN_WEIGHT, 10);
    return coinRange.map((coin) => {
      const key = `checkin_weight_${coin}`;
      const raw = settings[key];
      const parsed = raw === undefined ? defaultWeightNum : parseInt(raw, 10);
      const weight = Number.isNaN(parsed) ? defaultWeightNum : Math.max(0, parsed);
      return { coin, key, weight };
    });
  }, [coinRange, settings]);

  const weightStats = useMemo(() => {
    const totalWeight = coinWeights.reduce((sum, w) => sum + w.weight, 0);
    const items = coinWeights.map((w) => ({
      ...w,
      percent: totalWeight > 0 ? Number(((w.weight / totalWeight) * 100).toFixed(1)) : 0,
    }));
    return { totalWeight, items };
  }, [coinWeights]);

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
                  <input
                    type="number"
                    value={rawValue}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="mt-2 w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">簽到探險幣設定</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {CHECKIN_RANGE_FIELDS.map((field) => (
            <div key={field.key} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
              <p className="text-sm text-gray-700">{field.label}</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  value={settings[field.key] ?? field.fallback}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      [field.key]: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={savingKey === field.key}
                  onClick={() =>
                    void saveSetting(field.key, String(settings[field.key] ?? field.fallback))
                  }
                  className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {savingKey === field.key ? "儲存中..." : "儲存"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-800">
            機率權重（{coinRange[0]}–{coinRange[coinRange.length - 1]} 探險幣）
          </p>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {weightStats.items.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-gray-100 bg-gray-50/60 p-3"
              >
                <p className="text-xs text-gray-500">🧭 {item.coin} 幣權重</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={
                      settings[item.key] && settings[item.key].trim() !== ""
                        ? settings[item.key]
                        : DEFAULT_COIN_WEIGHT
                    }
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        [item.key]: e.target.value.replace(/[^0-9]/g, ""),
                      }))
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={savingKey === item.key}
                    onClick={() => void saveSetting(item.key, String(item.weight))}
                    className="rounded-lg bg-violet-600 px-2 py-1.5 text-[11px] font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                  >
                    存
                  </button>
                </div>
                <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-violet-500 h-2 rounded-full transition-all"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-gray-500">{item.percent}%</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            即時機率預覽（總權重：{weightStats.totalWeight}）
          </p>
          <div className="mt-2 grid gap-1 sm:grid-cols-3 lg:grid-cols-5">
            {weightStats.items.map((item) => (
              <p key={item.key} className="text-xs text-amber-800">
                {item.coin} 幣機率：{item.percent}%
              </p>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            總權重：{weightStats.totalWeight}（各權重數字比例即為機率，數字越大機率越高）
          </p>
        </div>
      </section>

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
                    type="number"
                    value={settings[key] ?? String((level - 1) * 100)}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        [key]: e.target.value,
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
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
