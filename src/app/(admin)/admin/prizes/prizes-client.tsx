"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import type { PrizePoolRow, PrizeItemRow } from "@/types/database.types";
import {
  getPrizePoolsAction,
  getPrizeItemsAction,
  updatePrizeItemAction,
  togglePrizeItemAction,
  togglePrizePoolAction,
  getPrizeLogsAction,
  createPrizePoolAction,
  deletePrizePoolAction,
  createPrizeItemAction,
  deletePrizeItemAction,
  getShopItemsAdminAction,
} from "@/services/admin.action";
import type { ShopItemRow } from "@/lib/repositories/server/shop.repository";
import {
  LocalFrameImagePicker,
  fetchLocalFrameBuckets,
  type LocalFrameImageBuckets,
} from "@/components/admin/local-frame-image-picker";
import type { PrizeLogWithUser } from "@/lib/repositories/server/prize.repository";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Tab = "items" | "logs";

type PoolRow = PrizePoolRow & { hasPrizeLogs: boolean };
type ItemRow = PrizeItemRow & { hasPrizeLogs: boolean };

const REWARD_TYPE_OPTIONS = [
  { value: "coins", label: "探險幣 coins" },
  { value: "exp", label: "經驗值 exp" },
  { value: "title", label: "稱號 title" },
  { value: "avatar_frame", label: "頭像框 avatar_frame" },
  { value: "card_frame", label: "卡片外框 card_frame" },
  { value: "broadcast", label: "廣播券 broadcast" },
] as const;

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

type DraftItem = Pick<
  PrizeItemRow,
  | "id"
  | "label"
  | "weight"
  | "min_value"
  | "max_value"
  | "reward_type"
  | "is_active"
  | "effect_key"
  | "image_url"
>;

