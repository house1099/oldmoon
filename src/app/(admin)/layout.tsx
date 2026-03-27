import React from "react";
import {
  LayoutDashboard,
  Users,
  Shield,
  Lock,
  Settings,
  Mail,
  Gift,
  Megaphone,
  Coins,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { findProfileById } from "@/lib/repositories/server/user.repository";
import { findModeratorPermissions } from "@/lib/repositories/server/admin.repository";
import AdminShellClient from "@/components/admin/AdminShellClient";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <>{children}</>;
  }

  const profile = await findProfileById(user.id);
  if (!profile) {
    return <>{children}</>;
  }

  const isMaster = profile.role === "master";
  const isModerator = profile.role === "moderator";
  const permissions = isModerator
    ? await findModeratorPermissions(user.id)
    : null;

  const navItems = [
    { href: "/admin", label: "儀表板", icon: LayoutDashboard, show: true },
    {
      href: "/admin/users",
      label: "用戶管理",
      icon: Users,
      show: isMaster || Boolean(permissions?.can_review_users),
    },
    {
      href: "/admin/reports",
      label: "檢舉管理",
      icon: Shield,
      show: isMaster || Boolean(permissions?.can_handle_reports),
    },
    {
      href: "/admin/invitations",
      label: "邀請碼管理",
      icon: Mail,
      show: isMaster || Boolean(permissions?.can_manage_invitations),
    },
    {
      href: "/admin/exp",
      label: "EXP 管理",
      icon: Gift,
      show:
        isMaster ||
        Boolean(permissions?.can_grant_exp) ||
        Boolean(permissions?.can_deduct_exp),
    },
    {
      href: "/admin/publish",
      label: "發布中心",
      icon: Megaphone,
      show:
        isMaster ||
        Boolean(permissions?.can_manage_announcements) ||
        Boolean(permissions?.can_manage_ads),
    },
    { href: "/admin/coins", label: "金幣管理", icon: Coins, show: isMaster },
    { href: "/admin/roles", label: "授權管理", icon: Lock, show: isMaster },
    {
      href: "/admin/settings",
      label: "系統設定",
      icon: Settings,
      show: isMaster,
    },
  ].filter((item) => item.show);

  return (
    <AdminShellClient
      navItems={navItems.map(({ href, label, icon }) => ({ href, label, icon }))}
      userInfo={{ nickname: profile.nickname, role: profile.role }}
    >
      {children}
    </AdminShellClient>
  );
}
