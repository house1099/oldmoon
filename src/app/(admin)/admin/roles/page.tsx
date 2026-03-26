"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Search,
  UserPlus,
  ShieldMinus,
} from "lucide-react";
import type { UserRow, ModeratorPermissionRow } from "@/types/database.types";
import {
  PERMISSION_LABELS,
  DEFAULT_MODERATOR_PERMISSIONS,
} from "@/lib/constants/admin-permissions";
import {
  getStaffUsersAction,
  updateUserRoleAction,
  getModeratorPermissionsAction,
  updateModeratorPermissionsAction,
  getUsersAction,
} from "@/services/admin.action";

const ROLE_BADGE: Record<string, string> = {
  master: "bg-violet-100 text-violet-700",
  moderator: "bg-blue-100 text-blue-700",
};

export default function AdminRolesPage() {
  const [staffUsers, setStaffUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [permissions, setPermissions] =
    useState<ModeratorPermissionRow | null>(null);
  const [permLoading, setPermLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const result = await getStaffUsersAction();
    if (result.ok) {
      setStaffUsers(result.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const toggleExpand = async (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
      return;
    }
    setExpandedUser(userId);
    setPermLoading(true);
    const result = await getModeratorPermissionsAction(userId);
    if (result.ok) {
      setPermissions(result.data);
    }
    setPermLoading(false);
  };

  const handlePermChange = async (key: string, value: boolean) => {
    if (!expandedUser || !permissions) return;
    const updated = { ...permissions, [key]: value };
    setPermissions(updated);

    const result = await updateModeratorPermissionsAction(expandedUser, {
      [key]: value,
    });
    if (!result.ok) {
      toast.error(result.error);
      setPermissions(permissions);
    }
  };

  const handleSavePermissions = async () => {
    if (!expandedUser || !permissions) return;
    const patch: Record<string, boolean> = {};
    for (const key of Object.keys(PERMISSION_LABELS)) {
      patch[key] = (permissions as unknown as Record<string, boolean>)[key] ?? false;
    }
    const result = await updateModeratorPermissionsAction(expandedUser, patch);
    if (result.ok) {
      toast.success("權限已儲存");
    } else {
      toast.error(result.error);
    }
  };

  const handleDemote = async (userId: string) => {
    if (!confirm("確定要將此版主降級為一般成員嗎？")) return;
    const result = await updateUserRoleAction(userId, "member");
    if (result.ok) {
      toast.success("已降級為成員");
      setExpandedUser(null);
      fetchStaff();
    } else {
      toast.error(result.error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const result = await getUsersAction({
      role: "member",
      search: searchQuery,
      pageSize: 10,
    });
    if (result.ok) {
      setSearchResults(result.data.users);
    }
    setSearching(false);
  };

  const handlePromote = async (userId: string) => {
    if (!confirm("確定要將此成員升為版主嗎？")) return;
    const result = await updateUserRoleAction(userId, "moderator");
    if (result.ok) {
      toast.success("已升為版主");
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
      fetchStaff();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold text-gray-900">授權管理</h2>

      {/* Section 1: Current staff */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-3">
          目前管理員列表
        </h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : staffUsers.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              目前沒有管理員
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {staffUsers.map((u) => (
                <div key={u.id}>
                  <div
                    className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() =>
                      u.role === "moderator" ? toggleExpand(u.id) : undefined
                    }
                  >
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-sm font-bold">
                        {u.nickname?.[0] ?? "?"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {u.nickname}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[u.role] ?? ""}`}
                        >
                          {u.role}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        加入時間：
                        {new Date(u.created_at).toLocaleDateString("zh-TW")}
                      </p>
                    </div>
                    {u.role === "moderator" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDemote(u.id);
                          }}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                          title="降級為成員"
                        >
                          <ShieldMinus className="w-4 h-4" />
                        </button>
                        {expandedUser === u.id ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expanded permissions for moderator */}
                  {expandedUser === u.id && u.role === "moderator" && (
                    <div className="px-4 pb-4 pt-1 bg-gray-50/50">
                      {permLoading ? (
                        <div className="py-4 flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-500 font-medium mb-2">
                            細化權限
                          </p>
                          {Object.entries(PERMISSION_LABELS).map(
                            ([key, label]) => {
                              const checked =
                                (permissions as unknown as Record<string, boolean>)?.[
                                  key
                                ] ?? false;
                              return (
                                <label
                                  key={key}
                                  className="flex items-center gap-3 py-1.5"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) =>
                                      handlePermChange(key, e.target.checked)
                                    }
                                    className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                                  />
                                  <span className="text-sm text-gray-700">
                                    {label}
                                  </span>
                                </label>
                              );
                            },
                          )}
                          <button
                            onClick={handleSavePermissions}
                            className="mt-3 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors"
                          >
                            儲存權限
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Section 2: Add new admin */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-3">
          新增管理員
        </h3>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜尋一般成員..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searching}
              className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
            >
              {searching ? "搜尋中..." : "搜尋"}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50"
                >
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">
                      {u.nickname?.[0] ?? "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900 truncate block">
                      {u.nickname}
                    </span>
                    <span className="text-xs text-gray-400">{u.region}</span>
                  </div>
                  <button
                    onClick={() => handlePromote(u.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    升為版主
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
