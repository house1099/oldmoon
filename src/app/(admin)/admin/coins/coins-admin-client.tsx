"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  adminAdjustCoinsAction,
  getAdminCoinStatsAction,
  getAdminUsersWithCoinsAction,
} from "@/services/admin.action";
import type { UserRow } from "@/lib/repositories/server/user.repository";

type UserWithCoins = UserRow & { premium_coins: number; free_coins: number };

const PAGE_SIZE = 20;

export default function CoinsAdminClient() {
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalFreeCoins: number;
    totalPremiumCoins: number;
    totalUsers: number;
  } | null>(null);

  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);
  const [users, setUsers] = useState<UserWithCoins[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);

  const [adjustUser, setAdjustUser] = useState<UserWithCoins | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustPin, setAdjustPin] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    const res = await getAdminCoinStatsAction();
    if (!res.ok) {
      toast.error(res.error);
      setStats(null);
    } else {
      setStats({
        totalFreeCoins: res.data.totalFreeCoins,
        totalPremiumCoins: res.data.totalPremiumCoins,
        totalUsers: res.data.totalUsers,
      });
    }
    setStatsLoading(false);
  }, []);

  const loadUsers = useCallback(async () => {
    setListLoading(true);
    const res = await getAdminUsersWithCoinsAction({ search, page });
    if (!res.ok) {
      toast.error(res.error);
      setUsers([]);
      setTotalUsers(0);
    } else {
      setUsers(res.data.users);
      setTotalUsers(res.data.total);
    }
    setListLoading(false);
  }, [search, page]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE));

  async function submitAdjust() {
    if (!adjustUser) return;
    const amount = parseInt(adjustAmount, 10);
    if (!Number.isFinite(amount) || amount === 0) {
      toast.error("調整數量須為非 0 整數");
      return;
    }
    const note = adjustNote.trim();
    if (!note) {
      toast.error("請填寫原因");
      return;
    }
    const pin = adjustPin.trim();
    if (!/^\d{4}$/.test(pin)) {
      toast.error("請輸入四位數密碼");
      return;
    }
    setAdjustSaving(true);
    const res = await adminAdjustCoinsAction({
      userId: adjustUser.id,
      coinType: "premium",
      amount,
      note,
      pin,
    });
    setAdjustSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("純金已調整");
    setAdjustUser(null);
    setAdjustAmount("");
    setAdjustNote("");
    setAdjustPin("");
    void loadStats();
    void loadUsers();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">財務管理（金幣）</h1>
      <p className="text-sm text-gray-500">
        全站探險幣／純金統計；可依暱稱搜尋用戶並手動調整<strong>純金</strong>（需後台金幣密碼）。
      </p>

      {statsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : stats ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-violet-600">
              {stats.totalFreeCoins}
            </p>
            <p className="mt-1 text-xs text-gray-500">全站總探險幣</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-amber-600">
              {stats.totalPremiumCoins}
            </p>
            <p className="mt-1 text-xs text-gray-500">全站總純金</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-gray-800">
              {stats.totalUsers}
            </p>
            <p className="mt-1 text-xs text-gray-500">用戶數</p>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-2">
          <label className="block min-w-[12rem] flex-1 text-sm text-gray-700">
            搜尋暱稱
            <input
              type="text"
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="輸入關鍵字…"
            />
          </label>
          <button
            type="button"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
            onClick={() => {
              setPage(1);
              setSearch(searchDraft.trim());
            }}
          >
            搜尋
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        {listLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">暱稱</th>
                <th className="px-3 py-2">探險幣</th>
                <th className="px-3 py-2">純金</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2 font-medium text-gray-900">{u.nickname}</td>
                  <td className="px-3 py-2 tabular-nums text-violet-700">
                    {u.free_coins}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-amber-700">
                    {u.premium_coins}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="text-xs font-medium text-violet-600 hover:underline"
                      onClick={() => {
                        setAdjustUser(u);
                        setAdjustAmount("");
                        setAdjustNote("");
                        setAdjustPin("");
                      }}
                    >
                      調整純金
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-gray-400">
                    沒有符合的用戶
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
          <button
            type="button"
            disabled={page <= 1}
            className="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            上一頁
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            className="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            下一頁
          </button>
        </div>
      )}

      {adjustUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">
              調整純金 — {adjustUser.nickname}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              正數為贈與、負數為扣除；需四位數後台金幣密碼。
            </p>
            <label className="mt-3 block text-sm text-gray-700">
              調整量（純金）
              <input
                type="text"
                inputMode="numeric"
                value={adjustAmount}
                onChange={(e) =>
                  setAdjustAmount(e.target.value.replace(/[^0-9-]/g, ""))
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="例如 100 或 -50"
              />
            </label>
            <label className="mt-2 block text-sm text-gray-700">
              原因（必填）
              <input
                type="text"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <label className="mt-2 block text-sm text-gray-700">
              四位數密碼
              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                value={adjustPin}
                onChange={(e) => setAdjustPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
                onClick={() => setAdjustUser(null)}
                disabled={adjustSaving}
              >
                取消
              </button>
              <button
                type="button"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                disabled={adjustSaving}
                onClick={() => void submitAdjust()}
              >
                {adjustSaving ? "處理中…" : "確認"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
