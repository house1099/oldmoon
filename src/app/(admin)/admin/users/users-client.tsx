"use client";

import React, { useState, useCallback, useTransition, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Ban,
  ShieldCheck,
  TrendingUp,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Avatar from "@/components/ui/Avatar";
import type { UserRow, AdminActionRow } from "@/types/database.types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getUsersAction,
  getUserDetailAction,
  getUserActionHistoryAction,
  getPendingUsersCountAction,
  banUserAction,
  suspendUserAction,
  unbanUserAction,
  approveUserAction,
  rejectUserIgAction,
  adjustExpAction,
  adjustReputationAction,
  getPendingIgRequestsForUserAction,
  reviewIgRequestFromAdminAction,
} from "@/services/admin.action";
import {
  banTavernUserAction,
  unbanTavernUserAction,
} from "@/services/tavern.action";

const STATUS_OPTIONS = [
  { value: "", label: "全部狀態" },
  { value: "active", label: "活躍" },
  { value: "pending", label: "待審核" },
  { value: "suspended", label: "停權" },
  { value: "banned", label: "放逐" },
];

const ROLE_OPTIONS = [
  { value: "", label: "全部角色" },
  { value: "member", label: "成員" },
  { value: "moderator", label: "版主" },
  { value: "master", label: "最高領袖" },
];

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-amber-100 text-amber-700",
  banned: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-900",
};

const ROLE_BADGE: Record<string, string> = {
  master: "bg-violet-100 text-violet-700",
  moderator: "bg-blue-100 text-blue-700",
  member: "bg-gray-100 text-gray-600",
};

type Props = {
  initialData: { users: UserRow[]; total: number };
  initialFilter?: string;
  viewerRole: "master" | "moderator" | "member";
};

type UserDetail = UserRow & { email: string | null; tavern_banned: boolean };

function formatTaipeiTime(iso: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Taipei",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(iso))
    .replaceAll("-", "/");
}

function canOperate(operatorRole: string, targetRole: string): boolean {
  if (targetRole === "master") return false;
  if (operatorRole === "moderator" && targetRole === "moderator") return false;
  return true;
}

