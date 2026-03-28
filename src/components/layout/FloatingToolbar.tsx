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
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getMyRewardsAction,
  equipRewardAction,
  unequipRewardAction,
  type MyRewardsPayload,
} from "@/services/rewards.action";
import type { UserRewardWithEffect } from "@/lib/repositories/server/rewards.repository";
import { rewardEffectClassName } from "@/lib/utils/reward-effects";

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

function FloatingToolbarInner({
  messageMaxLength,
  openEquipRef,
}: {
  messageMaxLength: number;
  openEquipRef: React.MutableRefObject<(() => void) | null>;
}) {
  const router = useRouter();
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
      toast.info("廣播券請於首頁「系統資訊」使用");
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

      <Sheet open={equipOpen} onOpenChange={setEquipOpen}>
        <SheetContent
          side="right"
          className="z-[70] flex w-[min(100vw,22rem)] flex-col border-l border-zinc-800 bg-zinc-950 p-0 text-zinc-100"
        >
          <SheetHeader className="space-y-1 border-b border-zinc-800/80 px-4 py-4 text-left">
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
                  const fxKey =
                    stack.rewardType === "avatar_frame" ||
                    stack.rewardType === "card_frame"
                      ? stack.rows[0]?.effect_key
                      : null;
                  return (
                    <button
                      key={stack.key}
                      type="button"
                      onClick={() => void handleStackEquip(stack)}
                      className={cn(
                        "relative flex h-16 flex-col items-center justify-center gap-0.5 rounded-xl border px-0.5 py-1 text-center transition-colors hover:brightness-110",
                        vis.border,
                        vis.bg,
                        rewardEffectClassName(fxKey ?? undefined),
                      )}
                    >
                      <span className="text-base leading-none" aria-hidden>
                        {vis.emoji}
                      </span>
                      <span className="line-clamp-2 w-full text-[9px] leading-tight text-zinc-200">
                        {stack.label}
                      </span>
                      {stack.count > 1 ? (
                        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-zinc-950/90 px-1 text-[10px] font-bold text-violet-200 ring-1 ring-violet-500/40">
                          {stack.count > 9 ? "9+" : stack.count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

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
