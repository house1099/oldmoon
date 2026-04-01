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
import {
  CARD_FRAME_OVERLAY_PERCENT,
  SHOP_CARD_FRAME_PREVIEW_HEIGHT_PX,
  SHOP_CARD_FRAME_PREVIEW_WIDTH_PX,
} from "@/lib/constants/shop-card-frame-preview";
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

/** 表單獨立欄位：不寫入「進階 metadata JSON」文字區，避免重複 */
function stripReservedCardDecorationKeys(meta: Record<string, unknown>) {
  const m = stripFrameLayoutKeys(meta);
  delete m.cardBgImageUrl;
  delete m.cardCornerImageUrl;
  delete m.cardMascotImageUrl;
  delete m.cardEffectKey;
  return m;
}

function readMetaString(meta: Record<string, unknown>, key: string): string {
  const v = meta[key];
  return typeof v === "string" ? v.trim() : "";
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
  /** 玩家持有後：血盟贈送 */
  allow_gift: boolean;
  /** 預留：玩家間買賣／市集 */
  allow_player_trade: boolean;
  allow_resell: boolean;
  resell_price: string;
  /** 空白 = 與商品售價幣種相同 */
  resell_currency_type: string;
  allow_delete: boolean;
  /** 頭像框／卡框對齊（寫入 metadata.frame_layout） */
  frame_offset_x: string;
  frame_offset_y: string;
  frame_scale: string;
  /** 卡片外框預留圖層（寫入 metadata） */
  card_bg_image_url: string;
  card_corner_image_url: string;
  card_mascot_image_url: string;
  /** 預留：卡片動畫識別（metadata.cardEffectKey） */
  card_effect_key: string;
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
  allow_gift: true,
  allow_player_trade: true,
  allow_resell: false,
  resell_price: "",
  resell_currency_type: "",
  allow_delete: true,
  frame_offset_x: "0",
  frame_offset_y: "0",
  frame_scale: "100",
  card_bg_image_url: "",
  card_corner_image_url: "",
  card_mascot_image_url: "",
  card_effect_key: "",
};