export default function UsersClient({
  initialData,
  initialFilter = "",
  viewerRole,
}: Props) {
  const [users, setUsers] = useState(initialData.users);
  const [total, setTotal] = useState(initialData.total);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const derivedStatus =
    initialFilter === "pending" ? "pending" :
    initialFilter === "active" ? "active" : "";
  const [statusFilter, setStatusFilter] = useState(derivedStatus);
  const [roleFilter, setRoleFilter] = useState("");
  const [, startTransition] = useTransition();

  const [filterLabel, setFilterLabel] = useState("");
  const didMount = useRef(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [igRequests, setIgRequests] = useState<
    { id: string; old_handle: string | null; new_handle: string; status: string }[]
  >([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [userActions, setUserActions] = useState<AdminActionRow[]>([]);

  const [actionReason, setActionReason] = useState("");
  const [expDelta, setExpDelta] = useState("");
  const [expReason, setExpReason] = useState("");
  const [repDelta, setRepDelta] = useState("");
  const [repReason, setRepReason] = useState("");
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showExpDialog, setShowExpDialog] = useState(false);
  const [showRepDialog, setShowRepDialog] = useState(false);
  const [tavernBanDialogOpen, setTavernBanDialogOpen] = useState(false);
  const [tavernUnbanDialogOpen, setTavernUnbanDialogOpen] = useState(false);
  const [tavernBanReason, setTavernBanReason] = useState("");
  const [registrationReviewPending, setRegistrationReviewPending] =
    useState(false);
  const [pendingBadgeCount, setPendingBadgeCount] = useState<number | null>(
    null,
  );
  const [igApproveDialogOpen, setIgApproveDialogOpen] = useState(false);
  const [igRejectDialogOpen, setIgRejectDialogOpen] = useState(false);

  const refreshPendingBadge = useCallback(() => {
    void getPendingUsersCountAction().then((r) => {
      if (r.ok) setPendingBadgeCount(r.data.count);
    });
  }, []);

  useEffect(() => {
    refreshPendingBadge();
  }, [refreshPendingBadge]);

  useEffect(() => {
    if (didMount.current) return;
    didMount.current = true;

    if (initialFilter === "today") {
      setFilterLabel("篩選：今日新增用戶");
      const now = new Date();
      const taipeiDateStr = now.toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
      startTransition(async () => {
        const result = await getUsersAction({ pageSize: 100, status: "active" });
        if (result.ok) {
          const todayUsers = result.data.users.filter((u) =>
            u.created_at.startsWith(taipeiDateStr),
          );
          setUsers(todayUsers);
          setTotal(todayUsers.length);
        }
      });
    } else if (initialFilter === "ig_pending") {
      setFilterLabel("篩選：待處理 IG 申請");
    } else if (initialFilter === "pending") {
      setFilterLabel("篩選：待審核用戶");
    } else if (initialFilter === "active") {
      setFilterLabel("篩選：活躍用戶");
    }
  }, [initialFilter, startTransition]);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const fetchUsers = useCallback(
    (p: number, s: string, st: string, r: string) => {
      startTransition(async () => {
        const result = await getUsersAction({
          page: p,
          pageSize,
          search: s || undefined,
          status: st || undefined,
          role: r || undefined,
        });
        if (result.ok) {
          setUsers(result.data.users);
          setTotal(result.data.total);
        }
      });
    },
    [],
  );

  const handleSearch = () => {
    setPage(1);
    fetchUsers(1, search, statusFilter, roleFilter);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    fetchUsers(p, search, statusFilter, roleFilter);
  };

  const openUserDetail = async (userId: string) => {
    setSheetOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setSelectedUserId(userId);
    setSelectedUser(null);
    setIgRequests([]);
    setUserActions([]);

    const [detailRes, igRes, actionRes] = await Promise.all([
      getUserDetailAction(userId),
      getPendingIgRequestsForUserAction(userId),
      getUserActionHistoryAction(userId),
    ]);

    if (detailRes.ok) {
      if (detailRes.data) {
        setSelectedUser(detailRes.data);
      } else {
        setDetailError("找不到此用戶資料");
      }
    } else {
      setDetailError(detailRes.error || "讀取用戶資料失敗");
    }
    if (igRes.ok) {
      setIgRequests(igRes.data as typeof igRequests);
    }
    if (actionRes.ok) {
      setUserActions(actionRes.data);
    }
    setDetailLoading(false);
  };

  const refreshList = () => {
    fetchUsers(page, search, statusFilter, roleFilter);
    refreshPendingBadge();
  };

  const refreshDetail = async (userId: string) => {
    setDetailError(null);
    const [detailRes, igRes, actionRes] = await Promise.all([
      getUserDetailAction(userId),
      getPendingIgRequestsForUserAction(userId),
      getUserActionHistoryAction(userId),
    ]);
    if (detailRes.ok) {
      if (detailRes.data) {
        setSelectedUser(detailRes.data);
      } else {
        setSelectedUser(null);
        setDetailError("找不到此用戶資料");
      }
    } else {
      setDetailError(detailRes.error || "讀取用戶資料失敗");
    }
    if (igRes.ok) setIgRequests(igRes.data as typeof igRequests);
    if (actionRes.ok) setUserActions(actionRes.data);
  };

  const handleBan = async () => {
    if (!selectedUser || !actionReason.trim()) return;
    const result = await banUserAction(selectedUser.id, actionReason);
    if (result.ok) {
      toast.success("已放逐用戶");
      setShowBanDialog(false);
      setActionReason("");
      refreshDetail(selectedUser.id);
      refreshList();
    } else {
      toast.error(result.error);
    }
  };

  const handleSuspend = async () => {
    if (!selectedUser || !actionReason.trim()) return;
    const result = await suspendUserAction(selectedUser.id, actionReason);
    if (result.ok) {
      toast.success("已停權用戶");
      setShowSuspendDialog(false);
      setActionReason("");
      refreshDetail(selectedUser.id);
      refreshList();
    } else {
      toast.error(result.error);
    }
  };

  const handleUnban = async () => {
    if (!selectedUser) return;
    const result = await unbanUserAction(selectedUser.id);
    if (result.ok) {
      toast.success("已解除停權/放逐");
      refreshDetail(selectedUser.id);
      refreshList();
    } else {
      toast.error(result.error);
    }
  };

  const handleExpAdjust = async () => {
    if (!selectedUser || !expDelta || !expReason.trim()) return;
    const delta = parseInt(expDelta, 10);
    if (isNaN(delta)) return;
    const result = await adjustExpAction(selectedUser.id, delta, expReason);
    if (result.ok) {
      toast.success(`EXP ${delta > 0 ? "+" : ""}${delta} 已調整`);
      setShowExpDialog(false);
      setExpDelta("");
      setExpReason("");
      refreshDetail(selectedUser.id);
    } else {
      toast.error(result.error);
    }
  };

  const handleRepAdjust = async () => {
    if (!selectedUser || !repDelta || !repReason.trim()) return;
    const delta = parseInt(repDelta, 10);
    if (isNaN(delta)) return;
    const result = await adjustReputationAction(
      selectedUser.id,
      delta,
      repReason,
    );
    if (result.ok) {
      toast.success(`信譽分 ${delta > 0 ? "+" : ""}${delta} 已調整`);
      setShowRepDialog(false);
      setRepDelta("");
      setRepReason("");
      refreshDetail(selectedUser.id);
    } else {
      toast.error(result.error);
    }
  };

  const handleTavernBan = async () => {
    if (!selectedUser || !tavernBanReason.trim()) return;
    try {
      await banTavernUserAction({
        userId: selectedUser.id,
        reason: tavernBanReason.trim(),
        durationHours: 24,
      });
      toast.success("已禁止該用戶在酒館發言");
      setTavernBanDialogOpen(false);
      setTavernBanReason("");
      await refreshDetail(selectedUser.id);
    } catch (e) {
      toast.error((e as Error).message ?? "操作失敗");
    }
  };
  const canOperateSelectedUser = selectedUser
    ? canOperate(viewerRole, selectedUser.role)
    : false;

  const handleTavernUnban = async () => {
    if (!selectedUser) return;
    try {
      await unbanTavernUserAction(selectedUser.id);
      toast.success("已恢復該用戶酒館發言權");
      setTavernUnbanDialogOpen(false);
      await refreshDetail(selectedUser.id);
    } catch (e) {
      toast.error((e as Error).message ?? "操作失敗");
    }
  };

  const handleIgReview = async (
    requestId: string,
    action: "approved" | "rejected",
  ) => {
    const result = await reviewIgRequestFromAdminAction(requestId, action);
    if (result.ok) {
      toast.success(action === "approved" ? "IG 變更已核准" : "IG 變更已拒絕");
      if (selectedUser) refreshDetail(selectedUser.id);
    } else {
      toast.error(result.error);
    }
  };

  const confirmIgApprove = async () => {
    if (!selectedUser || registrationReviewPending) return;
    setRegistrationReviewPending(true);
    try {
      const result = await approveUserAction(selectedUser.id);
      if (result.ok) {
        toast.success("已核准，用戶可登入公會");
        setIgApproveDialogOpen(false);
        setSheetOpen(false);
        refreshList();
      } else {
        toast.error(result.error);
      }
    } finally {
      setRegistrationReviewPending(false);
    }
  };

  const confirmIgReject = async () => {
    if (!selectedUser || registrationReviewPending) return;
    setRegistrationReviewPending(true);
    try {
      const result = await rejectUserIgAction(selectedUser.id);
      if (result.ok) {
        toast.success("已拒絕並通知用戶");
        setIgRejectDialogOpen(false);
        setSheetOpen(false);
        refreshList();
      } else {
        toast.error(result.error);
      }
    } finally {
      setRegistrationReviewPending(false);
    }
  };

  function applyStatusQuickFilter(next: string) {
    setStatusFilter(next);
    setPage(1);
    fetchUsers(1, search, next, roleFilter);
  }

  const pendingIgDisplay =
    selectedUser?.instagram_handle?.trim().replace(/^@+/, "") ?? "";
  const showPendingListColumns = statusFilter === "pending";

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">用戶管理</h2>

      {filterLabel && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm text-violet-700 bg-violet-50 px-3 py-1 rounded-full font-medium">
            {filterLabel}
          </span>
          <button
            onClick={() => {
              setFilterLabel("");
              setStatusFilter("");
              setPage(1);
              fetchUsers(1, "", "", "");
            }}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            清除篩選
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {[
          { value: "", label: "全部" },
          { value: "pending", label: "待審核", showBadge: true as const },
          { value: "active", label: "活躍" },
        ].map((chip) => (
          <button
            key={chip.value || "all"}
            type="button"
            onClick={() => applyStatusQuickFilter(chip.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === chip.value
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {chip.label}
            {"showBadge" in chip &&
            chip.showBadge &&
            pendingBadgeCount !== null &&
            pendingBadgeCount > 0 ? (
              <span className="rounded-full bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                {pendingBadgeCount > 99 ? "99+" : pendingBadgeCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜尋暱稱..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
            fetchUsers(1, search, e.target.value, roleFilter);
          }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
            fetchUsers(1, search, statusFilter, e.target.value);
          }}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          搜尋
        </button>
      </div>

      {/* Table (desktop) / Cards (mobile) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  暱稱
                </th>
                {showPendingListColumns ? (
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    IG 帳號
                  </th>
                ) : null}
                {!showPendingListColumns ? (
                  <>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">
                      等級
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">
                      地區
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">
                      狀態
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500">
                      角色
                    </th>
                  </>
                ) : (
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    狀態
                  </th>
                )}
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  註冊時間
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => openUserDetail(u.id)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={u.avatar_url}
                        nickname={u.nickname}
                        size={32}
                        className="bg-violet-100 [&_span]:text-violet-600"
                      />
                      <span className="font-medium text-gray-900">
                        {u.role === "master" ? `👑 ${u.nickname}` : u.nickname}
                      </span>
                    </div>
                  </td>
                  {showPendingListColumns ? (
                    <td className="px-4 py-3 text-gray-700 text-sm font-mono">
                      {u.instagram_handle?.trim()
                        ? `@${u.instagram_handle.trim().replace(/^@+/, "")}`
                        : "—"}
                    </td>
                  ) : null}
                  {!showPendingListColumns ? (
                    <>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
                          Lv.{u.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.region}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[u.status] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[u.role] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {u.role}
                        </span>
                      </td>
                    </>
                  ) : (
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[u.status] ?? "bg-gray-100 text-gray-600"}`}
                      >
                        {u.status}
                      </span>
                    </td>
                  )}
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(u.created_at).toLocaleString("zh-TW")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {users.map((u) => (
            <div
              key={u.id}
              className="p-4 flex items-center gap-3 active:bg-gray-50 cursor-pointer"
              onClick={() => openUserDetail(u.id)}
            >
              <Avatar
                src={u.avatar_url}
                nickname={u.nickname}
                size={40}
                className="bg-violet-100 [&_span]:text-violet-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 truncate">
                    {u.role === "master" ? `👑 ${u.nickname}` : u.nickname}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700">
                    Lv.{u.level}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 mt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_BADGE[u.status] ?? ""}`}
                    >
                      {u.status}
                    </span>
                    {!showPendingListColumns ? (
                      <>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_BADGE[u.role] ?? ""}`}
                        >
                          {u.role}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {u.region}
                        </span>
                      </>
                    ) : null}
                  </div>
                  {showPendingListColumns ? (
                    <span className="text-[11px] text-gray-600 font-mono">
                      IG:{" "}
                      {u.instagram_handle?.trim()
                        ? `@${u.instagram_handle.trim().replace(/^@+/, "")}`
                        : "—"}
                    </span>
                  ) : null}
                  <span className="text-[10px] text-gray-400">
                    註冊 {new Date(u.created_at).toLocaleString("zh-TW")}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            沒有符合條件的用戶
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>用戶詳情</SheetTitle>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
              </div>
            ) : selectedUser ? (
              <>
                {/* Profile header */}
                <div className="flex items-center gap-4">
                  <Avatar
                    src={selectedUser.avatar_url}
                    nickname={selectedUser.nickname}
                    size={64}
                    className="bg-violet-100 [&_span]:text-violet-600 [&_span]:text-xl"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {selectedUser.nickname}
                    </h3>
                    {viewerRole === "master" ? (
                      <p className="text-xs text-gray-400">
                        {selectedUser.email ?? "無 Email"}
                      </p>
                    ) : null}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
                        Lv.{selectedUser.level}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[selectedUser.status] ?? ""}`}
                      >
                        {selectedUser.status}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[selectedUser.role] ?? ""}`}
                      >
                        {selectedUser.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Reputation bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      信譽分
                    </span>
                    <span className="text-sm font-bold text-gray-900 inline-flex items-center flex-wrap gap-x-1">
                      {selectedUser.reputation_score ?? 100}
                      {(selectedUser.reputation_score ?? 100) < 30 ? (
                        <span className="text-xs text-red-400 font-normal">
                          ⚠️ 建議封鎖
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-violet-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, selectedUser.reputation_score ?? 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">IG</span>
                    <p className="font-medium text-gray-700">
                      {selectedUser.instagram_handle
                        ? `@${selectedUser.instagram_handle}`
                        : "未設定"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">IG 公開</span>
                    <p className="font-medium text-gray-700">
                      {selectedUser.ig_public ? "是" : "否"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">地區</span>
                    <p className="font-medium text-gray-700">
                      {selectedUser.region}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">性別</span>
                    <p className="font-medium text-gray-700">
                      {selectedUser.gender === "male"
                        ? "男"
                        : selectedUser.gender === "female"
                          ? "女"
                          : selectedUser.gender}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">線下意願</span>
                    <p className="font-medium text-gray-700">
                      {selectedUser.offline_ok ? "願意" : "不願意"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">邀請人</span>
                    <p className="font-medium text-gray-700">
                      {selectedUser.invited_by ?? "無"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">EXP</span>
                    <p className="font-medium text-gray-700">
                      {selectedUser.total_exp}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">等級</span>
                    <p className="font-medium text-gray-700">
                      Lv.{selectedUser.level}
                    </p>
                  </div>
                </div>

                {selectedUser.status === "pending" && canOperateSelectedUser ? (
                  <div className="rounded-xl border-2 border-amber-300/60 bg-gradient-to-b from-amber-50 to-amber-100/80 p-4 space-y-3 shadow-sm">
                    <p className="text-sm font-bold text-amber-950">
                      📸 IG 審核
                    </p>
                    <div>
                      <span className="text-xs font-medium text-amber-900/80">
                        IG 帳號
                      </span>
                      <p className="font-mono text-sm font-semibold text-gray-900 mt-0.5">
                        {pendingIgDisplay
                          ? `@${pendingIgDisplay}`
                          : "尚未填寫"}
                      </p>
                    </div>
                    {pendingIgDisplay ? (
                      <button
                        type="button"
                        onClick={() =>
                          window.open(
                            `https://instagram.com/${encodeURIComponent(pendingIgDisplay)}`,
                            "_blank",
                            "noopener,noreferrer",
                          )
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-white px-3 py-2.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-50"
                      >
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        前往 IG 確認
                      </button>
                    ) : null}
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        type="button"
                        disabled={registrationReviewPending}
                        onClick={() => setIgApproveDialogOpen(true)}
                        className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                      >
                        ✅ 審核通過
                      </button>
                      <button
                        type="button"
                        disabled={
                          registrationReviewPending || !pendingIgDisplay
                        }
                        onClick={() => setIgRejectDialogOpen(true)}
                        className="w-full rounded-xl border border-rose-400 bg-rose-50 py-2.5 text-sm font-medium text-rose-900 transition-colors hover:bg-rose-100 disabled:opacity-50"
                      >
                        ❌ 拒絕並通知
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Pending IG requests */}
                {igRequests.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-amber-800 mb-2">
                      待審核 IG 申請
                    </p>
                    {igRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="text-sm">
                          <span className="text-gray-500">
                            {req.old_handle ?? "無"} →{" "}
                          </span>
                          <span className="font-medium text-gray-900">
                            {req.new_handle}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleIgReview(req.id, "approved")}
                            className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleIgReview(req.id, "rejected")}
                            className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Ban/suspend warnings */}
                {selectedUser.ban_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-red-700">放逐原因</p>
                    <p className="text-sm text-red-600 mt-1">
                      {selectedUser.ban_reason}
                    </p>
                  </div>
                )}
                {selectedUser.suspended_until && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm font-medium text-amber-700">
                      停權至
                    </p>
                    <p className="text-sm text-amber-600 mt-1">
                      {new Date(
                        selectedUser.suspended_until,
                      ).toLocaleDateString("zh-TW")}
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400 font-medium">操作</p>

                  {canOperateSelectedUser ? (
                    <>
                      {(selectedUser.status === "suspended" ||
                        selectedUser.status === "banned") && (
                        <button
                          onClick={handleUnban}
                          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          解除停權/放逐
                        </button>
                      )}

                      {selectedUser.status === "active" && (
                        <>
                          <button
                            onClick={() => {
                              setActionReason("");
                              setShowSuspendDialog(true);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                          >
                            <Clock className="w-4 h-4" />
                            停權
                          </button>
                          <button
                            onClick={() => {
                              setActionReason("");
                              setShowBanDialog(true);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                            放逐
                          </button>
                        </>
                      )}

                      <button
                        onClick={() => {
                          setExpDelta("");
                          setExpReason("");
                          setShowExpDialog(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
                      >
                        <TrendingUp className="w-4 h-4" />
                        調整 EXP
                      </button>

                      <button
                        onClick={() => {
                          setRepDelta("");
                          setRepReason("");
                          setShowRepDialog(true);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <Star className="w-4 h-4" />
                        調整信譽分
                      </button>
                      {viewerRole !== "member" && (
                        <>
                          {!selectedUser.tavern_banned ? (
                            <button
                              type="button"
                              onClick={() => {
                                setTavernBanReason("");
                                setTavernBanDialogOpen(true);
                              }}
                              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-zinc-100 text-zinc-800 hover:bg-zinc-200 transition-colors"
                            >
                              🔇 酒館禁言
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setTavernUnbanDialogOpen(true)}
                              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
                            >
                              ✅ 解除酒館禁言
                            </button>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-500">
                      此用戶無法被操作
                    </div>
                  )}
                </div>

                <details className="mt-4">
                  <summary className="text-sm text-gray-600 cursor-pointer py-2 border-t">
                    📋 操作記錄（最近 20 筆）
                  </summary>
                  <div className="mt-2 space-y-2">
                    {userActions.map((action) => (
                      <div
                        key={action.id}
                        className="text-xs text-gray-500 py-1 border-b border-gray-100"
                      >
                        <span className="text-gray-400">
                          {formatTaipeiTime(action.created_at)}
                        </span>
                        <p className="text-gray-700 mt-0.5">
                          {action.action_label ?? action.reason ?? "（無描述）"}
                        </p>
                      </div>
                    ))}
                    {userActions.length === 0 && (
                      <p className="text-xs text-gray-400 py-2">尚無操作記錄</p>
                    )}
                  </div>
                </details>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">{detailError ?? "載入失敗"}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedUserId) {
                      void refreshDetail(selectedUserId);
                    }
                  }}
                  className="mt-2 text-violet-600 text-sm"
                >
                  重試
                </button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Action dialogs (ban/suspend/exp/reputation) */}
      {showBanDialog && (
        <ActionDialog
          title="確定要放逐此用戶？"
          onConfirm={handleBan}
          onCancel={() => setShowBanDialog(false)}
        >
          <textarea
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="請填寫放逐原因..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-red-500/40"
          />
        </ActionDialog>
      )}
      {showSuspendDialog && (
        <ActionDialog
          title="確定要停權此用戶？"
          onConfirm={handleSuspend}
          onCancel={() => setShowSuspendDialog(false)}
        >
          <textarea
            value={actionReason}
            onChange={(e) => setActionReason(e.target.value)}
            placeholder="請填寫停權原因..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />
        </ActionDialog>
      )}
      {showExpDialog && (
        <ActionDialog
          title="調整 EXP"
          onConfirm={handleExpAdjust}
          onCancel={() => setShowExpDialog(false)}
        >
          <input
            type="number"
            value={expDelta}
            onChange={(e) => setExpDelta(e.target.value)}
            placeholder="輸入數值（正/負）"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
          <input
            type="text"
            value={expReason}
            onChange={(e) => setExpReason(e.target.value)}
            placeholder="調整原因"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
        </ActionDialog>
      )}
      {showRepDialog && (
        <ActionDialog
          title="調整信譽分"
          onConfirm={handleRepAdjust}
          onCancel={() => setShowRepDialog(false)}
        >
          <input
            type="number"
            value={repDelta}
            onChange={(e) => setRepDelta(e.target.value)}
            placeholder="輸入數值（正/負）"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <input
            type="text"
            value={repReason}
            onChange={(e) => setRepReason(e.target.value)}
            placeholder="調整原因"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
        </ActionDialog>
      )}

      <AlertDialog
        open={igApproveDialogOpen}
        onOpenChange={setIgApproveDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              確定審核通過 @
              {pendingIgDisplay || "（無 IG）"}？
            </AlertDialogTitle>
            <AlertDialogDescription>
              通過後用戶狀態將改為活躍，可進入公會。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmIgApprove()}
              disabled={registrationReviewPending}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {registrationReviewPending ? "處理中…" : "確定通過"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={igRejectDialogOpen}
        onOpenChange={setIgRejectDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定拒絕？</AlertDialogTitle>
            <AlertDialogDescription>
              系統將清空 IG 欄位並通知用戶重新填寫。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmIgReject()}
              disabled={registrationReviewPending}
              className="bg-rose-600 hover:bg-rose-500"
            >
              {registrationReviewPending ? "處理中…" : "確定拒絕"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={tavernBanDialogOpen}
        onOpenChange={setTavernBanDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>酒館禁言</AlertDialogTitle>
            <AlertDialogDescription>
              該用戶將無法在酒館廣場發言，並會收到系統通知。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <textarea
            value={tavernBanReason}
            onChange={(e) => setTavernBanReason(e.target.value)}
            placeholder="請填寫禁言原因..."
            className="w-full min-h-[80px] px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/40"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleTavernBan()}
              disabled={!tavernBanReason.trim()}
            >
              確認禁言
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={tavernUnbanDialogOpen}
        onOpenChange={setTavernUnbanDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>解除酒館禁言？</AlertDialogTitle>
            <AlertDialogDescription>
              確認恢復此用戶在酒館廣場的發言權限？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleTavernUnban()}>
              確認解除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActionDialog({
  title,
  children,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {children}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors"
          >
            確認
          </button>
        </div>
      </div>
    </div>
  );
}
