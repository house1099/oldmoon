"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Backpack,
  Beer,
  ChevronLeft,
  Mail,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import { useTavern } from "@/hooks/useTavern";
import { useUnreadNotificationCount } from "@/hooks/useChat";
import { useGuildTabContext } from "@/contexts/guild-tab-context";
import { TavernModal } from "@/components/tavern/TavernModal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import useSWR, { mutate as swrMutate } from "swr";
import { SWR_KEYS } from "@/lib/swr/keys";
import { BROADCAST_MESSAGE_MAX_LENGTH } from "@/lib/constants/broadcast";
import { cn } from "@/lib/utils";
import { useMyProfile } from "@/hooks/useMyProfile";
import {
  getMyAlliancePartnersForGiftAction,
  type AlliancePartnerGiftDto,
} from "@/services/alliance.action";
import {
  getMyRewardsAction,
  equipRewardAction,
  unequipRewardAction,
  getActiveBroadcastsAction,
  expireBroadcastAction,
  useBroadcastAction as submitBroadcastAction,
  consumeRenameCardAction,
  consumeBagExpansionAction,
  deleteUserRewardsBatchAction,
  giftUserRewardsToAlliancePartnerBatchAction,
  resellUserRewardsBatchAction,
  openLootBoxRewardsAction,
  type ActiveBroadcastDto,
  type MyRewardsPayload,
} from "@/services/rewards.action";
import {
  createListingAction,
  getMyListingsAction,
} from "@/services/market-listing.action";
import { MarketSheet } from "@/components/market/MarketSheet";
import type { DrawResult } from "@/services/prize-engine";
import { GuildLootBoxReveal } from "@/components/loot-box/guild-loot-box-reveal";
import {
  giftItemToUserAction,
  confirmGiftsToUserBatchAction,
} from "@/services/gift.action";
import type {
  GiftRecipientSearchRow,
  UserRewardWithEffect,
} from "@/lib/repositories/server/rewards.repository";
import { rewardEffectClassName } from "@/lib/utils/reward-effects";
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

const TOTAL_INVENTORY_SLOTS = 48;

const inventoryCellBaseStyle: CSSProperties = {
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  boxSizing: "border-box",
  aspectRatio: "1",
  background: "rgba(255,255,255,0.04)",
  border: "0.5px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "flex-start",
  padding: "10px 6px 8px",
  cursor: "pointer",
  position: "relative",
  overflow: "hidden",
};

const inventoryCellEquippedStyle: CSSProperties = {
  borderColor: "rgba(34,197,94,0.4)",
  background: "rgba(34,197,94,0.06)",
};

const inventoryCellIconStyle: CSSProperties = {
  width: "100%",
  height: 36,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 26,
  flexShrink: 0,
  marginBottom: 6,
};

const inventoryCellNameStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "#a1a1aa",
  textAlign: "center",
  lineHeight: 1.3,
  width: "100%",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

function InventoryActionBtnContent({
  icon,
  label,
}: {
  icon: string;
  label: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "24px 1fr",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "0 16px",
      }}
    >
      <span style={{ textAlign: "center", fontSize: 16 }}>{icon}</span>
      <span style={{ textAlign: "left" }}>{label}</span>
    </div>
  );
}

function InventoryActionDivider() {
  return (
    <div
      style={{
        height: "0.5px",
        background: "rgba(255,255,255,0.06)",
        margin: "2px 0",
      }}
    />
  );
}

const inventoryActionBtnBase: CSSProperties = {
  width: "100%",
  height: 48,
  borderRadius: 13,
  fontSize: 14,
  fontWeight: 700,
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
};

const inventoryActionBtnStyles = {
  giftPlayer: {
    ...inventoryActionBtnBase,
    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
    color: "white",
  } satisfies CSSProperties,
  giftAlliance: {
    ...inventoryActionBtnBase,
    background: "rgba(255,255,255,0.06)",
    border: "0.5px solid rgba(255,255,255,0.1)",
    color: "#d4d4d8",
  } satisfies CSSProperties,
  resell: {
    ...inventoryActionBtnBase,
    background: "rgba(180,130,0,0.12)",
    border: "0.5px solid rgba(245,158,11,0.3)",
    color: "#fbbf24",
  } satisfies CSSProperties,
  market: {
    ...inventoryActionBtnBase,
    background: "linear-gradient(135deg, #0d9488, #0f766e)",
    color: "#ecfdf5",
  } satisfies CSSProperties,
  trash: {
    ...inventoryActionBtnBase,
    background: "transparent",
    border: "0.5px solid rgba(220,38,38,0.35)",
    color: "#f87171",
  } satisfies CSSProperties,
  cancel: {
    ...inventoryActionBtnBase,
    background: "rgba(255,255,255,0.04)",
    border: "0.5px solid rgba(255,255,255,0.07)",
    color: "#52525b",
  } satisfies CSSProperties,
};

const FloatingToolbarOpenContext = createContext<(() => void) | null>(null);

export function useOpenEquipmentSheet(): () => void {
  const fn = useContext(FloatingToolbarOpenContext);
  return fn ?? (() => {});
}

function rewardAccent(rewardType: string): {
  emoji: string;
  border: string;
  bg: string;
} {
  switch (rewardType) {
    case "title":
      return {
        emoji: "👑",
        border: "border-violet-500/50",
        bg: "bg-violet-950/50",
      };
    case "avatar_frame":
      return {
        emoji: "✨",
        border: "border-sky-500/45",
        bg: "bg-sky-950/40",
      };
    case "card_frame":
      return {
        emoji: "🎴",
        border: "border-emerald-500/45",
        bg: "bg-emerald-950/40",
      };
    case "broadcast":
      return {
        emoji: "📢",
        border: "border-amber-500/45",
        bg: "bg-amber-950/40",
      };
    case "rename_card":
      return {
        emoji: "✏️",
        border: "border-violet-500/45",
        bg: "bg-violet-950/40",
      };
    case "bag_expansion":
      return {
        emoji: "🎒",
        border: "border-amber-500/45",
        bg: "bg-amber-950/35",
      };
    case "fishing_bait":
      return {
        emoji: "🪱",
        border: "border-lime-500/40",
        bg: "bg-lime-950/35",
      };
    case "fishing_rod":
      return {
        emoji: "🎣",
        border: "border-sky-500/40",
        bg: "bg-sky-950/35",
      };
    case "loot_box":
      return {
        emoji: "🎁",
        border: "border-violet-500/45",
        bg: "bg-violet-950/45",
      };
    default:
      return {
        emoji: "🎁",
        border: "border-zinc-600/50",
        bg: "bg-zinc-900/50",
      };
  }
}

type RewardStack = {
  key: string;
  rewardType: string;
  label: string;
  count: number;
  rows: UserRewardWithEffect[];
};

const EQUIPPED_BADGE_REWARD_TYPES = new Set([
  "avatar_frame",
  "card_frame",
  "title",
]);

const INVENTORY_LONGPRESS_MS = 500;

function firstUnequippedRow(stack: RewardStack): UserRewardWithEffect | null {
  return stack.rows.find((r) => !r.is_equipped) ?? null;
}

/** 長按選單／數量：廣播券僅計「未使用」列，避免已用券佔位導致無法開選單 */
function firstManageableRewardRow(stack: RewardStack): UserRewardWithEffect | null {
  if (stack.rewardType === "broadcast") {
    return (
      stack.rows.find((r) => !r.is_equipped && r.used_at == null) ?? null
    );
  }
  return firstUnequippedRow(stack);
}

/** 只要有可操作的未裝備列（播券另計未使用）即可長按開啟選單；實際按鈕依商城／來源由 stackMenuActions 決定 */
function stackSupportsLongPress(stack: RewardStack): boolean {
  return firstManageableRewardRow(stack) != null;
}

function canListRewardToMarket(
  row: UserRewardWithEffect | null,
  listedRewardIds: Set<string>,
): boolean {
  if (!row) return false;
  if (!row.shop_item_id) return false;
  if (row.allow_player_trade === false) return false;
  if (row.used_at != null) return false;
  if (listedRewardIds.has(row.id)) return false;
  return true;
}

/** 未上架且可操作（未裝備／廣播券須未使用） */
function firstManageableUnlistedRow(
  stack: RewardStack,
  listed: Set<string>,
): UserRewardWithEffect | null {
  if (stack.rewardType === "broadcast") {
    return (
      stack.rows.find(
        (r) => !r.is_equipped && r.used_at == null && !listed.has(r.id),
      ) ?? null
    );
  }
  return stack.rows.find((r) => !r.is_equipped && !listed.has(r.id)) ?? null;
}

function stackMenuMaxQtyUnlisted(
  stack: RewardStack,
  listed: Set<string>,
): number {
  if (stack.rewardType === "broadcast") {
    return stack.rows.filter(
      (r) => !r.is_equipped && r.used_at == null && !listed.has(r.id),
    ).length;
  }
  return stack.rows.filter((r) => !r.is_equipped && !listed.has(r.id)).length;
}

