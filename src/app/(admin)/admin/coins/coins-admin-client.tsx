"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  adjustCoinsAction,
  getAdminCoinLedgerAction,
  getAdminCoinStatsAction,
  getAdminUsersWithCoinsAction,
} from "@/services/admin.action";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import type { CoinTransactionRow } from "@/types/database.types";
import type { CoinLedgerTxCategory } from "@/lib/repositories/server/coin.repository";

type UserWithCoins = UserRow & { premium_coins: number; free_coins: number };

type LedgerRow = CoinTransactionRow & { user_nickname: string };

const SEARCH_PAGE_SIZE = 20;
const LEDGER_PAGE_SIZE = 100;

const TX_CATEGORY_OPTIONS: { value: CoinLedgerTxCategory; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "checkin", label: "簽到" },
  { value: "purchase", label: "購買" },
  { value: "admin", label: "調整" },
  { value: "convert", label: "轉換" },
  { value: "consume", label: "消耗" },
];

function sourceToCategory(source: string): CoinLedgerTxCategory {
  if (source === "checkin") return "checkin";
  if (source === "shop_purchase" || source === "topup" || source === "refund") {
    return "purchase";
  }
  if (
    source === "admin_grant" ||
    source === "admin_deduct" ||
    source === "admin_adjust"
  ) {
    return "admin";
  }
  if (source === "convert_in" || source === "convert_out") return "convert";
  if (source === "loot_box") return "consume";
  return "all";
}

function txTypeBadgeLabel(source: CoinTransactionRow["source"]): string {
  const c = sourceToCategory(source);
  return TX_CATEGORY_OPTIONS.find((o) => o.value === c)?.label ?? source;
}

function coinTypeLabel(t: "premium" | "free"): string {
  return t === "premium" ? "純金" : "探險幣";
}

