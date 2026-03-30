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
  Check,
  Mail,
  Sparkles,
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
import useSWR from "swr";
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
  deleteUserRewardsBatchAction,
  giftUserRewardsToAlliancePartnerBatchAction,
  resellUserRewardsBatchAction,
  type ActiveBroadcastDto,
  type MyRewardsPayload,
} from "@/services/rewards.action";
import {
  giftItemToUserAction,
  confirmGiftAction,
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

/** 無商城來源時：維持原可長按之裝飾類道具 */
const LEGACY_LONGPRESS_REWARD_TYPES = new Set([
  "avatar_frame",
  "card_frame",
  "title",
]);

const EQUIPPED_BADGE_REWARD_TYPES = new Set([
  "avatar_frame",
  "card_frame",
  "title",
]);

const INVENTORY_LONGPRESS_MS = 500;

function firstUnequippedRow(stack: RewardStack): UserRewardWithEffect | null {
  return stack.rows.find((r) => !r.is_equipped) ?? null;
}

function stackSupportsLongPress(stack: RewardStack): boolean {
  if (!firstUnequippedRow(stack)) return false;
  const sample = firstUnequippedRow(stack)!;
  if (sample.shop_item_id) {
    const canGift = sample.shop_allow_gift !== false;
    const canDelete = sample.shop_allow_delete !== false;
    const unit =
      sample.shop_resell_price != null
        ? Number(sample.shop_resell_price)
        : NaN;
    const canResell =
      sample.shop_allow_resell === true &&
      Number.isFinite(unit) &&
      unit >= 0;
    return canGift || canDelete || canResell;
  }
  return LEGACY_LONGPRESS_REWARD_TYPES.has(stack.rewardType);
}

function stackMenuMaxQty(stack: RewardStack): number {
  return stack.rows.filter((r) => !r.is_equipped).length;
}

function pickUnequippedRowIds(stack: RewardStack, n: number): string[] {
  const rows = stack.rows.filter((r) => !r.is_equipped);
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
  if (
    rt === "broadcast" ||
    rt === "rename_card" ||
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
  const [broadcastManageOpen, setBroadcastManageOpen] = useState(false);
  const [expireTarget, setExpireTarget] = useState<ActiveBroadcastDto | null>(null);
  const [expiring, setExpiring] = useState(false);

  const [stackMenuOpen, setStackMenuOpen] = useState(false);
  const [stackMenuTarget, setStackMenuTarget] = useState<RewardStack | null>(null);
  const [stackMenuQty, setStackMenuQty] = useState(1);
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
  const [giftPlayerRewardId, setGiftPlayerRewardId] = useState<string | null>(
    null,
  );
  const [giftPlayerItemLabel, setGiftPlayerItemLabel] = useState("");
  const [giftNicknameDraft, setGiftNicknameDraft] = useState("");
  const [giftPlayerCandidates, setGiftPlayerCandidates] = useState<
    GiftRecipientSearchRow[]
  >([]);
  const [giftPlayerSearchBusy, setGiftPlayerSearchBusy] = useState(false);
  const [giftPlayerRecipientPick, setGiftPlayerRecipientPick] =
    useState<GiftRecipientSearchRow | null>(null);
  const [giftPlayerConfirmBusy, setGiftPlayerConfirmBusy] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  const { data: activeBroadcasts = [], mutate: mutateActiveBroadcasts } = useSWR(
    profile?.role === "master" ? "floating-toolbar-active-broadcasts" : null,
    () => getActiveBroadcastsAction(),
    { revalidateOnFocus: true },
  );

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

    if (rt === "rename_card") {
      setRenameDraft("");
      setRenameDialogOpen(true);
      return;
    }

    if (rt === "fishing_bait" || rt === "fishing_rod") {
      toast.info("請前往釣魚頁面使用（釣魚系統尚未開放）");
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
      } else {
        toast.message("此道具未開放這些操作");
      }
      return;
    }
    setStackMenuQty(1);
    setStackMenuTarget(stack);
    setStackMenuOpen(true);
  }

  function stackMenuActions(stack: RewardStack) {
    const sample = firstUnequippedRow(stack);
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
    const rowIds = pickUnequippedRowIds(stackMenuTarget, stackMenuQty);
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
    const rowIds = pickUnequippedRowIds(stackMenuTarget, 1);
    if (rowIds.length === 0) {
      toast.error("沒有可贈送的道具");
      return;
    }
    if (stackMenuQty > 1) {
      toast.message("贈送給其他玩家每次僅能送出 1 件");
    }
    setGiftPlayerRewardId(rowIds[0]!);
    setGiftPlayerItemLabel(stackMenuTarget.label);
    setGiftNicknameDraft("");
    setGiftPlayerCandidates([]);
    setGiftPlayerRecipientPick(null);
    setGiftPlayerDialogOpen(true);
  }

  async function handleGiftPlayerSearch() {
    if (!giftPlayerRewardId) return;
    const q = giftNicknameDraft.trim();
    if (q.length < 1) {
      toast.error("請至少輸入 1 個字再搜尋");
      return;
    }
    setGiftPlayerSearchBusy(true);
    try {
      const r = await giftItemToUserAction({
        rewardId: giftPlayerRewardId,
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
    const rowIds = pickUnequippedRowIds(stackMenuTarget, stackMenuQty);
    if (rowIds.length === 0) {
      toast.error("沒有可刪除的數量");
      return;
    }
    setDeleteDialog({ step: 1, rowIds, label: stackMenuTarget.label });
  }

  function beginResellFromMenu() {
    setStackMenuOpen(false);
    if (!stackMenuTarget) return;
    const sample = firstUnequippedRow(stackMenuTarget);
    if (!sample) return;
    const rowIds = pickUnequippedRowIds(stackMenuTarget, stackMenuQty);
    if (rowIds.length === 0) {
      toast.error("沒有可回賣的數量");
      return;
    }
    const { canResell, unit } = stackMenuActions(stackMenuTarget);
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
            className="flex flex-col gap-3 pb-1"
            role="toolbar"
            aria-label="快捷功能"
          >
            {subButtons.map((btn) => (
              <div
                key={btn.id}
                className="ft-toolbar-pop flex flex-row items-center gap-2.5"
                style={
                  { "--ft-delay": `${btn.delayMs}ms` } as CSSProperties & {
                    "--ft-delay"?: string;
                  }
                }
              >
                <span className="whitespace-nowrap rounded-full border border-zinc-700/50 bg-zinc-900/90 px-3 py-1 text-xs text-zinc-200 shadow-sm backdrop-blur-sm">
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
              訊息將顯示於畫面頂部約 24 小時（1〜30 字）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={broadcastDraft}
              onChange={(e) => setBroadcastDraft(e.target.value.slice(0, 30))}
              placeholder="輸入廣播內容…"
              rows={3}
              className="min-h-[5rem] border-zinc-700 bg-zinc-900/80 text-zinc-100"
            />
            <div className="flex justify-end text-xs text-zinc-500">
              {broadcastDraft.trim().length}/30
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
                broadcastDraft.trim().length > 30
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

      <Sheet open={equipOpen} onOpenChange={setEquipOpen}>
        <SheetContent
          side="right"
          className="z-[70] flex w-[min(100vw,22rem)] flex-col border-l border-zinc-800 bg-zinc-950 px-0 pb-0 pt-[max(1.5rem,env(safe-area-inset-top,0px))] text-zinc-100"
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
              <div className="grid grid-cols-4 gap-2 py-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-xl bg-zinc-800/40"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: TOTAL_INVENTORY_SLOTS }, (_, slotIdx) => {
                  if (slotIdx >= lockedStart) {
                    return (
                      <div
                        key={`lock-${slotIdx}`}
                        title="購買擴充包解鎖（即將開放）"
                        className="flex h-16 cursor-default flex-col items-center justify-center rounded-xl border border-zinc-800/30 bg-zinc-800/40 text-zinc-600 transition-colors hover:bg-zinc-800/55"
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
                        className="flex h-16 items-center justify-center rounded-xl border border-dashed border-zinc-700/30 bg-zinc-800/20"
                      />
                    );
                  }
                  const vis = rewardAccent(stack.rewardType);
                  const actionHint = stackActionHint(stack);
                  const fxKey =
                    stack.rewardType === "avatar_frame" ||
                    stack.rewardType === "card_frame"
                      ? stack.rows[0]?.effect_key
                      : null;
                  const canLongPressManage = stackSupportsLongPress(stack);
                  const showEquippedBadge =
                    EQUIPPED_BADGE_REWARD_TYPES.has(stack.rewardType) &&
                    stack.rows.some((r) => r.is_equipped);
                  return (
                    <button
                      key={stack.key}
                      type="button"
                      data-long-press="true"
                      onContextMenu={(e) => e.preventDefault()}
                      style={{
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
                        "relative flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-xl border px-0.5 py-1 text-center transition-colors hover:brightness-110",
                        vis.border,
                        vis.bg,
                        rewardEffectClassName(fxKey ?? undefined),
                      )}
                    >
                      {stack.rows[0]?.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={toThumbImageUrl(stack.rows[0].image_url, 128, 128)}
                          alt=""
                          className="h-8 w-8 object-contain"
                        />
                      ) : fxKey ? (
                        <span
                          className={cn(
                            "h-7 w-7 rounded-full bg-zinc-500/80",
                            stack.rewardType === "card_frame" && "rounded-md",
                          )}
                          aria-hidden
                        />
                      ) : (
                        <span className="text-base leading-none" aria-hidden>
                          {vis.emoji}
                        </span>
                      )}
                      <span className="line-clamp-2 max-h-[1.5rem] w-full text-[9px] leading-tight text-zinc-200">
                        {stack.label}
                      </span>
                      {actionHint ? (
                        <span className="line-clamp-1 w-full text-[8px] leading-none text-zinc-400">
                          {actionHint}
                        </span>
                      ) : null}
                      {stack.count > 1 ? (
                        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-950/90 px-1 text-[10px] font-bold text-violet-200 ring-1 ring-violet-500/40">
                          {stack.count > 9 ? "9+" : stack.count}
                        </span>
                      ) : null}
                      {showEquippedBadge ? (
                        <span
                          className="absolute bottom-0.5 left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600/95 text-white shadow-sm ring-1 ring-zinc-950"
                          title="裝備中"
                        >
                          <Check className="h-2.5 w-2.5" strokeWidth={3} aria-hidden />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-center text-[10px] text-zinc-500">
              支援的道具：長按格位可贈送玩家或血盟、刪除或回賣（依商城設定；須先卸下已裝備者）
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
        <DialogContent className="border-zinc-700 bg-zinc-950 text-zinc-100 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">道具操作</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {stackMenuTarget?.label ?? ""}
            </DialogDescription>
          </DialogHeader>
          {stackMenuTarget ? (
            <div className="flex flex-col gap-3 pt-2">
              {(() => {
                const sm = stackMenuTarget;
                const act = stackMenuActions(sm);
                const u = firstUnequippedRow(sm);
                const maxQ = stackMenuMaxQty(sm);
                const previewTotal =
                  act.canResell && u
                    ? act.unit * Math.min(stackMenuQty, maxQ)
                    : 0;
                return (
                  <>
              <label className="flex flex-col gap-1 text-xs text-zinc-400">
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
                    setStackMenuQty(Math.min(Math.max(1, v), Math.max(1, maxQ)));
                  }}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              <div className="flex flex-col gap-2">
                {act.canGift ? (
                  <Button
                    type="button"
                    className="w-full bg-violet-600 hover:bg-violet-500"
                    onClick={() => beginGiftToPlayerFromMenu()}
                  >
                    🎁 贈送給玩家
                  </Button>
                ) : null}
                {act.canGift ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full border border-violet-500/40 bg-violet-950/40 text-violet-100 hover:bg-violet-900/50"
                    onClick={() => void beginGiftFromMenu()}
                  >
                    贈送給血盟夥伴
                  </Button>
                ) : null}
                {act.canDelete ? (
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full"
                    onClick={() => beginDeleteFromMenu()}
                  >
                    刪除道具
                  </Button>
                ) : null}
                {act.canResell && u ? (
                  <Button
                    type="button"
                    className="w-full border border-amber-500/50 bg-amber-950/50 text-amber-100 hover:bg-amber-900/50"
                    onClick={() => beginResellFromMenu()}
                  >
                    回賣系統（+{previewTotal} {resellCurrencyLabel(u)}）
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="border-zinc-600 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                  onClick={() => setStackMenuOpen(false)}
                >
                  取消
                </Button>
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
            setGiftPlayerRewardId(null);
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
                ? `將贈送「${giftPlayerItemLabel}」`
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
                  !giftPlayerRewardId
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
                ? `確定要把「${giftPlayerItemLabel}」送給 ${giftPlayerRecipientPick.nickname} 嗎？送出後無法取回。`
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
              disabled={giftPlayerConfirmBusy || !giftPlayerRewardId}
              onClick={async (e) => {
                e.preventDefault();
                const pick = giftPlayerRecipientPick;
                const rid = giftPlayerRewardId;
                if (!pick || !rid || giftPlayerConfirmBusy) return;
                setGiftPlayerConfirmBusy(true);
                try {
                  const r = await confirmGiftAction(rid, pick.id);
                  if (!r.ok) {
                    toast.error(r.error);
                    return;
                  }
                  toast.success("🎁 已成功送出！");
                  setGiftPlayerRecipientPick(null);
                  setGiftPlayerDialogOpen(false);
                  setGiftPlayerRewardId(null);
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
          <SheetHeader className="space-y-1 border-b border-zinc-800/80 px-4 pb-4 pt-0 text-left">
            <SheetTitle className="text-lg text-zinc-100">📢 廣播管理</SheetTitle>
            <p className="text-xs font-normal text-zinc-400">
              管理目前正在顯示中的廣播
            </p>
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