function itemToForm(item: ShopItemRow): FormData {
  const rawMeta =
    item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
      ? { ...(item.metadata as Record<string, unknown>) }
      : {};
  const layout =
    parseShopFrameLayoutFromMetadata(rawMeta) ?? DEFAULT_SHOP_FRAME_LAYOUT;
  const metaForTextarea = stripReservedCardDecorationKeys(rawMeta);
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
    allow_gift: item.allow_gift !== false,
    allow_player_trade: item.allow_player_trade !== false,
    allow_resell: Boolean(item.allow_resell),
    resell_price:
      item.resell_price != null && Number.isFinite(Number(item.resell_price))
        ? String(item.resell_price)
        : "",
    resell_currency_type: item.resell_currency_type?.trim() ?? "",
    allow_delete: item.allow_delete !== false,
    frame_offset_x: String(layout.offsetXPercent),
    frame_offset_y: String(layout.offsetYPercent),
    frame_scale: String(layout.scalePercent),
    card_bg_image_url: readMetaString(rawMeta, "cardBgImageUrl"),
    card_corner_image_url: readMetaString(rawMeta, "cardCornerImageUrl"),
    card_mascot_image_url: readMetaString(rawMeta, "cardMascotImageUrl"),
    card_effect_key: readMetaString(rawMeta, "cardEffectKey"),
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
  const [localFrameBuckets, setLocalFrameBuckets] = useState<{
    root: string[];
    avatars: string[];
    cards: string[];
  }>({ root: [], avatars: [], cards: [] });
  const [localItems, setLocalItems] = useState<string[]>([]);
  const [listTab, setListTab] = useState<"listed" | "delisted">("listed");
  const [typeFilter, setTypeFilter] = useState<string>("all");
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
      setLocalFrameBuckets({
        root: res.data.framesRoot,
        avatars: res.data.framesAvatars,
        cards: res.data.framesCards,
      });
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

  const localImageOptions = useMemo(() => {
    if (form.item_type === "avatar_frame") {
      return Array.from(
        new Set([...localFrameBuckets.avatars, ...localFrameBuckets.root]),
      ).sort((a, b) => a.localeCompare(b));
    }
    if (form.item_type === "card_frame") {
      return Array.from(
        new Set([...localFrameBuckets.cards, ...localFrameBuckets.root]),
      ).sort((a, b) => a.localeCompare(b));
    }
    return localItems;
  }, [
    form.item_type,
    localFrameBuckets.avatars,
    localFrameBuckets.cards,
    localFrameBuckets.root,
    localItems,
  ]);

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
    let resellPriceNum: number | null = null;
    if (form.allow_resell) {
      const rp = parseInt(form.resell_price.replace(/[^0-9]/g, ""), 10);
      if (!Number.isFinite(rp) || rp < 0) {
        toast.error("回賣回收金額須為 ≥ 0 的整數");
        return;
      }
      resellPriceNum = rp;
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
      if (form.item_type === "card_frame") {
        const m = metadata as Record<string, unknown>;
        const setPath = (key: string, val: string) => {
          const t = val.trim();
          if (t) m[key] = t;
          else delete m[key];
        };
        setPath("cardBgImageUrl", form.card_bg_image_url);
        setPath("cardCornerImageUrl", form.card_corner_image_url);
        setPath("cardMascotImageUrl", form.card_mascot_image_url);
        setPath("cardEffectKey", form.card_effect_key);
        metadata = m;
      }
    } else if (metadata != null && typeof metadata === "object" && !Array.isArray(metadata)) {
      const m = stripFrameLayoutKeys(metadata as Record<string, unknown>);
      metadata = Object.keys(m).length ? m : null;
    }

    if (form.item_type === "fishing_bait" && metadata) {
      const { validateFishingBaitMetadata } = await import(
        "@/lib/utils/fishing-shop-metadata"
      );
      const err = validateFishingBaitMetadata(metadata as Record<string, unknown>);
      if (err) {
        toast.error(err);
        return;
      }
    }
    if (form.item_type === "fishing_rod" && metadata) {
      const { validateFishingRodMetadata } = await import(
        "@/lib/utils/fishing-shop-metadata"
      );
      const err = validateFishingRodMetadata(metadata as Record<string, unknown>);
      if (err) {
        toast.error(err);
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
      allow_gift: form.allow_gift,
      allow_player_trade: form.allow_player_trade,
      allow_resell: form.allow_resell,
      resell_price: form.allow_resell ? resellPriceNum : null,
      resell_currency_type:
        form.allow_resell && form.resell_currency_type.trim()
          ? form.resell_currency_type.trim()
          : null,
      allow_delete: form.allow_delete,
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

  const tabItems = useMemo(
    () =>
      items.filter((item) =>
        listTab === "listed" ? item.is_active : !item.is_active,
      ),
    [items, listTab],
  );

  const filteredItems = useMemo(() => {
    if (typeFilter === "all") return tabItems;
    return tabItems.filter((item) => item.item_type === typeFilter);
  }, [tabItems, typeFilter]);

  const tabEmpty = tabItems.length === 0;
  const filterEmpty = !tabEmpty && filteredItems.length === 0;

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

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex max-w-md rounded-full bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setListTab("listed")}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:px-4 ${
              listTab === "listed"
                ? "bg-white text-emerald-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            上架中
          </button>
          <button
            type="button"
            onClick={() => setListTab("delisted")}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:px-4 ${
              listTab === "delisted"
                ? "bg-white text-gray-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            已下架
          </button>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="shrink-0">商品類型</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 sm:max-w-xs sm:flex-none"
          >
            <option value="all">全部</option>
            {ITEM_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
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
            {filteredItems.map((item) => (
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
            {items.length > 0 && tabEmpty && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-400">
                  {listTab === "listed"
                    ? "此分頁尚無上架中商品"
                    : "此分頁尚無下架商品"}
                </td>
              </tr>
            )}
            {filterEmpty && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-400">
                  此類型下沒有商品，請改選其他類型
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filteredItems.map((item) => (
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
        {items.length > 0 && tabEmpty && (
          <p className="py-8 text-center text-gray-400">
            {listTab === "listed"
              ? "此分頁尚無上架中商品"
              : "此分頁尚無下架商品"}
          </p>
        )}
        {filterEmpty && (
          <p className="py-8 text-center text-gray-400">
            此類型下沒有商品，請改選其他類型
          </p>
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
                        {form.item_type === "avatar_frame" ? (
                          <>
                            {localFrameBuckets.avatars.length > 0 ? (
                              <optgroup label="frames/avatars/（頭像框建議）">
                                {localFrameBuckets.avatars.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </optgroup>
                            ) : null}
                            {localFrameBuckets.root.length > 0 ? (
                              <optgroup label="frames/ 根目錄（legacy）">
                                {localFrameBuckets.root.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </optgroup>
                            ) : null}
                          </>
                        ) : form.item_type === "card_frame" ? (
                          <>
                            {localFrameBuckets.cards.length > 0 ? (
                              <optgroup label="frames/cards/（卡框建議）">
                                {localFrameBuckets.cards.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </optgroup>
                            ) : null}
                            {localFrameBuckets.root.length > 0 ? (
                              <optgroup label="frames/ 根目錄（legacy）">
                                {localFrameBuckets.root.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </optgroup>
                            ) : null}
                          </>
                        ) : form.item_type === "title" ? (
                          localItems.length > 0 ? (
                            <optgroup label="items/（稱號胸章建議）">
                              {localItems.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </optgroup>
                          ) : null
                        ) : (
                          localImageOptions.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))
                        )}
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
                            setLocalFrameBuckets({
                              root: res.data.framesRoot,
                              avatars: res.data.framesAvatars,
                              cards: res.data.framesCards,
                            });
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
                      {form.item_type === "avatar_frame"
                        ? "頭像框建議放 public/frames/avatars/（或 legacy：frames 根目錄）。路徑與 item_type 分開管理，查詢以資料庫欄位為準，不會混淆。"
                        : form.item_type === "card_frame"
                          ? "卡框建議放 public/frames/cards/（或 legacy：frames 根目錄）。與頭像框分資料夾僅為資產整理，image_url 仍為完整路徑字串。"
                          : form.item_type === "title"
                            ? "稱號胸章建議放 public/items/，透明底 PNG／WebP、正方形構圖；與頭像框分開管理。"
                            : "一般商品請放 public/items，建議直接用上方下拉選。"}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "rounded-xl border border-gray-200 bg-gray-50",
                      form.item_type === "title"
                        ? "flex h-11 w-11 items-center justify-center"
                        : "h-20 w-20",
                    )}
                  >
                    {form.image_url.trim().startsWith("/") && !imagePreviewError ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={form.image_url.trim()}
                        alt=""
                        className={cn(
                          "rounded-xl",
                          form.item_type === "title"
                            ? "max-h-9 max-w-9 object-contain"
                            : "h-full w-full object-cover",
                        )}
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
              {form.item_type === "loot_box" ? (
                <p className="mt-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                  須選「盲盒」類型，前台購買才會走獎池{" "}
                  <span className="font-mono">loot_box</span>（與七日簽到第 7
                  天相同）。僅改 SKU／名稱無效；商品圖可不設，不影響開獎。
                </p>
              ) : null}
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
                    <>
                      卡片外框預覽槽與個資彈窗（UserDetailModal）外殼比例一致（約{" "}
                      {SHOP_CARD_FRAME_PREVIEW_WIDTH_PX}×
                      {SHOP_CARD_FRAME_PREVIEW_HEIGHT_PX}
                      px、rounded-3xl）。框圖疊放{" "}
                      <span className="font-mono">{CARD_FRAME_OVERLAY_PERCENT}%</span>
                      （常數 CARD_FRAME_OVERLAY_PERCENT，與頭像框 160% 分離）。探索列表 UserCard
                      的紫色光暈為等級特效（LevelCardEffect），非此商品圖。
                    </>
                  )}
                </p>
                {form.item_type === "card_frame" ? (
                  <details className="rounded-lg border border-dashed border-gray-300 bg-white/80 px-3 py-2">
                    <summary className="cursor-pointer text-xs font-medium text-gray-700">
                      未來裝飾層（metadata：背景／角落／角色圖）
                    </summary>
                    <div className="mt-2 space-y-2 border-t border-gray-100 pt-2">
                      <label className="block text-[11px] text-gray-600">
                        背景紋理路徑（cardBgImageUrl）
                        <input
                          type="text"
                          value={form.card_bg_image_url}
                          onChange={(e) => setField("card_bg_image_url", e.target.value)}
                          placeholder="/textures/card-bg.png"
                          className="mt-0.5 block w-full rounded border border-gray-200 px-2 py-1 font-mono text-xs"
                        />
                      </label>
                      <label className="block text-[11px] text-gray-600">
                        角落圖路徑（cardCornerImageUrl）
                        <input
                          type="text"
                          value={form.card_corner_image_url}
                          onChange={(e) =>
                            setField("card_corner_image_url", e.target.value)
                          }
                          placeholder="/decor/corner.png"
                          className="mt-0.5 block w-full rounded border border-gray-200 px-2 py-1 font-mono text-xs"
                        />
                      </label>
                      <label className="block text-[11px] text-gray-600">
                        角色圖路徑（cardMascotImageUrl）
                        <input
                          type="text"
                          value={form.card_mascot_image_url}
                          onChange={(e) =>
                            setField("card_mascot_image_url", e.target.value)
                          }
                          placeholder="/decor/mascot.png"
                          className="mt-0.5 block w-full rounded border border-gray-200 px-2 py-1 font-mono text-xs"
                        />
                      </label>
                      <label className="block text-[11px] text-gray-600">
                        卡片特效代碼（cardEffectKey，預留）
                        <input
                          type="text"
                          value={form.card_effect_key}
                          onChange={(e) =>
                            setField("card_effect_key", e.target.value)
                          }
                          placeholder="與 effect_key 分開，供未來多層動畫"
                          className="mt-0.5 block w-full rounded border border-gray-200 px-2 py-1 font-mono text-xs"
                        />
                      </label>
                    </div>
                  </details>
                ) : null}
                <div
                  ref={framePreviewBoxRef}
                  className={
                    form.item_type === "avatar_frame"
                      ? cn(
                          "relative mx-auto touch-none select-none overflow-visible bg-zinc-700",
                          form.effect_key?.trim() && `effect-${form.effect_key.trim()}`,
                        )
                      : cn(
                          "relative mx-auto touch-none select-none overflow-hidden rounded-3xl bg-zinc-700",
                          form.effect_key?.trim() && `effect-${form.effect_key.trim()}`,
                        )
                  }
                  style={
                    form.item_type === "avatar_frame"
                      ? {
                          width: AVATAR_FRAME_PREVIEW_SLOT_PX,
                          height: AVATAR_FRAME_PREVIEW_SLOT_PX,
                        }
                      : form.item_type === "card_frame"
                        ? {
                            width: SHOP_CARD_FRAME_PREVIEW_WIDTH_PX,
                            height: SHOP_CARD_FRAME_PREVIEW_HEIGHT_PX,
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
                      {form.card_bg_image_url.trim().startsWith("/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.card_bg_image_url.trim()}
                          alt=""
                          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover opacity-80"
                        />
                      ) : (
                        <div className="absolute inset-0 z-0 flex items-center justify-center rounded-3xl border border-dashed border-zinc-500/50 bg-zinc-800/40 text-[9px] text-zinc-500">
                          背景紋理 未設定
                        </div>
                      )}
                      <div className="absolute inset-[7%] z-[1] rounded-2xl bg-zinc-600/75" />
                      {form.image_url.trim() ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.image_url.trim()}
                          alt=""
                          className="pointer-events-none absolute left-1/2 top-1/2 z-[2] max-w-none -translate-x-1/2 -translate-y-1/2 select-none object-contain"
                          style={{
                            width: `${CARD_FRAME_OVERLAY_PERCENT}%`,
                            height: `${CARD_FRAME_OVERLAY_PERCENT}%`,
                            ...framePreviewStyle,
                          }}
                        />
                      ) : (
                        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[2] flex h-[40%] w-[55%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl border border-dashed border-zinc-500/50 text-[9px] text-zinc-500">
                          卡框圖 未設定
                        </div>
                      )}
                      {form.card_corner_image_url.trim().startsWith("/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.card_corner_image_url.trim()}
                          alt=""
                          className="pointer-events-none absolute right-[3%] top-[3%] z-[3] w-[18%] max-w-[52px] object-contain"
                        />
                      ) : (
                        <div className="pointer-events-none absolute right-[3%] top-[3%] z-[3] flex h-[14%] w-[18%] max-w-[52px] items-center justify-center rounded border border-dashed border-zinc-500/50 text-[7px] leading-tight text-zinc-500">
                          角落 未設定
                        </div>
                      )}
                      {form.card_mascot_image_url.trim().startsWith("/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.card_mascot_image_url.trim()}
                          alt=""
                          className="pointer-events-none absolute bottom-[2%] right-[2%] z-[4] w-[22%] max-w-[72px] object-contain"
                        />
                      ) : (
                        <div className="pointer-events-none absolute bottom-[2%] right-[2%] z-[4] flex h-[18%] w-[22%] max-w-[72px] items-center justify-center rounded border border-dashed border-zinc-500/50 text-[7px] leading-tight text-zinc-500">
                          角色 未設定
                        </div>
                      )}
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
            <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-2">
              <p className="text-xs font-medium text-gray-600">
                玩家持有後（背包贈送／刪除／回賣）
              </p>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.allow_gift}
                  onChange={(e) => setField("allow_gift", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-violet-600"
                />
                <span className="text-gray-700">允許贈送（血盟夥伴）</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.allow_player_trade}
                  onChange={(e) => setField("allow_player_trade", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-violet-600"
                />
                <span className="text-gray-700">允許玩家買賣／市集（預留）</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.allow_delete}
                  onChange={(e) => setField("allow_delete", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-violet-600"
                />
                <span className="text-gray-700">允許從背包刪除</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.allow_resell}
                  onChange={(e) => setField("allow_resell", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-violet-600"
                />
                <span className="text-gray-700">允許回賣給系統（回收）</span>
              </label>
              {form.allow_resell ? (
                <div className="grid grid-cols-1 gap-2 pl-6 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-gray-700 text-xs">單件回收金額（≥ 0）</span>
                    <input
                      type="text"
                      value={form.resell_price}
                      onChange={(e) =>
                        setField("resell_price", e.target.value.replace(/[^0-9]/g, ""))
                      }
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="0"
                    />
                  </label>
                  <label className="block">
                    <span className="text-gray-700 text-xs">回收幣種</span>
                    <select
                      value={form.resell_currency_type}
                      onChange={(e) => setField("resell_currency_type", e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">與商品售價幣種相同</option>
                      <option value="free_coins">🪙 探險幣</option>
                      <option value="premium_coins">💎 純金</option>
                    </select>
                  </label>
                </div>
              ) : null}
            </div>
            <label className="block">
              <span className="text-gray-700">進階設定（metadata JSON，選填）</span>
              <span className="ml-1 text-xs text-gray-400">
                釣竿機率加成等（框類商品的對齊會另存為 frame_layout，不須手寫）
              </span>
              {form.item_type === "fishing_bait" ? (
                <p className="mt-1 text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
                  一般餌：四項
                  <code className="text-[11px] text-gray-900">bait_common_rate</code>～
                  <code className="text-[11px] text-gray-900">bait_matchmaker_rate</code>
                  加總 100，<code className="text-[11px] text-gray-900">bait_leviathan_rate</code>
                  ＝0。章魚餌：加 <code className="text-[11px] text-gray-900">bait_octopus</code>
                  : true 時五項加總 100。
                </p>
              ) : null}
              {form.item_type === "fishing_rod" ? (
                <p className="mt-1 text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
                  釣竿必填：
                  <code className="text-[11px] text-gray-900">rod_max_casts_per_day</code>（每日可拋）、
                  <code className="text-[11px] text-gray-900">rod_wait_until_harvest_minutes</code>
                  （拋竿後至可收成之分鐘）、
                  <code className="text-[11px] text-gray-900">rod_cooldown_minutes</code>
                  （收竿後再拋冷卻分鐘，可填 0）。
                </p>
              ) : null}
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
            <Button variant="outlineLight" onClick={() => setDialogOpen(false)}>
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
