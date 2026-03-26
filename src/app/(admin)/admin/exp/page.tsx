"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Gift,
  History,
  Search,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import {
  getUsersAction,
  batchGrantExpAction,
  grantExpToAllAction,
  grantExpByLevelAction,
  getAdminExpGrantHistoryAction,
  getExpLogsByUserAction,
} from "@/services/admin.action";
import type { UserRow, ExpLogRow } from "@/types/database.types";
import type { AdminExpGrantSummary } from "@/lib/repositories/server/admin.repository";
import { createBrowserClient } from "@supabase/ssr";

type Tab = "grant" | "history" | "query";

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function ExpManagementPage() {
  const [tab, setTab] = useState<Tab>("grant");
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    supabase.auth.getUser().then(async ({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      if (data) setUserRole(data.role);
    });
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">🎁 EXP 管理</h1>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([
          { key: "grant" as Tab, label: "批量發放", icon: Gift },
          { key: "history" as Tab, label: "發放紀錄", icon: History },
          { key: "query" as Tab, label: "用戶查詢", icon: Search },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "grant" && <BatchGrantTab userRole={userRole} />}
      {tab === "history" && <GrantHistoryTab />}
      {tab === "query" && <UserQueryTab />}
    </div>
  );
}

// ═══════════════════════════════════════
// Tab 1: Batch Grant
// ═══════════════════════════════════════

type GrantTarget = "select" | "all" | "level";

