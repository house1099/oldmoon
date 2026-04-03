"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Archive,
  ArchiveRestore,
} from "lucide-react";
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
  archiveShopItemAction,
  unarchiveShopItemAction,
  getShopLocalImageOptionsAction,
  getFishingAdminSettingsAction,
} from "@/services/admin.action";
import type { ShopItemRow } from "@/lib/repositories/server/shop.repository";
import type { Json } from "@/types/database.types";
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
import {
  BAIT_OCTOPUS_RATE_SUM_EPSILON,
  detectBaitType,
  resolveRodCooldownResolution,
  stripFishingBaitKeys,
  type RodTierCooldownDefaults,
} from "@/lib/utils/fishing-shop-metadata";

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

const FISHING_ROD_META_KEYS = [
  "rod_tier",
  "rod_cooldown_minutes",
  "rod_max_casts_per_day",
  "rod_wait_until_harvest_minutes",
] as const;

function stripFishingRodKeys(meta: Record<string, unknown>): Record<string, unknown> {
  const m = { ...meta };
  for (const k of FISHING_ROD_META_KEYS) delete m[k];
  return m;
}

/** 載入時：已由表單管理的鍵不寫入「額外 metadata」文字區 */
function pickUnknownShopMetadata(
  raw: Record<string, unknown>,
  itemType: string,
): Record<string, unknown> {
  if (FRAME_ITEM_TYPES.has(itemType)) {
    return stripReservedCardDecorationKeys({ ...raw });
  }
  if (itemType === "fishing_rod") {
    const m = stripFishingRodKeys({ ...raw });
    delete m.rare_bonus;
    return m;
  }
  if (itemType === "fishing_bait") {
    return stripFishingBaitKeys({ ...raw });
  }
  if (itemType === "exp_boost") {
    const m = { ...raw };
    delete m.value;
    return m;
  }
  if (itemType === "coins_pack") {
    const m = { ...raw };
    delete m.value;
    delete m.coin_type;
    return m;
  }
  return { ...raw };
}

function metaRodTierFromRaw(
  meta: Record<string, unknown>,
): "" | "basic" | "mid" | "high" {
  const v = meta.rod_tier;
  return v === "basic" || v === "mid" || v === "high" ? v : "";
}

function metaNumStr(
  meta: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const v = meta[key];
  if (v === undefined || v === null) return fallback;
  if (typeof v === "number" && Number.isFinite(v)) return String(Math.trunc(v));
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return fallback;
}

/** 冷卻分鐘：未設定時留空（走 tier／全站預設） */
function metaCooldownStr(meta: Record<string, unknown>): string {
  const v = meta.rod_cooldown_minutes;
  if (v === undefined || v === null) return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(Math.trunc(v));
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return "";
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
  /** 釣竿：寫入 metadata，免手打 JSON */
  rod_tier: "" | "basic" | "mid" | "high";
  rod_cooldown_minutes: string;
  rod_max_casts_per_day: string;
  rod_wait_until_harvest_minutes: string;
  /** 釣竿選填，寫入 metadata.rare_bonus */
  rod_rare_bonus: string;
  /** 魚餌類型（對應 detectBaitType） */
  bait_kind: "normal" | "octopus" | "heart";
  bait_rare_rate: string;
  bait_legendary_rate: string;
  bait_leviathan_rate: string;
  exp_boost_value: string;
  coins_pack_value: string;
  coins_pack_coin_type: "free" | "premium";
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
  rod_tier: "",
  rod_cooldown_minutes: "",
  rod_max_casts_per_day: "1",
  rod_wait_until_harvest_minutes: "1",
  rod_rare_bonus: "",
  bait_kind: "normal",
  bait_rare_rate: "",
  bait_legendary_rate: "",
  bait_leviathan_rate: "",
  exp_boost_value: "1",
  coins_pack_value: "1",
  coins_pack_coin_type: "free",
};

