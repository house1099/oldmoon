"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Shield,
  Mail,
  Gift,
  Megaphone,
  Coins,
  Lock,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ModeratorPermissionRow } from "@/types/database.types";

interface AdminShellProps {
  role: string;
  nickname: string;
  permissions: ModeratorPermissionRow | null;
  children: React.ReactNode;
}

export function AdminShell({
  role,
  nickname,
  permissions,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const isMaster = role === "master";

  const navItems = [
    { href: "/admin", label: "儀表板", Icon: LayoutDashboard, show: true },
    {
      href: "/admin/users",
      label: "用戶管理",
      Icon: Users,
      show: isMaster || Boolean(permissions?.can_review_users),
    },
    {
      href: "/admin/reports",
      label: "檢舉管理",
      Icon: Shield,
      show: isMaster || Boolean(permissions?.can_handle_reports),
    },
    {
      href: "/admin/invitations",
      label: "邀請碼管理",
      Icon: Mail,
      show: isMaster || Boolean(permissions?.can_manage_invitations),
    },
    {
      href: "/admin/exp",
      label: "EXP 管理",
      Icon: Gift,
      show:
        isMaster ||
        Boolean(permissions?.can_grant_exp) ||
        Boolean(permissions?.can_deduct_exp),
    },
    {
      href: "/admin/publish",
      label: "發布中心",
      Icon: Megaphone,
      show:
        isMaster ||
        Boolean(permissions?.can_manage_announcements) ||
        Boolean(permissions?.can_manage_ads),
    },
    { href: "/admin/coins", label: "金幣管理", Icon: Coins, show: isMaster },
    { href: "/admin/roles", label: "授權管理", Icon: Lock, show: isMaster },
    { href: "/admin/settings", label: "系統設定", Icon: Settings, show: isMaster },
  ].filter((item) => item.show);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 [color-scheme:light]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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

        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
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
                <item.Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="border-t border-gray-200 p-3">
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{nickname}</p>
              </div>
              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
                {role}
              </span>
            </div>
          </div>
        )}
      </aside>

      <div
        className={`transition-all duration-200 ${collapsed ? "lg:pl-16" : "lg:pl-56"}`}
      >
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
            <span className="text-sm text-gray-600 hidden sm:inline">{nickname}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
              {role}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
              title="登出"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