function pickUnequippedUnlistedRowIds(
  stack: RewardStack,
  n: number,
  listed: Set<string>,
): string[] {
  const rows =
    stack.rewardType === "broadcast"
      ? stack.rows.filter(
          (r) => !r.is_equipped && r.used_at == null && !listed.has(r.id),
        )
      : stack.rows.filter((r) => !r.is_equipped && !listed.has(r.id));
  const cap = rows.length;
  if (cap === 0) return [];
  const take = Math.min(Math.max(1, n), cap);
  return rows.slice(0, take).map((r) => r.id);
}

function resellCurrencyLabel(r: UserRewardWithEffect): string {
  const c = r.shop_resell_currency_type?.trim();
  if (c === "premium_coins") return "純金";
  if (c === "free_coins") return "探險幣";
  const ct = r.shop_currency_type?.trim();
  if (ct === "premium_coins") return "純金";
  return "探險幣";
}

function buildStacks(rows: UserRewardWithEffect[]): RewardStack[] {
  const map = new Map<string, UserRewardWithEffect[]>();
  for (const r of rows) {
    const k = `${r.reward_type}\0${r.label}`;
    const arr = map.get(k) ?? [];
    arr.push(r);
    map.set(k, arr);
  }
  const stacks: RewardStack[] = [];
  for (const [, list] of Array.from(map.entries())) {
    if (list.length === 0) continue;
    list.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const first = list[0]!;
    stacks.push({
      key: `${first.reward_type}:${first.label}`,
      rewardType: first.reward_type,
      label: first.label,
      count: list.length,
      rows: list,
    });
  }
  stacks.sort(
    (a, b) =>
      new Date(a.rows[0]!.created_at).getTime() -
      new Date(b.rows[0]!.created_at).getTime(),
  );
  return stacks;
}

function stackActionHint(stack: RewardStack): string {
  const rt = stack.rewardType;
  if (rt === "loot_box") {
    return "開啟";
  }
  if (
    rt === "broadcast" ||
    rt === "rename_card" ||
    rt === "bag_expansion" ||
    rt === "fishing_bait" ||
    rt === "fishing_rod"
  ) {
    return "使用";
  }
  if (rt === "title" || rt === "avatar_frame" || rt === "card_frame") {
    return stack.rows.some((r) => r.is_equipped) ? "裝備中 ✓" : "裝備";
  }
  return "";
}

function formatBroadcastRemaining(expiresAt: string): string {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return "即將結束";
  const totalMinutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `剩餘 ${minutes} 分鐘`;
  return `剩餘 ${hours} 小時 ${minutes} 分`;
}

function toThumbImageUrl(raw: string, width: number, height: number): string {
  const src = raw.trim();
  if (!src) return src;
  if (src.startsWith("/")) return src;
  if (src.includes("cloudinary.com")) {
    return src.replace(
      "/upload/",
      `/upload/w_${width},h_${height},c_fill,q_auto,f_auto/`,
    );
  }
  return src;
}

