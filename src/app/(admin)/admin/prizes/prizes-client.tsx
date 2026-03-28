"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { PrizePoolRow, PrizeItemRow } from "@/types/database.types";
import {
  getPrizePoolsAction,
  getPrizeItemsAction,
  updatePrizeItemAction,
  togglePrizeItemAction,
  togglePrizePoolAction,
  getPrizeLogsAction,
} from "@/services/admin.action";
import type { PrizeLogWithUser } from "@/lib/repositories/server/prize.repository";

type Tab = "items" | "logs";

function fmtTaipei(iso: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

function rewardBadgeClass(type: string) {
  switch (type) {
    case "coins":
      return "bg-amber-100 text-amber-900";
    case "exp":
      return "bg-emerald-100 text-emerald-900";
    case "title":
      return "bg-violet-100 text-violet-900";
    case "avatar_frame":
      return "bg-blue-100 text-blue-900";
    case "broadcast":
      return "bg-orange-100 text-orange-900";
    default:
      return "bg-zinc-100 text-zinc-800";
  }
}

type DraftItem = Pick<
  PrizeItemRow,
  "id" | "label" | "weight" | "min_value" | "max_value" | "reward_type" | "is_active"
>;

export default function AdminPrizesClient() {
  const [tab, setTab] = useState<Tab>("items");
  const [pools, setPools] = useState<PrizePoolRow[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [items, setItems] = useState<PrizeItemRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftItem>>({});
  const [loadingPools, setLoadingPools] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [logsPoolType, setLogsPoolType] = useState<string>("");
  const [logsPage, setLogsPage] = useState(1);
  const [logs, setLogs] = useState<PrizeLogWithUser[]>([]);

  const loadPools = useCallback(async () => {
    setLoadingPools(true);
    const r = await getPrizePoolsAction();
    setLoadingPools(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setPools(r.data);
    setSelectedPoolId((prev) => {
      if (prev && r.data.some((p) => p.id === prev)) return prev;
      return r.data[0]?.id ?? null;
    });
  }, []);

  const loadItems = useCallback(async (poolId: string) => {
    setLoadingItems(true);
    const r = await getPrizeItemsAction(poolId);
    setLoadingItems(false);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setItems(r.data);
    const d: Record<string, DraftItem> = {};
    for (const it of r.data) {
      d[it.id] = {
        id: it.id,
        label: it.label,
        weight: it.weight,
        min_value: it.min_value,
        max_value: it.max_value,
        reward_type: it.reward_type,
        is_active: it.is_active,
      };
    }
    setDrafts(d);
  }, []);

  const loadLogs = useCallback(async () => {
    const r = await getPrizeLogsAction({
      poolType: logsPoolType || undefined,
      page: logsPage,
    });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    setLogs(r.data);
  }, [logsPoolType, logsPage]);

  useEffect(() => {
    void loadPools();
  }, [loadPools]);

  useEffect(() => {
    if (selectedPoolId) void loadItems(selectedPoolId);
  }, [selectedPoolId, loadItems]);

  useEffect(() => {
    if (tab === "logs") void loadLogs();
  }, [tab, loadLogs]);

  const totalWeight = useMemo(() => {
    return items.reduce((s, it) => {
      const w = drafts[it.id]?.weight ?? it.weight;
      return s + Math.max(1, w);
    }, 0);
  }, [items, drafts]);

  async function saveAllWeights() {
    if (!selectedPoolId) return;
    setSavingAll(true);
    const results = await Promise.all(
      items.map((it) => {
        const d = drafts[it.id];
        if (!d) return Promise.resolve({ ok: true as const, data: undefined });
        return updatePrizeItemAction(it.id, {
          label: d.label,
          weight: d.weight,
          min_value: d.min_value,
          max_value: d.max_value,
        });
      }),
    );
    setSavingAll(false);
    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      toast.error("部分獎項儲存失敗");
    } else {
      toast.success("已儲存所有獎項");
    }
    await loadItems(selectedPoolId);
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-gray-900">🎰 獎池管理</h1>

      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {(
          [
            { key: "items" as Tab, label: "獎項設定" },
            { key: "logs" as Tab, label: "抽獎紀錄" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "items" ? (
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-56 shrink-0 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              獎池
            </p>
            {loadingPools ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                載入中…
              </div>
            ) : (
              <ul className="space-y-1">
                {pools.map((p) => (
                  <li key={p.id}>
                    <div
                      className={`flex w-full flex-col rounded-xl border px-3 py-2 text-sm transition-colors ${
                        selectedPoolId === p.id
                          ? "border-violet-500 bg-violet-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedPoolId(p.id)}
                        className="w-full text-left"
                      >
                        <span className="font-medium text-gray-900">{p.label}</span>
                        <span className="mt-0.5 block text-[10px] text-gray-500">
                          {p.pool_type}
                        </span>
                      </button>
                      <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={p.is_active}
                          onChange={async (e) => {
                            const r = await togglePrizePoolAction(
                              p.id,
                              e.target.checked,
                            );
                            if (!r.ok) {
                              toast.error(r.error);
                              return;
                            }
                            toast.success("已更新獎池狀態");
                            await loadPools();
                          }}
                          className="rounded border-gray-300"
                        />
                        啟用
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <div className="min-w-0 flex-1 space-y-4">
            {loadingItems ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                載入獎項…
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-500">此獎池尚無獎項</p>
            ) : (
              <>
                <div className="space-y-3">
                  {items.map((it) => {
                    const d = drafts[it.id];
                    if (!d) return null;
                    const w = Math.max(1, d.weight);
                    const pct = ((w / totalWeight) * 100).toFixed(1);
                    return (
                      <div
                        key={it.id}
                        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${rewardBadgeClass(d.reward_type)}`}
                          >
                            {d.reward_type}
                          </span>
                          <input
                            type="text"
                            value={d.label}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [it.id]: { ...d, label: e.target.value },
                              }))
                            }
                            className="min-w-[8rem] flex-1 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                          />
                          <label className="flex items-center gap-1 text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={d.is_active}
                              onChange={async (e) => {
                                const r = await togglePrizeItemAction(
                                  it.id,
                                  e.target.checked,
                                );
                                if (!r.ok) {
                                  toast.error(r.error);
                                  return;
                                }
                                setDrafts((prev) => ({
                                  ...prev,
                                  [it.id]: { ...d, is_active: e.target.checked },
                                }));
                                if (selectedPoolId) await loadItems(selectedPoolId);
                              }}
                              className="rounded border-gray-300"
                            />
                            啟用
                          </label>
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <label className="text-xs text-gray-500">權重</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={String(d.weight)}
                              onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, "");
                                setDrafts((prev) => ({
                                  ...prev,
                                  [it.id]: {
                                    ...d,
                                    weight: v === "" ? 1 : parseInt(v, 10) || 1,
                                  },
                                }));
                              }}
                              className="mt-0.5 w-20 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                            />
                          </div>
                          <div className="text-sm text-violet-700">
                            機率約 <strong>{pct}%</strong>
                          </div>
                          {(d.reward_type === "coins" ||
                            d.reward_type === "exp") && (
                            <>
                              <div>
                                <label className="text-xs text-gray-500">min</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={
                                    d.min_value == null ? "" : String(d.min_value)
                                  }
                                  onChange={(e) => {
                                    const v = e.target.value.replace(/-/g, "");
                                    setDrafts((prev) => ({
                                      ...prev,
                                      [it.id]: {
                                        ...d,
                                        min_value:
                                          v === "" ? null : parseInt(v, 10),
                                      },
                                    }));
                                  }}
                                  className="mt-0.5 w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-500">max</label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={
                                    d.max_value == null ? "" : String(d.max_value)
                                  }
                                  onChange={(e) => {
                                    const v = e.target.value.replace(/-/g, "");
                                    setDrafts((prev) => ({
                                      ...prev,
                                      [it.id]: {
                                        ...d,
                                        max_value:
                                          v === "" ? null : parseInt(v, 10),
                                      },
                                    }));
                                  }}
                                  className="mt-0.5 w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  disabled={savingAll}
                  onClick={() => void saveAllWeights()}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-violet-700 disabled:opacity-60"
                >
                  {savingAll ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  儲存所有獎項權重
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-gray-600">
              獎池類型
              <select
                value={logsPoolType}
                onChange={(e) => {
                  setLogsPoolType(e.target.value);
                  setLogsPage(1);
                }}
                className="ml-2 rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
              >
                <option value="">全部</option>
                {pools.map((p) => (
                  <option key={p.id} value={p.pool_type}>
                    {p.label} ({p.pool_type})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void loadLogs()}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              重新載入
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-600">
                <tr>
                  <th className="px-3 py-2">用戶</th>
                  <th className="px-3 py-2">獎池</th>
                  <th className="px-3 py-2">獎勵</th>
                  <th className="px-3 py-2">時間（台北）</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{row.user_nickname}</td>
                    <td className="px-3 py-2 font-mono text-xs">{row.pool_type}</td>
                    <td className="px-3 py-2">
                      {row.label}
                      {row.reward_value != null ? ` (+${row.reward_value})` : ""}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {fmtTaipei(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">尚無紀錄</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={logsPage <= 1}
              onClick={() => setLogsPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
            >
              上一頁
            </button>
            <button
              type="button"
              disabled={logs.length < 50}
              onClick={() => setLogsPage((p) => p + 1)}
              className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
            >
              下一頁
            </button>
            <span className="self-center text-xs text-gray-500">
              第 {logsPage} 頁（每頁 50 筆）
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
