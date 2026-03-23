"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Store, Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "首頁", icon: Home },
  { href: "/village", label: "村莊", icon: Users },
  { href: "/market", label: "市集", icon: Store },
  { href: "/inbox", label: "信件", icon: Inbox },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="公會導航"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.12] bg-[#0A0A0A] pb-[env(safe-area-inset-bottom,0px)]"
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href} className="flex min-w-0 flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[0.65rem] font-medium tracking-wide transition-[color,filter,text-shadow] duration-200",
                  active
                    ? "text-cyan-400 [text-shadow:0_0_12px_rgba(34,211,238,0.85),0_0_24px_rgba(34,211,238,0.35)]"
                    : "text-zinc-500 hover:text-zinc-300",
                )}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0 transition-[filter] duration-200",
                    active &&
                      "drop-shadow-[0_0_10px_rgba(34,211,238,0.75)] drop-shadow-[0_0_18px_rgba(34,211,238,0.35)]",
                  )}
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden
                />
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