function FloatingToolbarInner({
  messageMaxLength,
  openEquipRef,
}: {
  messageMaxLength: number;
  openEquipRef: React.MutableRefObject<(() => void) | null>;
}) {
  const router = useRouter();
  const { profile, mutate: mutateProfile } = useMyProfile();
  const guildCtx = useGuildTabContext();
  const [expanded, setExpanded] = useState(false);
  const [tavernOpen, setTavernOpen] = useState(false);
  const [lastClosedAt, setLastClosedAt] = useState(() => Date.now());
  const { messages } = useTavern();
  const { count: unreadMail } = useUnreadNotificationCount();

  const [equipOpen, setEquipOpen] = useState(false);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsPayload, setRewardsPayload] = useState<MyRewardsPayload | null>(
    null,
  );

  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [broadcastDraft, setBroadcastDraft] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastStack, setBroadcastStack] = useState<RewardStack | null>(
    null,
  );

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [bagExpandOpen, setBagExpandOpen] = useState(false);
  const [bagExpandStack, setBagExpandStack] = useState<RewardStack | null>(
    null,
  );
  const [bagExpandBusy, setBagExpandBusy] = useState(false);
  const [broadcastManageOpen, setBroadcastManageOpen] = useState(false);
  const [expireTarget, setExpireTarget] = useState<ActiveBroadcastDto | null>(null);
  const [expiring, setExpiring] = useState(false);

  const [stackMenuOpen, setStackMenuOpen] = useState(false);
  const [stackMenuTarget, setStackMenuTarget] = useState<RewardStack | null>(null);
  const [stackMenuQty, setStackMenuQty] = useState(1);
  const [lootPackDialogOpen, setLootPackDialogOpen] = useState(false);
  const [lootPackStack, setLootPackStack] = useState<RewardStack | null>(null);
  const [lootPackQty, setLootPackQty] = useState(1);
  const [lootRevealOpen, setLootRevealOpen] = useState(false);
  const [lootDraws, setLootDraws] = useState<DrawResult[]>([]);
  const [lootPlaybackKey, setLootPlaybackKey] = useState(0);
  const [lootOpenBusy, setLootOpenBusy] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    step: 1 | 2;
    rowIds: string[];
    label: string;
  } | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [giftPickerOpen, setGiftPickerOpen] = useState(false);
  const [giftPartners, setGiftPartners] = useState<AlliancePartnerGiftDto[]>([]);
  const [pendingGift, setPendingGift] = useState<{
    rowIds: string[];
    label: string;
  } | null>(null);
  const [giftDialog, setGiftDialog] = useState<{
    step: 1 | 2;
    rowIds: string[];
    itemLabel: string;
    partner: AlliancePartnerGiftDto;
  } | null>(null);
  const [giftBusy, setGiftBusy] = useState(false);
  const [resellDialog, setResellDialog] = useState<{
    step: 1 | 2;
    rowIds: string[];
    label: string;
    payout: number;
    currencyLabel: string;
  } | null>(null);
  const [resellBusy, setResellBusy] = useState(false);
  const [giftPlayerDialogOpen, setGiftPlayerDialogOpen] = useState(false);
  const [giftPlayerRewardIds, setGiftPlayerRewardIds] = useState<string[]>([]);
  const [giftPlayerItemLabel, setGiftPlayerItemLabel] = useState("");
  const [giftNicknameDraft, setGiftNicknameDraft] = useState("");
  const [giftPlayerCandidates, setGiftPlayerCandidates] = useState<
    GiftRecipientSearchRow[]
  >([]);
  const [giftPlayerSearchBusy, setGiftPlayerSearchBusy] = useState(false);
  const [giftPlayerRecipientPick, setGiftPlayerRecipientPick] =
    useState<GiftRecipientSearchRow | null>(null);
  const [giftPlayerConfirmBusy, setGiftPlayerConfirmBusy] = useState(false);
  const [marketSheetOpen, setMarketSheetOpen] = useState(false);
  const [marketListOpen, setMarketListOpen] = useState(false);
  const [marketListRewardId, setMarketListRewardId] = useState<string | null>(
    null,
  );
  const [marketListLabel, setMarketListLabel] = useState("");
  const [marketListImageUrl, setMarketListImageUrl] = useState<string | null>(
    null,
  );
  const [marketListCurrency, setMarketListCurrency] = useState<
    "free_coins" | "premium_coins"
  >("free_coins");
  const [marketListPriceStr, setMarketListPriceStr] = useState("");
  const [marketListBusy, setMarketListBusy] = useState(false);
  /** 關閉自由市場面板後視為已讀；高於此時間戳的「24h 內成交」才顯示橘點（session 內持久化） */
  const [lastMarketSheetClosedAt, setLastMarketSheetClosedAt] = useState(0);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const { data: activeBroadcasts = [], mutate: mutateActiveBroadcasts } = useSWR(
    profile?.role === "master" ? "floating-toolbar-active-broadcasts" : null,
    () => getActiveBroadcastsAction(),
    { revalidateOnFocus: true },
  );

  const { data: myMarketRows = [] } = useSWR(
    SWR_KEYS.myMarketListings,
    getMyListingsAction,
    { revalidateOnFocus: true },
  );
  /** 後端 getMyRewardsAction.listedRewardIds 與 SWR 市集列表合併，並排除已過期仍為 active 的列 */
  const listedRewardIdSet = useMemo(() => {
    const s = new Set<string>();
    for (const id of rewardsPayload?.listedRewardIds ?? []) {
      s.add(id);
    }
    const now = Date.now();
    for (const l of myMarketRows) {
      if (l.status !== "active") continue;
      if (l.expires_at && new Date(l.expires_at).getTime() <= now) continue;
      s.add(l.user_reward_id);
    }
    return s;
  }, [rewardsPayload?.listedRewardIds, myMarketRows]);
  const hasMarketNotification = useMemo(() => {
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    return myMarketRows.some(
      (l) =>
        l.status === "sold" &&
        (l.seller_received ?? 0) > 0 &&
        l.sold_at != null &&
        now - new Date(l.sold_at).getTime() < day &&
        new Date(l.sold_at).getTime() > lastMarketSheetClosedAt,
    );
  }, [myMarketRows, lastMarketSheetClosedAt]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("ft_market_sheet_closed_at");
      if (raw) {
        const n = parseInt(raw, 10);
        if (Number.isFinite(n) && n > 0) {
          setLastMarketSheetClosedAt(n);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    openEquipRef.current = () => setEquipOpen(true);
    return () => {
      openEquipRef.current = null;
    };
  }, [openEquipRef]);

  useEffect(() => {
    if (!equipOpen) return;
    let cancelled = false;
    setRewardsLoading(true);
    void getMyRewardsAction()
      .then((p) => {
        if (!cancelled) setRewardsPayload(p);
      })
      .catch(() => {
        if (!cancelled) setRewardsPayload(null);
      })
      .finally(() => {
        if (!cancelled) setRewardsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [equipOpen]);

  useEffect(() => {
    const refresh = () => {
      if (!equipOpen) return;
      void getMyRewardsAction().then((p) => setRewardsPayload(p));
    };
    window.addEventListener("guild-rewards-invalidate", refresh);
    return () => window.removeEventListener("guild-rewards-invalidate", refresh);
  }, [equipOpen]);

  const showTavernDot = useMemo(() => {
    if (tavernOpen) return false;
    const last = messages[messages.length - 1];
    if (!last) return false;
    return new Date(last.created_at).getTime() > lastClosedAt;
  }, [messages, tavernOpen, lastClosedAt]);

  const handleTavernOpenChange = (open: boolean) => {
    setTavernOpen(open);
    if (!open) setLastClosedAt(Date.now());
  };

  const stacks = useMemo(
    () => buildStacks(rewardsPayload?.allRewards ?? []),
    [rewardsPayload?.allRewards],
  );
  const inventorySlots = rewardsPayload?.inventorySlots ?? 16;
  const openSlots = Math.min(TOTAL_INVENTORY_SLOTS, Math.max(0, inventorySlots));
  const lockedStart = openSlots;
  const displayStacks = stacks.slice(0, openSlots);
  const isFull = stacks.length >= openSlots && openSlots > 0;

  const handleStackEquip = async (stack: RewardStack) => {
    const rt = stack.rewardType;

    if (rt === "broadcast") {
      const unused = stack.rows.find((r) => r.used_at == null);
      if (!unused) {
        toast.error("沒有可用的廣播券");
        return;
      }
      setBroadcastStack(stack);
      setBroadcastDraft("");
      setBroadcastDialogOpen(true);
      return;
    }

    if (rt === "loot_box") {
      if (!firstManageableUnlistedRow(stack, listedRewardIdSet)) {
        toast.error("沒有可開啟的盲盒（上架中的需先下架）");
        return;
      }
      setLootPackStack(stack);
      setLootPackQty(1);
      setLootPackDialogOpen(true);
      return;
    }

    if (rt === "rename_card") {
      setRenameDraft("");
      setRenameDialogOpen(true);
      return;
    }

    if (rt === "bag_expansion") {
      const row = firstManageableRewardRow(stack);
      if (!row) {
        toast.error("沒有可用的背包擴充包");
        return;
      }
      setBagExpandStack(stack);
      setBagExpandOpen(true);
      return;
    }

    if (rt === "fishing_bait" || rt === "fishing_rod") {
      toast.info("請前往「月老」分頁使用釣竿與釣餌");
      router.push("/matchmaking");
      return;
    }

    if (rt !== "title" && rt !== "avatar_frame" && rt !== "card_frame") {
      toast.info("此道具暫不支援裝備");
      return;
    }

    const equipped = stack.rows.find((r) => r.is_equipped);
    if (equipped) {
      const r = await unequipRewardAction(equipped.id);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("已卸下");
    } else {
      const target = stack.rows.find((r) => !r.is_equipped) ?? stack.rows[0];
      if (!target) return;
      const r = await equipRewardAction(target.id, rt);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success("已裝備");
    }
    if (rt === "title" || rt === "avatar_frame" || rt === "card_frame") {
      window.dispatchEvent(new CustomEvent("guild-rewards-invalidate"));
    }
    const p = await getMyRewardsAction();
    setRewardsPayload(p);
    router.refresh();
  };

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function tryOpenStackMenu(stack: RewardStack) {
    if (!stackSupportsLongPress(stack)) {
      if (!stack.rows.some((r) => !r.is_equipped)) {
        toast.error("請先卸下道具才能贈送、刪除或回賣");
      } else if (
        stack.rewardType === "broadcast" &&
        !stack.rows.some((r) => !r.is_equipped && r.used_at == null)
      ) {
        toast.message("沒有未使用的廣播券可贈送或刪除");
      } else {
        toast.message("此道具未開放這些操作");
      }
      return;
    }
    setStackMenuQty(1);
    setStackMenuTarget(stack);
    setStackMenuOpen(true);
  }

  function stackMenuActions(stack: RewardStack, listed: Set<string>) {
    const sample = firstManageableUnlistedRow(stack, listed);
    if (!sample) {
      return { canGift: false, canDelete: false, canResell: false, unit: 0 };
    }
    if (sample.shop_item_id) {
      const unit =
        sample.shop_resell_price != null
          ? Number(sample.shop_resell_price)
          : NaN;
      return {
        canGift: sample.shop_allow_gift !== false,
        canDelete: sample.shop_allow_delete !== false,
        canResell:
          sample.shop_allow_resell === true &&
          Number.isFinite(unit) &&
          unit >= 0,
        unit: Number.isFinite(unit) ? unit : 0,
      };
    }
    return {
      canGift: true,
      canDelete: true,
      canResell: false,
      unit: 0,
    };
  }

  async function beginGiftFromMenu() {
    setStackMenuOpen(false);
    if (!stackMenuTarget) return;
    const rowIds = pickUnequippedUnlistedRowIds(
      stackMenuTarget,
      stackMenuQty,
      listedRewardIdSet,
    );
    if (rowIds.length === 0) {
      toast.error("沒有可贈送的數量");
      return;
    }
    const res = await getMyAlliancePartnersForGiftAction();
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (res.partners.length === 0) {
      toast.message("尚無已成立的血盟夥伴");
      return;
    }
    setPendingGift({ rowIds, label: stackMenuTarget.label });
    setGiftPartners(res.partners);
    setGiftPickerOpen(true);
  }

  function beginGiftToPlayerFromMenu() {
    setStackMenuOpen(false);
    if (!stackMenuTarget) return;
    const rowIds = pickUnequippedUnlistedRowIds(
      stackMenuTarget,
      stackMenuQty,
      listedRewardIdSet,
    );
    if (rowIds.length === 0) {
      toast.error("沒有可贈送的道具");
      return;
    }
    setGiftPlayerRewardIds(rowIds);
    setGiftPlayerItemLabel(stackMenuTarget.label);
    setGiftNicknameDraft("");
    setGiftPlayerCandidates([]);
    setGiftPlayerRecipientPick(null);
    setGiftPlayerDialogOpen(true);
  }

  function beginMarketListToMarketFromMenu() {
    setStackMenuOpen(false);
    if (!stackMenuTarget) return;
    const rowIds = pickUnequippedUnlistedRowIds(
      stackMenuTarget,
      1,
      listedRewardIdSet,
    );
    if (rowIds.length === 0) {
      toast.error("沒有可上架的道具");
      return;
    }
    const rid = rowIds[0]!;
    const row = stackMenuTarget.rows.find((r) => r.id === rid) ?? null;
    if (!canListRewardToMarket(row, listedRewardIdSet)) {
      toast.message("此道具不符合上架條件");
      return;
    }
    setMarketListRewardId(rid);
    setMarketListLabel(stackMenuTarget.label);
    setMarketListImageUrl(row?.image_url ?? null);
    setMarketListCurrency("free_coins");
    setMarketListPriceStr("");
    setMarketListOpen(true);
  }

  async function handleGiftPlayerSearch() {
    if (giftPlayerRewardIds.length === 0) return;
    const q = giftNicknameDraft.trim();
    if (q.length < 1) {
      toast.error("請至少輸入 1 個字再搜尋");
      return;
    }
    setGiftPlayerSearchBusy(true);
    try {
      const r = await giftItemToUserAction({
        rewardId: giftPlayerRewardIds[0]!,
        recipientNickname: q,
      });
      if (!r.ok) {
        toast.error(r.error);
        setGiftPlayerCandidates([]);
        return;
      }
      if (r.candidates.length === 0) {
        toast.message("找不到符合的冒險者");
      }
      setGiftPlayerCandidates(r.candidates);
    } finally {
      setGiftPlayerSearchBusy(false);
    }
  }

  function beginDeleteFromMenu() {
    setStackMenuOpen(false);
    if (!stackMenuTarget) return;
    const rowIds = pickUnequippedUnlistedRowIds(
      stackMenuTarget,
      stackMenuQty,
      listedRewardIdSet,
    );
    if (rowIds.length === 0) {
      toast.error("沒有可刪除的數量");
      return;
    }
    setDeleteDialog({ step: 1, rowIds, label: stackMenuTarget.label });
  }

  function beginResellFromMenu() {
    setStackMenuOpen(false);
    if (!stackMenuTarget) return;
    const sample = firstManageableUnlistedRow(stackMenuTarget, listedRewardIdSet);
    if (!sample) return;
    const rowIds = pickUnequippedUnlistedRowIds(
      stackMenuTarget,
      stackMenuQty,
      listedRewardIdSet,
    );
    if (rowIds.length === 0) {
      toast.error("沒有可回賣的數量");
      return;
    }
    const { canResell, unit } = stackMenuActions(
      stackMenuTarget,
      listedRewardIdSet,
    );
    if (!canResell) return;
    const payout = unit * rowIds.length;
    setResellDialog({
      step: 1,
      rowIds,
      label: stackMenuTarget.label,
      payout,
      currencyLabel: resellCurrencyLabel(sample),
    });
  }

  async function beginOpenLootFromMenu() {
    const target = stackMenuTarget;
    const qty = stackMenuQty;
    if (!target || target.rewardType !== "loot_box") return;
    const rowIds = pickUnequippedUnlistedRowIds(target, qty, listedRewardIdSet);
    if (rowIds.length === 0) {
      toast.error("沒有可開啟的盲盒");
      return;
    }
    setStackMenuOpen(false);
    setLootOpenBusy(true);
    try {
      const r = await openLootBoxRewardsAction(rowIds);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setLootDraws(r.draws);
      setLootPlaybackKey((k) => k + 1);
      setLootRevealOpen(true);
      toast.success(
        r.draws.length === 1
          ? "🎁 公會盲盒開啟中，請觀看動畫"
          : `🎁 已開啟 ${r.draws.length} 個公會盲盒，請觀看動畫與獎項`,
      );
      const p = await getMyRewardsAction();
      setRewardsPayload(p);
      router.refresh();
    } finally {
      setLootOpenBusy(false);
    }
  }

  const subButtons = [
    {
      id: "mail" as const,
      label: "信件",
      delayMs: 100,
      onClick: () => {
        setExpanded(false);
        guildCtx?.requestGuildSubTab("信件");
        router.push("/guild");
      },
      icon: <Mail className="h-5 w-5 text-zinc-200" strokeWidth={1.75} />,
      badge: "mail" as const,
    },
    {
      id: "equip" as const,
      label: "裝備",
      delayMs: 50,
      onClick: () => {
        setExpanded(false);
        setEquipOpen(true);
      },
      icon: <Backpack className="h-5 w-5 text-zinc-200" strokeWidth={1.75} />,
      badge: "none" as const,
    },
    {
      id: "tavern" as const,
      label: "酒館",
      delayMs: 0,
      onClick: () => {
        setExpanded(false);
        handleTavernOpenChange(true);
      },
      icon: <Beer className="h-5 w-5 text-amber-200/95" strokeWidth={1.75} />,
      badge: "tavern" as const,
    },
    {
      id: "market" as const,
      label: "自由市場",
      delayMs: 150,
      onClick: () => {
        setExpanded(false);
        setMarketSheetOpen(true);
      },
      icon: <Store className="h-5 w-5 text-teal-200/95" strokeWidth={1.75} />,
      badge: "market" as const,
    },
    ...(profile?.role === "master" && activeBroadcasts.length > 0
      ? [
          {
            id: "broadcast-manage" as const,
            label: "廣播管理",
            delayMs: 0,
            onClick: () => {
              setExpanded(false);
              setBroadcastManageOpen(true);
            },
            icon: (
              <span
                aria-hidden
                className="inline-flex h-5 w-5 items-center justify-center text-sm text-red-300"
              >
                📢
              </span>
            ),
            badge: "none" as const,
          },
        ]
      : []),
  ] as const;

  const mainButtonHasNotice = unreadMail > 0;

  return (
    <>
      <div
        className={cn(
          "fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3",
          expanded && "z-[60]",
        )}
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {expanded ? (
          <div
            className="flex flex-col items-end gap-3 pb-1"
            role="toolbar"
            aria-label="快捷功能"
          >
            {subButtons.map((btn) => (
              <div
                key={btn.id}
                className="ft-toolbar-pop flex w-[min(100vw-2rem,220px)] shrink-0 flex-row items-center justify-end gap-2"
                style={
                  { "--ft-delay": `${btn.delayMs}ms` } as CSSProperties & {
                    "--ft-delay"?: string;
                  }
                }
              >
                <span className="whitespace-nowrap rounded-full border border-zinc-600/70 bg-zinc-800/95 px-3 py-1 text-xs font-medium text-white shadow-sm backdrop-blur-sm">
                  {btn.label}
                </span>
                <button
                  type="button"
                  onClick={btn.onClick}
                  aria-label={btn.label}
                  className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-zinc-700/40 bg-zinc-800/90 shadow-md transition-transform hover:bg-zinc-700/90 active:scale-95"
                >
                  {btn.icon}
                  {btn.badge === "mail" && unreadMail > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-zinc-950">
                      {unreadMail > 9 ? "9+" : unreadMail}
                    </span>
                  ) : null}
                  {btn.badge === "tavern" && showTavernDot ? (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-zinc-950" />
                  ) : null}
                  {btn.badge === "market" && hasMarketNotification ? (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-zinc-950" />
                  ) : null}
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-label={expanded ? "收合快捷選單" : "展開快捷選單"}
          className={cn(
            "relative flex h-14 w-14 items-center justify-center rounded-full border bg-zinc-900/90 text-violet-200 backdrop-blur-xl transition-[transform,box-shadow,filter] duration-200 hover:border-violet-500/40 active:scale-95",
            mainButtonHasNotice
              ? "border-violet-500/50 shadow-[0_0_16px_rgba(139,92,246,0.8)] ring-2 ring-violet-400/60 animate-pulse"
              : "border-zinc-700/50 shadow-none ring-0",
          )}
        >
          {expanded ? (
            <X className="h-6 w-6 text-zinc-200" strokeWidth={2} />
          ) : (
            <Sparkles className="h-6 w-6 text-violet-300" strokeWidth={1.75} />
          )}
          {mainButtonHasNotice && !expanded ? (
            <span
              className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-zinc-950"
              aria-hidden
            />
          ) : null}
        </button>
      </div>

      <TavernModal
        open={tavernOpen}
        onClose={() => handleTavernOpenChange(false)}
        maxLength={messageMaxLength}
      />

      <Dialog
        open={broadcastDialogOpen}
        onOpenChange={(o) => {
          setBroadcastDialogOpen(o);
          if (!o) setBroadcastStack(null);
        }}
      >
        <DialogContent className="max-w-md border-zinc-700 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>使用廣播券</DialogTitle>
            <DialogDescription className="text-zinc-500">
              訊息將顯示於畫面頂部約 24 小時（1〜
              {BROADCAST_MESSAGE_MAX_LENGTH} 字）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={broadcastDraft}
              onChange={(e) =>
                setBroadcastDraft(
                  e.target.value.slice(0, BROADCAST_MESSAGE_MAX_LENGTH),
                )
              }
              placeholder="輸入廣播內容…"
              rows={3}
              className="min-h-[5rem] border-zinc-700 bg-zinc-900/80 text-zinc-100"
            />
            <div className="flex justify-end text-xs text-zinc-500">
              {broadcastDraft.trim().length}/{BROADCAST_MESSAGE_MAX_LENGTH}
            </div>
            <div className="rounded-2xl border border-amber-400/40 bg-amber-950/60 px-4 py-2">
              <p className="flex flex-wrap items-center gap-2 text-sm text-amber-100">
                <span aria-hidden>📢</span>
                <span className="font-bold text-amber-200">
                  {profile?.nickname ?? "你"}
                </span>
                <span className="min-w-0 break-words text-amber-50/95">
                  {broadcastDraft.trim() || "（預覽）"}
                </span>
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              className="text-zinc-400"
              onClick={() => setBroadcastDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={
                broadcastSending ||
                broadcastDraft.trim().length < 1 ||
                broadcastDraft.trim().length > BROADCAST_MESSAGE_MAX_LENGTH
              }
              onClick={async () => {
                const unused = broadcastStack?.rows.find(
                  (b) => b.reward_type === "broadcast" && b.used_at == null,
                );
                if (!unused) {
                  toast.error("沒有可用的廣播券");
                  return;
                }
                setBroadcastSending(true);
                try {
                  const r = await submitBroadcastAction(
                    unused.id,
                    broadcastDraft,
                  );
                  if (!r.ok) {
                    toast.error(r.error);
                    return;
                  }
                  toast.success("📢 廣播已發送！將在頂部橫幅顯示約 24 小時");
                  setBroadcastDialogOpen(false);
                  setBroadcastStack(null);
                  setBroadcastDraft("");
                  const p = await getMyRewardsAction();
                  setRewardsPayload(p);
                  router.refresh();
                } finally {
                  setBroadcastSending(false);
                }
              }}
            >
              {broadcastSending ? "送出中…" : "確認送出"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={lootPackDialogOpen}
        onOpenChange={(o) => {
          setLootPackDialogOpen(o);
          if (!o) setLootPackStack(null);
        }}
      >
        <DialogContent className="max-w-md border-zinc-700 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>開啟公會盲盒</DialogTitle>
            <DialogDescription className="text-zinc-500">
              {lootPackStack
                ? (() => {
                    const openable = stackMenuMaxQtyUnlisted(
                      lootPackStack,
                      listedRewardIdSet,
                    );
                    return `共 ${lootPackStack.count} 個，可開啟 ${openable} 個（上架中需先下架）`;
                  })()
                : ""}
            </DialogDescription>
          </DialogHeader>
          {lootPackStack ? (
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-xs text-zinc-500">
                <span>數量</span>
                <input
                  type="number"
                  min={1}
                  max={Math.max(
                    1,
                    stackMenuMaxQtyUnlisted(lootPackStack, listedRewardIdSet),
                  )}
                  value={lootPackQty}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    const cap = Math.max(
                      1,
                      stackMenuMaxQtyUnlisted(lootPackStack, listedRewardIdSet),
                    );
                    if (!Number.isFinite(v)) {
                      setLootPackQty(1);
                      return;
                    }
                    setLootPackQty(Math.min(Math.max(1, v), cap));
                  }}
                  className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              className="text-zinc-400"
              onClick={() => setLootPackDialogOpen(false)}
              disabled={lootOpenBusy}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={
                lootOpenBusy ||
                !lootPackStack ||
                (lootPackStack
                  ? stackMenuMaxQtyUnlisted(lootPackStack, listedRewardIdSet) < 1
                  : true)
              }
              onClick={async () => {
                if (!lootPackStack) return;
                const rowIds = pickUnequippedUnlistedRowIds(
                  lootPackStack,
                  lootPackQty,
                  listedRewardIdSet,
                );
                if (rowIds.length === 0) {
                  toast.error("沒有可開啟的盲盒");
                  return;
                }
                setLootOpenBusy(true);
                try {
                  const r = await openLootBoxRewardsAction(rowIds);
                  if (!r.ok) {
                    toast.error(r.error);
                    return;
                  }
                  setLootPackDialogOpen(false);
                  setLootPackStack(null);
                  setLootDraws(r.draws);
                  setLootPlaybackKey((k) => k + 1);
                  setLootRevealOpen(true);
                  toast.success(
                    r.draws.length === 1
                      ? "🎁 公會盲盒開啟中，請觀看動畫"
                      : `🎁 已開啟 ${r.draws.length} 個公會盲盒，請觀看動畫與獎項`,
                  );
                  const p = await getMyRewardsAction();
                  setRewardsPayload(p);
                  router.refresh();
                } finally {
                  setLootOpenBusy(false);
                }
              }}
            >
              {lootOpenBusy ? "開啟中…" : "確認開啟"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={lootRevealOpen} onOpenChange={setLootRevealOpen}>
        <DialogContent className="max-w-sm w-[calc(100%-2rem)] overflow-hidden rounded-3xl border border-violet-500/30 bg-zinc-950/90 p-0 text-center shadow-[0_0_28px_rgba(139,92,246,0.2)] backdrop-blur-xl text-zinc-100">
          <div className="px-5 pb-2 pt-6">
            <span className="inline-flex rounded-full border border-violet-400/40 bg-violet-950/60 px-4 py-1 text-xs font-semibold text-violet-200">
              公會盲盒
            </span>
            <h2 className="mt-4 text-lg font-bold text-white">開獎結果</h2>
            <p className="mt-1 text-xs text-zinc-500">
              獎勵已發放（探險幣／經驗／造型道具等）
            </p>
          </div>
          <div className="px-4 pb-2">
            <GuildLootBoxReveal
              playbackKey={lootPlaybackKey}
              draws={lootDraws}
            />
          </div>
          <div className="border-t border-white/10 bg-black/20 px-5 py-5">
            <button
              type="button"
              onClick={() => setLootRevealOpen(false)}
              className="w-full rounded-full bg-gradient-to-r from-violet-600 to-purple-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition-transform active:scale-95"
            >
              完成
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="max-w-md border-zinc-700 bg-zinc-950 text-zinc-100">
          <DialogHeader>
            <DialogTitle>使用改名卡</DialogTitle>
            <DialogDescription className="text-zinc-500">
              確認後將消耗一張改名卡
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <input
              type="text"
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value.slice(0, 32))}
              placeholder="新暱稱（1〜32 字）"
              maxLength={32}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
            />
            <p className="text-xs text-zinc-500">{renameDraft.length} / 32</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              className="text-zinc-400"
              onClick={() => setRenameDialogOpen(false)}
              disabled={renameSaving}
            >
              取消
            </Button>
            <Button
              type="button"
              disabled={renameSaving || !renameDraft.trim()}
              onClick={async () => {
                setRenameSaving(true);
                try {
                  const r = await consumeRenameCardAction(renameDraft.trim());
                  if (!r.ok) {
                    toast.error(r.error);
                    return;
                  }
                  toast.success(`✅ 暱稱已更新為 ${r.newNickname}`);
                  setRenameDialogOpen(false);
                  setRenameDraft("");
                  setEquipOpen(false);
                  void mutateProfile();
                  const p = await getMyRewardsAction();
                  setRewardsPayload(p);
                  router.refresh();
                } finally {
                  setRenameSaving(false);
                }
              }}
            >
              {renameSaving ? "處理中…" : "確認"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={bagExpandOpen}
        onOpenChange={(open) => {
          setBagExpandOpen(open);
          if (!open) {
            setBagExpandStack(null);
            setBagExpandBusy(false);
          }
        }}
      >
        <AlertDialogContent className="border-zinc-700 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>使用背包擴充包？</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              將消耗一個擴充包並解鎖 4 格背包空間（上限 48 格）。欄位已全開時無法使用，可贈送給其他冒險者。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              variant="outline"
              className="border-zinc-700 bg-zinc-900 text-zinc-200"
              disabled={bagExpandBusy}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 text-white hover:bg-amber-500"
              disabled={bagExpandBusy || !bagExpandStack}
              onClick={async (e) => {
                e.preventDefault();
                if (!bagExpandStack || bagExpandBusy) return;
                const row = firstManageableRewardRow(bagExpandStack);
                if (!row) {
                  toast.error("沒有可用的背包擴充包");
                  setBagExpandOpen(false);
                  setBagExpandStack(null);
                  return;
                }
                setBagExpandBusy(true);
                try {
                  const r = await consumeBagExpansionAction(row.id);
                  if (!r.ok) {
                    toast.error(r.error);
                    return;
                  }
                  toast.success(`✅ 已解鎖，目前開放 ${r.newSlots} 格`);
                  setBagExpandOpen(false);
                  setBagExpandStack(null);
                  void mutateProfile();
                  const p = await getMyRewardsAction();
                  setRewardsPayload(p);
                  router.refresh();
                } finally {
                  setBagExpandBusy(false);
                }
              }}
            >
              {bagExpandBusy ? "處理中…" : "確認使用"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={equipOpen} onOpenChange={setEquipOpen}>
        <SheetContent
          side="right"
          className="z-[70] flex w-[min(100vw,22rem)] flex-col border-l border-zinc-800 bg-[#18181b] px-0 pb-0 pt-[max(1.5rem,env(safe-area-inset-top,0px))] text-zinc-100"
        >
          <SheetHeader className="space-y-1 border-b border-zinc-800/80 px-4 pb-4 pt-0 text-left">
            <SheetTitle className="text-lg text-zinc-100">🎒 裝備背包</SheetTitle>
            <p className="text-xs font-normal text-zinc-400">
              收集道具，強化你的冒險之旅
            </p>
          </SheetHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-6 pt-3">
            {isFull ? (
              <div className="mb-3 rounded-xl border border-orange-500/40 bg-orange-950/35 px-3 py-2 text-center text-xs text-orange-100">
                ⚠️ 背包已滿，購買擴充包可增加 4 格
              </div>
            ) : null}
            {stacks.length > openSlots ? (
              <p className="mb-2 text-center text-[10px] text-orange-300/90">
                尚有道具超過顯示格數，請擴充背包
              </p>
            ) : null}

            {rewardsLoading ? (
              <div className="grid grid-cols-4 gap-2 py-4 [&>*]:min-w-0">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square w-full min-w-0 animate-pulse rounded-xl bg-zinc-800/40"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 [&>*]:min-w-0">
                {Array.from({ length: TOTAL_INVENTORY_SLOTS }, (_, slotIdx) => {
                  if (slotIdx >= lockedStart) {
                    return (
                      <div
                        key={`lock-${slotIdx}`}
                        title="購買擴充包解鎖（即將開放）"
                        className="flex aspect-square w-full min-w-0 cursor-default flex-col items-center justify-center rounded-xl border border-zinc-800/30 bg-zinc-800/40 text-zinc-600 transition-colors hover:bg-zinc-800/55"
                      >
                        <span className="text-lg opacity-70" aria-hidden>
                          🔒
                        </span>
                      </div>
                    );
                  }
                  const stack =
                    slotIdx < displayStacks.length
                      ? displayStacks[slotIdx]
                      : null;
                  if (!stack) {
                    return (
                      <div
                        key={`empty-${slotIdx}`}
                        className="flex aspect-square w-full min-w-0 items-center justify-center rounded-xl border border-dashed border-zinc-700/30 bg-zinc-800/20"
                      />
                    );
                  }
                  const vis = rewardAccent(stack.rewardType);
                  const fxKey =
                    stack.rewardType === "avatar_frame" ||
                    stack.rewardType === "card_frame"
                      ? stack.rows[0]?.effect_key
                      : null;
                  const canLongPressManage = stackSupportsLongPress(stack);
                  const showEquippedBadge =
                    EQUIPPED_BADGE_REWARD_TYPES.has(stack.rewardType) &&
                    stack.rows.some((r) => r.is_equipped);
                  const showListedBadge = stack.rows.some((r) =>
                    listedRewardIdSet.has(r.id),
                  );
                  return (
                    <button
                      key={stack.key}
                      type="button"
                      data-long-press="true"
                      title={stackActionHint(stack) ?? undefined}
                      onContextMenu={(e) => e.preventDefault()}
                      style={{
                        ...inventoryCellBaseStyle,
                        ...(showEquippedBadge ? inventoryCellEquippedStyle : {}),
                        WebkitUserSelect: "none",
                        userSelect: "none",
                        touchAction: "manipulation",
                      }}
                      onPointerDown={(e) => {
                        if (!canLongPressManage || e.button !== 0) return;
                        longPressFiredRef.current = false;
                        clearLongPressTimer();
                        longPressTimerRef.current = setTimeout(() => {
                          longPressTimerRef.current = null;
                          longPressFiredRef.current = true;
                          tryOpenStackMenu(stack);
                        }, INVENTORY_LONGPRESS_MS);
                      }}
                      onPointerUp={clearLongPressTimer}
                      onPointerCancel={clearLongPressTimer}
                      onPointerLeave={clearLongPressTimer}
                      onClick={() => {
                        if (longPressFiredRef.current) {
                          longPressFiredRef.current = false;
                          return;
                        }
                        void handleStackEquip(stack);
                      }}
                      className={cn(
                        "w-full min-w-0 max-w-full box-border transition-colors hover:brightness-110",
                        rewardEffectClassName(fxKey ?? undefined),
                      )}
                    >
                      {showEquippedBadge ? (
                        <div
                          style={{
                            position: "absolute",
                            top: 5,
                            left: 6,
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            background: "#22c55e",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 9,
                            color: "white",
                            fontWeight: 700,
                          }}
                          title="裝備中"
                        >
                          ✓
                        </div>
                      ) : null}
                      {stack.count > 1 ? (
                        <div
                          style={{
                            position: "absolute",
                            top: 5,
                            right: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#f59e0b",
                            background: "rgba(245,158,11,0.15)",
                            borderRadius: 6,
                            padding: "1px 5px",
                            lineHeight: 1.4,
                          }}
                        >
                          {stack.count > 9 ? "9+" : stack.count}
                        </div>
                      ) : null}
                      <div style={inventoryCellIconStyle}>
                        {stack.rows[0]?.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={toThumbImageUrl(stack.rows[0].image_url, 128, 128)}
                            alt=""
                            className="max-h-[36px] w-full object-contain"
                          />
                        ) : fxKey ? (
                          <span
                            className={cn(
                              "h-9 w-9 rounded-full bg-zinc-500/80",
                              stack.rewardType === "card_frame" && "rounded-md",
                            )}
                            aria-hidden
                          />
                        ) : (
                          <span className="leading-none" aria-hidden>
                            {vis.emoji}
                          </span>
                        )}
                      </div>
                      <div style={inventoryCellNameStyle}>{stack.label}</div>
                      {showListedBadge ? (
                        <div
                          className="pointer-events-none absolute bottom-1 left-0 right-0 text-center text-[9px] font-semibold leading-none text-violet-400"
                          title="拍賣市集上架中"
                        >
                          上架中
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-center text-[10px] text-zinc-500">
              長按格位可開啟道具操作（贈送、刪除、回賣依商城設定；須先卸下已裝備者）
            </p>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={stackMenuOpen}
        onOpenChange={(open) => {
          setStackMenuOpen(open);
          if (!open) setStackMenuTarget(null);
        }}
      >
        <DialogContent className="border border-white/[0.08] bg-[#18181b] text-[#f4f4f5] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#f4f4f5]">道具操作</DialogTitle>
            <DialogDescription className="text-[#71717a]">
              {stackMenuTarget?.label ?? ""}
            </DialogDescription>
          </DialogHeader>
          {stackMenuTarget ? (
            <div className="flex flex-col gap-3 pt-2">
              {(() => {
                const sm = stackMenuTarget;
                const act = stackMenuActions(sm, listedRewardIdSet);
                const u = firstManageableUnlistedRow(sm, listedRewardIdSet);
                const maxQ = stackMenuMaxQtyUnlisted(sm, listedRewardIdSet);
                const previewTotal =
                  act.canResell && u
                    ? act.unit * Math.min(stackMenuQty, maxQ)
                    : 0;
                const canOpenLoot =
                  sm.rewardType === "loot_box" &&
                  stackMenuMaxQtyUnlisted(sm, listedRewardIdSet) > 0;
                const canListMarket =
                  u != null &&
                  canListRewardToMarket(u, listedRewardIdSet);
                const hasAnyAction =
                  act.canGift ||
                  act.canDelete ||
                  (act.canResell && u != null) ||
                  canOpenLoot ||
                  canListMarket;
                return (
                  <>
                    {hasAnyAction ? (
                      <label className="flex flex-col gap-1 text-xs text-[#71717a]">
                        <span>數量（未裝備者可操作最多 {maxQ} 件）</span>
                        <input
                          type="number"
                          min={1}
                          max={maxQ}
                          value={stackMenuQty}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!Number.isFinite(v)) {
                              setStackMenuQty(1);
                              return;
                            }
                            setStackMenuQty(
                              Math.min(Math.max(1, v), Math.max(1, maxQ)),
                            );
                          }}
                          className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-100"
                        />
                      </label>
                    ) : (
                      <p className="px-1 text-sm leading-relaxed text-[#a1a1aa]">
                        此道具依商城設定，目前未開放贈送、刪除、回賣或上架市集。可先卸下或點擊格位使用／裝備。
                      </p>
                    )}
                    <div
                      style={{
                        padding: "0 20px 20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 9,
                      }}
                    >
                      {canOpenLoot ? (
                        <button
                          type="button"
                          disabled={lootOpenBusy}
                          onClick={() => void beginOpenLootFromMenu()}
                          style={inventoryActionBtnStyles.giftPlayer}
                        >
                          <InventoryActionBtnContent
                            icon="🎁"
                            label={
                              lootOpenBusy
                                ? "開啟中…"
                                : `開啟盲盒（${Math.min(stackMenuQty, Math.max(1, maxQ))} 個）`
                            }
                          />
                        </button>
                      ) : null}
                      {canOpenLoot &&
                      (act.canGift || act.canDelete || (act.canResell && u)) ? (
                        <InventoryActionDivider />
                      ) : null}
                      {act.canGift ? (
                        <button
                          type="button"
                          style={inventoryActionBtnStyles.giftPlayer}
                          onClick={() => beginGiftToPlayerFromMenu()}
                        >
                          <InventoryActionBtnContent
                            icon="🎁"
                            label="贈送給玩家"
                          />
                        </button>
                      ) : null}
                      {canListMarket ? (
                        <button
                          type="button"
                          style={inventoryActionBtnStyles.market}
                          onClick={() => beginMarketListToMarketFromMenu()}
                        >
                          <InventoryActionBtnContent
                            icon="🏪"
                            label="上架至市集"
                          />
                        </button>
                      ) : null}
                      {act.canGift ? (
                        <button
                          type="button"
                          style={inventoryActionBtnStyles.giftAlliance}
                          onClick={() => void beginGiftFromMenu()}
                        >
                          <InventoryActionBtnContent
                            icon="🤝"
                            label="贈送給血盟夥伴"
                          />
                        </button>
                      ) : null}
                      {act.canGift &&
                      ((act.canResell && u) || act.canDelete) ? (
                        <InventoryActionDivider />
                      ) : null}
                      {act.canResell && u ? (
                        <button
                          type="button"
                          style={inventoryActionBtnStyles.resell}
                          onClick={() => beginResellFromMenu()}
                        >
                          <InventoryActionBtnContent
                            icon="💰"
                            label={`回賣系統（+${previewTotal} ${resellCurrencyLabel(u)}）`}
                          />
                        </button>
                      ) : null}
                      {act.canDelete ? (
                        <button
                          type="button"
                          style={inventoryActionBtnStyles.trash}
                          onClick={() => beginDeleteFromMenu()}
                        >
                          <InventoryActionBtnContent icon="🗑️" label="刪除道具" />
                        </button>
                      ) : null}
                      {act.canGift ||
                      (act.canResell && u) ||
                      act.canDelete ||
                      canListMarket ||
                      canOpenLoot ? (
                        <InventoryActionDivider />
                      ) : null}
                      <button
                        type="button"
                        style={inventoryActionBtnStyles.cancel}
                        onClick={() => setStackMenuOpen(false)}
                      >
                        <InventoryActionBtnContent icon="" label="取消" />
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={giftPlayerDialogOpen}
        onOpenChange={(o) => {
          setGiftPlayerDialogOpen(o);
          if (!o) {
            setGiftPlayerRewardIds([]);
            setGiftPlayerCandidates([]);
            setGiftNicknameDraft("");
            setGiftPlayerRecipientPick(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-hidden border-zinc-700 bg-zinc-950 text-zinc-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">贈送給誰？</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {giftPlayerItemLabel
                ? giftPlayerRewardIds.length > 1
                  ? `將贈送 ${giftPlayerRewardIds.length} 個「${giftPlayerItemLabel}」`
                  : `將贈送「${giftPlayerItemLabel}」`
                : "搜尋冒險者暱稱"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-col gap-3 overflow-hidden pt-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={giftNicknameDraft}
                onChange={(e) =>
                  setGiftNicknameDraft(e.target.value.slice(0, 32))
                }
                placeholder="輸入暱稱（至少 1 字）"
                className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
              <Button
                type="button"
                disabled={
                  giftPlayerSearchBusy ||
                  giftNicknameDraft.trim().length < 1 ||
                  giftPlayerRewardIds.length === 0
                }
                onClick={() => void handleGiftPlayerSearch()}
              >
                {giftPlayerSearchBusy ? "搜尋中…" : "搜尋"}
              </Button>
            </div>
            <div
              className="max-h-52 min-h-0 space-y-2 overflow-y-auto"
              style={{ overscrollBehavior: "contain" }}
            >
              {giftPlayerCandidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-left transition-colors hover:bg-zinc-800/90"
                  onClick={() => setGiftPlayerRecipientPick(c)}
                >
                  {c.avatar_url?.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={toThumbImageUrl(c.avatar_url, 64, 64)}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm text-zinc-400">
                      {(c.nickname || "?")[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-100">
                      {c.nickname}
                    </p>
                    <p className="text-xs text-zinc-500">Lv.{c.level}</p>
                  </div>
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
              onClick={() => setGiftPlayerDialogOpen(false)}
            >
              關閉
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={giftPlayerRecipientPick !== null}
        onOpenChange={(open) => {
          if (!open) setGiftPlayerRecipientPick(null);
        }}
      >
        <AlertDialogContent className="border-zinc-700 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>確定贈送？</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {giftPlayerRecipientPick
                ? giftPlayerRewardIds.length > 1
                  ? `確定要把 ${giftPlayerRewardIds.length} 個「${giftPlayerItemLabel}」送給 ${giftPlayerRecipientPick.nickname} 嗎？送出後無法取回。`
                  : `確定要把「${giftPlayerItemLabel}」送給 ${giftPlayerRecipientPick.nickname} 嗎？送出後無法取回。`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              variant="outline"
              className="border-zinc-700 bg-zinc-900 text-zinc-200"
              disabled={giftPlayerConfirmBusy}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-violet-600 text-white hover:bg-violet-500"
              disabled={
                giftPlayerConfirmBusy || giftPlayerRewardIds.length === 0
              }
              onClick={async (e) => {
                e.preventDefault();
                const pick = giftPlayerRecipientPick;
                const ids = giftPlayerRewardIds;
                if (!pick || ids.length === 0 || giftPlayerConfirmBusy) return;
                setGiftPlayerConfirmBusy(true);
                try {
                  const r = await confirmGiftsToUserBatchAction(ids, pick.id);
                  if (!r.ok) {
                    toast.error(r.error);
                    return;
                  }
                  toast.success("🎁 已成功送出！");
                  setGiftPlayerRecipientPick(null);
                  setGiftPlayerDialogOpen(false);
                  setGiftPlayerRewardIds([]);
                  setGiftPlayerCandidates([]);
                  setGiftNicknameDraft("");
                  const p = await getMyRewardsAction();
                  setRewardsPayload(p);
                  router.refresh();
                } finally {
                  setGiftPlayerConfirmBusy(false);
                }
              }}
            >
              {giftPlayerConfirmBusy ? "送出中…" : "確定送出"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet
        open={giftPickerOpen}
        onOpenChange={(o) => {
          setGiftPickerOpen(o);
          if (!o) setPendingGift(null);
        }}
      >
        <SheetContent
          side="right"
          className="z-[70] flex w-[min(100vw,22rem)] flex-col border-l border-zinc-800 bg-zinc-950 px-0 pb-0 pt-[max(1.5rem,env(safe-area-inset-top,0px))] text-zinc-100"
        >
          <SheetHeader className="space-y-1 border-b border-zinc-800/80 px-4 pb-4 pt-0 text-left">
            <SheetTitle className="text-lg text-zinc-100">贈與對象</SheetTitle>
            <p className="text-xs font-normal text-zinc-400">
              僅限已成立的血盟夥伴；對方將收到相同件數的道具
            </p>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3">
            <div className="space-y-2">
              {giftPartners.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 text-left transition-colors hover:bg-zinc-800/90"
                  onClick={() => {
                    if (!pendingGift) return;
                    setGiftDialog({
                      step: 1,
                      rowIds: pendingGift.rowIds,
                      itemLabel: pendingGift.label,
                      partner: p,
                    });
                    setPendingGift(null);
                    setGiftPickerOpen(false);
                  }}
                >
                  {p.avatar_url?.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={toThumbImageUrl(p.avatar_url, 64, 64)}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm text-zinc-400">
                      {(p.nickname || "?")[0]?.toUpperCase() ?? "?"}
                    </span>
                  )}
                  <span className="min-w-0 truncate text-sm font-medium text-zinc-100">
                    {p.nickname}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={deleteDialog !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteDialog(null);
        }}
      >
        <AlertDialogContent className="border-zinc-700 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteDialog?.step === 1 ? "確定刪除道具？" : "再次確認刪除"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {deleteDialog?.step === 1
                ? `將刪除 ${deleteDialog.rowIds.length} 件「${deleteDialog.label}」。請再次於下一步確認。`
                : `刪除後無法復原。確定刪除 ${deleteDialog?.rowIds.length ?? 0} 件「${deleteDialog?.label ?? ""}」？`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              variant="outline"
              className="border-zinc-700 bg-zinc-900 text-zinc-200"
              disabled={deleteBusy}
            >
              取消
            </AlertDialogCancel>
            {deleteDialog?.step === 1 ? (
              <AlertDialogAction
                className="bg-amber-600 text-white hover:bg-amber-500"
                onClick={(e) => {
                  e.preventDefault();
                  setDeleteDialog((d) => (d ? { ...d, step: 2 } : null));
                }}
              >
                下一步
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-500"
                disabled={deleteBusy}
                onClick={async (e) => {
                  e.preventDefault();
                  if (!deleteDialog || deleteBusy) return;
                  setDeleteBusy(true);
                  try {
                    const r = await deleteUserRewardsBatchAction(
                      deleteDialog.rowIds,
                    );
                    if (!r.ok) {
                      toast.error(r.error);
                      return;
                    }
                    toast.success(
                      deleteDialog.rowIds.length > 1
                        ? `已刪除 ${deleteDialog.rowIds.length} 件道具`
                        : "已刪除道具",
                    );
                    setDeleteDialog(null);
                    const p = await getMyRewardsAction();
                    setRewardsPayload(p);
                    router.refresh();
                  } finally {
                    setDeleteBusy(false);
                  }
                }}
              >
                {deleteBusy ? "刪除中…" : "確定刪除"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={giftDialog !== null}
        onOpenChange={(open) => {
          if (!open) setGiftDialog(null);
        }}
      >
        <AlertDialogContent className="border-zinc-700 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {giftDialog?.step === 1 ? "確定贈送？" : "再次確認贈送"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {giftDialog?.step === 1
                ? `將 ${giftDialog.rowIds.length} 件「${giftDialog.itemLabel}」贈送給 ${giftDialog.partner.nickname}？下一步為最終確認。`
                : `道具將從你的背包移除並轉給 ${giftDialog?.partner.nickname ?? ""}，無法復原。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              variant="outline"
              className="border-zinc-700 bg-zinc-900 text-zinc-200"
              disabled={giftBusy}
            >
              取消
            </AlertDialogCancel>
            {giftDialog?.step === 1 ? (
              <AlertDialogAction
                className="bg-violet-600 text-white hover:bg-violet-500"
                onClick={(e) => {
                  e.preventDefault();
                  setGiftDialog((g) => (g ? { ...g, step: 2 } : null));
                }}
              >
                下一步
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                className="bg-violet-600 text-white hover:bg-violet-500"
                disabled={giftBusy}
                onClick={async (e) => {
                  e.preventDefault();
                  if (!giftDialog || giftBusy) return;
                  setGiftBusy(true);
                  try {
                    const r = await giftUserRewardsToAlliancePartnerBatchAction(
                      giftDialog.rowIds,
                      giftDialog.partner.id,
                    );
                    if (!r.ok) {
                      toast.error(r.error);
                      return;
                    }
                    toast.success(
                      giftDialog.rowIds.length > 1
                        ? `已贈送 ${giftDialog.rowIds.length} 件給 ${giftDialog.partner.nickname}`
                        : `已贈送給 ${giftDialog.partner.nickname}`,
                    );
                    setGiftDialog(null);
                    const p = await getMyRewardsAction();
                    setRewardsPayload(p);
                    router.refresh();
                  } finally {
                    setGiftBusy(false);
                  }
                }}
              >
                {giftBusy ? "贈送中…" : "確定贈送"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={resellDialog !== null}
        onOpenChange={(open) => {
          if (!open) setResellDialog(null);
        }}
      >
        <AlertDialogContent className="border-zinc-700 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {resellDialog?.step === 1 ? "確定回賣給系統？" : "再次確認回賣"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {resellDialog?.step === 1
                ? `將回賣 ${resellDialog.rowIds.length} 件「${resellDialog.label}」，可獲得 ${resellDialog.payout} ${resellDialog.currencyLabel}。`
                : `回賣後道具將自背包移除，${resellDialog?.payout ?? 0} ${resellDialog?.currencyLabel ?? ""} 將入帳。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              variant="outline"
              className="border-zinc-700 bg-zinc-900 text-zinc-200"
              disabled={resellBusy}
            >
              取消
            </AlertDialogCancel>
            {resellDialog?.step === 1 ? (
              <AlertDialogAction
                className="bg-amber-600 text-white hover:bg-amber-500"
                onClick={(e) => {
                  e.preventDefault();
                  setResellDialog((d) => (d ? { ...d, step: 2 } : null));
                }}
              >
                下一步
              </AlertDialogAction>
            ) : (
              <AlertDialogAction
                className="bg-amber-600 text-white hover:bg-amber-500"
                disabled={resellBusy}
                onClick={async (e) => {
                  e.preventDefault();
                  if (!resellDialog || resellBusy) return;
                  setResellBusy(true);
                  try {
                    const r = await resellUserRewardsBatchAction(
                      resellDialog.rowIds,
                    );
                    if (!r.ok) {
                      toast.error(r.error);
                      return;
                    }
                    toast.success(
                      `已回賣，獲得 ${r.totalCredited} ${r.currencyLabel}`,
                    );
                    setResellDialog(null);
                    const p = await getMyRewardsAction();
                    setRewardsPayload(p);
                    router.refresh();
                  } finally {
                    setResellBusy(false);
                  }
                }}
              >
                {resellBusy ? "處理中…" : "確定回賣"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={broadcastManageOpen} onOpenChange={setBroadcastManageOpen}>
        <SheetContent
          side="right"
          className="z-[70] flex w-[min(100vw,24rem)] flex-col border-l border-zinc-800 bg-zinc-950 px-0 pb-0 pt-[max(1.5rem,env(safe-area-inset-top,0px))] text-zinc-100"
        >
          <SheetHeader className="space-y-2 border-b border-zinc-800/80 px-4 pb-4 pt-0 text-left">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 shrink-0 gap-0.5 px-2 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                onClick={() => setBroadcastManageOpen(false)}
                aria-label="返回"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm font-medium">返回</span>
              </Button>
            </div>
            <div className="space-y-1 pl-0.5">
              <SheetTitle className="text-lg text-zinc-100">📢 廣播管理</SheetTitle>
              <p className="text-xs font-normal text-zinc-400">
                管理目前正在顯示中的廣播
              </p>
            </div>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {activeBroadcasts.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-4 text-center text-sm text-zinc-400">
                目前無進行中的廣播
              </div>
            ) : (
              <div className="space-y-2">
                {activeBroadcasts.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs text-amber-200">
                          發送者：{item.nickname}
                        </p>
                        <p className="text-sm text-zinc-100 break-words">
                          {item.message}
                        </p>
                        <p className="text-[11px] text-zinc-500">
                          {formatBroadcastRemaining(item.expiresAt)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setExpireTarget(item)}
                        className="shrink-0"
                      >
                        下架
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(expireTarget)} onOpenChange={(open) => {
        if (!open) setExpireTarget(null);
      }}>
        <AlertDialogContent className="border-zinc-700 bg-zinc-950 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>確定下架這則廣播？</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              下架後將立即從廣播橫幅移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              variant="outline"
              className="border-zinc-700 bg-zinc-900 text-zinc-200"
              disabled={expiring}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-500"
              disabled={expiring}
              onClick={async () => {
                if (!expireTarget || expiring) return;
                setExpiring(true);
                try {
                  const result = await expireBroadcastAction(expireTarget.id);
                  if (!result.ok) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success("已下架廣播");
                  setExpireTarget(null);
                  await mutateActiveBroadcasts();
                  router.refresh();
                } finally {
                  setExpiring(false);
                }
              }}
            >
              {expiring ? "下架中…" : "確定下架"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MarketSheet
        open={marketSheetOpen}
        onOpenChange={(open) => {
          setMarketSheetOpen(open);
          if (!open) {
            const ts = Date.now();
            setLastMarketSheetClosedAt(ts);
            try {
              sessionStorage.setItem("ft_market_sheet_closed_at", String(ts));
            } catch {
              /* ignore */
            }
          }
        }}
      />

      <Dialog
        open={marketListOpen}
        onOpenChange={(o) => {
          setMarketListOpen(o);
          if (!o) {
            setMarketListRewardId(null);
            setMarketListLabel("");
            setMarketListImageUrl(null);
            setMarketListPriceStr("");
          }
        }}
      >
        <DialogContent className="border border-zinc-700 bg-zinc-950 text-zinc-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>上架至市集</DialogTitle>
            <DialogDescription className="text-zinc-400">
              設定價格與幣種；上架後其他玩家可於市集購買。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-zinc-800/60">
                {marketListImageUrl?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={toThumbImageUrl(marketListImageUrl, 128, 128)}
                    alt=""
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-2xl" aria-hidden>
                    📦
                  </span>
                )}
              </div>
              <p className="min-w-0 flex-1 text-sm font-semibold text-zinc-100">
                {marketListLabel}
              </p>
            </div>
            <div>
              <p className="mb-1.5 text-xs text-zinc-500">幣種</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMarketListCurrency("free_coins")}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    marketListCurrency === "free_coins"
                      ? "border-amber-500/50 bg-amber-500/15 text-amber-100"
                      : "border-zinc-700 bg-zinc-900 text-zinc-400",
                  )}
                >
                  探險幣
                </button>
                <button
                  type="button"
                  onClick={() => setMarketListCurrency("premium_coins")}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    marketListCurrency === "premium_coins"
                      ? "border-violet-500/45 bg-violet-500/15 text-violet-100"
                      : "border-zinc-700 bg-zinc-900 text-zinc-400",
                  )}
                >
                  純金
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">價格</label>
              <input
                type="text"
                inputMode="numeric"
                value={marketListPriceStr}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, "");
                  setMarketListPriceStr(d);
                }}
                placeholder="正整數"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
              />
            </div>
            <p className="text-xs text-zinc-500">
              賣家實收：
              <span className="font-semibold text-zinc-300">
                {(() => {
                  const n = parseInt(marketListPriceStr, 10);
                  return Number.isFinite(n) && n >= 1 ? n : "—";
                })()}
              </span>
              幣（目前手續費 0%）
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                className="text-zinc-400"
                onClick={() => setMarketListOpen(false)}
              >
                取消
              </Button>
              <Button
                type="button"
                disabled={
                  marketListBusy ||
                  !marketListRewardId ||
                  !/^[1-9]\d*$/.test(marketListPriceStr.trim())
                }
                onClick={async () => {
                  if (!marketListRewardId || marketListBusy) return;
                  const price = parseInt(marketListPriceStr.trim(), 10);
                  if (!Number.isFinite(price) || price < 1) {
                    toast.error("請輸入至少 1 的正整數價格");
                    return;
                  }
                  setMarketListBusy(true);
                  try {
                    const r = await createListingAction({
                      rewardId: marketListRewardId,
                      price,
                      currencyType: marketListCurrency,
                    });
                    if (!r.ok) {
                      toast.error(
                        r.error === "market_disabled"
                          ? "拍賣場目前已關閉"
                          : (r.error ?? "上架失敗"),
                      );
                      return;
                    }
                    toast.success("已上架至自由市場");
                    setMarketListOpen(false);
                    setMarketListRewardId(null);
                    setMarketListLabel("");
                    setMarketListImageUrl(null);
                    setMarketListPriceStr("");
                    await swrMutate(SWR_KEYS.myMarketListings);
                    const p = await getMyRewardsAction();
                    setRewardsPayload(p);
                    router.refresh();
                  } finally {
                    setMarketListBusy(false);
                  }
                }}
              >
                {marketListBusy ? "上架中…" : "確認上架"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

    </>
  );
}

export function FloatingToolbarProvider({
  children,
  messageMaxLength = 50,
}: {
  children: ReactNode;
  messageMaxLength?: number;
}) {
  const openEquipRef = useRef<(() => void) | null>(null);
  const openEquipmentSheet = useCallback(() => {
    openEquipRef.current?.();
  }, []);

  return (
    <FloatingToolbarOpenContext.Provider value={openEquipmentSheet}>
      {children}
      <FloatingToolbarInner
        messageMaxLength={messageMaxLength}
        openEquipRef={openEquipRef}
      />
    </FloatingToolbarOpenContext.Provider>
  );
}
