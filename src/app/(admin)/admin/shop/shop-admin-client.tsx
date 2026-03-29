"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  getShopItemsAdminAction,
  createShopItemAction,
  updateShopItemAction,
  toggleShopItemAction,
  deleteShopItemAction,
  getShopLocalImageOptionsAction,
} from "@/services/admin.action";
import type { ShopItemRow } from "@/lib/repositories/server/shop.repository";
import { uploadAvatarToCloudinary } from "@/lib/utils/cloudinary";
import {
  DEFAULT_SHOP_FRAME_LAYOUT,
  parseShopFrameLayoutFromMetadata,
  SHOP_FRAME_LAYOUT_OFFSET_MAX_ABS,
  shopFrameLayoutStyle,
  type ShopFrameLayout,
} from "@/lib/utils/avatar-frame-layout";
import {
  MASTER_AVATAR_FRAME_OVERLAY_PERCENT,
  MASTER_AVATAR_INNER_PHOTO_DIAMETER_SCALE,
} from "@/lib/constants/master-avatar-frame";
import { cn } from "@/lib/utils";

/** 後台頭像框預覽槽位邊長（px），對應 `h-20 w-20` */
const AVATAR_FRAME_PREVIEW_SLOT_PX = 80;

const ITEM_TYPE_LABELS: Record<string, string> = {
  avatar_frame: "頭像框",
  card_frame: "卡片外框",
  title: "稱號",
  broadcast: "廣播券",
  bag_expansion: "背包擴充包",
  loot_box: "盲盒",
  rename_card: "改名卡",
  fishing_bait: "釣餌",
  fishing_rod: "釣竿",
  exp_boost: "EXP加成券",
  coins_pack: "探險幣包",
};