function itemToForm(item: ShopItemRow): FormData {
  const rawMeta =
    item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
      ? { ...(item.metadata as Record<string, unknown>) }
      : {};
  const layout =
    parseShopFrameLayoutFromMetadata(rawMeta) ?? DEFAULT_SHOP_FRAME_LAYOUT;
  const unknownMeta = pickUnknownShopMetadata(rawMeta, item.item_type);
  const baitKindDetected =
    item.item_type === "fishing_bait" ? detectBaitType(rawMeta) : "normal";
  const baitKindUi: FormData["bait_kind"] =
    baitKindDetected === "heart"
      ? "heart"
      : baitKindDetected === "octopus"
        ? "octopus"
        : "normal";
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
    metadata: Object.keys(unknownMeta).length
      ? JSON.stringify(unknownMeta, null, 2)
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
    rod_tier:
      item.item_type === "fishing_rod" ? metaRodTierFromRaw(rawMeta) : "",
    rod_cooldown_minutes:
      item.item_type === "fishing_rod" ? metaCooldownStr(rawMeta) : "",
    rod_max_casts_per_day:
      item.item_type === "fishing_rod"
        ? metaNumStr(rawMeta, "rod_max_casts_per_day", "1")
        : "1",
    rod_wait_until_harvest_minutes:
      item.item_type === "fishing_rod"
        ? metaNumStr(rawMeta, "rod_wait_until_harvest_minutes", "1")
        : "1",
    rod_rare_bonus:
      item.item_type === "fishing_rod"
        ? (() => {
            const v = rawMeta.rare_bonus;
            if (typeof v === "number" && Number.isFinite(v)) return String(v);
            if (typeof v === "string" && v.trim() !== "") return v.trim();
            return "";
          })()
        : "",
    bait_kind: item.item_type === "fishing_bait" ? baitKindUi : "normal",
    bait_rare_rate:
      item.item_type === "fishing_bait"
        ? metaNumStr(rawMeta, "bait_rare_rate", "")
        : "",
    bait_legendary_rate:
      item.item_type === "fishing_bait"
        ? metaNumStr(rawMeta, "bait_legendary_rate", "")
        : "",
    bait_leviathan_rate:
      item.item_type === "fishing_bait"
        ? metaNumStr(rawMeta, "bait_leviathan_rate", "")
        : "",
    exp_boost_value:
      item.item_type === "exp_boost" ? metaNumStr(rawMeta, "value", "1") : "1",
    coins_pack_value:
      item.item_type === "coins_pack" ? metaNumStr(rawMeta, "value", "1") : "1",
    coins_pack_coin_type:
      item.item_type === "coins_pack" &&
      rawMeta.coin_type === "premium"
        ? "premium"
        : "free",
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
  const [extraMetaEditor, setExtraMetaEditor] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageMode, setImageMode] = useState<"local" | "cloudinary">("local");
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const [baitProfileMissing, setBaitProfileMissing] = useState(false);
  const [localFrameBuckets, setLocalFrameBuckets] = useState<{
    root: string[];
    avatars: string[];
    cards: string[];
  }>({ root: [], avatars: [], cards: [] });
  const [localItems, setLocalItems] = useState<string[]>([]);
  const [localShopFishing, setLocalShopFishing] = useState<string[]>([]);
  const [listTab, setListTab] = useState<"listed" | "delisted" | "archived">(
    "listed",
  );
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [fishingTierDefaults, setFishingTierDefaults] =
    useState<RodTierCooldownDefaults | null>(null);
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
    if (!dialogOpen) return;
    void (async () => {
      const res = await getFishingAdminSettingsAction();
      if (!res.ok) return;
      setFishingTierDefaults({
        basic: res.data.fishing_rod_cooldown_basic_minutes,
        mid: res.data.fishing_rod_cooldown_mid_minutes,
        high: res.data.fishing_rod_cooldown_high_minutes,
      });
    })();
  }, [dialogOpen]);

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
      setLocalShopFishing(res.data.shopFishing);
    })();
  }, [dialogOpen, imageMode]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setExtraMetaEditor(false);
    setImageMode("local");
    setImagePreviewError(false);
    setDialogOpen(true);
  }

  function openEdit(item: ShopItemRow) {
    setEditingId(item.id);
    setForm(itemToForm(item));
    setExtraMetaEditor(false);
    if (item.item_type === "fishing_bait") {
      const m =
        item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
          ? (item.metadata as Record<string, unknown>)
          : {};
      setBaitProfileMissing(!("bait_profile" in m));
    } else {
      setBaitProfileMissing(false);
    }
    setImageMode(
      item.image_url?.trim().startsWith("https://") ? "cloudinary" : "local",
    );
    setImagePreviewError(false);
    setDialogOpen(true);
  }

  function setField(key: keyof FormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const baitOctopusSumPreview = useMemo(() => {
    if (form.item_type !== "fishing_bait" || form.bait_kind !== "octopus") {
      return null;
    }
    const rare = parseFloat(form.bait_rare_rate.replace(",", "."));
    const legendary = parseFloat(form.bait_legendary_rate.replace(",", "."));
    const leviathan = parseFloat(form.bait_leviathan_rate.replace(",", "."));
    if (![rare, legendary, leviathan].every((n) => Number.isFinite(n))) {
      return NaN;
    }
    return rare + legendary + leviathan;
  }, [
    form.item_type,
    form.bait_kind,
    form.bait_rare_rate,
    form.bait_legendary_rate,
    form.bait_leviathan_rate,
  ]);

  const rodCooldownResolutionPreview = useMemo(() => {
    if (form.item_type !== "fishing_rod" || !fishingTierDefaults) return null;
    const meta: Record<string, unknown> = {};
    const max = parseInt(form.rod_max_casts_per_day.replace(/\D/g, ""), 10);
    const wait = parseInt(
      form.rod_wait_until_harvest_minutes.replace(/\D/g, ""),
      10,
    );
    if (Number.isFinite(max) && max >= 1) meta.rod_max_casts_per_day = max;
    if (Number.isFinite(wait) && wait >= 1) {
      meta.rod_wait_until_harvest_minutes = wait;
    }
    if (
      form.rod_tier === "basic" ||
      form.rod_tier === "mid" ||
      form.rod_tier === "high"
    ) {
      meta.rod_tier = form.rod_tier;
    }
    const cdRaw = form.rod_cooldown_minutes.trim();
    if (cdRaw !== "") {
      const cd = parseInt(cdRaw.replace(/\D/g, ""), 10);
      if (Number.isFinite(cd) && cd >= 0 && cd <= 10080) {
        meta.rod_cooldown_minutes = cd;
      }
    }
    return resolveRodCooldownResolution(meta as Json, fishingTierDefaults);
  }, [
    form.item_type,
    form.rod_tier,
    form.rod_cooldown_minutes,
    form.rod_max_casts_per_day,
    form.rod_wait_until_harvest_minutes,
    fishingTierDefaults,
  ]);

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
    if (form.item_type === "fishing_bait" || form.item_type === "fishing_rod") {
      return Array.from(new Set([...localShopFishing, ...localItems])).sort((a, b) =>
        a.localeCompare(b),
      );
    }
    return localItems;
  }, [
    form.item_type,
    localFrameBuckets.avatars,
    localFrameBuckets.cards,
    localFrameBuckets.root,
    localItems,
    localShopFishing,
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

    let unknownParsed: Record<string, unknown> = {};
    if (form.metadata.trim()) {
      try {
        const o = JSON.parse(form.metadata) as unknown;
        if (!o || typeof o !== "object" || Array.isArray(o)) {
          toast.error("額外 metadata JSON 必須為物件");
          return;
        }
        unknownParsed = o as Record<string, unknown>;
      } catch {
        toast.error("額外 metadata JSON 格式錯誤");
        return;
      }
    }

    let metadata: Record<string, unknown> | null = null;

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
      const merged: Record<string, unknown> = { ...unknownParsed, frame_layout: layout };
      if (form.item_type === "card_frame") {
        const setPath = (key: string, val: string) => {
          const t = val.trim();
          if (t) merged[key] = t;
          else delete merged[key];
        };
        setPath("cardBgImageUrl", form.card_bg_image_url);
        setPath("cardCornerImageUrl", form.card_corner_image_url);
        setPath("cardMascotImageUrl", form.card_mascot_image_url);
        setPath("cardEffectKey", form.card_effect_key);
      }
      metadata = Object.keys(merged).length ? merged : null;
    } else if (form.item_type === "fishing_rod") {
      const base: Record<string, unknown> = { ...unknownParsed };
      const max = parseInt(form.rod_max_casts_per_day.replace(/\D/g, ""), 10);
      const wait = parseInt(
        form.rod_wait_until_harvest_minutes.replace(/\D/g, ""),
        10,
      );
      if (!Number.isFinite(max) || max < 1) {
        toast.error("每日拋竿上限須為 ≥1 的整數");
        return;
      }
      if (!Number.isFinite(wait) || wait < 1) {
        toast.error("拋竿後至可收成之分鐘須為 ≥1 的整數");
        return;
      }
      base.rod_max_casts_per_day = max;
      base.rod_wait_until_harvest_minutes = wait;
      if (
        form.rod_tier === "basic" ||
        form.rod_tier === "mid" ||
        form.rod_tier === "high"
      ) {
        base.rod_tier = form.rod_tier;
      } else {
        delete base.rod_tier;
      }
      const cdRaw = form.rod_cooldown_minutes.trim();
      if (cdRaw !== "") {
        const cd = parseInt(cdRaw.replace(/\D/g, ""), 10);
        if (!Number.isFinite(cd) || cd < 0 || cd > 10080) {
          toast.error(
            "拋竿冷卻分鐘須為 0–10080 的整數，或留空以套用等級／全站預設",
          );
          return;
        }
        base.rod_cooldown_minutes = cd;
      } else {
        delete base.rod_cooldown_minutes;
      }
      if (form.rod_rare_bonus.trim() === "") {
        delete base.rare_bonus;
      } else {
        const rb = parseFloat(form.rod_rare_bonus.replace(",", "."));
        if (!Number.isFinite(rb)) {
          toast.error("稀有加成 rare_bonus 須為有效數字");
          return;
        }
        base.rare_bonus = rb;
      }
      metadata = Object.keys(base).length ? base : null;
    } else if (form.item_type === "fishing_bait") {
      const built: Record<string, unknown> = { ...unknownParsed };
      if (form.bait_kind === "normal") {
        built.bait_profile = "normal";
        built.bait_common_rate = 100;
        delete built.bait_matchmaker_rate;
        delete built.bait_rare_rate;
        delete built.bait_legendary_rate;
        delete built.bait_leviathan_rate;
      } else if (form.bait_kind === "heart") {
        built.bait_profile = "heart";
        built.bait_matchmaker_rate = 100;
        delete built.bait_common_rate;
        delete built.bait_rare_rate;
        delete built.bait_legendary_rate;
        delete built.bait_leviathan_rate;
      } else {
        built.bait_profile = "octopus";
        delete built.bait_common_rate;
        delete built.bait_matchmaker_rate;
        const rare = parseFloat(form.bait_rare_rate.replace(",", "."));
        const legendary = parseFloat(form.bait_legendary_rate.replace(",", "."));
        const leviathan = parseFloat(form.bait_leviathan_rate.replace(",", "."));
        if (![rare, legendary, leviathan].every((n) => Number.isFinite(n))) {
          toast.error("章魚餌：稀有／傳說／深海巨獸須為有效數字");
          return;
        }
        built.bait_rare_rate = rare;
        built.bait_legendary_rate = legendary;
        built.bait_leviathan_rate = leviathan;
      }
      delete built.bait_kind;
      metadata = built;
      const { validateBaitMetadata } = await import(
        "@/lib/utils/fishing-shop-metadata"
      );
      const r = validateBaitMetadata(metadata as Record<string, unknown>);
      if (!r.valid) {
        toast.error(r.error ?? "魚餌 metadata 無效");
        return;
      }
    } else if (form.item_type === "exp_boost") {
      const v = parseInt(form.exp_boost_value.replace(/\D/g, ""), 10);
      if (!Number.isFinite(v) || v < 0) {
        toast.error("EXP 加成數值須為 ≥0 的整數");
        return;
      }
      metadata = { ...unknownParsed, value: v };
    } else if (form.item_type === "coins_pack") {
      const v = parseInt(form.coins_pack_value.replace(/\D/g, ""), 10);
      if (!Number.isFinite(v) || v < 0) {
        toast.error("幣包數量須為 ≥0 的整數");
        return;
      }
      metadata = {
        ...unknownParsed,
        value: v,
        coin_type: form.coins_pack_coin_type === "premium" ? "premium" : "free",
      };
    } else {
      metadata = Object.keys(unknownParsed).length ? { ...unknownParsed } : null;
    }

    if (form.item_type === "fishing_rod") {
      const { validateFishingRodMetadata } = await import(
        "@/lib/utils/fishing-shop-metadata"
      );
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        toast.error("釣竿設定異常，請重試");
        return;
      }
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

  async function handleArchive(item: ShopItemRow) {
    const res = await archiveShopItemAction(item.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("已封存並下架");
    void load();
  }

  async function handleUnarchive(item: ShopItemRow) {
    const res = await unarchiveShopItemAction(item.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("已取消封存");
    void load();
  }

  const tabItems = useMemo(() => {
    if (listTab === "archived") {
      return items.filter((item) => item.is_archived);
    }
    if (listTab === "listed") {
      return items.filter((item) => item.is_active && !item.is_archived);
    }
    return items.filter((item) => !item.is_active && !item.is_archived);
  }, [items, listTab]);

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
          <button
            type="button"
            onClick={() => setListTab("archived")}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors sm:flex-none sm:px-4 ${
              listTab === "archived"
                ? "bg-white text-amber-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            封存
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
                  {item.is_archived ? (
                    <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                      封存
                    </span>
                  ) : (
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {item.is_active ? "上架" : "下架"}
                    </span>
                  )}
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
                    {item.is_archived ? (
                      <button
                        type="button"
                        onClick={() => void handleUnarchive(item)}
                        className="rounded p-1 hover:bg-gray-100"
                        title="取消封存"
                      >
                        <ArchiveRestore className="h-4 w-4 text-amber-700" />
                      </button>
                    ) : (
                      <>
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
                          onClick={() => void handleArchive(item)}
                          className="rounded p-1 hover:bg-gray-100"
                          title="封存（並下架）"
                        >
                          <Archive className="h-4 w-4 text-amber-600" />
                        </button>
                      </>
                    )}
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
                    : listTab === "delisted"
                      ? "此分頁尚無下架商品"
                      : "此分頁尚無封存商品"}
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
              {item.is_archived ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                  封存
                </span>
              ) : (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.is_active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {item.is_active ? "上架" : "下架"}
                </span>
              )}
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
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
              <button
                type="button"
                onClick={() => openEdit(item)}
                className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
              >
                編輯
              </button>
              {item.is_archived ? (
                <button
                  type="button"
                  onClick={() => void handleUnarchive(item)}
                  className="rounded px-2 py-1 text-xs text-amber-800 hover:bg-amber-50"
                >
                  取消封存
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void handleToggle(item)}
                    className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                  >
                    {item.is_active ? "下架" : "上架"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleArchive(item)}
                    className="rounded px-2 py-1 text-xs text-amber-800 hover:bg-amber-50"
                  >
                    封存
                  </button>
                </>
              )}
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
              : listTab === "delisted"
                ? "此分頁尚無下架商品"
                : "此分頁尚無封存商品"}
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
                        ) : form.item_type === "fishing_bait" ||
                          form.item_type === "fishing_rod" ? (
                          <>
                            {localShopFishing.length > 0 ? (
                              <optgroup label="shop/fishing/（釣餌／釣竿建議）">
                                {localShopFishing.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </optgroup>
                            ) : null}
                            {localItems.length > 0 ? (
                              <optgroup label="items/（共用素材，可選）">
                                {localItems.map((opt) => (
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
                            setLocalShopFishing(res.data.shopFishing);
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
                      placeholder={
                        form.item_type === "fishing_bait" ||
                        form.item_type === "fishing_rod"
                          ? "/shop/fishing/bait-normal.png"
                          : "/items/gold-chest.png"
                      }
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {form.item_type === "avatar_frame"
                        ? "頭像框建議放 public/frames/avatars/（或 legacy：frames 根目錄）。路徑與 item_type 分開管理，查詢以資料庫欄位為準，不會混淆。"
                        : form.item_type === "card_frame"
                          ? "卡框建議放 public/frames/cards/（或 legacy：frames 根目錄）。與頭像框分資料夾僅為資產整理，image_url 仍為完整路徑字串。"
                          : form.item_type === "title"
                            ? "稱號胸章建議放 public/items/，透明底 PNG／WebP、正方形構圖；與頭像框分開管理。"
                            : form.item_type === "fishing_bait" ||
                                form.item_type === "fishing_rod"
                              ? "釣餌／釣竿圖建議放 public/shop/fishing/（與資料庫 seed 路徑 /shop/fishing/… 一致）；亦可選 items/ 共用素材。"
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
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((prev) => ({
                    ...prev,
                    item_type: v,
                    ...(v === "fishing_rod"
                      ? {
                          rod_tier: "" as FormData["rod_tier"],
                          rod_cooldown_minutes: "",
                          rod_max_casts_per_day: "1",
                          rod_wait_until_harvest_minutes: "1",
                          rod_rare_bonus: "",
                        }
                      : {}),
                    ...(v === "fishing_bait"
                      ? {
                          bait_kind: "normal",
                          bait_rare_rate: "",
                          bait_legendary_rate: "",
                          bait_leviathan_rate: "",
                        }
                      : {}),
                    ...(v === "exp_boost" ? { exp_boost_value: "1" } : {}),
                    ...(v === "coins_pack"
                      ? {
                          coins_pack_value: "1",
                          coins_pack_coin_type: "free" as FormData["coins_pack_coin_type"],
                        }
                      : {}),
                  }));
                  setExtraMetaEditor(false);
                }}
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
            {form.item_type === "exp_boost" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 space-y-2">
                <p className="text-sm font-semibold text-gray-900">EXP 加成券</p>
                <label className="block">
                  <span className="text-xs font-medium text-gray-800">
                    發放經驗值（metadata.value，≥0 整數）
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.exp_boost_value}
                    onChange={(e) =>
                      setField("exp_boost_value", e.target.value.replace(/\D/g, ""))
                    }
                    className="mt-1 block w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </label>
              </div>
            ) : null}
            {form.item_type === "coins_pack" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-900">探險幣包</p>
                <label className="block">
                  <span className="text-xs font-medium text-gray-800">
                    發放數量（metadata.value，≥0 整數）
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.coins_pack_value}
                    onChange={(e) =>
                      setField("coins_pack_value", e.target.value.replace(/\D/g, ""))
                    }
                    className="mt-1 block w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-800">幣種（metadata.coin_type）</span>
                  <select
                    value={form.coins_pack_coin_type}
                    onChange={(e) =>
                      setField(
                        "coins_pack_coin_type",
                        e.target.value as FormData["coins_pack_coin_type"],
                      )
                    }
                    className="mt-1 block w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="free">探險幣（free）</option>
                    <option value="premium">純金（premium）</option>
                  </select>
                </label>
              </div>
            ) : null}
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

            {form.item_type === "fishing_bait" ? (
              <div className="rounded-xl border border-violet-200 bg-violet-50/90 p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-900">魚餌類型與機率</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  三選一（不同商品請各選對應類型，互不混用）：<strong>普通餌</strong>（例：蟲蟲餌）→
                  普通魚；<strong>章魚餌</strong>→ 稀有／傳說／深海巨獸三欄加總 100，可填小數（如
                  0.01% 級）；<strong>愛心餌（月老）</strong>（例：蝦仁豬心餌）→ 月老魚池（玩家須符合單身等）。存檔寫入{" "}
                  <span className="font-mono">bait_profile</span>，愛心／普通不需填章魚三欄。
                </p>
                {baitProfileMissing && editingId ? (
                  <p className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    此商品 metadata 尚無 <span className="font-mono">bait_profile</span>
                    ，目前由數值欄位自動推斷。請確認下方類型正確後儲存，即可寫入 bait_profile。
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["normal", "普通餌"],
                      ["octopus", "章魚餌"],
                      ["heart", "愛心餌（月老）"],
                    ] as const
                  ).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          bait_kind: val,
                          ...(val === "normal" || val === "heart"
                            ? {
                                bait_rare_rate: "",
                                bait_legendary_rate: "",
                                bait_leviathan_rate: "",
                              }
                            : {}),
                        }))
                      }
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                        form.bait_kind === val
                          ? "border-violet-600 bg-violet-600 text-white"
                          : "border-violet-200 bg-white text-gray-800 hover:bg-violet-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {form.bait_kind === "normal" ? (
                  <p className="text-xs text-gray-600 rounded-lg bg-white/80 border border-violet-100 px-3 py-2">
                    已內建 <span className="font-mono">bait_common_rate: 100</span>，僅能釣到一般魚種權重。
                  </p>
                ) : null}
                {form.bait_kind === "heart" ? (
                  <p className="text-xs text-gray-600 rounded-lg bg-white/80 border border-violet-100 px-3 py-2">
                    已內建 <span className="font-mono">bait_matchmaker_rate: 100</span>。月老篩選可於「後台 →
                    釣魚系統」調整。
                  </p>
                ) : null}
                {form.bait_kind === "octopus" ? (
                  <div className="space-y-2 rounded-lg bg-white/80 border border-violet-100 p-3">
                    <p className="text-xs font-medium text-gray-800">
                      稀有／傳說／深海巨獸三欄加總須為 100
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <label className="block text-xs">
                        bait_rare_rate
                        <input
                          type="text"
                          value={form.bait_rare_rate}
                          onChange={(e) => setField("bait_rare_rate", e.target.value)}
                          className="mt-0.5 block w-full rounded border border-violet-200 px-2 py-1 font-mono text-xs"
                        />
                      </label>
                      <label className="block text-xs">
                        bait_legendary_rate
                        <input
                          type="text"
                          value={form.bait_legendary_rate}
                          onChange={(e) =>
                            setField("bait_legendary_rate", e.target.value)
                          }
                          className="mt-0.5 block w-full rounded border border-violet-200 px-2 py-1 font-mono text-xs"
                        />
                      </label>
                      <label className="block text-xs">
                        bait_leviathan_rate
                        <input
                          type="text"
                          value={form.bait_leviathan_rate}
                          onChange={(e) =>
                            setField("bait_leviathan_rate", e.target.value)
                          }
                          className="mt-0.5 block w-full rounded border border-violet-200 px-2 py-1 font-mono text-xs"
                        />
                      </label>
                    </div>
                    <p
                      className={`text-xs ${
                        baitOctopusSumPreview != null &&
                        Number.isFinite(baitOctopusSumPreview) &&
                        Math.abs(baitOctopusSumPreview - 100) > BAIT_OCTOPUS_RATE_SUM_EPSILON
                          ? "text-red-600 font-medium"
                          : "text-gray-600"
                      }`}
                    >
                      目前合計：{" "}
                      {baitOctopusSumPreview != null && Number.isFinite(baitOctopusSumPreview)
                        ? baitOctopusSumPreview.toFixed(4)
                        : "—"}{" "}
                      {baitOctopusSumPreview != null &&
                      Number.isFinite(baitOctopusSumPreview) &&
                      Math.abs(baitOctopusSumPreview - 100) > BAIT_OCTOPUS_RATE_SUM_EPSILON
                        ? "（須為 100）"
                        : ""}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {form.item_type === "fishing_rod" ? (
              <div className="rounded-xl border border-violet-200 bg-violet-50/90 p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-900">
                  釣竿數值設定（直接生效，不必手寫 JSON）
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  <strong>拋竿冷卻</strong>留空時：已選
                  basic／mid／high 則套用「後台 → 釣魚系統 → 釣竿拋竿冷卻（tier
                  預設）」；未選等級則遊戲內預設 480 分鐘。若填數字則<strong>永遠以該分鐘為準</strong>。
                </p>
                {rodCooldownResolutionPreview ? (
                  <div className="rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs text-gray-800">
                    <p className="font-semibold text-gray-900">
                      解析後拋竿冷卻：{rodCooldownResolutionPreview.minutes} 分鐘／次
                    </p>
                    <p className="mt-1 text-gray-600">
                      來源：{rodCooldownResolutionPreview.description}
                    </p>
                  </div>
                ) : null}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-medium text-gray-800">
                      釣竿等級（rod_tier）
                    </span>
                    <select
                      value={form.rod_tier}
                      onChange={(e) =>
                        setField("rod_tier", e.target.value as FormData["rod_tier"])
                      }
                      className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-gray-900"
                    >
                      <option value="">未指定（冷卻留空時用 480 分）</option>
                      <option value="basic">
                        basic — 冷卻留空時用後台「basic」預設分鐘
                      </option>
                      <option value="mid">mid — 冷卻留空時用後台「mid」預設</option>
                      <option value="high">high — 冷卻留空時用後台「high」預設</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-800">
                      拋竿後再拋冷卻（分鐘）
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.rod_cooldown_minutes}
                      onChange={(e) =>
                        setField(
                          "rod_cooldown_minutes",
                          e.target.value.replace(/\D/g, ""),
                        )
                      }
                      className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-gray-900"
                      placeholder="留空＝依等級／全站預設"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-800">
                      每日可拋竿上限
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.rod_max_casts_per_day}
                      onChange={(e) =>
                        setField(
                          "rod_max_casts_per_day",
                          e.target.value.replace(/\D/g, ""),
                        )
                      }
                      className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-medium text-gray-800">
                      拋竿後至可收成（分鐘）
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.rod_wait_until_harvest_minutes}
                      onChange={(e) =>
                        setField(
                          "rod_wait_until_harvest_minutes",
                          e.target.value.replace(/\D/g, ""),
                        )
                      }
                      className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="text-xs font-medium text-gray-800">
                      稀有加成 rare_bonus（選填，預留欄位）
                    </span>
                    <input
                      type="text"
                      value={form.rod_rare_bonus}
                      onChange={(e) => setField("rod_rare_bonus", e.target.value)}
                      placeholder="例：0.1"
                      className="mt-1 block w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                  </label>
                </div>
              </div>
            ) : null}

            {(form.metadata.trim() !== "" || extraMetaEditor) &&
            form.item_type !== "fishing_bait" &&
            form.item_type !== "exp_boost" &&
            form.item_type !== "coins_pack" ? (
              <label className="block">
                <span className="text-gray-700">額外 metadata（JSON，選填）</span>
                <span className="ml-1 text-xs text-gray-400">
                  僅保留上方表單未涵蓋的鍵；一般不需填寫。
                </span>
                <textarea
                  value={form.metadata}
                  onChange={(e) => setField("metadata", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
                  rows={3}
                  placeholder="{}"
                />
              </label>
            ) : null}
            {form.metadata.trim() === "" &&
            !extraMetaEditor &&
            form.item_type !== "fishing_bait" &&
            form.item_type !== "exp_boost" &&
            form.item_type !== "coins_pack" ? (
              <button
                type="button"
                className="text-xs font-medium text-violet-700 hover:underline"
                onClick={() => setExtraMetaEditor(true)}
              >
                ＋ 額外 metadata（進階）
              </button>
            ) : null}
            {form.item_type === "fishing_bait" && (form.metadata.trim() !== "" || extraMetaEditor) ? (
              <label className="block">
                <span className="text-gray-700">額外 metadata（JSON，選填）</span>
                <span className="ml-1 text-xs text-gray-400">
                  魚餌機率已由上方按鈕設定；此處僅在需要保留其他自訂鍵時使用。
                </span>
                <textarea
                  value={form.metadata}
                  onChange={(e) => setField("metadata", e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
                  rows={2}
                  placeholder="{}"
                />
              </label>
            ) : null}
            {form.item_type === "fishing_bait" &&
            form.metadata.trim() === "" &&
            !extraMetaEditor ? (
              <button
                type="button"
                className="text-xs font-medium text-violet-700 hover:underline"
                onClick={() => setExtraMetaEditor(true)}
              >
                ＋ 額外 metadata（進階，一般用不到）
              </button>
            ) : null}
            {form.item_type === "exp_boost" ||
            form.item_type === "coins_pack" ? (
              form.metadata.trim() !== "" || extraMetaEditor ? (
                <label className="block">
                  <span className="text-gray-700">額外 metadata（JSON，選填）</span>
                  <textarea
                    value={form.metadata}
                    onChange={(e) => setField("metadata", e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs"
                    rows={2}
                    placeholder="{}"
                  />
                </label>
              ) : (
                <button
                  type="button"
                  className="text-xs font-medium text-violet-700 hover:underline"
                  onClick={() => setExtraMetaEditor(true)}
                >
                  ＋ 額外 metadata（進階）
                </button>
              )
            ) : null}
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