function formatTaipei(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export default function CoinsAdminClient() {
  const [tab, setTab] = useState<"adjust" | "ledger">("adjust");

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

  const [selectedUser, setSelectedUser] = useState<UserWithCoins | null>(null);
  const [coinType, setCoinType] = useState<"premium" | "free">("free");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustSaving, setAdjustSaving] = useState(false);

  const [ledgerUserSearch, setLedgerUserSearch] = useState("");
  const [ledgerUserDraft, setLedgerUserDraft] = useState("");
  const [ledgerCoinFilter, setLedgerCoinFilter] = useState<
    "all" | "premium" | "free"
  >("all");
  const [ledgerTxFilter, setLedgerTxFilter] =
    useState<CoinLedgerTxCategory>("all");
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);

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

  const loadLedger = useCallback(async () => {
    setLedgerLoading(true);
    const res = await getAdminCoinLedgerAction({
      userSearch: ledgerUserSearch.trim() || undefined,
      coinType: ledgerCoinFilter,
      txCategory: ledgerTxFilter,
      page: ledgerPage,
    });
    if (!res.ok) {
      toast.error(res.error);
      setLedgerRows([]);
      setLedgerTotal(0);
    } else {
      setLedgerRows(res.data.rows);
      setLedgerTotal(res.data.total);
    }
    setLedgerLoading(false);
  }, [ledgerUserSearch, ledgerCoinFilter, ledgerTxFilter, ledgerPage]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (tab !== "adjust") return;
    void loadUsers();
  }, [loadUsers, tab]);

  useEffect(() => {
    if (tab !== "ledger") return;
    void loadLedger();
  }, [loadLedger, tab]);

  const searchTotalPages = Math.max(1, Math.ceil(totalUsers / SEARCH_PAGE_SIZE));
  const ledgerTotalPages = Math.max(1, Math.ceil(ledgerTotal / LEDGER_PAGE_SIZE));

  async function submitAdjust() {
    if (!selectedUser) return;
    const trimmed = adjustAmount.trim();
    if (!/^-?\d+$/.test(trimmed)) {
      toast.error("請輸入整數（可含負號於開頭）");
      return;
    }
    const amount = parseInt(trimmed, 10);
    if (!Number.isFinite(amount) || amount === 0) {
      toast.error("調整數量須為非 0 整數");
      return;
    }
    const note = adjustNote.trim();
    if (!note) {
      toast.error("請填寫原因說明");
      return;
    }
    setAdjustSaving(true);
    const res = await adjustCoinsAction({
      userId: selectedUser.id,
      coinType,
      amount,
      note,
    });
    setAdjustSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`${coinTypeLabel(coinType)}已調整，並已寫入金流紀錄`);
    setSelectedUser(null);
    setAdjustAmount("");
    setAdjustNote("");
    void loadStats();
    void loadUsers();
    if (tab === "ledger") void loadLedger();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">財務管理（金幣）</h1>
      <p className="text-sm text-gray-500">
        全站探險幣／純金統計；金幣調整與金流紀錄查詢（master／moderator 可檢視金流）。
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

      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "adjust"
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setTab("adjust")}
        >
          金幣調整
        </button>
        <button
          type="button"
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "ledger"
              ? "border-violet-600 text-violet-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setTab("ledger")}
        >
          金流紀錄
        </button>
      </div>

      {tab === "adjust" ? (
        <>
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
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {u.nickname}
                      </td>
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
                            setSelectedUser(u);
                            setAdjustAmount("");
                            setAdjustNote("");
                            setCoinType("free");
                          }}
                        >
                          選擇並調整
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

          {searchTotalPages > 1 && (
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
                {page} / {searchTotalPages}
              </span>
              <button
                type="button"
                disabled={page >= searchTotalPages}
                className="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(searchTotalPages, p + 1))}
              >
                下一頁
              </button>
            </div>
          )}

          {selectedUser ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900">
                  金幣調整 — {selectedUser.nickname}
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-violet-50 px-3 py-2">
                    <p className="text-xs text-gray-500">探險幣餘額</p>
                    <p className="font-semibold tabular-nums text-violet-700">
                      {selectedUser.free_coins}
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-50 px-3 py-2">
                    <p className="text-xs text-gray-500">純金餘額</p>
                    <p className="font-semibold tabular-nums text-amber-700">
                      {selectedUser.premium_coins}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  正數為增加、負數為扣除；扣除時若餘額不足將無法完成。
                </p>
                <label className="mt-3 block text-sm text-gray-700">
                  幣種
                  <select
                    value={coinType}
                    onChange={(e) =>
                      setCoinType(e.target.value as "premium" | "free")
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="free">探險幣</option>
                    <option value="premium">純金</option>
                  </select>
                </label>
                <label className="mt-2 block text-sm text-gray-700">
                  數量（整數，可為負）
                  <input
                    type="text"
                    inputMode="numeric"
                    value={adjustAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d-]/g, "");
                      const neg = raw.startsWith("-") ? "-" : "";
                      const digits = raw.replace(/-/g, "");
                      setAdjustAmount(neg + digits);
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                    placeholder="例如 100 或 -50"
                  />
                </label>
                <p className="mt-1 text-xs text-gray-400">
                  僅允許整數；負號僅能出現在開頭。
                </p>
                <label className="mt-2 block text-sm text-gray-700">
                  原因說明（必填）
                  <input
                    type="text"
                    value={adjustNote}
                    onChange={(e) => setAdjustNote(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
                    onClick={() => setSelectedUser(null)}
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
                    {adjustSaving ? "處理中…" : "確認調整"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-end gap-3">
              <label className="block min-w-[10rem] flex-1 text-sm text-gray-700">
                用戶暱稱（空白＝全部）
                <input
                  type="text"
                  value={ledgerUserDraft}
                  onChange={(e) => setLedgerUserDraft(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="關鍵字…"
                />
              </label>
              <label className="block text-sm text-gray-700">
                幣種
                <select
                  value={ledgerCoinFilter}
                  onChange={(e) =>
                    setLedgerCoinFilter(e.target.value as "all" | "premium" | "free")
                  }
                  className="mt-1 block w-full min-w-[8rem] rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="all">全部</option>
                  <option value="free">探險幣</option>
                  <option value="premium">純金</option>
                </select>
              </label>
              <label className="block text-sm text-gray-700">
                交易類型
                <select
                  value={ledgerTxFilter}
                  onChange={(e) =>
                    setLedgerTxFilter(e.target.value as CoinLedgerTxCategory)
                  }
                  className="mt-1 block w-full min-w-[8rem] rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {TX_CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                onClick={() => {
                  setLedgerPage(1);
                  setLedgerUserSearch(ledgerUserDraft.trim());
                }}
              >
                套用篩選
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              每頁最多 {LEDGER_PAGE_SIZE} 筆，依時間新→舊排序（台北時間顯示）。
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            {ledgerLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2">時間</th>
                    <th className="px-3 py-2">用戶</th>
                    <th className="px-3 py-2">類型</th>
                    <th className="px-3 py-2">幣種</th>
                    <th className="px-3 py-2">金額</th>
                    <th className="px-3 py-2">說明／來源</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ledgerRows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/60">
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600">
                        {formatTaipei(row.created_at)}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {row.user_nickname}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                          {txTypeBadgeLabel(row.source)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.coin_type === "premium"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-violet-100 text-violet-900"
                          }`}
                        >
                          {coinTypeLabel(row.coin_type)}
                        </span>
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-medium tabular-nums ${
                          row.amount >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {row.amount >= 0 ? `+${row.amount}` : row.amount}
                      </td>
                      <td className="max-w-[14rem] px-3 py-2 text-gray-600">
                        <span className="line-clamp-2 break-words">
                          {row.note?.trim() || row.source}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {ledgerRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-gray-400">
                        沒有符合的紀錄
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {ledgerTotalPages > 1 && (
            <div className="flex items-center justify-center gap-3 text-sm text-gray-600">
              <button
                type="button"
                disabled={ledgerPage <= 1}
                className="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40"
                onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
              >
                上一頁
              </button>
              <span>
                {ledgerPage} / {ledgerTotalPages}
              </span>
              <button
                type="button"
                disabled={ledgerPage >= ledgerTotalPages}
                className="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40"
                onClick={() =>
                  setLedgerPage((p) => Math.min(ledgerTotalPages, p + 1))
                }
              >
                下一頁
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
