"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "首頁", href: "/" },
  { label: "探索", href: "/explore" },
  { label: "冒險團", href: "/guild" },
  { label: "月老", href: "/matchmaking" },
  { label: "商店", href: "/shop" },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="公會導航"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-zinc-950/90 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 py-3 transition-colors"
            >
              <span
                className={`text-xs transition-colors ${
                  isActive
                    ? "font-semibold text-white"
                    : "font-medium text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {item.label}
              </span>
              {isActive ? (
                <div className="mt-1 h-0.5 w-6 rounded-full bg-violet-500" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
