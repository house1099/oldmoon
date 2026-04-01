"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  ClipboardList,
  AlertTriangle,
  Activity,
  Swords,
  Instagram,
  Loader2,
  Fish,
} from "lucide-react";
import { getDashboardStatsAction } from "@/services/admin.action";
import type { DashboardStats } from "@/lib/repositories/server/admin.repository";

const STAT_CARDS = [
  {
    key: "todayNewUsers",
    label: "今日新增用戶",
    icon: Users,
    color: "bg-violet-100 text-violet-500",
    href: "/admin/users?filter=today",
  },
  {
    key: "pendingUsers",
    label: "待審核用戶",
    icon: ClipboardList,
    color: "bg-amber-100 text-amber-500",
    href: "/admin/users?filter=pending",
  },
  {
    key: "pendingReports",
    label: "待處理檢舉",
    icon: AlertTriangle,
    color: "bg-red-100 text-red-500",
    href: "/admin/reports?filter=pending",
  },
  {
    key: "activeUsers",
    label: "總活躍用戶",
    icon: Activity,
    color: "bg-emerald-100 text-emerald-500",
    href: "/admin/users?filter=active",
  },
  {
    key: "weekNewAlliances",
    label: "本週新增血盟",
    icon: Swords,
    color: "bg-blue-100 text-blue-500",
    href: "/admin/users",
  },
  {
    key: "pendingIgRequests",
    label: "待處理 IG 申請",
    icon: Instagram,
    color: "bg-pink-100 text-pink-500",
    href: "/admin/users?filter=ig_pending",
  },
  {
    key: "pendingProfileChangeCount",
    label: "待審資料變更",
    icon: ClipboardList,
    color: "bg-violet-100 text-violet-600",
    href: "/admin/profile-changes?filter=pending",
  },
  {
    key: "todayFishingCount",
    label: "今日釣魚",
    icon: Fish,
    color: "bg-cyan-100 text-cyan-600",
    href: "/admin/fishing",
  },
] as const;

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /** `pendingUsers` = **`COUNT(*) WHERE users.status = 'pending'`**（`getDashboardStats`） */
    getDashboardStatsAction().then((result) => {
      if (result.ok) setStats(result.data);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-6">儀表板</h2>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : !stats ? (
        <p className="text-gray-500">載入統計失敗，請重新整理頁面。</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {STAT_CARDS.map((card) => {
            const Icon = card.icon;
            const value = stats[card.key] ?? 0;
            return (
              <div
                key={card.key}
                onClick={() => router.push(card.href)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-start gap-4 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-150"
              >
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full ${card.color}`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {value}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{card.label}</p>
                </div>
              </div>
            );
          })}
          {stats.leviathanStockAlert ? (
            <div
              onClick={() => router.push("/admin/fishing")}
              className="bg-orange-50 rounded-2xl shadow-sm border border-orange-200 p-5 flex items-start gap-4 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-150"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 text-orange-600">
                <span className="text-2xl" aria-hidden>
                  🦈
                </span>
              </div>
              <div>
                <p className="text-lg font-bold text-orange-900">
                  深海巨獸庫存不足
                </p>
                <p className="text-sm text-orange-800/90 mt-1">
                  大獎限量庫存剩餘 ≤5，請前往釣魚管理
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