export default function AdminPrizesClient() {
  const [tab, setTab] = useState<Tab>("items");
  const [pools, setPools] = useState<PoolRow[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftItem>>({});
  const [loadingPools, setLoadingPools] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [logsPoolType, setLogsPoolType] = useState<string>("");
  const [logsPage, setLogsPage] = useState(1);
  const [logs, setLogs] = useState<PrizeLogWithUser[]>([]);

  const [createPoolOpen, setCreatePoolOpen] = useState(false);
  const [newPoolType, setNewPoolType] = useState("");
  const [newPoolLabel, setNewPoolLabel] = useState("");
  const [newPoolDesc, setNewPoolDesc] = useState("");
  const [creatingPool, setCreatingPool] = useState(false);

  const [deletePoolId, setDeletePoolId] = useState<string | null>(null);

  const [createItemOpen, setCreateItemOpen] = useState(false);
  const [newItemType, setNewItemType] = useState<string>("coins");
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemWeight, setNewItemWeight] = useState("10");
  const [newItemMin, setNewItemMin] = useState("");
  const [newItemMax, setNewItemMax] = useState("");
  const [newItemEffectKey, setNewItemEffectKey] = useState("");
  const [newItemImageUrl, setNewItemImageUrl] = useState("");
  const [creatingItem, setCreatingItem] = useState(false);
  const [prizeTypeHelpOpen, setPrizeTypeHelpOpen] = useState(false);
  const [localFrameBuckets, setLocalFrameBuckets] =
    useState<LocalFrameImageBuckets>({
      framesRoot: [],
      framesAvatars: [],
      framesCards: [],
      items: [],
    });
  const [shopItemsForTemplates, setShopItemsForTemplates] = useState<
    ShopItemRow[]
  >([]);
  const [itemTemplateNonce, setItemTemplateNonce] = useState<
    Record<string, number>
  >({});
  const [newItemShopTemplateNonce, setNewItemShopTemplateNonce] = useState(0);

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
        effect_key: it.effect_key ?? null,
        image_url: it.image_url ?? null,
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

  useEffect(() => {
    if (tab !== "items") return;
    void (async () => {
      const b = await fetchLocalFrameBuckets();
      if (b) setLocalFrameBuckets(b);
      const s = await getShopItemsAdminAction();
      if (s.ok) setShopItemsForTemplates(s.data);
      else toast.error(s.error);
    })();
  }, [tab]);

  const totalWeight = useMemo(() => {
    return items.reduce((s, it) => {
      const w = drafts[it.id]?.weight ?? it.weight;
      return s + Math.max(1, w);
    }, 0);
  }, [items, drafts]);

  async function saveAllWeights() {
    if (!selectedPoolId) return;
    setSavingAll(true);
    const results = await Promise.allSettled(
      items.map((it) => {
        const d = drafts[it.id];
        if (!d) return Promise.resolve({ ok: true as const });
        return updatePrizeItemAction(it.id, {
          label: d.label,
          weight: d.weight,
          min_value: d.min_value,
          max_value: d.max_value,
          reward_type: d.reward_type,
          effect_key: d.effect_key ?? null,
          image_url: d.image_url ?? null,
        });
      }),
    );
    setSavingAll(false);
    const failed = results.filter((r) => {
      if (r.status === "rejected") return true;
      const v = r.value as { ok?: boolean } | undefined;
      return Boolean(v && "ok" in v && v.ok === false);
    });
    if (failed.length > 0) {
      toast.error("部分獎項儲存失敗");
    } else {
      toast.success("已儲存所有獎項");
    }
    await loadItems(selectedPoolId);
  }

  async function submitCreatePool() {
    setCreatingPool(true);
    try {
      const r = await createPrizePoolAction({
        pool_type: newPoolType,
        label: newPoolLabel,
        description: newPoolDesc || null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("已建立獎池");
      setCreatePoolOpen(false);
      setNewPoolType("");
      setNewPoolLabel("");
      setNewPoolDesc("");
      await loadPools();
      setSelectedPoolId(r.data.id);
    } finally {
      setCreatingPool(false);
    }
  }

  async function submitCreateItem() {
    if (!selectedPoolId) return;
    const w = parseInt(newItemWeight, 10);
    const minV =
      newItemType === "coins" || newItemType === "exp"
        ? newItemMin === ""
          ? null
          : parseInt(newItemMin, 10)
        : null;
    const maxV =
      newItemType === "coins" || newItemType === "exp"
        ? newItemMax === ""
          ? null
          : parseInt(newItemMax, 10)
        : null;
    setCreatingItem(true);
    try {
      const r = await createPrizeItemAction(selectedPoolId, {
        reward_type: newItemType,
        label: newItemLabel,
        weight: Number.isFinite(w) ? w : 1,
        min_value: minV,
        max_value: maxV,
        effect_key:
          newItemType === "avatar_frame" ||
          newItemType === "card_frame" ||
          newItemType === "title"
            ? newItemEffectKey.trim() || null
            : null,
        image_url:
          newItemType === "avatar_frame" ||
          newItemType === "card_frame" ||
          newItemType === "title"
            ? newItemImageUrl.trim() || null
            : null,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("已新增獎項");
      setCreateItemOpen(false);
      setNewItemLabel("");
      setNewItemWeight("10");
      setNewItemMin("");
      setNewItemMax("");
      setNewItemEffectKey("");
      setNewItemImageUrl("");
      await loadItems(selectedPoolId);
    } finally {
      setCreatingItem(false);
    }
  }

  const selectedPool = pools.find((p) => p.id === selectedPoolId);

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
          <aside className="lg:w-64 shrink-0 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                獎池
              </p>
              <button
                type="button"
                onClick={() => setCreatePoolOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-800 hover:bg-violet-100"
              >
                <Plus className="h-3.5 w-3.5" />
                建立新獎池
              </button>
            </div>
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
                      <div className="mt-2 border-t border-gray-100 pt-2">
                        {p.hasPrizeLogs ? (
                          p.is_active ? (
                            <button
                              type="button"
                              onClick={async () => {
                                const r = await togglePrizePoolAction(p.id, false);
                                if (!r.ok) {
                                  toast.error(r.error);
                                  return;
                                }
                                toast.success("已停用獎池");
                                await loadPools();
                              }}
                              className="text-xs font-medium text-amber-700 hover:underline"
                            >
                              停用
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-500">
                              已有抽獎紀錄，無法刪除
                            </span>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeletePoolId(p.id)}
                            className="text-xs font-medium text-rose-600 hover:underline"
                          >
                            刪除獎池
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!selectedPoolId}
                onClick={() => setCreateItemOpen(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                新增獎項
              </button>
            </div>

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
                          <select
                            value={d.reward_type}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [it.id]: {
                                  ...d,
                                  reward_type: e.target.value,
                                  min_value:
                                    e.target.value === "coins" ||
                                    e.target.value === "exp"
                                      ? d.min_value
                                      : null,
                                  max_value:
                                    e.target.value === "coins" ||
                                    e.target.value === "exp"
                                      ? d.max_value
                                      : null,
                                  effect_key:
                                    e.target.value === "avatar_frame" ||
                                    e.target.value === "card_frame" ||
                                    e.target.value === "title"
                                      ? d.effect_key
                                      : null,
                                  image_url:
                                    e.target.value === "avatar_frame" ||
                                    e.target.value === "card_frame" ||
                                    e.target.value === "title"
                                      ? d.image_url
                                      : null,
                                },
                              }))
                            }
                            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-medium"
                          >
                            {REWARD_TYPE_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
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
                                if (selectedPoolId)
                                  await loadItems(selectedPoolId);
                              }}
                              className="rounded border-gray-300"
                            />
                            啟用
                          </label>
                          <button
                            type="button"
                            disabled={it.hasPrizeLogs}
                            title={
                              it.hasPrizeLogs
                                ? "已有抽獎紀錄，無法刪除"
                                : undefined
                            }
                            onClick={async () => {
                              if (it.hasPrizeLogs) return;
                              if (
                                !window.confirm(
                                  "確定刪除此獎項？此操作無法復原。",
                                )
                              )
                                return;
                              const r = await deletePrizeItemAction(it.id);
                              if (!r.ok) {
                                toast.error(r.error);
                                return;
                              }
                              toast.success("已刪除獎項");
                              if (selectedPoolId)
                                await loadItems(selectedPoolId);
                            }}
                            className="ml-auto text-xs text-rose-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
                          >
                            刪除
                          </button>
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <label className="text-xs text-gray-500">權重</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={String(d.weight)}
                              onChange={(e) => {
                                const v = e.target.value.replace(/[^0-9]/g, "");
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
                            <p className="mt-0.5 max-w-[14rem] text-[10px] text-gray-500">
                              數字越大機率越高（建議 1–100）
                            </p>
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
                                    const v = e.target.value.replace(
                                      /[^0-9]/g,
                                      "",
                                    );
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
                                <p className="mt-0.5 text-[10px] text-gray-500">
                                  最小獲得數量
                                </p>
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
                                    const v = e.target.value.replace(
                                      /[^0-9]/g,
                                      "",
                                    );
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
                                <p className="mt-0.5 text-[10px] text-gray-500">
                                  最大獲得數量（空白=固定值）
                                </p>
                              </div>
                            </>
                          )}
                          {(d.reward_type === "avatar_frame" ||
                            d.reward_type === "card_frame" ||
                            d.reward_type === "title") && (
                            <div className="grid w-full min-w-[12rem] max-w-2xl grid-cols-1 gap-3 md:grid-cols-2">
                              <div className="space-y-2">
                                <div>
                                  <label
                                    className="text-xs text-gray-500"
                                    htmlFor={`shop-tpl-${it.id}`}
                                  >
                                    從商城商品帶入
                                  </label>
                                  <select
                                    id={`shop-tpl-${it.id}`}
                                    key={`shop-tpl-k-${it.id}-${itemTemplateNonce[it.id] ?? 0}`}
                                    defaultValue=""
                                    aria-label="從商城商品帶入名稱與框架設定"
                                    onChange={(e) => {
                                      const sid = e.target.value;
                                      if (!sid) return;
                                      const row = shopItemsForTemplates.find(
                                        (x) => x.id === sid,
                                      );
                                      if (
                                        !row ||
                                        row.item_type !== d.reward_type
                                      )
                                        return;
                                      setDrafts((prev) => {
                                        const cur = prev[it.id];
                                        if (!cur) return prev;
                                        return {
                                          ...prev,
                                          [it.id]: {
                                            ...cur,
                                            label:
                                              row.name.trim() || cur.label,
                                            effect_key:
                                              row.effect_key?.trim() || null,
                                            image_url:
                                              row.image_url?.trim() || null,
                                          },
                                        };
                                      });
                                      setItemTemplateNonce((p) => ({
                                        ...p,
                                        [it.id]: (p[it.id] ?? 0) + 1,
                                      }));
                                    }}
                                    className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1 text-sm"
                                  >
                                    <option value="">
                                      （選擇商城商品帶入名稱／effect_key／主圖）
                                    </option>
                                    {shopItemsForTemplates
                                      .filter(
                                        (s) => s.item_type === d.reward_type,
                                      )
                                      .map((s) => (
                                        <option key={s.id} value={s.id}>
                                          {s.name}（{s.sku}）
                                        </option>
                                      ))}
                                  </select>
                                  <p className="mt-0.5 text-[10px] text-gray-500">
                                    {d.reward_type === "title"
                                      ? "帶入商城稱號之名稱、effect_key、胸章圖路徑。"
                                      : "僅寫入獎項可存欄位；卡框商品之背景／角圖等 metadata 不會寫入獎項。"}
                                  </p>
                                </div>
                                <div>
                                  <label className="text-xs text-gray-500">
                                    特效代碼（effect_key）
                                  </label>
                                  <input
                                    type="text"
                                    value={d.effect_key ?? ""}
                                    onChange={(e) =>
                                      setDrafts((prev) => ({
                                        ...prev,
                                        [it.id]: {
                                          ...d,
                                          effect_key:
                                            e.target.value.trim() === ""
                                              ? null
                                              : e.target.value.trim(),
                                        },
                                      }))
                                    }
                                    placeholder={
                                      d.reward_type === "title"
                                        ? "選填，與商城稱號一致時可留空"
                                        : "如：star_frame、rainbow_frame"
                                    }
                                    className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1 text-sm"
                                  />
                                </div>
                                <LocalFrameImagePicker
                                  rewardType={
                                    d.reward_type === "title"
                                      ? "title"
                                      : d.reward_type === "avatar_frame"
                                        ? "avatar_frame"
                                        : "card_frame"
                                  }
                                  imageUrl={d.image_url ?? ""}
                                  onImageUrlChange={(url) =>
                                    setDrafts((prev) => {
                                      const cur = prev[it.id];
                                      if (!cur) return prev;
                                      return {
                                        ...prev,
                                        [it.id]: {
                                          ...cur,
                                          image_url:
                                            url.trim() === ""
                                              ? null
                                              : url.trim(),
                                        },
                                      };
                                    })
                                  }
                                  buckets={localFrameBuckets}
                                  onBucketsChange={setLocalFrameBuckets}
                                  selectId={`frame-sel-${it.id}`}
                                  manualInputId={`frame-manual-${it.id}`}
                                />
                              </div>
                              <div>
                                <p className="mb-1 text-xs text-gray-500">
                                  {d.reward_type === "title"
                                    ? "胸章預覽"
                                    : "特效預覽"}
                                </p>
                                <div className="rounded-lg border border-gray-200 bg-white p-2">
                                  {d.reward_type === "title" ? (
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg border border-gray-100 bg-zinc-50">
                                      {d.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={d.image_url}
                                          alt=""
                                          className="max-h-10 max-w-10 object-contain"
                                        />
                                      ) : (
                                        <span className="text-center text-[10px] text-gray-400">
                                          無圖
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <>
                                      <div
                                        className={
                                          d.reward_type === "avatar_frame"
                                            ? `relative mx-auto h-20 w-20 overflow-visible rounded-full bg-zinc-700 ${d.effect_key ? `effect-${d.effect_key}` : ""}`
                                            : `relative mx-auto h-28 w-20 overflow-visible rounded-xl bg-zinc-700 ${d.effect_key ? `effect-${d.effect_key}` : ""}`
                                        }
                                      >
                                        {d.reward_type === "avatar_frame" ? (
                                          <div className="absolute inset-[22%] rounded-full bg-zinc-500" />
                                        ) : (
                                          <div className="absolute inset-[18%] rounded-lg bg-zinc-500" />
                                        )}
                                        {d.image_url ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={d.image_url}
                                            alt=""
                                            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                                          />
                                        ) : null}
                                      </div>
                                      {!d.effect_key ? (
                                        <p className="mt-2 text-center text-[10px] text-gray-400">
                                          （無特效）
                                        </p>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
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

      <Dialog open={createPoolOpen} onOpenChange={setCreatePoolOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>建立新獎池</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-gray-500">pool_type（英文唯一）</label>
              <input
                value={newPoolType}
                onChange={(e) => setNewPoolType(e.target.value)}
                placeholder="例：spring_2026"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">顯示名稱（中文）</label>
              <input
                value={newPoolLabel}
                onChange={(e) => setNewPoolLabel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">說明（選填）</label>
              <textarea
                value={newPoolDesc}
                onChange={(e) => setNewPoolDesc(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePoolOpen(false)}>
              取消
            </Button>
            <Button
              disabled={creatingPool}
              onClick={() => void submitCreatePool()}
            >
              {creatingPool ? "建立中…" : "建立"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createItemOpen} onOpenChange={setCreateItemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增獎項 {selectedPool ? `— ${selectedPool.label}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
              <button
                type="button"
                onClick={() => setPrizeTypeHelpOpen((o) => !o)}
                className="text-xs text-violet-700 hover:underline"
              >
                ？ 查看類型說明
              </button>
              {prizeTypeHelpOpen ? (
                <div className="mt-2 space-y-1.5 text-xs text-zinc-400">
                  <p className="font-medium text-zinc-500">獎項類型說明：</p>
                  <p>
                    探險幣（coins）：填寫 min/max 範圍，用戶獲得隨機數量
                  </p>
                  <p>
                    經驗值（exp）：填寫 min/max 範圍，直接加到 total_exp
                  </p>
                  <p>
                    稱號（title）：填寫標籤名稱；可選胸章圖（public/items，與商城稱號一致）、可選
                    effect_key
                  </p>
                  <p>
                    頭像框（avatar_frame）：可從商城帶入或選 public
                    frames/avatars；需 effect_key 與主圖路徑
                  </p>
                  <p>
                    卡片外框（card_frame）：可從商城帶入或選 public
                    frames/cards；需 effect_key 與主圖（metadata 圖層不寫入獎項）
                  </p>
                  <p>
                    廣播券（broadcast）：用戶可發送全站廣播，有效 24 小時
                  </p>
                </div>
              ) : null}
            </div>
            <div>
              <label className="text-xs text-gray-500">reward_type</label>
              <select
                value={newItemType}
                onChange={(e) => setNewItemType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {REWARD_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">標籤</label>
              <input
                type="text"
                value={newItemLabel}
                onChange={(e) => setNewItemLabel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">權重（≥1）</label>
              <input
                type="text"
                inputMode="numeric"
                value={newItemWeight}
                onChange={(e) =>
                  setNewItemWeight(e.target.value.replace(/[^0-9]/g, "") || "1")
                }
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
              <p className="mt-0.5 text-[10px] text-gray-500">
                數字越大機率越高（建議 1–100）
              </p>
            </div>
            {(newItemType === "coins" || newItemType === "exp") && (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500">min</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newItemMin}
                    onChange={(e) =>
                      setNewItemMin(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    最小獲得數量
                  </p>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500">max</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newItemMax}
                    onChange={(e) =>
                      setNewItemMax(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    最大獲得數量（空白=固定值）
                  </p>
                </div>
              </div>
            )}
            {(newItemType === "avatar_frame" ||
              newItemType === "card_frame" ||
              newItemType === "title") && (
              <div className="space-y-2">
                <div>
                  <label
                    className="text-xs text-gray-500"
                    htmlFor="new-item-shop-tpl"
                  >
                    從商城商品帶入
                  </label>
                  <select
                    id="new-item-shop-tpl"
                    key={`new-shop-tpl-${newItemShopTemplateNonce}`}
                    defaultValue=""
                    aria-label="從商城商品帶入名稱與框架設定"
                    onChange={(e) => {
                      const sid = e.target.value;
                      if (!sid) return;
                      const row = shopItemsForTemplates.find(
                        (x) => x.id === sid,
                      );
                      if (!row || row.item_type !== newItemType) return;
                      setNewItemLabel(row.name.trim() || "");
                      setNewItemEffectKey(row.effect_key?.trim() ?? "");
                      setNewItemImageUrl(row.image_url?.trim() ?? "");
                      setNewItemShopTemplateNonce((n) => n + 1);
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  >
                    <option value="">
                      （選擇商城商品帶入名稱／effect_key／主圖）
                    </option>
                    {shopItemsForTemplates
                      .filter((s) => s.item_type === newItemType)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}（{s.sku}）
                        </option>
                      ))}
                  </select>
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    {newItemType === "title"
                      ? "帶入商城稱號之名稱、effect_key、胸章圖。"
                      : "僅寫入獎項可存欄位；卡框商品之背景／角圖等 metadata 不會寫入獎項。"}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">
                    特效代碼（effect_key）
                  </label>
                  <input
                    type="text"
                    value={newItemEffectKey}
                    onChange={(e) => setNewItemEffectKey(e.target.value)}
                    placeholder={
                      newItemType === "title"
                        ? "選填，與商城稱號一致時可留空"
                        : "如：star_frame、rainbow_frame"
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                <LocalFrameImagePicker
                  rewardType={
                    newItemType === "title"
                      ? "title"
                      : newItemType === "avatar_frame"
                        ? "avatar_frame"
                        : "card_frame"
                  }
                  imageUrl={newItemImageUrl}
                  onImageUrlChange={setNewItemImageUrl}
                  buckets={localFrameBuckets}
                  onBucketsChange={setLocalFrameBuckets}
                  selectId="new-item-frame-sel"
                  manualInputId="new-item-frame-manual"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateItemOpen(false)}>
              取消
            </Button>
            <Button
              disabled={creatingItem}
              onClick={() => void submitCreateItem()}
            >
              {creatingItem ? "新增中…" : "新增"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deletePoolId != null}
        onOpenChange={(o) => !o && setDeletePoolId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定刪除此獎池？</AlertDialogTitle>
            <AlertDialogDescription>
              將一併刪除池內所有獎項。若已有抽獎紀錄請改為「停用」。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deletePoolId) return;
                const id = deletePoolId;
                setDeletePoolId(null);
                const r = await deletePrizePoolAction(id);
                if (!r.ok) {
                  toast.error(r.error);
                  return;
                }
                toast.success("已刪除獎池");
                await loadPools();
                setSelectedPoolId((prev) => (prev === id ? null : prev));
              }}
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
