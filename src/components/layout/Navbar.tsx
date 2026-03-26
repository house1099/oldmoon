"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, Home, ShoppingBag, Swords } from "lucide-react";
import useSWR from "swr";

import { cn } from "@/lib/utils";
import { useGuildTabContext } from "@/contexts/guild-tab-context";
import {
  useUnreadChatCount,
  useUnreadNotificationCount,
} from "@/hooks/useChat";
import { SWR_KEYS } from "@/lib/swr/keys";
import { getPendingRequestsAction } from "@/services/alliance.action";

const navItems = [
  { label: "首頁", href: "/", icon: Home },
  { label: "探索", href: "/explore", icon: Compass },
  { label: "冒險團", href: "/guild", icon: Swords },
  { label: "月老", href: "/matchmaking", icon: Heart },
  { label: "商店", href: "/shop", icon: ShoppingBag },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const guildCtx = useGuildTabContext();
  const { count: unreadNotifCount } = useUnreadNotificationCount();
  const { count: unreadChatConvCount } = useUnreadChatCount();
  const { data: pendingAllianceData } = useSWR(
    SWR_KEYS.pendingAlliances,
    () => getPendingRequestsAction(),
    { revalidateOnFocus: false },
  );
  const pendingAllianceCount = pendingAllianceData?.length ?? 0;

  const onGuild = pathname === "/guild";
  const sub = guildCtx?.guildSubTab;

  /** 在對應子分頁時不重複提示同類未讀 */
  const effectiveNotifForNav =
    onGuild && sub === "信件" ? 0 : unreadNotifCount;
  const effectiveChatForNav =
    onGuild && sub === "聊天" ? 0 : unreadChatConvCount;
  const totalUnreadNotifPlusChat =
    effectiveNotifForNav + effectiveChatForNav;

  const hasPendingAllianceForNav =
    pendingAllianceCount > 0 && !(onGuild && sub === "血盟");

  const showGuildNavDot =
    totalUnreadNotifPlusChat > 0 || hasPendingAllianceForNav;

  return (
    <nav
      aria-label="公會導航"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-zinc-950/90 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          const isGuild = href === "/guild";
          const showDot = isGuild && showGuildNavDot;

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className="relative flex flex-1 flex-col items-center justify-center py-2 transition-colors"
            >
              <span
                className={cn(
                  "relative inline-flex",
                  showDot && "drop-shadow-[0_0_10px_rgba(244,63,94,0.65)]",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-colors",
                    isActive ? "text-violet-400" : "text-zinc-500",
                  )}
                  strokeWidth={isActive ? 2.25 : 1.75}
                  aria-hidden
                />
                {showDot ? (
                  <span
                    className="absolute -right-1 -top-0.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-zinc-950"
                    aria-hidden
                  />
                ) : null}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[10px] font-medium transition-colors",
                  isActive ? "text-violet-400" : "text-zinc-500",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
