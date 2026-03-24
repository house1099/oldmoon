"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, Home, ShoppingBag, Swords } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { label: "首頁", href: "/", icon: Home },
  { label: "探索", href: "/explore", icon: Compass },
  { label: "冒險團", href: "/guild", icon: Swords },
  { label: "月老", href: "/matchmaking", icon: Heart },
  { label: "商店", href: "/shop", icon: ShoppingBag },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="公會導航"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-zinc-950/90 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-center py-2 transition-colors"
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  isActive ? "text-violet-400" : "text-zinc-500",
                )}
                strokeWidth={isActive ? 2.25 : 1.75}
                aria-hidden
              />
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
