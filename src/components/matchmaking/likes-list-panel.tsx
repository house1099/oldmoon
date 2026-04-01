"use client";

import useSWR from "swr";
import { MasterAvatarShell } from "@/components/ui/MasterAvatarShell";
import { cn } from "@/lib/utils";
import {
  getMyLikesListsAction,
  type LikePeerListItem,
} from "@/services/social.action";

const likesKey = "matchmaking-likes-lists";

export function LikesListPanel() {
  const { data, isLoading } = useSWR(
    likesKey,
    async () => {
      const r = await getMyLikesListsAction();
      return r;
    },
    { revalidateOnFocus: true },
  );

  if (isLoading || !data) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">載入緣分列表…</p>
    );
  }

  if (!data.ok) {
    return (
      <p className="py-12 text-center text-sm text-rose-400">{data.error}</p>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      <LikesSubList title="我送出的緣分" empty="尚未對任何人送出緣分" items={data.sent} />
      <LikesSubList
        title="我收到的緣分"
        empty="尚無人對你送出緣分"
        items={data.received}
      />
    </div>
  );
}

function LikesSubList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: LikePeerListItem[];
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-zinc-300">{title}</h3>
      {items.length === 0 ? (
        <p className="rounded-xl border border-white/5 bg-zinc-900/30 px-4 py-8 text-center text-xs text-zinc-500">
          {empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((u) => (
            <li
              key={u.peerId}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900/40 px-3 py-2.5",
              )}
            >
              <MasterAvatarShell
                src={u.avatar_url}
                nickname={u.nickname}
                size={44}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{u.nickname}</p>
                <p className="text-xs text-zinc-500">Lv.{u.level}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
