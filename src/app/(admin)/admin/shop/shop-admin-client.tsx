"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
} from "@/services/admin.action";
import type { ShopItemRow } from "@/lib/repositories/server/shop.repository";
import { uploadAvatarToCloudinary } from "@/lib/utils/cloudinary";

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
};

function itemToForm(item: ShopItemRow): FormData {
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
    metadata: item.metadata ? JSON.stringify(item.metadata, null, 2) : "",
    image_url: item.image_url?.trim() ?? "",
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
  const shopImageInputRef = useRef<HTMLInputElement>(null);

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

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(item: ShopItemRow) {
    setEditingId(item.id);
    setForm(itemToForm(item));
    setDialogOpen(true);
  }

  function setField(key: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
        metadata = JSON.parse(form.metadata);
      } catch {
        toast.error("進階設定 JSON 格式錯誤");
        return;
      }
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
                {form.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={form.image_url}
                    alt=""
                    className="h-20 w-20 rounded-xl border border-gray-200 object-cover"
                  />
                ) : null}
              </div>
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
              <span className="ml-1 text-xs text-gray-400">釣竿機率加成等</span>
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
