"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

function normalizeBoolean(value: string | undefined, fallback: string) {
  const raw = (value ?? fallback).toLowerCase();
  return raw === "true";
}

export default function AdminSettingsClient({ isMaster }: { isMaster: boolean }) {
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

      <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
        <h2 className="text-base font-semibold text-gray-900">簽到探險幣</h2>
        <p className="text-sm text-gray-500">
          簽到探險幣已改為連續報到固定獎勵制，請至「獎池管理」調整盲盒獎勵內容。
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
