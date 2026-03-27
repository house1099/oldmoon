"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  KeyRound,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  MailPlus,
  Gift,
  Megaphone,
  Coins,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  badge?: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "儀表板",
    href: "/admin",
    icon: LayoutDashboard,
    roles: ["master", "moderator"],
  },
  {
    label: "用戶管理",
    href: "/admin/users",
    icon: Users,
    roles: ["master", "moderator"],
  },
  {
    label: "邀請碼管理",
    href: "/admin/invitations",
    icon: MailPlus,
    roles: ["master", "moderator"],
  },
  {
    label: "EXP 管理",
    href: "/admin/exp",
    icon: Gift,
    roles: ["master", "moderator"],
  },
  {
    label: "🪙 金幣管理",
    href: "/admin/coins",
    icon: Coins,
    roles: ["master"],
  },
  {
    label: "發布中心",
    href: "/admin/publish",
    icon: Megaphone,
    roles: ["master", "moderator"],
  },
  {
    label: "檢舉管理",
    href: "/admin/reports",
    icon: ShieldAlert,
    roles: ["master", "moderator"],
  },
  {
    label: "授權管理",
    href: "/admin/roles",
    icon: KeyRound,
    roles: ["master"],
  },
  {
    label: "系統設定",
    href: "/admin/settings",
    icon: Settings,
    roles: ["master"],
    badge: "Wave 2",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userInfo, setUserInfo] = useState<{
    nickname: string;
    role: string;
  } | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("nickname, role")
        .eq("id", user.id)
        .single();
      if (data) setUserInfo({ nickname: data.nickname, role: data.role });
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    await supabase.auth.signOut();
    router.push("/login");
  };

  const visibleItems = NAV_ITEMS.filter(
    (item) => !userInfo || item.roles.includes(userInfo.role),
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 [color-scheme:light]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 shadow-sm
          pt-[env(safe-area-inset-top,0px)]
          transition-all duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${collapsed ? "lg:w-16" : "lg:w-56"}
          w-56
        `}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          {!collapsed && (
            <span className="text-lg font-bold text-violet-600 truncate">
              🌙 後台管理
            </span>
          )}
          <button
            onClick={() => {
              setSidebarOpen(false);
              setCollapsed(!collapsed);
            }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hidden lg:block"
          >
            <ChevronLeft
              className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-violet-50 text-violet-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }
                  ${collapsed ? "justify-center" : ""}
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        {userInfo && !collapsed && (
          <div className="border-t border-gray-200 p-3">
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userInfo.nickname}
                </p>
              </div>
              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                {userInfo.role}
              </span>
            </div>
          </div>
        )}
      </aside>

      {/* Main area */}
      <div
        className={`transition-all duration-200 ${collapsed ? "lg:pl-16" : "lg:pl-56"}`}
      >
        {/* Top header */}
        <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-semibold text-gray-800 hidden sm:block">
              傳奇公會 — 後台管理
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {userInfo && (
              <>
                <span className="text-sm text-gray-600 hidden sm:inline">
                  {userInfo.nickname}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                  {userInfo.role}
                </span>
              </>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              title="登出"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
