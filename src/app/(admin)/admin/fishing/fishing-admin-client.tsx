"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import useSWR, { useSWRConfig } from "swr";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { SWR_KEYS } from "@/lib/swr/keys";
import type {
  FishType,
  FishingRewardTier,
  FishingRewardType,
} from "@/types/database.types";
import type { FishingRewardWithItem } from "@/lib/repositories/server/fishing.repository";
import type { ShopItemRow } from "@/lib/repositories/server/shop.repository";
import {
  createFishingRewardAction,
  deleteFishingRewardAction,
  getFishingLogsAdminAction,
  getFishingRewardsAction,
  getFishingStatsAction,
  getFishingTierSettingsAction,
  getMatchmakerLogsAction,
  getShopItemsAdminAction,
  updateFishingRewardAction,
  updateFishingSettingsAction,
  upsertFishingTierSettingAction,
} from "@/services/admin.action";
import { DecimalPercentInput } from "@/components/admin/decimal-percent-input";
import {
  percentInputToWeightBp,
  weightBpToPercentNumber,
} from "@/lib/utils/fishing-reward-percent";
import type {
  FishingAdminSettingsPayload,
  FishingStats,
} from "@/services/admin.action";

const PAGE_SIZE = 20;

const FISH_TABS: { value: FishType; label: string }[] = [
  { value: "common", label: "普通魚" },
  { value: "rare", label: "稀有魚" },
  { value: "legendary", label: "傳說魚" },
  { value: "matchmaker", label: "月老魚" },
  { value: "leviathan", label: "深海巨獸" },
];

/** 小／中／大 tier 僅適用普通／稀有／傳說魚 */
const TIER_SETTINGS_FISH_TABS: { value: FishType; label: string }[] = [
  { value: "common", label: "普通魚" },
  { value: "rare", label: "稀有魚" },
  { value: "legendary", label: "傳說魚" },
];

const FISH_DISTRIBUTION_ROWS: {
  type: FishType;
  emoji: string;
  label: string;
  barClass: string;
}[] = [
  { type: "common", emoji: "🐟", label: "普通魚", barClass: "bg-gray-400" },
  { type: "rare", emoji: "🐠", label: "稀有魚", barClass: "bg-cyan-500" },
  {
    type: "legendary",
    emoji: "🐡",
    label: "傳說魚",
    barClass: "bg-violet-500",
  },
  { type: "matchmaker", emoji: "❤️", label: "月老魚", barClass: "bg-pink-500" },
  {
    type: "leviathan",
    emoji: "🦈",
    label: "深海巨獸",
    barClass: "bg-amber-500",
  },
];