const ITEM_TYPE_OPTIONS = Object.entries(ITEM_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const CURRENCY_LABELS: Record<string, string> = {
  free_coins: "🪙 探險幣",
  premium_coins: "💎 純金",
};

const EFFECT_KEY_TYPES = new Set(["avatar_frame", "card_frame", "title"]);
const FRAME_ITEM_TYPES = new Set(["avatar_frame", "card_frame"]);

function stripFrameLayoutKeys(meta: Record<string, unknown>) {
  const m = { ...meta };
  delete m.frame_layout;
  delete m.avatar_frame_layout;
  return m;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function parseLayoutField(raw: string, fallback: number): number {
  const n = parseFloat(raw.replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

type FormData = {
  sku: string;
  name: string;
  description: string;
  item_type: string;
  effect_key: string;
  currency_type: string;
  price: string;
  original_price: string;
  daily_limit: string;
  sale_start_at: string;
  sale_end_at: string;
  sort_order: string;
  is_active: boolean;
  metadata: string;
  image_url: string;
  /** 頭像框／卡框對齊（寫入 metadata.frame_layout） */
  frame_offset_x: string;
  frame_offset_y: string;
  frame_scale: string;
};

const EMPTY_FORM: FormData = {
  sku: "",
  name: "",
  description: "",
  item_type: "broadcast",
  effect_key: "",
  currency_type: "free_coins",
  price: "0",
  original_price: "",
  daily_limit: "",
  sale_start_at: "",
  sale_end_at: "",
  sort_order: "0",
  is_active: false,
  metadata: "",
  image_url: "",
  frame_offset_x: "0",
  frame_offset_y: "0",
  frame_scale: "100",
};

function itemToForm(item: ShopItemRow): FormData {
  const rawMeta =
    item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
      ? { ...(item.metadata as Record<string, unknown>) }
      : {};
  const layout =
    parseShopFrameLayoutFromMetadata(rawMeta) ?? DEFAULT_SHOP_FRAME_LAYOUT;
  const metaForTextarea = stripFrameLayoutKeys(rawMeta);
  return {
    sku: item.sku,
    name: item.name,
    description: item.description ?? "",
    item_type: item.item_type,
    effect_key: item.effect_key ?? "",
    currency_type: item.currency_type,
    price: String(item.price),
    original_price: item.original_price != null ? String(item.original_price) : "",
    daily_limit: item.daily_limit != null ? String(item.daily_limit) : "",
    sale_start_at: item.sale_start_at
      ? new Date(item.sale_start_at).toISOString().slice(0, 16)
      : "",
    sale_end_at: item.sale_end_at
      ? new Date(item.sale_end_at).toISOString().slice(0, 16)
      : "",
    sort_order: String(item.sort_order),
    is_active: item.is_active,
    metadata: Object.keys(metaForTextarea).length
      ? JSON.stringify(metaForTextarea, null, 2)
      : "",
    image_url: item.image_url?.trim() ?? "",
    frame_offset_x: String(layout.offsetXPercent),
    frame_offset_y: String(layout.offsetYPercent),
    frame_scale: String(layout.scalePercent),
  };
}

export default function ShopAdminClient() {
  const [items, setItems] = useState<ShopItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ShopItemRow | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageMode, setImageMode] = useState<"local" | "cloudinary">("local");
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [localFrames, setLocalFrames] = useState<string[]>([]);
  const [localItems, setLocalItems] = useState<string[]>([]);
  const shopImageInputRef = useRef<HTMLInputElement>(null);
  const framePreviewDragRef = useRef<{
    active: boolean;
    lastX: number;
    lastY: number;
    pointerId: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getShopItemsAdminAction();
    if (res.ok) setItems(res.data);
    else toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!dialogOpen || imageMode !== "local") return;
    void (async () => {
      const res = await getShopLocalImageOptionsAction();
      if (!res.ok) return;
      setLocalFrames(res.data.frames);
      setLocalItems(res.data.items);
    })();
  }, [dialogOpen, imageMode]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageMode("local");
    setImagePreviewError(false);
    setDialogOpen(true);
  }

  function openEdit(item: ShopItemRow) {
    setEditingId(item.id);
    setForm(itemToForm(item));
    setImageMode(
      item.image_url?.trim().startsWith("https://") ? "cloudinary" : "local",
    );
    setImagePreviewError(false);
    setDialogOpen(true);
  }

  function setField(key: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const localImageOptions = FRAME_ITEM_TYPES.has(form.item_type) ? localFrames : localItems;

  const oxMax = SHOP_FRAME_LAYOUT_OFFSET_MAX_ABS;
  const framePreviewLayout: ShopFrameLayout = useMemo(
    () => ({
      offsetXPercent: clamp(parseLayoutField(form.frame_offset_x, 0), -oxMax, oxMax),
      offsetYPercent: clamp(parseLayoutField(form.frame_offset_y, 0), -oxMax, oxMax),
      scalePercent: clamp(parseLayoutField(form.frame_scale, 100), 50, 200),
    }),
    [form.frame_offset_x, form.frame_offset_y, form.frame_scale, oxMax],
  );
  const framePreviewStyle = shopFrameLayoutStyle(framePreviewLayout);

  const framePreviewBoxRef = useRef<HTMLDivElement>(null);

  function applyFrameDragDelta(dxPx: number, dyPx: number) {
    const el = framePreviewBoxRef.current;
    const box = el ? Math.min(el.clientWidth, el.clientHeight) : 80;
    const sens = 45 / Math.max(box, 1);
    const lim = SHOP_FRAME_LAYOUT_OFFSET_MAX_ABS;
    setForm((prev) => ({
      ...prev,
      frame_offset_x: String(
        clamp(parseLayoutField(prev.frame_offset_x, 0) + dxPx * sens, -lim, lim),
      ),
      frame_offset_y: String(
        clamp(parseLayoutField(prev.frame_offset_y, 0) + dyPx * sens, -lim, lim),
      ),
    }));
  }

  async function handleSave() {
    const price = parseInt(form.price, 10);
    if (!Number.isFinite(price) || price < 0) {
      toast.error("售價須為 0 以上整數");
      return;
    }
    const sortOrder = parseInt(form.sort_order, 10);
    if (!Number.isFinite(sortOrder)) {
      toast.error("排序數字須為整數");
      return;
    }
    const dailyLimit = form.daily_limit.trim() === "" ? null : parseInt(form.daily_limit, 10);
    if (dailyLimit != null && (!Number.isFinite(dailyLimit) || dailyLimit < 1)) {
      toast.error("每日限購須 ≥ 1 或留空");
      return;
    }
    const originalPrice = form.original_price.trim() === "" ? null : parseInt(form.original_price, 10);
    if (originalPrice != null && !Number.isFinite(originalPrice)) {
      toast.error("原價須為整數或留空");
      return;
    }

    let metadata: Record<string, unknown> | null = null;
    if (form.metadata.trim()) {
      try {
        metadata = JSON.parse(form.metadata) as Record<string, unknown>;
      } catch {
        toast.error("進階設定 JSON 格式錯誤");
        return;
      }
    }

    if (FRAME_ITEM_TYPES.has(form.item_type)) {
      const lim = SHOP_FRAME_LAYOUT_OFFSET_MAX_ABS;
      const ox = clamp(parseLayoutField(form.frame_offset_x, 0), -lim, lim);
      const oy = clamp(parseLayoutField(form.frame_offset_y, 0), -lim, lim);
      const sc = clamp(parseLayoutField(form.frame_scale, 100), 50, 200);
      const layout: ShopFrameLayout = {
        offsetXPercent: ox,
        offsetYPercent: oy,
        scalePercent: sc,
      };
      metadata = { ...(metadata ?? {}), frame_layout: layout };
    } else if (metadata != null && typeof metadata === "object" && !Array.isArray(metadata)) {
      const m = stripFrameLayoutKeys(metadata as Record<string, unknown>);
      metadata = Object.keys(m).length ? m : null;
    }

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      item_type: form.item_type,
      effect_key: form.effect_key.trim() || null,
      currency_type: form.currency_type,
      price,
      original_price: originalPrice,
      daily_limit: dailyLimit,
      sale_start_at: form.sale_start_at ? new Date(form.sale_start_at).toISOString() : null,
      sale_end_at: form.sale_end_at ? new Date(form.sale_end_at).toISOString() : null,
      is_active: form.is_active,
      sort_order: sortOrder,
      metadata,
      image_url: form.image_url.trim() || null,
    };

    setSaving(true);
    const res = editingId
      ? await updateShopItemAction(editingId, payload)
      : await createShopItemAction(payload);
    setSaving(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(editingId ? "商品已更新" : "商品已建立");
    setDialogOpen(false);
    void load();
  }

  async function handleToggle(item: ShopItemRow) {
    const res = await toggleShopItemAction(item.id, !item.is_active);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(item.is_active ? "已下架" : "已上架");
    void load();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const res = await deleteShopItemAction(deleteTarget.id);
    if (!res.ok) {
      toast.error(res.error);
      setDeleteTarget(null);
      return;
    }
    toast.success("已刪除商品");
    setDeleteTarget(null);
    void load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">🛍️ 商城管理</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> 新增商品
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">名稱</th>
              <th className="px-3 py-2">類型</th>
              <th className="px-3 py-2">幣種</th>
              <th className="px-3 py-2">價格</th>
              <th className="px-3 py-2">每日限購</th>
              <th className="px-3 py-2">狀態</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50/60">
                <td className="px-3 py-2 font-mono text-xs text-gray-600">{item.sku}</td>
                <td className="px-3 py-2 font-medium text-gray-900">{item.name}</td>
                <td className="px-3 py-2">
                  <span className="inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                    {ITEM_TYPE_LABELS[item.item_type] ?? item.item_type}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">
                  {CURRENCY_LABELS[item.currency_type] ?? item.currency_type}
                </td>
                <td className="px-3 py-2 tabular-nums">{item.price}</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {item.daily_limit ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.is_active
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {item.is_active ? "上架" : "下架"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="rounded p-1 hover:bg-gray-100"
                      title="編輯"
                    >
                      <Pencil className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggle(item)}
                      className="rounded p-1 hover:bg-gray-100"
                      title={item.is_active ? "下架" : "上架"}
                    >
                      {item.is_active ? (
                        <ToggleRight className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="rounded p-1 hover:bg-gray-100"
                      title="刪除"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-400">
                  尚無商品
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-gray-200 bg-white p-3 space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-xs font-mono text-gray-500">{item.sku}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  item.is_active
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {item.is_active ? "上架" : "下架"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-700">
                {ITEM_TYPE_LABELS[item.item_type] ?? item.item_type}
              </span>
              <span className="text-gray-500">
                {CURRENCY_LABELS[item.currency_type] ?? item.currency_type} {item.price}
              </span>
              {item.daily_limit != null && (
                <span className="text-gray-500">限購 {item.daily_limit}/日</span>
              )}
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
              <button
                type="button"
                onClick={() => openEdit(item)}
                className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                編輯
              </button>
              <button
                type="button"
                onClick={() => void handleToggle(item)}
                className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                {item.is_active ? "下架" : "上架"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(item)}
                className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
              >
                刪除
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-8 text-center text-gray-400">尚無商品</p>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "編輯商品" : "新增商品"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="text-gray-700">SKU（唯一代號）</span>
              <span className="ml-1 text-xs text-gray-400">英文大寫+數字+底線，如 AVATAR_STAR_001</span>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => setField("sku", e.target.value.replace(/[^A-Z0-9_]/g, "").toUpperCase())}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="AVATAR_STAR_001"
              />
            </label>
            <label className="block">
              <span className="text-gray-700">商品名稱</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <div className="block">
              <span className="text-gray-700">商品圖片</span>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setImageMode("local")}
                  className={`rounded-lg border px-2 py-1 text-xs ${
                    imageMode === "local"
                      ? "border-violet-400 bg-violet-50 text-violet-700"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  本地路徑（建議）
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode("cloudinary")}
                  className={`rounded-lg border px-2 py-1 text-xs ${
                    imageMode === "cloudinary"
                      ? "border-violet-400 bg-violet-50 text-violet-700"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  Cloudinary 上傳（選填）
                </button>
              </div>
              <input
                ref={shopImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setImageUploading(true);
                  void (async () => {
                    try {
                      const url = await uploadAvatarToCloudinary(f, {
                        folder: "shop_items",
                      });
                      setField("image_url", url);
                      toast.success("圖片上傳成功");
                    } catch {
                      toast.error("圖片上傳失敗");
                    } finally {
                      setImageUploading(false);
                    }
                  })();
                }}
              />
              {imageMode === "local" ? (
                <div className="mt-2 grid grid-cols-[1fr_auto] items-start gap-3">
                  <div>
                    <div className="mb-2 grid grid-cols-[1fr_auto] gap-2">
                      <select
                        value={localImageOptions.includes(form.image_url.trim()) ? form.image_url.trim() : ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) return;
                          setImagePreviewError(false);
                          setField("image_url", v);
                        }}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2"
                      >
                        <option value="">從資料夾直接選圖（最穩定）</option>
                        {localImageOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          void (async () => {
                            const res = await getShopLocalImageOptionsAction();
                            if (!res.ok) {
                              toast.error(res.error);
                              return;
                            }
                            setLocalFrames(res.data.frames);
                            setLocalItems(res.data.items);
                            toast.success("已重新讀取圖片清單");
                          })();
                        }}
                        className="rounded-lg border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        重新掃描
                      </button>
                    </div>
                    <input
                      type="text"
                      value={form.image_url}
                      onChange={(e) => {
                        setImagePreviewError(false);
                        setField("image_url", e.target.value);
                      }}
                      placeholder="/items/gold-chest.png"
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {FRAME_ITEM_TYPES.has(form.item_type)
                        ? "頭像框/卡框請放 public/frames，建議直接用上方下拉選。"
                        : "一般商品請放 public/items，建議直接用上方下拉選。"}
                    </p>
                  </div>
                  <div className="h-20 w-20 rounded-xl border border-gray-200 bg-gray-50">
                    {form.image_url.trim().startsWith("/") && !imagePreviewError ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.image_url.trim()}
                        alt=""
                        className="h-full w-full rounded-xl object-cover"
                        onError={() => setImagePreviewError(true)}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-gray-400">
                        圖片路徑無效
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={imageUploading}
                    onClick={() => shopImageInputRef.current?.click()}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {imageUploading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> 上傳中…
                      </span>
                    ) : (
                      "上傳商品圖片"
                    )}
                  </button>
                  <p className="text-xs text-gray-500">
                    建議使用本地路徑以節省 Cloudinary 用量
                  </p>
                  {form.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.image_url}
                      alt=""
                      className="h-20 w-20 rounded-xl border border-gray-200 object-cover"
                    />
                  ) : null}
                </div>
              )}
            </div>
            <label className="block">
              <span className="text-gray-700">商品說明</span>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                rows={2}
              />
            </label>
            <label className="block">
              <span className="text-gray-700">商品類型</span>
              <select
                value={form.item_type}
                onChange={(e) => setField("item_type", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                {ITEM_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            {EFFECT_KEY_TYPES.has(form.item_type) && (
              <label className="block">
                <span className="text-gray-700">特效代碼（effect_key）</span>
                <span className="ml-1 text-xs text-gray-400">
                  對應 CSS 特效，需開發者實作後才生效
                </span>
                <input
                  type="text"
                  value={form.effect_key}
                  onChange={(e) => setField("effect_key", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>
            )}
            {FRAME_ITEM_TYPES.has(form.item_type) ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                <p className="text-xs text-gray-600">
                  {form.item_type === "avatar_frame" ? (
                    <>
                      頭像框預覽與前台一致：槽位{" "}
                      <span className="font-mono">size×size</span>、臉圓約{" "}
                      <span className="font-mono">
                        size×{MASTER_AVATAR_INNER_PHOTO_DIAMETER_SCALE.toFixed(2)}
                      </span>
                      、框圖{" "}
                      <span className="font-mono">{MASTER_AVATAR_FRAME_OVERLAY_PERCENT}%</span>
                      。拖曳／滑桿作用在框圖層（水平／垂直各 ±{SHOP_FRAME_LAYOUT_OFFSET_MAX_ABS}%）。
                    </>
                  ) : (
                    <>卡片外框預覽（圓角矩形槽位）；拖曳／滑桿作用在框圖層。</>
                  )}
                </p>
                <div
                  ref={framePreviewBoxRef}
                  className={
                    form.item_type === "avatar_frame"
                      ? cn(
                          "relative mx-auto touch-none select-none overflow-visible bg-zinc-700",
                          form.effect_key?.trim() && `effect-${form.effect_key.trim()}`,
                        )
                      : cn(
                          "relative mx-auto h-28 w-20 touch-none overflow-hidden rounded-xl bg-zinc-700 select-none",
                          form.effect_key?.trim() && `effect-${form.effect_key.trim()}`,
                        )
                  }
                  style={
                    form.item_type === "avatar_frame"
                      ? {
                          width: AVATAR_FRAME_PREVIEW_SLOT_PX,
                          height: AVATAR_FRAME_PREVIEW_SLOT_PX,
                        }
                      : undefined
                  }
                  onPointerDown={(e) => {
                    if (!form.image_url.trim()) return;
                    framePreviewDragRef.current = {
                      active: true,
                      lastX: e.clientX,
                      lastY: e.clientY,
                      pointerId: e.pointerId,
                    };
                    e.currentTarget.setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => {
                    const d = framePreviewDragRef.current;
                    if (!d?.active || d.pointerId !== e.pointerId) return;
                    const dx = e.clientX - d.lastX;
                    const dy = e.clientY - d.lastY;
                    d.lastX = e.clientX;
                    d.lastY = e.clientY;
                    applyFrameDragDelta(dx, dy);
                  }}
                  onPointerUp={(e) => {
                    const d = framePreviewDragRef.current;
                    if (d?.pointerId === e.pointerId) {
                      framePreviewDragRef.current = null;
                      try {
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      } catch {
                        /* ignore */
                      }
                    }
                  }}
                  onPointerCancel={() => {
                    const d = framePreviewDragRef.current;
                    if (d) framePreviewDragRef.current = null;
                  }}
                >
                  {form.item_type === "avatar_frame" ? (
                    <>
                      <div
                        className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-zinc-500"
                        style={{
                          width: Math.max(
                            1,
                            Math.round(
                              AVATAR_FRAME_PREVIEW_SLOT_PX *
                                MASTER_AVATAR_INNER_PHOTO_DIAMETER_SCALE,
                            ),
                          ),
                          height: Math.max(
                            1,
                            Math.round(
                              AVATAR_FRAME_PREVIEW_SLOT_PX *
                                MASTER_AVATAR_INNER_PHOTO_DIAMETER_SCALE,
                            ),
                          ),
                        }}
                      />
                      {form.image_url.trim() ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.image_url.trim()}
                          alt=""
                          className="pointer-events-none absolute left-1/2 top-1/2 z-[15] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain"
                          style={{
                            width: `${MASTER_AVATAR_FRAME_OVERLAY_PERCENT}%`,
                            height: `${MASTER_AVATAR_FRAME_OVERLAY_PERCENT}%`,
                            ...framePreviewStyle,
                          }}
                        />
                      ) : null}
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-[18%] rounded-lg bg-zinc-500" />
                      {form.image_url.trim() ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.image_url.trim()}
                          alt=""
                          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
                          style={framePreviewStyle}
                        />
                      ) : null}
                    </>
                  )}
                </div>
                <p className="text-center text-[10px] text-gray-400">
                  在預覽區按住拖曳可微調左右／上下（手機可用）
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className="block text-[10px] text-gray-600">
                    水平偏移 %
                    <input
                      type="range"
                      min={-SHOP_FRAME_LAYOUT_OFFSET_MAX_ABS}
                      max={SHOP_FRAME_LAYOUT_OFFSET_MAX_ABS}
                      step={0.5}
                      value={clamp(
                        parseLayoutField(form.frame_offset_x, 0),
                        -SHOP_FRAME_LAYOUT_OFFSET_MAX_ABS,
                        SHOP_FRAME_LAYOUT_OFFSET_MAX_ABS,
                      )}
                      onChange={(e) =>
                        setField("frame_offset_x", e.target.value)
                      }
                      className="mt-0.5 block w-full"
                    />
                    <input
                      type="text"
                      value={form.frame_offset_x}
                      onChange={(e) => setField("frame_offset_x", e.target.value)}
                      className="mt-0.5 w-full rounded border border-gray-200 px-1 py-0.5 text-xs"
                    />
                  </label>
                  <label className="block text-[10px] text-gray-600">
                    垂直偏移 %
                    <input
                      type="range"
                      min={-SHOP_FRAME_LAYOUT_OFFSET_MAX_ABS}
                      max={SHOP_FRAME_LAYOUT_OFFSET_MAX_ABS}
                      step={0.5}
                      value={clamp(
                        parseLayoutField(form.frame_offset_y, 0),
                        -SHOP_FRAME_LAYOUT_OFFSET_MAX_ABS,
                        SHOP_FRAME_LAYOUT_OFFSET_MAX_ABS,
                      )}
                      onChange={(e) =>
                        setField("frame_offset_y", e.target.value)
                      }
                      className="mt-0.5 block w-full"
                    />
                    <input
                      type="text"
                      value={form.frame_offset_y}
                      onChange={(e) => setField("frame_offset_y", e.target.value)}
                      className="mt-0.5 w-full rounded border border-gray-200 px-1 py-0.5 text-xs"
                    />
                  </label>
                  <label className="block text-[10px] text-gray-600">
                    縮放 %
                    <input
                      type="range"
                      min={50}
                      max={200}
                      step={1}
                      value={clamp(parseLayoutField(form.frame_scale, 100), 50, 200)}
                      onChange={(e) =>
                        setField("frame_scale", e.target.value)
                      }
                      className="mt-0.5 block w-full"
                    />
                    <input
                      type="text"
                      value={form.frame_scale}
                      onChange={(e) => setField("frame_scale", e.target.value)}
                      className="mt-0.5 w-full rounded border border-gray-200 px-1 py-0.5 text-xs"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  className="w-full rounded border border-gray-200 py-1 text-[10px] text-gray-500 hover:bg-white"
                  onClick={() => {
                    setField("frame_offset_x", "0");
                    setField("frame_offset_y", "0");
                    setField("frame_scale", "100");
                  }}
                >
                  重設對齊（0 / 0 / 100%）
                </button>
                {!form.effect_key.trim() ? (
                  <p className="text-center text-xs text-gray-400">（無 CSS 特效）</p>
                ) : null}
              </div>
            ) : null}
            <label className="block">
              <span className="text-gray-700">幣種</span>
              <select
                value={form.currency_type}
                onChange={(e) => setField("currency_type", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="free_coins">🪙 探險幣</option>
                <option value="premium_coins">💎 純金</option>
              </select>
            </label>
            <label className="block">
              <span className="text-gray-700">售價</span>
              <span className="ml-1 text-xs text-gray-400">0 = 免費</span>
              <input
                type="text"
                value={form.price}
                onChange={(e) => setField("price", e.target.value.replace(/[^0-9]/g, ""))}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="text-gray-700">原價（選填）</span>
              <span className="ml-1 text-xs text-gray-400">特賣時顯示劃線原價</span>
              <input
                type="text"
                value={form.original_price}
                onChange={(e) =>
                  setField("original_price", e.target.value.replace(/[^0-9]/g, ""))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="留空=不顯示"
              />
            </label>
            <label className="block">
              <span className="text-gray-700">每日限購（選填）</span>
              <span className="ml-1 text-xs text-gray-400">空白 = 無限制，最小 1</span>
              <input
                type="text"
                value={form.daily_limit}
                onChange={(e) =>
                  setField("daily_limit", e.target.value.replace(/[^0-9]/g, ""))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="空白=無限制"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-gray-700 text-xs">限時特賣開始</span>
                <input
                  type="datetime-local"
                  value={form.sale_start_at}
                  onChange={(e) => setField("sale_start_at", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-gray-700 text-xs">限時特賣結束</span>
                <input
                  type="datetime-local"
                  value={form.sale_end_at}
                  onChange={(e) => setField("sale_end_at", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-gray-700">排序數字</span>
              <span className="ml-1 text-xs text-gray-400">小的排前面</span>
              <input
                type="text"
                value={form.sort_order}
                onChange={(e) =>
                  setField("sort_order", e.target.value.replace(/[^0-9]/g, ""))
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setField("is_active", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-violet-600"
              />
              <span className="text-gray-700">上架</span>
            </label>
            <label className="block">
              <span className="text-gray-700">進階設定（metadata JSON，選填）</span>
              <span className="ml-1 text-xs text-gray-400">
                釣竿機率加成等（框類商品的對齊會另存為 frame_layout，不須手寫）
              </span>
              <textarea
                value={form.metadata}
                onChange={(e) => setField("metadata", e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
                rows={3}
                placeholder='{"rare_bonus": 0.1}'
              />
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button disabled={saving} onClick={() => void handleSave()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? "儲存" : "建立"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除？</AlertDialogTitle>
            <AlertDialogDescription>
              即將刪除「{deleteTarget?.name}」（{deleteTarget?.sku}）。若已有購買紀錄則只能停用。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
