"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";

import { UserDetailModal } from "@/components/modals/UserDetailModal";
import { Button } from "@/components/ui/button";
import { MasterAvatarShell } from "@/components/ui/MasterAvatarShell";
import { SWR_KEYS } from "@/lib/swr/keys";
import { cn } from "@/lib/utils";
import { INTEREST_TAG_OPTIONS } from "@/lib/constants/adventurer-questionnaire";
import {
  getFishingLogsAction,
  type FishingLogListItemDto,
} from "@/services/fishing.action";
import {
  getMemberProfileByIdAction,
  type MemberProfileView,
} from "@/services/profile.action";

export interface CatchPanelProps {
  subTab: "matchmaker" | "items";
  onSubTabChange: (tab: "matchmaker" | "items") => void;
}

function SubTabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-1.5 text-xs transition-colors",
        active
          ? "border-violet-500/60 bg-violet-900/60 text-violet-300"
          : "border-zinc-800/40 bg-zinc-900/40 text-zinc-500",
      )}
    >
      {children}
    </button>
  );
}

function formatTaipeiMd(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function formatTaipeiDateTime(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function tagLabel(slug: string): string {
  return INTEREST_TAG_OPTIONS.find((o) => o.value === slug)?.label ?? slug;
}

function fishEmoji(t: FishingLogListItemDto["fish_type"]): string {
  switch (t) {
    case "common":
      return "🐟";
    case "rare":
      return "🐠";
    case "legendary":
      return "🐡";
    case "matchmaker":
      return "❤️";
    default:
      return "🐟";
  }
}

function rarityBadge(t: FishingLogListItemDto["fish_type"]) {
  switch (t) {
    case "common":
      return (
        <span className="rounded bg-zinc-700/80 px-1.5 py-0.5 text-[10px] text-zinc-300">
          普通
        </span>
      );
    case "rare":
      return (
        <span className="rounded bg-cyan-950/60 px-1.5 py-0.5 text-[10px] text-cyan-300">
          稀有
        </span>
      );
    case "legendary":
      return (
        <span className="rounded bg-violet-950/60 px-1.5 py-0.5 text-[10px] text-violet-300">
          傳說
        </span>
      );
    default:
      return null;
  }
}

export function CatchPanel({ subTab, onSubTabChange }: CatchPanelProps) {
  const { data, isLoading } = useSWR(
    SWR_KEYS.fishingLogs,
    getFishingLogsAction,
    { revalidateOnMount: true },
  );

  const [detailUser, setDetailUser] = useState<MemberProfileView | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  const openDetail = useCallback(async (userId: string) => {
    setDetailLoadingId(userId);
    try {
      const p = await getMemberProfileByIdAction(userId);
      if (p) setDetailUser(p);
    } finally {
      setDetailLoadingId(null);
    }
  }, []);

  if (isLoading || !data) {
    return (
      <div className="px-4 py-12 text-center text-sm text-zinc-500">
        載入魚獲紀錄…
      </div>
    );
  }

  if (!data.ok) {
    return (
      <div className="px-4 py-12 text-center text-sm text-rose-400">
        {data.error}
      </div>
    );
  }

  const logs = data.logs;
  const matchmakerLogs = logs.filter((l) => l.fish_type === "matchmaker");
  const itemLogs = logs.filter((l) => l.fish_type !== "matchmaker");

  return (
    <>
      <div className="mb-3 flex gap-2 px-4 pt-4">
        <SubTabBtn
          active={subTab === "matchmaker"}
          onClick={() => onSubTabChange("matchmaker")}
        >
          ❤️ 月老魚
        </SubTabBtn>
        <SubTabBtn
          active={subTab === "items"}
          onClick={() => onSubTabChange("items")}
        >
          🎁 釣獲物
        </SubTabBtn>
      </div>

      <div className="space-y-2 px-4 pb-8">
        {subTab === "matchmaker" ? (
          matchmakerLogs.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              還沒有釣到月老魚，繼續努力！
            </p>
          ) : (
            matchmakerLogs.map((l) => (
              <div
                key={l.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-800/40 bg-zinc-900/40 px-3 py-2.5"
              >
                {l.fish_user_id && l.peer_nickname ? (
                  <MasterAvatarShell
                    src={l.peer_avatar_url}
                    nickname={l.peer_nickname}
                    size={40}
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-lg">
                    💔
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  {l.fish_user_id && l.peer_nickname ? (
                    <>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-medium text-white">
                          {l.peer_nickname}
                        </span>
                        {l.mutual_like ? (
                          <span className="shrink-0 rounded-full border border-violet-500/50 bg-violet-950/50 px-1.5 text-[10px] text-violet-300">
                            互有緣分
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {l.peer_region ?? "—"} ·{" "}
                        {formatTaipeiMd(l.created_at)}
                      </p>
                      {(l.peer_interests ?? []).length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {l.peer_interests!.slice(0, 3).map((slug) => (
                            <span
                              key={slug}
                              className="rounded-full border border-violet-500/30 bg-violet-950/40 px-1.5 text-[10px] text-violet-300"
                            >
                              {tagLabel(slug)}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-zinc-500">
                        緣分不夠，未釣到
                      </p>
                      <p className="text-xs text-zinc-600">
                        {formatTaipeiMd(l.created_at)}
                      </p>
                    </>
                  )}
                </div>
                {l.fish_user_id ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-zinc-700 text-xs text-zinc-200"
                    disabled={detailLoadingId === l.fish_user_id}
                    onClick={() => void openDetail(l.fish_user_id!)}
                  >
                    {detailLoadingId === l.fish_user_id ? "…" : "查看"}
                  </Button>
                ) : (
                  <span className="w-12 shrink-0" aria-hidden />
                )}
              </div>
            ))
          )
        ) : itemLogs.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500">
            還沒有釣獲任何東西
          </p>
        ) : (
          itemLogs.map((l) => {
            const itemName =
              l.fish_item &&
              typeof l.fish_item === "object" &&
              l.fish_item !== null &&
              "name" in l.fish_item
                ? String((l.fish_item as { name?: string }).name ?? "")
                : "";
            return (
              <div
                key={l.id}
                className="flex items-center gap-3 rounded-xl border border-zinc-800/40 bg-zinc-900/40 px-3 py-2.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900/60 text-xl">
                  {fishEmoji(l.fish_type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-white">
                      {l.fish_type === "matchmaker"
                        ? "月老魚"
                        : `釣獲 · ${l.fish_type}`}
                    </span>
                    {rarityBadge(l.fish_type)}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {l.fish_coins != null && l.fish_coins > 0
                      ? `免費幣×${l.fish_coins}`
                      : null}
                    {l.fish_coins != null &&
                    l.fish_coins > 0 &&
                    l.fish_exp != null &&
                    l.fish_exp > 0
                      ? " · "
                      : ""}
                    {l.fish_exp != null && l.fish_exp > 0
                      ? `+${l.fish_exp} EXP`
                      : null}
                    {itemName ? ` · 道具：${itemName}` : ""}
                  </p>
                  <p className="text-[11px] text-zinc-600">
                    {formatTaipeiDateTime(l.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {detailUser ? (
        <UserDetailModal
          user={detailUser}
          open
          onOpenChange={(open) => {
            if (!open) setDetailUser(null);
          }}
        />
      ) : null}
    </>
  );
}