function fishBadgeClass(t: FishType): string {
  switch (t) {
    case "common":
      return "bg-gray-100 text-gray-800";
    case "rare":
      return "bg-cyan-100 text-cyan-800";
    case "legendary":
      return "bg-violet-100 text-violet-800";
    case "matchmaker":
      return "bg-pink-100 text-pink-800";
    case "leviathan":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function fishLabel(t: FishType): string {
  return FISH_TABS.find((x) => x.value === t)?.label ?? t;
}

function formatTaipei(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

const TIER_ORDER: FishingRewardTier[] = ["small", "medium", "large"];

const TIER_LABELS: Record<FishingRewardTier, string> = {
  small: "最小獎",
  medium: "中等獎",
  large: "大獎",
};

type MatchmakerLockState = Pick<
  FishingAdminSettingsPayload,
  | "matchmaker_lock_height"
  | "matchmaker_lock_diet"
  | "matchmaker_lock_smoking"
  | "matchmaker_lock_pets"
  | "matchmaker_lock_single_parent"
  | "matchmaker_lock_fertility"
  | "matchmaker_lock_marriage"
  | "matchmaker_lock_zodiac"
  | "matchmaker_lock_v1"
  | "matchmaker_lock_v3"
  | "matchmaker_lock_v4"
>;

const MATCHMAKER_HARD_ROWS: {
  key: keyof Pick<
    MatchmakerLockState,
    | "matchmaker_lock_height"
    | "matchmaker_lock_diet"
    | "matchmaker_lock_smoking"
    | "matchmaker_lock_pets"
    | "matchmaker_lock_single_parent"
    | "matchmaker_lock_fertility"
    | "matchmaker_lock_marriage"
    | "matchmaker_lock_zodiac"
  >;
  emoji: string;
  title: string;
  hint: string;
}[] = [
  {
    key: "matchmaker_lock_height",
    emoji: "📏",
    title: "身高條件篩選",
    hint: "身高偏好不符合者不配對",
  },
  {
    key: "matchmaker_lock_diet",
    emoji: "🥗",
    title: "飲食習慣篩選",
    hint: "葷素不合的不配對",
  },
  {
    key: "matchmaker_lock_smoking",
    emoji: "🚬",
    title: "抽菸習慣篩選",
    hint: "不接受抽菸者不配對",
  },
  {
    key: "matchmaker_lock_pets",
    emoji: "🐾",
    title: "寵物接受度篩選",
    hint: "對寵物過敏或不接受者不配對",
  },
  {
    key: "matchmaker_lock_single_parent",
    emoji: "👶",
    title: "單親接受度篩選",
    hint: "不接受單親者不配對",
  },
  {
    key: "matchmaker_lock_fertility",
    emoji: "🍼",
    title: "生育意願篩選",
    hint: "生育意願嚴重衝突者不配對",
  },
  {
    key: "matchmaker_lock_marriage",
    emoji: "💍",
    title: "婚姻觀念篩選",
    hint: "堅持不婚 vs 不排斥結婚者不配對",
  },
  {
    key: "matchmaker_lock_zodiac",
    emoji: "♈",
    title: "星座排除篩選",
    hint: "尊重星座排除設定",
  },
];

const MATCHMAKER_V_ROWS: {
  key: "matchmaker_lock_v1" | "matchmaker_lock_v3" | "matchmaker_lock_v4";
  emoji: string;
  title: string;
}[] = [
  { key: "matchmaker_lock_v1", emoji: "💰", title: "金錢觀（V1）" },
  { key: "matchmaker_lock_v3", emoji: "🤗", title: "黏人程度（V3）" },
  { key: "matchmaker_lock_v4", emoji: "💥", title: "衝突處理（V4）" },
];

/** 0–100% step 0.01 → basis points 0–10000 */
function parseTierPercentToBp(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number.parseFloat(t.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100);
}

const dialogFieldClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500";

const ITEM_TYPE_BADGE: Record<string, string> = {
  title: "稱號",
  avatar_frame: "頭像框",
  card_frame: "卡片框",
  fishing_bait: "釣餌",
  fishing_rod: "釣竿",
  loot_box: "盲盒",
  consumable: "消耗品",
  bag_expansion: "背包擴充",
};

type MainTab = "stats" | "logs" | "matchmaker" | "rewards" | "settings";

type RewardFormType = "coins_free" | "coins_premium" | "exp" | "shop_item";

function rewardTypeBadgeLabel(t: FishingRewardType): string {
  switch (t) {
    case "coins_free":
      return "探險幣";
    case "coins_premium":
      return "純金";
    case "exp":
      return "EXP";
    case "shop_item":
      return "商城道具";
    default:
      return t;
  }
}

function describeReward(row: FishingRewardWithItem): string {
  switch (row.reward_type) {
    case "coins_free":
    case "coins_premium":
      return row.coins_amount != null
        ? `${row.reward_type === "coins_premium" ? "純金" : "探險幣"} ×${row.coins_amount}`
        : "—";
    case "exp":
      return row.exp_amount != null ? `EXP +${row.exp_amount}` : "—";
    case "shop_item":
      return row.shop_item?.name ? row.shop_item.name : "（未選道具）";
    default:
      return "—";
  }
}

function tierPoolWeightSum(rows: FishingRewardWithItem[]): number {
  return rows.reduce((s, r) => s + Number(r.weight), 0);
}

export default function FishingAdminClient({
  initialSettings,
  canAccessShopAdmin,
}: {
  initialSettings: FishingAdminSettingsPayload;
  canAccessShopAdmin: boolean;
}) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [tab, setTab] = useState<MainTab>("stats");
  const [rewardFish, setRewardFish] = useState<FishType>("common");

  const [tierFish, setTierFish] = useState<FishType>("common");
  const [tierSmall, setTierSmall] = useState("60");
  const [tierMed, setTierMed] = useState("30");
  const [tierLarge, setTierLarge] = useState("10");
  const [tierMode, setTierMode] = useState<"interval_miss" | "normalize">(
    "interval_miss",
  );
  const [tierSaving, setTierSaving] = useState(false);

  const { data: stats, isLoading: statsLoading } = useSWR(
    tab === "stats" ? SWR_KEYS.fishingStats : null,
    async (): Promise<FishingStats> => {
      const r = await getFishingStatsAction();
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  );

  const { data: rewards, isLoading: rewardsLoading } = useSWR(
    tab === "rewards" ? SWR_KEYS.fishingRewards : null,
    async () => {
      const r = await getFishingRewardsAction();
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  );

  const { data: shopItems } = useSWR(
    tab === "rewards" ? "fishing-admin-shop-items" : null,
    async (): Promise<ShopItemRow[]> => {
      const r = await getShopItemsAdminAction();
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  );

  const { data: tierSettings, isLoading: tierSettingsLoading } = useSWR(
    tab === "settings" ? SWR_KEYS.fishingTierSettings : null,
    async () => {
      const r = await getFishingTierSettingsAction();
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  );

  useEffect(() => {
    if (!tierSettings) return;
    const row = tierSettings.find((x) => x.fish_type === tierFish);
    if (!row) return;
    setTierSmall(String(row.p_small_bp / 100));
    setTierMed(String(row.p_medium_bp / 100));
    setTierLarge(String(row.p_large_bp / 100));
    setTierMode(row.remainder_mode);
  }, [tierSettings, tierFish]);

  const tierSumPreview = useMemo(() => {
    const a = Number.parseFloat(tierSmall) || 0;
    const b = Number.parseFloat(tierMed) || 0;
    const c = Number.parseFloat(tierLarge) || 0;
    const sum = a + b + c;
    return { sum, miss: Math.max(0, 100 - sum) };
  }, [tierSmall, tierMed, tierLarge]);

  /* —— 釣魚日誌 —— */
  const [logDraftNick, setLogDraftNick] = useState("");
  const [logDraftFish, setLogDraftFish] = useState<FishType | "">("");
  const [logNick, setLogNick] = useState("");
  const [logFish, setLogFish] = useState<FishType | "">("");
  const [logPage, setLogPage] = useState(1);

  const { data: logBundle, isLoading: logsLoading } = useSWR(
    tab === "logs"
      ? ["fishing-admin-logs", logPage, logNick, logFish]
      : null,
    async () => {
      const r = await getFishingLogsAdminAction({
        nickname: logNick.trim() || undefined,
        fishType: logFish || undefined,
        page: logPage,
      });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  );

  /* —— 月老配對 —— */
  const [mmDraftFisher, setMmDraftFisher] = useState("");
  const [mmDraftTarget, setMmDraftTarget] = useState("");
  const [mmFisher, setMmFisher] = useState("");
  const [mmTarget, setMmTarget] = useState("");
  const [mmPage, setMmPage] = useState(1);

  const { data: mmBundle, isLoading: mmLoading } = useSWR(
    tab === "matchmaker"
      ? ["fishing-admin-mm", mmPage, mmFisher, mmTarget]
      : null,
    async () => {
      const r = await getMatchmakerLogsAction({
        fisherNickname: mmFisher.trim() || undefined,
        targetNickname: mmTarget.trim() || undefined,
        page: mmPage,
      });
      if (!r.ok) throw new Error(r.error);
      return r.data;
    },
  );

  /* —— 系統設定 —— */
  const [fishingEnabled, setFishingEnabled] = useState(
    initialSettings.fishing_enabled,
  );
  const [ageMaxDraft, setAgeMaxDraft] = useState(
    String(initialSettings.fishing_age_max),
  );
  const [rodBasicDraft, setRodBasicDraft] = useState(
    String(initialSettings.fishing_rod_cooldown_basic_minutes),
  );
  const [rodMidDraft, setRodMidDraft] = useState(
    String(initialSettings.fishing_rod_cooldown_mid_minutes),
  );
  const [rodHighDraft, setRodHighDraft] = useState(
    String(initialSettings.fishing_rod_cooldown_high_minutes),
  );

  const [mmLocks, setMmLocks] = useState<MatchmakerLockState>({
    matchmaker_lock_height: initialSettings.matchmaker_lock_height,
    matchmaker_lock_diet: initialSettings.matchmaker_lock_diet,
    matchmaker_lock_smoking: initialSettings.matchmaker_lock_smoking,
    matchmaker_lock_pets: initialSettings.matchmaker_lock_pets,
    matchmaker_lock_single_parent: initialSettings.matchmaker_lock_single_parent,
    matchmaker_lock_fertility: initialSettings.matchmaker_lock_fertility,
    matchmaker_lock_marriage: initialSettings.matchmaker_lock_marriage,
    matchmaker_lock_zodiac: initialSettings.matchmaker_lock_zodiac,
    matchmaker_lock_v1: initialSettings.matchmaker_lock_v1,
    matchmaker_lock_v3: initialSettings.matchmaker_lock_v3,
    matchmaker_lock_v4: initialSettings.matchmaker_lock_v4,
  });
  const [mmVMaxCommitted, setMmVMaxCommitted] = useState(
    initialSettings.matchmaker_v_max_diff,
  );
  const [mmVMaxDraft, setMmVMaxDraft] = useState(
    String(initialSettings.matchmaker_v_max_diff),
  );

  const anyVLockOn =
    mmLocks.matchmaker_lock_v1 ||
    mmLocks.matchmaker_lock_v3 ||
    mmLocks.matchmaker_lock_v4;

  const toggleMmLock = async (
    key: keyof MatchmakerLockState,
    label: string,
    next: boolean,
  ) => {
    const prev = mmLocks[key];
    setMmLocks((s) => ({ ...s, [key]: next }));
    const r = await updateFishingSettingsAction({ [key]: next });
    if (!r.ok) {
      toast.error(r.error);
      setMmLocks((s) => ({ ...s, [key]: prev }));
      return;
    }
    toast.success(`${label} 已${next ? "開啟" : "關閉"}`);
  };

  const onBlurMatchmakerVMax = async () => {
    const n = Number.parseInt(mmVMaxDraft.trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 4) {
      toast.error("三觀最大差距須為 1–4 的整數");
      setMmVMaxDraft(String(mmVMaxCommitted));
      return;
    }
    if (n === mmVMaxCommitted) return;
    const r = await updateFishingSettingsAction({
      matchmaker_v_max_diff: n,
    });
    if (!r.ok) {
      toast.error(r.error);
      setMmVMaxDraft(String(mmVMaxCommitted));
      return;
    }
    setMmVMaxCommitted(n);
    toast.success("三觀最大允許差距已更新");
  };

  /* —— 獎品 Dialog —— */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formFish, setFormFish] = useState<FishType>("common");
  const [formTier, setFormTier] = useState<FishingRewardTier>("small");
  const [formRewardType, setFormRewardType] =
    useState<RewardFormType>("coins_free");
  const [formCoins, setFormCoins] = useState("");
  const [formExp, setFormExp] = useState("");
  const [formShopItemId, setFormShopItemId] = useState("");
  const [formWeight, setFormWeight] = useState("1.00");
  const [formStock, setFormStock] = useState("");
  const [formNote, setFormNote] = useState("");
  const [dialogBusy, setDialogBusy] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const showWeightInDialog = useMemo(() => {
    if (!rewards) return false;
    const inTier = rewards.filter(
      (r) => r.fish_type === formFish && r.reward_tier === formTier,
    );
    if (formFish === "matchmaker") return false;
    if (dialogMode === "create") return inTier.length >= 1;
    return inTier.length >= 2;
  }, [rewards, formFish, formTier, dialogMode]);

  const tierCountForWeightHint = useMemo(() => {
    if (!rewards) return 0;
    return rewards.filter(
      (r) => r.fish_type === formFish && r.reward_tier === formTier,
    ).length;
  }, [rewards, formFish, formTier]);

  const openCreate = (tier: FishingRewardTier) => {
    setDialogMode("create");
    setEditingId(null);
    setFormFish(rewardFish);
    setFormTier(
      rewardFish === "matchmaker" || rewardFish === "leviathan"
        ? "large"
        : tier,
    );
    setFormRewardType("coins_free");
    setFormCoins("");
    setFormExp("");
    setFormShopItemId("");
    setFormWeight("1.00");
    setFormStock("");
    setFormNote("");
    setDialogOpen(true);
  };

  const openEdit = (row: FishingRewardWithItem) => {
    setDialogMode("edit");
    setEditingId(row.id);
    setFormFish(row.fish_type);
    setFormTier(row.reward_tier);
    setFormRewardType(row.reward_type);
    setFormCoins(
      row.coins_amount != null ? String(row.coins_amount) : "",
    );
    setFormExp(row.exp_amount != null ? String(row.exp_amount) : "");
    setFormShopItemId(row.shop_item_id ?? "");
    setFormWeight((Number(row.weight) / 100).toFixed(2));
    setFormStock(row.stock != null ? String(row.stock) : "");
    setFormNote(row.note ?? "");
    setDialogOpen(true);
  };

  const submitReward = async () => {
    let wBp: number;
    if (showWeightInDialog) {
      const parsed = percentInputToWeightBp(formWeight);
      if (parsed == null) {
        toast.error("請填寫正數機率（%），最多兩位小數");
        return;
      }
      wBp = parsed;
    } else if (dialogMode === "edit" && editingId) {
      const existing = rewards?.find((r) => r.id === editingId);
      if (!existing) {
        toast.error("找不到獎品");
        return;
      }
      wBp = Number(existing.weight);
    } else {
      wBp = percentInputToWeightBp("1.00") ?? 100;
    }
    let stock: number | null = null;
    if (formStock.trim() !== "") {
      const s = Number.parseInt(formStock, 10);
      if (!Number.isFinite(s) || s < 1) {
        toast.error("庫存須為正整數或留空（無限）");
        return;
      }
      stock = s;
    }

    let coins_amount: number | null = null;
    let exp_amount: number | null = null;
    let shop_item_id: string | null = null;

    if (formRewardType === "coins_free" || formRewardType === "coins_premium") {
      const c = Number.parseInt(formCoins, 10);
      if (!Number.isFinite(c) || c < 1) {
        toast.error("請填寫正整數數量");
        return;
      }
      coins_amount = c;
    } else if (formRewardType === "exp") {
      const e = Number.parseInt(formExp, 10);
      if (!Number.isFinite(e) || e < 1) {
        toast.error("請填寫正整數 EXP");
        return;
      }
      exp_amount = e;
    } else {
      if (!formShopItemId.trim()) {
        toast.error("請選擇商城道具");
        return;
      }
      shop_item_id = formShopItemId.trim();
    }

    const effectiveTier: FishingRewardTier =
      formFish === "matchmaker" || formFish === "leviathan"
        ? "large"
        : formTier;

    setDialogBusy(true);
    try {
      if (dialogMode === "create") {
        const r = await createFishingRewardAction({
          fish_type: formFish,
          reward_tier: effectiveTier,
          reward_type: formRewardType,
          coins_amount:
            formRewardType === "coins_free" || formRewardType === "coins_premium"
              ? coins_amount
              : null,
          exp_amount: formRewardType === "exp" ? exp_amount : null,
          shop_item_id: formRewardType === "shop_item" ? shop_item_id : null,
          weight: wBp,
          stock,
          stock_used: 0,
          is_active: true,
          note: formNote.trim() || null,
        });
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        toast.success("已新增獎品");
      } else if (editingId) {
        const r = await updateFishingRewardAction(editingId, {
          reward_type: formRewardType,
          coins_amount:
            formRewardType === "coins_free" || formRewardType === "coins_premium"
              ? coins_amount
              : null,
          exp_amount: formRewardType === "exp" ? exp_amount : null,
          shop_item_id:
            formRewardType === "shop_item" ? shop_item_id : null,
          weight: wBp,
          stock,
          note: formNote.trim() || null,
        });
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        toast.success("已更新獎品");
      }
      setDialogOpen(false);
      void mutate(SWR_KEYS.fishingRewards);
    } finally {
      setDialogBusy(false);
    }
  };

  const toggleActive = async (row: FishingRewardWithItem) => {
    const r = await updateFishingRewardAction(row.id, {
      is_active: !row.is_active,
    });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success(row.is_active ? "已停用" : "已啟用");
    void mutate(SWR_KEYS.fishingRewards);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const r = await deleteFishingRewardAction(deleteId);
    setDeleteOpen(false);
    setDeleteId(null);
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("已刪除");
    void mutate(SWR_KEYS.fishingRewards);
  };

  const onSaveFishingEnabled = async (next: boolean) => {
    const r = await updateFishingSettingsAction({ fishing_enabled: next });
    if (!r.ok) {
      toast.error(r.error);
      setFishingEnabled(!next);
      return;
    }
    setFishingEnabled(next);
    toast.success("設定已更新");
  };

  const onSaveAgeMax = async () => {
    const n = Number.parseInt(ageMaxDraft, 10);
    if (!Number.isFinite(n) || n < 1 || n > 50) {
      toast.error("年齡差距上限須為 1–50 的整數");
      return;
    }
    const r = await updateFishingSettingsAction({ fishing_age_max: n });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("設定已更新");
  };

  const onSaveRodTierCooldowns = async () => {
    const basic = Number.parseInt(rodBasicDraft, 10);
    const mid = Number.parseInt(rodMidDraft, 10);
    const high = Number.parseInt(rodHighDraft, 10);
    if (
      ![basic, mid, high].every(
        (x) => Number.isFinite(x) && x >= 0 && x <= 10080,
      )
    ) {
      toast.error("冷卻分鐘須為 0–10080 的整數");
      return;
    }
    const r = await updateFishingSettingsAction({
      fishing_rod_cooldown_basic_minutes: basic,
      fishing_rod_cooldown_mid_minutes: mid,
      fishing_rod_cooldown_high_minutes: high,
    });
    if (!r.ok) {
      toast.error(r.error);
      return;
    }
    toast.success("釣竿 tier 冷卻已更新");
  };

  const onSaveTierSettings = async () => {
    const ps = parseTierPercentToBp(tierSmall);
    const pm = parseTierPercentToBp(tierMed);
    const pl = parseTierPercentToBp(tierLarge);
    if (ps === null || pm === null || pl === null) {
      toast.error("請填寫 0–100 的數字（tier 百分比）");
      return;
    }
    setTierSaving(true);
    try {
      const r = await upsertFishingTierSettingAction({
        fish_type: tierFish,
        p_small_bp: ps,
        p_medium_bp: pm,
        p_large_bp: pl,
        remainder_mode: tierMode,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("已更新 tier 設定");
      void mutate(SWR_KEYS.fishingTierSettings);
    } finally {
      setTierSaving(false);
    }
  };

  const filteredRewards = useMemo(() => {
    if (!rewards) return [];
    return rewards.filter((r) => r.fish_type === rewardFish);
  }, [rewards, rewardFish]);

  const rewardsByTier = useMemo(() => {
    const m: Record<FishingRewardTier, FishingRewardWithItem[]> = {
      small: [],
      medium: [],
      large: [],
    };
    for (const r of filteredRewards) {
      m[r.reward_tier].push(r);
    }
    return m;
  }, [filteredRewards]);

  const leviathanRewards = useMemo(
    () => (rewards ?? []).filter((r) => r.fish_type === "leviathan"),
    [rewards],
  );

  const weightPreview = useMemo(() => {
    const all = rewards ?? [];
    const parsedWeight = percentInputToWeightBp(formWeight.trim()) ?? 0;
    const currentTierRewards = all.filter(
      (r) =>
        r.fish_type === formFish &&
        r.reward_tier === formTier &&
        r.is_active &&
        (editingId == null || r.id !== editingId),
    );
    const otherWeightsTotal = currentTierRewards.reduce(
      (sum, r) => sum + Number(r.weight),
      0,
    );
    const totalWeight = otherWeightsTotal + parsedWeight;
    const estimatedRate =
      totalWeight > 0
        ? Math.round((parsedWeight / totalWeight) * 10000) / 100
        : 0;
    return {
      currentTierRewards,
      totalWeight,
      estimatedRate,
      parsedWeight,
    };
  }, [rewards, formFish, formTier, editingId, formWeight]);

  useEffect(() => {
    if (!dialogOpen) return;
    if (formFish === "matchmaker" || formFish === "leviathan") {
      setFormTier("large");
    }
  }, [dialogOpen, formFish]);

  const totalCount = stats?.totalCount ?? 0;
  const pct = (n: number) =>
    totalCount > 0 ? Math.round((n / totalCount) * 1000) / 10 : 0;

  const logTotalPages = logBundle
    ? Math.max(1, Math.ceil(logBundle.total / PAGE_SIZE))
    : 1;
  const mmTotalPages = mmBundle
    ? Math.max(1, Math.ceil(mmBundle.total / PAGE_SIZE))
    : 1;

  const tabsNav: { id: MainTab; label: string }[] = [
    { id: "stats", label: "📊 統計" },
    { id: "logs", label: "🎣 釣魚日誌" },
    { id: "matchmaker", label: "❤️ 月老配對" },
    { id: "rewards", label: "🎁 獎品設定" },
    { id: "settings", label: "⚙️ 系統設定" },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <h1 className="text-2xl font-bold text-violet-600 mb-2">釣魚管理</h1>
      <p className="text-sm text-gray-500 mb-6">
        統計、日誌、月老配對、獎品與系統開關
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {tabsNav.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "stats" ? (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-2xl bg-gray-100 animate-pulse border border-gray-100"
                />
              ))}
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard label="今日釣魚" value={stats.todayCount} />
                <StatCard label="累計釣魚" value={stats.totalCount} />
                <StatCard label="月老配對" value={stats.matchmakerCount} />
                <StatCard label="深海巨獸" value={stats.leviathanCount} />
                <StatCard
                  label="配對成功率"
                  value={`${totalCount > 0 ? pct(stats.matchmakerCount) : 0}%`}
                />
                <StatCard
                  label="深海出現率"
                  value={`${totalCount > 0 ? pct(stats.leviathanCount) : 0}%`}
                />
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">
                  魚種分佈
                </h3>
                <div className="space-y-3">
                  {FISH_DISTRIBUTION_ROWS.map((row) => {
                    const n = stats.fishTypeBreakdown[row.type] ?? 0;
                    const p = pct(n);
                    return (
                      <div
                        key={row.type}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm"
                      >
                        <span className="w-40 shrink-0 text-gray-700">
                          {row.emoji} {row.label}
                        </span>
                        <div className="flex-1 flex items-center gap-3 min-w-0">
                          <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${row.barClass}`}
                              style={{
                                width: `${Math.min(100, p)}%`,
                              }}
                            />
                          </div>
                          <span className="text-gray-600 w-14 text-right tabular-nums">
                            {p}%
                          </span>
                          <span className="text-gray-500 w-16 text-right">
                            ({n} 次)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-500">無法載入統計</p>
          )}
        </div>
      ) : null}

      {tab === "logs" ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-gray-500 block mb-1">
                玩家暱稱
              </label>
              <Input
                value={logDraftNick}
                onChange={(e) => setLogDraftNick(e.target.value)}
                type="text"
                placeholder="關鍵字"
                className="bg-white"
              />
            </div>
            <div className="w-full sm:w-44">
              <label className="text-xs text-gray-500 block mb-1">魚種</label>
              <select
                className="w-full h-9 rounded-md border border-gray-200 bg-white px-2 text-sm"
                value={logDraftFish}
                onChange={(e) =>
                  setLogDraftFish(
                    (e.target.value || "") as FishType | "",
                  )
                }
              >
                <option value="">全部</option>
                {FISH_TABS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => {
                setLogNick(logDraftNick);
                setLogFish(logDraftFish);
                setLogPage(1);
              }}
            >
              搜尋
            </Button>
          </div>

          {logsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ) : logBundle ? (
            <>
              <div className="hidden md:block overflow-x-auto bg-white rounded-2xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-500">
                      <th className="p-3 font-medium">玩家</th>
                      <th className="p-3 font-medium">魚種</th>
                      <th className="p-3 font-medium">獎勵摘要</th>
                      <th className="p-3 font-medium">釣魚時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logBundle.data.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-gray-50 hover:bg-gray-50/80"
                      >
                        <td className="p-3">{row.fisher.nickname}</td>
                        <td className="p-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${fishBadgeClass(row.fish_type)}`}
                          >
                            {fishLabel(row.fish_type)}
                          </span>
                        </td>
                        <td className="p-3 text-gray-700">
                          {row.reward_summary}
                        </td>
                        <td className="p-3 text-gray-600 whitespace-nowrap">
                          {formatTaipei(row.cast_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-3">
                {logBundle.data.map((row) => (
                  <div
                    key={row.id}
                    className="bg-white rounded-xl border border-gray-100 p-4 space-y-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-medium">{row.fisher.nickname}</span>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-medium ${fishBadgeClass(row.fish_type)}`}
                      >
                        {fishLabel(row.fish_type)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{row.reward_summary}</p>
                    <p className="text-xs text-gray-500">
                      {formatTaipei(row.cast_at)}
                    </p>
                  </div>
                ))}
              </div>
              <Pagination
                page={logPage}
                totalPages={logTotalPages}
                onPage={setLogPage}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {tab === "matchmaker" ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-end bg-white rounded-2xl border border-gray-100 p-4">
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-gray-500 block mb-1">
                釣魚者暱稱
              </label>
              <Input
                value={mmDraftFisher}
                onChange={(e) => setMmDraftFisher(e.target.value)}
                type="text"
              />
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs text-gray-500 block mb-1">
                被釣者暱稱
              </label>
              <Input
                value={mmDraftTarget}
                onChange={(e) => setMmDraftTarget(e.target.value)}
                type="text"
              />
            </div>
            <Button
              type="button"
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => {
                setMmFisher(mmDraftFisher);
                setMmTarget(mmDraftTarget);
                setMmPage(1);
              }}
            >
              搜尋
            </Button>
          </div>

          {mmLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ) : mmBundle ? (
            <>
              <div className="hidden md:block overflow-x-auto bg-white rounded-2xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-500">
                      <th className="p-3 font-medium">釣魚者</th>
                      <th className="p-3 w-10" />
                      <th className="p-3 font-medium">被釣者</th>
                      <th className="p-3 font-medium">釣到時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mmBundle.data.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-gray-50 hover:bg-gray-50/80"
                      >
                        <td className="p-3">
                          <UserCell
                            nickname={row.fisher.nickname}
                            avatarUrl={row.fisher.avatar_url}
                          />
                        </td>
                        <td className="p-3 text-gray-400">
                          <ArrowRight className="w-4 h-4" />
                        </td>
                        <td className="p-3">
                          {row.no_match ? (
                            <span className="text-gray-400">— 緣分不夠</span>
                          ) : row.target ? (
                            <UserCell
                              nickname={row.target.nickname}
                              avatarUrl={row.target.avatar_url}
                            />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-600 whitespace-nowrap">
                          {formatTaipei(row.cast_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-3">
                {mmBundle.data.map((row) => (
                  <div
                    key={row.id}
                    className="bg-white rounded-xl border border-gray-100 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <UserCell
                        nickname={row.fisher.nickname}
                        avatarUrl={row.fisher.avatar_url}
                      />
                      <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                      {row.no_match ? (
                        <span className="text-gray-400 text-sm">
                          — 緣分不夠
                        </span>
                      ) : row.target ? (
                        <UserCell
                          nickname={row.target.nickname}
                          avatarUrl={row.target.avatar_url}
                        />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatTaipei(row.cast_at)}
                    </p>
                  </div>
                ))}
              </div>
              <Pagination
                page={mmPage}
                totalPages={mmTotalPages}
                onPage={setMmPage}
              />
            </>
          ) : null}
        </div>
      ) : null}

      {tab === "rewards" ? (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {FISH_TABS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setRewardFish(f.value)}
                className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
                  rewardFish === f.value
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {rewardsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ) : rewardFish === "matchmaker" ? (
            <div className="rounded-xl border border-pink-200 bg-pink-50 p-6 text-center mt-4">
              <div className="text-3xl mb-3">❤️</div>
              <h3 className="text-base font-semibold text-pink-800 mb-2">
                月老魚不需要設定獎品
              </h3>
              <p className="text-sm text-pink-600 leading-relaxed">
                月老魚釣到後會自動配對符合條件的單身玩家，
                配對結果本身就是獎勵。
              </p>
              <p className="text-sm text-pink-500 mt-3">
                配對篩選條件（年齡差距、地區等）請至
                <button
                  type="button"
                  className="underline font-medium ml-1"
                  onClick={() => setTab("settings")}
                >
                  系統設定
                </button>
                調整。
              </p>
            </div>
          ) : rewardFish === "leviathan" ? (
            <div className="mt-4">
              <LeviathanStockAlert rewards={leviathanRewards} />
              <RewardTierCard
                title="限量大獎"
                list={rewardsByTier.large}
                subtitleVariant="leviathan"
                onGoSettings={() => setTab("settings")}
                onAdd={() => openCreate("large")}
                onEdit={openEdit}
                onToggle={(row) => void toggleActive(row)}
                onDelete={(row) => {
                  setDeleteId(row.id);
                  setDeleteOpen(true);
                }}
              />
              <p className="text-xs text-gray-400 text-center mt-3">
                深海巨獸為全服極稀有魚種，僅設一級限量大獎。
                庫存耗盡後自動降級為傳說魚大獎。
              </p>
            </div>
          ) : (
            TIER_ORDER.map((tier) => (
              <RewardTierCard
                key={tier}
                title={TIER_LABELS[tier]}
                list={rewardsByTier[tier]}
                subtitleVariant="tierRates"
                onGoSettings={() => setTab("settings")}
                onAdd={() => openCreate(tier)}
                onEdit={openEdit}
                onToggle={(row) => void toggleActive(row)}
                onDelete={(row) => {
                  setDeleteId(row.id);
                  setDeleteOpen(true);
                }}
              />
            ))
          )}
        </div>
      ) : null}

      {tab === "settings" ? (
        <div className="space-y-6 max-w-lg">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">釣魚系統</p>
                <p className="text-xs text-gray-500 mt-1">
                  關閉後玩家無法拋竿，正在釣魚的不受影響
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-sm font-semibold tabular-nums min-w-[3.5rem] text-right ${
                    fishingEnabled ? "text-emerald-700" : "text-gray-500"
                  }`}
                  aria-live="polite"
                >
                  {fishingEnabled ? "已開啟" : "已關閉"}
                </span>
                <Switch
                  checked={fishingEnabled}
                  aria-label={fishingEnabled ? "釣魚系統已開啟，按一下關閉" : "釣魚系統已關閉，按一下開啟"}
                  className="data-checked:bg-emerald-600 data-unchecked:bg-gray-300"
                  onCheckedChange={(v) => {
                    setFishingEnabled(v);
                    void onSaveFishingEnabled(v);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <label className="text-sm font-medium text-gray-900">
              年齡差距上限
            </label>
            <p className="text-xs text-gray-500">
              玩家自訂的年齡差距不能超過此值
            </p>
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                type="text"
                inputMode="numeric"
                value={ageMaxDraft}
                onChange={(e) => setAgeMaxDraft(e.target.value)}
                className="w-24 bg-white"
              />
              <Button
                type="button"
                className="bg-violet-600 hover:bg-violet-700 text-white"
                onClick={() => void onSaveAgeMax()}
              >
                儲存
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 max-w-xl">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                💘 月老配對條件開關
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                關閉的條件不會參與配對運算，
                人數較少時建議關閉部分條件以提高配對成功率
              </p>
            </div>

            <div className="rounded-lg bg-gray-50/80 border border-gray-100 p-3 space-y-1.5">
              <p className="text-sm font-medium text-gray-800">
                【基礎篩選（建議常開）】
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                以下條件為月老魚基礎邏輯，
                永遠生效：性別×性向、單身狀態、年齡差距、地區偏好
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-900 mb-2">
                【進階硬鎖條件】
              </p>
              <div className="space-y-0 divide-y divide-gray-100">
                {MATCHMAKER_HARD_ROWS.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-start gap-3 py-3 first:pt-0"
                  >
                    <Switch
                      checked={mmLocks[row.key]}
                      aria-label={`${row.title}：${mmLocks[row.key] ? "已開啟" : "已關閉"}`}
                      className="data-checked:bg-violet-600 data-unchecked:bg-gray-200 shrink-0 mt-0.5"
                      onCheckedChange={(v) =>
                        void toggleMmLock(row.key, row.title, v)
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {row.emoji} {row.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{row.hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-3">
              <p className="text-sm font-medium text-gray-900">
                【三觀相似度篩選】
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                開啟後，三觀差距超過設定值的玩家不配對
              </p>
              <div className="space-y-0 divide-y divide-gray-100">
                {MATCHMAKER_V_ROWS.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-start gap-3 py-3 first:pt-0"
                  >
                    <Switch
                      checked={mmLocks[row.key]}
                      aria-label={`${row.title}：${mmLocks[row.key] ? "已開啟" : "已關閉"}`}
                      className="data-checked:bg-violet-600 data-unchecked:bg-gray-200 shrink-0 mt-0.5"
                      onCheckedChange={(v) =>
                        void toggleMmLock(row.key, row.title, v)
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {row.emoji} {row.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {anyVLockOn ? (
                <div className="space-y-1.5 pt-1">
                  <label className="text-sm font-medium text-gray-900 block">
                    三觀最大允許差距
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={mmVMaxDraft}
                    onChange={(e) => setMmVMaxDraft(e.target.value)}
                    onBlur={() => void onBlurMatchmakerVMax()}
                    className="w-24 bg-white max-w-full"
                  />
                  <p className="text-xs text-gray-500">
                    1=完全相同 2=差一格 3=差兩格 4=不限
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">
              釣竿拋竿冷卻（tier 預設）
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              商城釣竿商品 metadata 設{" "}
              <span className="font-mono text-[11px] bg-gray-50 px-1 rounded">
                rod_tier
              </span>{" "}
              為 basic／mid／high，且<strong>未</strong>填{" "}
              <span className="font-mono text-[11px] bg-gray-50 px-1 rounded">
                rod_cooldown_minutes
              </span>{" "}
              時，套用此處分鐘數（24h／12h／8h 為預設例）。若單筆釣竿已填冷卻分鐘則以商品為準。
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-gray-700 text-sm mb-1 block">
                  basic（分鐘）
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={rodBasicDraft}
                  onChange={(e) => setRodBasicDraft(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div>
                <label className="text-gray-700 text-sm mb-1 block">
                  mid（分鐘）
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={rodMidDraft}
                  onChange={(e) => setRodMidDraft(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div>
                <label className="text-gray-700 text-sm mb-1 block">
                  high（分鐘）
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={rodHighDraft}
                  onChange={(e) => setRodHighDraft(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
            <Button
              type="button"
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={() => void onSaveRodTierCooldowns()}
            >
              儲存釣竿冷卻
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              小／中／大獎 tier 抽選（每魚種）
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              僅適用普通／稀有／傳說魚。月老魚獎勵由配對成功與否決定；深海巨獸僅限量大獎，不適用本表。
              決定玩家釣到該魚種後，獎品落在「最小獎／中等獎／大獎」哪一層（與獎品列的 tier
              對齊）。
              <span className="font-mono text-[11px] bg-gray-50 px-1 rounded">
                interval_miss
              </span>
              ：三項加總可小於 100%，其餘視為 miss 再依序嘗試中獎、小獎；
              <span className="font-mono text-[11px] bg-gray-50 px-1 rounded">
                normalize
              </span>
              ：三項依比例正規化為 100%。
            </p>
            {tierSettingsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-gray-700 text-sm mb-1 block">魚種</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    value={tierFish}
                    onChange={(e) => setTierFish(e.target.value as FishType)}
                  >
                    {TIER_SETTINGS_FISH_TABS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-gray-700 text-sm mb-1 block">
                      最小獎（%）
                    </label>
                    <input
                      type="text"
                      value={tierSmall}
                      onChange={(e) => setTierSmall(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-gray-700 text-sm mb-1 block">
                      中等獎（%）
                    </label>
                    <input
                      type="text"
                      value={tierMed}
                      onChange={(e) => setTierMed(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-gray-700 text-sm mb-1 block">
                      大獎（%）
                    </label>
                    <input
                      type="text"
                      value={tierLarge}
                      onChange={(e) => setTierLarge(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-gray-700 text-sm mb-1 block">
                    缺額模式
                  </label>
                  <select
                    value={tierMode}
                    onChange={(e) =>
                      setTierMode(
                        e.target.value as "interval_miss" | "normalize",
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="interval_miss">
                      interval_miss（可加總小於 100%）
                    </option>
                    <option value="normalize">normalize（正規化為 100%）</option>
                  </select>
                </div>
                {tierMode === "interval_miss" ? (
                  <p className="text-xs text-amber-800 bg-amber-50/80 rounded-lg px-3 py-2 border border-amber-100">
                    目前三項合計約 {tierSumPreview.sum.toFixed(2)}%，
                    {tierSumPreview.miss > 0
                      ? ` 約 ${tierSumPreview.miss.toFixed(2)}% 為 miss（再嘗試中獎→小獎）。`
                      : " 無缺額。"}
                  </p>
                ) : null}
                <Button
                  type="button"
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  disabled={tierSaving}
                  onClick={() => void onSaveTierSettings()}
                >
                  {tierSaving ? "儲存中…" : "儲存 tier 設定"}
                </Button>
              </>
            )}
          </div>

          <div className="bg-amber-50/80 rounded-2xl border border-amber-100 p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">
              魚餌機率設定說明
            </h3>
            <p className="text-xs text-gray-700 leading-relaxed">
              一般魚餌：<code className="text-[11px] bg-white px-1 rounded text-gray-900">
                bait_common_rate
              </code>
              ～
              <code className="text-[11px] bg-white px-1 rounded text-gray-900">
                bait_matchmaker_rate
              </code>
              四項加總須為 100，且
              <code className="text-[11px] bg-white px-1 rounded text-gray-900">
                bait_leviathan_rate
              </code>
              須為 0。
              <br />
              章魚餌：設{" "}
              <code className="text-[11px] bg-white px-1 rounded text-gray-900">
                bait_octopus
              </code>
              為 true 時，五魚種（含
              <code className="text-[11px] bg-white px-1 rounded text-gray-900">
                bait_leviathan_rate
              </code>
              ）加總須為 100。
            </p>
            {canAccessShopAdmin ? (
              <Button
                type="button"
                variant="outline"
                className="border-violet-200 text-violet-700"
                onClick={() => router.push("/admin/shop")}
              >
                前往商城管理
              </Button>
            ) : (
              <p className="text-xs text-gray-500">
                （商城管理僅站長可進入，請洽站長調整魚餌商品。）
              </p>
            )}
          </div>
        </div>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-md max-h-[90vh] overflow-y-auto border border-gray-200 bg-white text-gray-900 shadow-xl [&_[data-slot=dialog-close]]:text-gray-600 [&_[data-slot=dialog-close]]:hover:bg-gray-100"
        >
          <DialogHeader>
            <DialogTitle className="text-gray-900 font-semibold">
              {dialogMode === "edit"
                ? "編輯獎品"
                : formFish === "leviathan"
                  ? "新增限量大獎 — 深海巨獸"
                  : `新增獎品 — ${fishLabel(formFish)} ${TIER_LABELS[formTier]}`}
            </DialogTitle>
            {dialogMode === "edit" ? (
              <DialogDescription className="text-gray-500 text-sm">
                {formFish === "leviathan"
                  ? "深海巨獸 · 限量大獎"
                  : `${fishLabel(formFish)} · ${TIER_LABELS[formTier]}`}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-gray-700 text-sm mb-1 block">
                獎品類型
              </label>
              <select
                className={dialogFieldClass}
                value={formRewardType}
                onChange={(e) =>
                  setFormRewardType(e.target.value as RewardFormType)
                }
              >
                <option value="coins_free">探險幣</option>
                <option value="coins_premium">純金</option>
                <option value="exp">EXP</option>
                <option value="shop_item">商城道具</option>
              </select>
            </div>
            {formRewardType === "coins_free" || formRewardType === "coins_premium" ? (
              <div>
                <label className="text-gray-700 text-sm mb-1 block">
                  數量
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formCoins}
                  onChange={(e) => setFormCoins(e.target.value)}
                  className={dialogFieldClass}
                />
              </div>
            ) : null}
            {formRewardType === "exp" ? (
              <div>
                <label className="text-gray-700 text-sm mb-1 block">
                  EXP 數量
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formExp}
                  onChange={(e) => setFormExp(e.target.value)}
                  className={dialogFieldClass}
                />
              </div>
            ) : null}
            {formRewardType === "shop_item" ? (
              <div>
                <label className="text-gray-700 text-sm mb-1 block">
                  從商城選擇
                </label>
                <select
                  className={dialogFieldClass}
                  value={formShopItemId}
                  onChange={(e) => setFormShopItemId(e.target.value)}
                >
                  <option value="">— 選擇商品 —</option>
                  {(shopItems ?? []).map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name} [{ITEM_TYPE_BADGE[it.item_type] ?? it.item_type}]
                      {!it.is_active ? "（已下架）" : ""}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {formFish === "matchmaker" ? null : formFish === "leviathan" ? null : (
              <div>
                <label className="text-gray-700 text-sm mb-1 block">
                  獎品 tier
                </label>
                <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                  {TIER_LABELS[formTier]}
                </p>
              </div>
            )}
            {showWeightInDialog ? (
              <div>
                <label className="text-gray-700 text-sm mb-1 block">
                  權重（%）
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  此 tier 已有 {tierCountForWeightHint} 個獎品，請設定相對權重
                </p>
                <DecimalPercentInput
                  value={formWeight}
                  onChange={setFormWeight}
                  disabled={dialogBusy}
                  placeholder="0.01"
                />
                {weightPreview.parsedWeight > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className="text-sm text-gray-500">≈ 佔此 tier 池</span>
                    <span className="text-base font-semibold text-violet-600">
                      {weightPreview.estimatedRate}%
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div>
              <label className="text-gray-700 text-sm mb-1 block">
                庫存（選填）
                {formFish === "leviathan" ? (
                  <span className="text-amber-700">（建議填寫）</span>
                ) : null}
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                placeholder="留空為無限"
                className={dialogFieldClass}
              />
              {formFish === "leviathan" ? (
                <p className="text-amber-800 text-xs mt-1 flex gap-1 items-start">
                  <span aria-hidden>⚠️</span>
                  <span>
                    深海巨獸為限量獎品，建議設定庫存數量。留空為無限；填數字為限量，耗盡後此獎品不再出現。
                  </span>
                </p>
              ) : (
                <p className="text-gray-500 text-xs mt-1">
                  留空為無限；填數字為限量，耗盡後此獎品不再出現
                </p>
              )}
            </div>
            <div>
              <label className="text-gray-700 text-sm mb-1 block">
                備註（選填，最多 100 字）
              </label>
              <Textarea
                value={formNote}
                onChange={(e) => setFormNote(e.target.value.slice(0, 100))}
                maxLength={100}
                rows={3}
                className={`${dialogFieldClass} resize-none`}
              />
            </div>
          </div>
          <DialogFooter className="border-t border-gray-200 bg-white sm:justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              onClick={() => setDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={dialogBusy}
              onClick={() => void submitReward()}
            >
              {dialogBusy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : dialogMode === "create" ? (
                "確認新增"
              ) : (
                "確認修改"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="border border-gray-200 bg-white text-gray-900 shadow-xl sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 font-semibold">
              確定刪除此獎品？
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 text-sm">
              此動作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-t border-gray-200 bg-white sm:justify-end gap-2">
            <AlertDialogCancel className="bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 mt-0">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => void confirmDelete()}
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-4 pt-4">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="inline-flex items-center gap-1 text-sm text-violet-600 disabled:opacity-40"
      >
        <ChevronLeft className="w-4 h-4" /> 上一頁
      </button>
      <span className="text-sm text-gray-600">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        className="inline-flex items-center gap-1 text-sm text-violet-600 disabled:opacity-40"
      >
        下一頁 <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function UserCell({
  nickname,
  avatarUrl,
}: {
  nickname: string;
  avatarUrl: string | null;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-100 shrink-0">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            fill
            className="object-cover"
            sizes="32px"
          />
        ) : (
          <span className="flex w-full h-full items-center justify-center text-xs text-gray-500">
            {(nickname || "?").slice(0, 1)}
          </span>
        )}
      </div>
      <span className="truncate font-medium text-gray-900">{nickname}</span>
    </div>
  );
}

function LeviathanStockAlert({
  rewards,
}: {
  rewards: FishingRewardWithItem[];
}) {
  const warn = rewards.some(
    (r) =>
      r.reward_tier === "large" &&
      r.stock != null &&
      r.stock - r.stock_used <= 5,
  );
  if (!warn) return null;
  return (
    <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-2 text-amber-700 text-sm">
      <span aria-hidden>⚠️</span>
      <span>部分限量獎品庫存不足 5 件，請盡快補充！</span>
    </div>
  );
}

function FishingRewardRow({
  row,
  list,
  onEdit,
  onToggle,
  onDelete,
}: {
  row: FishingRewardWithItem;
  list: FishingRewardWithItem[];
  onEdit: (row: FishingRewardWithItem) => void;
  onToggle: (row: FishingRewardWithItem) => void;
  onDelete: (row: FishingRewardWithItem) => void;
}) {
  const totalW = tierPoolWeightSum(list);
  const showWeightShare = list.length >= 2;
  const pct =
    totalW > 0
      ? Math.round((Number(row.weight) / totalW) * 10000) / 100
      : 0;
  const wStr = weightBpToPercentNumber(row.weight).toFixed(2);
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <span
        className="w-[60px] shrink-0 text-center text-xs font-medium px-1 py-0.5 rounded-md bg-gray-100 text-gray-800 truncate"
        title={rewardTypeBadgeLabel(row.reward_type)}
      >
        {rewardTypeBadgeLabel(row.reward_type)}
      </span>
      <span className="flex-1 min-w-0 text-sm text-gray-800">
        {describeReward(row)}
      </span>
      {showWeightShare ? (
        <span className="text-xs text-gray-400 tabular-nums shrink-0">
          權重 {wStr} ≈ {pct}%
        </span>
      ) : null}
      <button
        type="button"
        className="text-sm text-blue-600 hover:underline shrink-0"
        onClick={() => onEdit(row)}
      >
        編輯
      </button>
      <button
        type="button"
        className="text-sm text-gray-500 hover:underline shrink-0"
        onClick={() => onToggle(row)}
      >
        {row.is_active ? "停用" : "啟用"}
      </button>
      <button
        type="button"
        className="text-sm text-red-500 hover:underline shrink-0"
        onClick={() => onDelete(row)}
      >
        刪除
      </button>
    </div>
  );
}

function RewardTierCard({
  title,
  list,
  subtitleVariant,
  onGoSettings,
  onAdd,
  onEdit,
  onToggle,
  onDelete,
}: {
  title: string;
  list: FishingRewardWithItem[];
  subtitleVariant: "tierRates" | "leviathan";
  onGoSettings: () => void;
  onAdd: () => void;
  onEdit: (row: FishingRewardWithItem) => void;
  onToggle: (row: FishingRewardWithItem) => void;
  onDelete: (row: FishingRewardWithItem) => void;
}) {
  const subtitleMain =
    subtitleVariant === "tierRates"
      ? "出現機率請至系統設定調整"
      : "全服限量獎池；魚餌與出現率請至系統設定調整";
  const addBtnClass =
    "text-violet-600 border border-violet-300 rounded-lg px-3 py-1 text-sm hover:bg-violet-50";
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <div className="flex justify-between items-start gap-2">
        <h3 className="font-semibold text-gray-800">{title}</h3>
        <button type="button" onClick={onAdd} className={`shrink-0 ${addBtnClass}`}>
          ＋ 新增獎品
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1 mb-3 flex flex-wrap items-center gap-x-1 gap-y-0.5">
        <span>{subtitleMain}</span>
        <button
          type="button"
          className="text-violet-600 font-medium hover:underline"
          onClick={onGoSettings}
        >
          前往設定 ›
        </button>
      </p>
      <div>
        {list.length === 0 ? (
          <p className="text-xs text-gray-400 mb-3">
            尚無獎品，點下方按鈕新增
          </p>
        ) : (
          list.map((row) => (
            <FishingRewardRow
              key={row.id}
              row={row}
              list={list}
              onEdit={onEdit}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
      <div className="mt-3 pt-1">
        <button type="button" onClick={onAdd} className={addBtnClass}>
          ＋ 新增獎品
        </button>
      </div>
    </div>
  );
}
