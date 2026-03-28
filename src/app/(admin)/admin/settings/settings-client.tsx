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

export default function AdminSettingsClient({ isMaster }: { isMaster: boolean }) {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingsMap>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [streakRows, setStreakRows] = useState<StreakFormRow[]>([]);
  const [streakLoading, setStreakLoading] = useState(false);
  const [streakSaving, setStreakSaving] = useState(false);

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

          <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 space-y-4 mt-4">
            <h3 className="text-sm font-semibold text-gray-900">跑馬燈設定</h3>
            <div className="space-y-2">
              <p className="text-xs text-gray-600">
                輪播間隔（秒），建議 5〜30
              </p>
              <div className="flex flex-wrap items-center gap-2 max-w-xs">
                <input
                  type="text"
                  inputMode="numeric"
                  value={settings.marquee_speed_seconds ?? "10"}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      marquee_speed_seconds: e.target.value.replace(/[^0-9]/g, ""),
                    }))
                  }
                  className="flex-1 min-w-[6rem] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={savingKey === "marquee_speed_seconds"}
                  onClick={() =>
                    void saveSetting(
                      "marquee_speed_seconds",
                      String(settings.marquee_speed_seconds ?? "10"),
                    )
                  }
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {savingKey === "marquee_speed_seconds" ? "儲存中..." : "儲存"}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-gray-600">廣播／跑馬燈文字特效</p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={settings.marquee_broadcast_effect ?? "glow"}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      marquee_broadcast_effect: e.target.value,
                    }))
                  }
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="glow">glow（光暈）</option>
                  <option value="pulse">pulse（脈動）</option>
                  <option value="rainbow">rainbow（彩虹）</option>
                </select>
                <button
                  type="button"
                  disabled={savingKey === "marquee_broadcast_effect"}
                  onClick={() =>
                    void saveSetting(
                      "marquee_broadcast_effect",
                      String(settings.marquee_broadcast_effect ?? "glow"),
                    )
                  }
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                >
                  {savingKey === "marquee_broadcast_effect" ? "儲存中..." : "儲存"}
                </button>
              </div>
            </div>
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
    </div>
  );
}