function BatchGrantTab({ userRole }: { userRole: string | null }) {
  const [source, setSource] = useState("");
  const [deltaStr, setDeltaStr] = useState("10");
  const [target, setTarget] = useState<GrantTarget>("select");

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [minLevel, setMinLevel] = useState(1);
  const [maxLevel, setMaxLevel] = useState(10);

  const [showConfirm, setShowConfirm] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);

  const searchUsers = useCallback(async (q: string) => {
    setUsersLoading(true);
    const res = await getUsersAction({
      search: q,
      status: "active",
      pageSize: 50,
    });
    if (res.ok) setUsers(res.data.users);
    setUsersLoading(false);
  }, []);

  useEffect(() => {
    if (target === "select") {
      searchUsers(search);
    }
  }, [target, search, searchUsers]);

  function toggleUser(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const deltaNum = parseInt(deltaStr, 10);
  const deltaValid =
    Number.isFinite(deltaNum) && deltaNum >= 1 && deltaNum <= 1000;

  function getSummary() {
    if (!deltaValid) return "—";
    if (target === "select")
      return `${selectedIds.size} 人 × ${deltaNum} EXP = ${selectedIds.size * deltaNum} EXP`;
    if (target === "all") return `所有 active 用戶 × ${deltaNum} EXP`;
    return `Lv.${minLevel}–${maxLevel} 用戶 × ${deltaNum} EXP`;
  }

  async function handleExecute() {
    if (!deltaValid) {
      toast.error("EXP 數量須為 1–1000");
      return;
    }
    setExecuting(true);
    setResult(null);
    let res;
    if (target === "select") {
      res = await batchGrantExpAction({
        userIds: Array.from(selectedIds),
        delta: deltaNum,
        source: source.trim(),
      });
    } else if (target === "all") {
      res = await grantExpToAllAction({ delta: deltaNum, source: source.trim() });
    } else {
      res = await grantExpByLevelAction({
        minLevel,
        maxLevel,
        delta: deltaNum,
        source: source.trim(),
      });
    }
    setExecuting(false);
    setShowConfirm(false);
    if (res.ok) {
      setResult(res.data);
      toast.success(`發放完成：成功 ${res.data.success} 人`);
    } else {
      toast.error(res.error);
    }
  }

  const canSubmit =
    source.trim().length > 0 &&
    deltaValid &&
    (target !== "select" || selectedIds.size > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            發放名稱（必填）
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="例：三月活動獎勵"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            EXP 數量（1–1000）
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={deltaStr}
            onChange={(e) =>
              setDeltaStr(e.target.value.replace(/[^0-9]/g, ""))
            }
            placeholder="1–1000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Target radio */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">發放對象</p>
        <div className="space-y-2">
          {([
            { key: "select" as GrantTarget, label: "勾選用戶" },
            { key: "all" as GrantTarget, label: "全體用戶", masterOnly: true },
            { key: "level" as GrantTarget, label: "指定等級範圍" },
          ]).map((opt) => {
            const disabled = opt.masterOnly && userRole !== "master";
            return (
              <label
                key={opt.key}
                className={`flex items-center gap-2 text-sm ${disabled ? "text-gray-400 cursor-not-allowed" : "text-gray-700 cursor-pointer"}`}
              >
                <input
                  type="radio"
                  name="target"
                  value={opt.key}
                  checked={target === opt.key}
                  disabled={disabled}
                  onChange={() => setTarget(opt.key)}
                  className="accent-violet-600"
                />
                {opt.label}
                {opt.masterOnly && userRole !== "master" && (
                  <span className="text-xs text-gray-400">（僅 master）</span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {target === "all" && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          將對所有 active 用戶發放，請謹慎操作
        </div>
      )}

      {target === "select" && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜尋暱稱…"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">
              已選 {selectedIds.size} 人
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
            {usersLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-gray-400 py-6 text-sm">無結果</p>
            ) : (
              users.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(u.id)}
                    onChange={() => toggleUser(u.id)}
                    className="accent-violet-600"
                  />
                  <Avatar src={u.avatar_url} nickname={u.nickname} size={28} />
                  <span className="text-sm text-gray-800">{u.nickname}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    Lv.{u.level}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {target === "level" && (
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              最低等級
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={minLevel}
              onChange={(e) => setMinLevel(Number(e.target.value))}
              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <span className="text-gray-400 mt-5">~</span>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              最高等級
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={maxLevel}
              onChange={(e) => setMaxLevel(Number(e.target.value))}
              className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          發放完成 — 成功 <strong>{result.success}</strong> 人
          {result.failed > 0 && (
            <>
              ，失敗 <strong className="text-red-600">{result.failed}</strong> 人
            </>
          )}
        </div>
      )}

      <button
        disabled={!canSubmit || executing}
        onClick={() => setShowConfirm(true)}
        className="px-6 py-2.5 rounded-full bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        確認發放
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">確認發放 EXP</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                名稱：<strong>{source}</strong>
              </p>
              <p>{getSummary()}</p>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 rounded-full text-sm text-gray-600 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleExecute}
                disabled={executing}
                className="px-5 py-2 rounded-full bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {executing ? "執行中…" : "確認發放"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// Tab 2: Grant History
// ═══════════════════════════════════════

function GrantHistoryTab() {
  const [history, setHistory] = useState<AdminExpGrantSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  useEffect(() => {
    getAdminExpGrantHistoryAction().then((res) => {
      if (res.ok) setHistory(res.data);
      else toast.error(res.error);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (history.length === 0) {
    return <p className="text-center text-gray-400 py-12">尚無發放紀錄</p>;
  }

  return (
    <div className="space-y-2">
      {history.map((h) => (
        <div
          key={h.source}
          className="rounded-xl border border-gray-200 bg-white overflow-hidden"
        >
          <button
            onClick={() =>
              setExpandedSource(expandedSource === h.source ? null : h.source)
            }
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4 text-left">
              <div>
                <p className="text-sm font-medium text-gray-900">{h.source}</p>
                <p className="text-xs text-gray-500">{fmtDate(h.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-semibold text-violet-600">
                  +{h.total_exp} EXP
                </p>
                <p className="text-xs text-gray-500">{h.total_users} 人</p>
              </div>
              {expandedSource === h.source ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </button>
          {expandedSource === h.source && (
            <ExpandedHistoryDetail source={h.source} />
          )}
        </div>
      ))}
    </div>
  );
}

function ExpandedHistoryDetail({ source }: { source: string }) {
  return (
    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
      <p className="text-xs text-gray-500">
        發放名稱「{source}」的個別用戶紀錄可在「用戶查詢」Tab 搜尋。
      </p>
    </div>
  );
}

// ═══════════════════════════════════════
// Tab 3: User EXP Query
// ═══════════════════════════════════════

function UserQueryTab() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [logs, setLogs] = useState<ExpLogRow[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsLoading, setLogsLoading] = useState(false);

  async function handleSearch() {
    if (!search.trim()) return;
    setSearching(true);
    setSelectedUser(null);
    const res = await getUsersAction({ search: search.trim(), pageSize: 20 });
    if (res.ok) setUsers(res.data.users);
    setSearching(false);
  }

  async function selectUser(u: UserRow) {
    setSelectedUser(u);
    setLogsPage(1);
    await loadLogs(u.id, 1);
  }

  async function loadLogs(userId: string, page: number) {
    setLogsLoading(true);
    const res = await getExpLogsByUserAction(userId, page);
    if (res.ok) {
      setLogs(res.data.logs);
      setLogsTotal(res.data.total);
    }
    setLogsLoading(false);
  }

  async function changePage(page: number) {
    if (!selectedUser) return;
    setLogsPage(page);
    await loadLogs(selectedUser.id, page);
  }

  const totalPages = Math.ceil(logsTotal / 20);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="輸入暱稱搜尋…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm hover:bg-gray-300 disabled:opacity-50"
        >
          {searching ? "搜尋中…" : "搜尋"}
        </button>
      </div>

      {!selectedUser && users.length > 0 && (
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-64 overflow-y-auto">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => selectUser(u)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
            >
              <Avatar src={u.avatar_url} nickname={u.nickname} size={28} />
              <span className="text-sm text-gray-800">{u.nickname}</span>
              <span className="text-xs text-gray-400 ml-auto">
                Lv.{u.level} · {u.total_exp} EXP
              </span>
            </button>
          ))}
        </div>
      )}

      {selectedUser && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
            <Avatar
              src={selectedUser.avatar_url}
              nickname={selectedUser.nickname}
              size={36}
            />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {selectedUser.nickname}
              </p>
              <p className="text-xs text-gray-500">
                Lv.{selectedUser.level} · {selectedUser.total_exp} EXP
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedUser(null);
                setLogs([]);
              }}
              className="ml-auto text-xs text-gray-500 hover:text-gray-700"
            >
              返回列表
            </button>
          </div>

          {logsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-gray-400 py-6 text-sm">
              此用戶無 EXP 紀錄
            </p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium">
                        時間
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium">
                        來源
                      </th>
                      <th className="text-right px-4 py-2.5 font-medium">
                        EXP
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium">
                        unique_key
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap text-xs">
                          {fmtDate(log.created_at)}
                        </td>
                        <td className="px-4 py-2 text-gray-700">
                          {log.source}
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-medium ${
                            log.delta_exp >= 0
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {log.delta_exp >= 0 ? "+" : ""}
                          {log.delta_exp}
                        </td>
                        <td className="px-4 py-2 text-gray-400 text-xs font-mono max-w-[200px] truncate">
                          {log.unique_key}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (p) => (
                      <button
                        key={p}
                        onClick={() => changePage(p)}
                        className={`px-3 py-1 text-sm rounded-lg ${
                          p === logsPage
                            ? "bg-violet-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
