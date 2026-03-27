"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Users,
  ScrollText,
  Loader2,
  Search,
  X,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  getAdminCoinStatsAction,
  getAdminUsersWithCoinsAction,
  getAdminCoinTransactionsAction,
  getRecentCoinTransactionsAction,
  adminAdjustCoinsAction,
} from "@/services/admin.action";
import type { UserRow, CoinTransactionRow } from "@/types/database.types";

type Tab = "stats" | "users" | "ledger";

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

const SOURCE_LABEL: Record<CoinTransactionRow["source"], string> = {
  checkin: "簽到",
  loot_box: "公會盲盒",
  admin_grant: "管理贈與",
  admin_deduct: "管理扣除",
  shop_purchase: "商城消費",
  refund: "退款",
  convert_in: "兌換入帳",
  convert_out: "兌換扣款",
  topup: "儲值",
};

export default function AdminCoinsPage() {
  const [tab, setTab] = useState<Tab>("stats");

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">🪙 金幣管理</h1>

      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
        {(
          [
            { key: "stats" as Tab, label: "全站統計", icon: BarChart3 },
            { key: "users" as Tab, label: "用戶金幣", icon: Users },
            { key: "ledger" as Tab, label: "流水帳", icon: ScrollText },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
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

      {tab === "stats" && <StatsTab />}
      {tab === "users" && <UsersTab />}
      {tab === "ledger" && <LedgerTab />}
    </div>
  );
}

type CoinStatsPayload = {
  totalPremiumCoins: number;
  totalFreeCoins: number;
  totalUsers: number;
  totalTopupAmount: number;
  totalPaidOrders: number;
};

function StatsTab() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CoinStatsPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getAdminCoinStatsAction();
    if (res.ok) setStats(res.data);
    else toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !stats) {
    return (
      <div className="flex justify-center py-16 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="全站純金總量"
          value={stats.totalPremiumCoins.toLocaleString()}
          accent="text-amber-600"
        />
        <StatCard
          title="全站探險幣總量"
          value={stats.totalFreeCoins.toLocaleString()}
          accent="text-violet-600"
        />
        <StatCard
          title="累計儲值台幣"
          value={`NT$ ${stats.totalTopupAmount.toLocaleString()}`}
          accent="text-emerald-600"
        />
        <StatCard
          title="付費訂單數"
          value={stats.totalPaidOrders.toLocaleString()}
          accent="text-blue-600"
        />
        <StatCard
          title="有效用戶數"
          value={stats.totalUsers.toLocaleString()}
          accent="text-gray-700"
        />
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
    </div>
  );
}

function UsersTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<
    (UserRow & { premium_coins: number; free_coins: number })[]
  >([]);
  const [total, setTotal] = useState(0);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selected, setSelected] = useState<
    (UserRow & { premium_coins: number; free_coins: number }) | null
  >(null);
  const [coinType, setCoinType] = useState<"premium" | "free">("free");
  const [amountStr, setAmountStr] = useState("");
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getAdminUsersWithCoinsAction({ search, page });
    if (res.ok) {
      setUsers(res.data.users);
      setTotal(res.data.total);
    } else toast.error(res.error);
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function openAdjust(u: UserRow & { premium_coins: number; free_coins: number }) {
    setSelected(u);
    setCoinType("free");
    setAmountStr("");
    setReason("");
    setPin("");
    setSheetOpen(true);
  }

  async function submitAdjust() {
    if (!selected) return;
    const amount = parseInt(amountStr, 10);
    if (!Number.isFinite(amount) || amount === 0) {
      toast.error("請輸入非零整數數量（正為贈與、負為扣除）");
      return;
    }
    if (!reason.trim()) {
      toast.error("請填寫原因");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      toast.error("請輸入四位數密碼");
      return;
    }
    setSubmitting(true);
    const res = await adminAdjustCoinsAction({
      userId: selected.id,
      coinType,
      amount,
      note: reason.trim(),
      pin,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("已調整金幣");
    setSheetOpen(false);
    void load();
  }

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="搜尋暱稱…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2">用戶</th>
                <th className="px-3 py-2 text-right">純金</th>
                <th className="px-3 py-2 text-right">探險幣</th>
                <th className="px-3 py-2 w-28">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={u.avatar_url}
                        nickname={u.nickname}
                        size={36}
                      />
                      <span className="font-medium text-gray-900 truncate max-w-[140px]">
                        {u.nickname}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                    {u.premium_coins ?? 0}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-violet-700">
                    {u.free_coins ?? 0}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => openAdjust(u)}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700"
                    >
                      調整金幣
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一頁
          </Button>
          <span>
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一頁
          </Button>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          {selected && (
            <div className="mt-2 space-y-4 text-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">調整金幣</h2>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-gray-700">
                對象：<span className="font-medium text-gray-900">{selected.nickname}</span>
              </p>
              <div>
                <label className="mb-1 block text-gray-700">幣種</label>
                <select
                  value={coinType}
                  onChange={(e) =>
                    setCoinType(e.target.value as "premium" | "free")
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                >
                  <option value="premium">純金</option>
                  <option value="free">探險幣</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-gray-700">
                  數量（正＝贈與，負＝扣除）
                </label>
                <input
                  type="number"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-gray-700">原因（必填）</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-gray-700">四位數密碼</label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900"
                />
              </div>
              <button
                type="button"
                className="w-full rounded-lg bg-violet-600 py-3 font-medium text-white hover:bg-violet-700 disabled:opacity-60"
                disabled={submitting}
                onClick={() => void submitAdjust()}
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    處理中...
                  </span>
                ) : (
                  "確認"
                )}
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LedgerTab() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pickLoading, setPickLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [candidates, setCandidates] = useState<
    (UserRow & { premium_coins: number; free_coins: number })[]
  >([]);
  const [targetUser, setTargetUser] = useState<
    (UserRow & { premium_coins: number; free_coins: number }) | null
  >(null);
  const [transactions, setTransactions] = useState<CoinTransactionRow[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<
    (CoinTransactionRow & {
      user: { nickname: string; avatar_url: string | null };
    })[]
  >([]);

  const searchUsers = useCallback(async () => {
    setPickLoading(true);
    const res = await getAdminUsersWithCoinsAction({
      search: search.trim(),
      page: 1,
    });
    if (res.ok) {
      setCandidates(res.data.users);
      if (res.data.users.length === 1) {
        setTargetUser(res.data.users[0]);
      }
    } else toast.error(res.error);
    setPickLoading(false);
  }, [search]);

  const loadTx = useCallback(async (userId: string, p: number) => {
    setTxLoading(true);
    const res = await getAdminCoinTransactionsAction(userId, p);
    if (res.ok) {
      setTransactions(res.data.transactions);
      setTxTotal(res.data.total);
    } else toast.error(res.error);
    setTxLoading(false);
  }, []);

  useEffect(() => {
    if (targetUser) void loadTx(targetUser.id, page);
  }, [targetUser, page, loadTx]);

  useEffect(() => {
    void (async () => {
      const res = await getRecentCoinTransactionsAction();
      if (res.ok) setRecentTransactions(res.data);
      else toast.error(res.error);
    })();
  }, []);

  const pageSize = 20;
  const txPages = Math.max(1, Math.ceil(txTotal / pageSize));

  return (
    <div className="space-y-4">
      <Accordion className="mb-4">
        <AccordionItem value="recent">
          <AccordionTrigger className="text-sm font-medium text-gray-700">
            📊 近三天全站明細
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-1.5 border-b border-gray-100 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">
                      {formatTaipeiTime(tx.created_at)}
                    </span>
                    <span className="text-gray-700">{tx.user.nickname}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        tx.coin_type === "premium"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-violet-100 text-violet-700"
                      }`}
                    >
                      {tx.coin_type === "premium" ? "純金" : "探險幣"}
                    </span>
                  </div>
                  <span
                    className={`font-medium ${
                      tx.amount > 0 ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount}
                  </span>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                <p className="text-xs text-gray-400 py-4 text-center">
                  近三天無交易記錄
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="搜尋用戶暱稱…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={pickLoading}
          onClick={() => void searchUsers()}
        >
          {pickLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "搜尋"}
        </Button>
      </div>

      {candidates.length > 1 && (
        <div className="rounded-lg border border-gray-200 bg-white p-2 max-h-40 overflow-y-auto text-sm">
          {candidates.map((u) => (
            <button
              key={u.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-gray-50"
              onClick={() => {
                setTargetUser(u);
                setPage(1);
              }}
            >
              <Avatar src={u.avatar_url} nickname={u.nickname} size={28} />
              {u.nickname}
            </button>
          ))}
        </div>
      )}

      {targetUser && (
        <div className="text-sm text-gray-600">
          目前查看：<span className="font-medium text-gray-900">{targetUser.nickname}</span>
        </div>
      )}

      {txLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : targetUser ? (
        <>
          <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2">時間</th>
                  <th className="px-3 py-2">幣種</th>
                  <th className="px-3 py-2">來源</th>
                  <th className="px-3 py-2 text-right">金額</th>
                  <th className="px-3 py-2 text-right">餘額</th>
                  <th className="px-3 py-2">備註</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                      {fmtDate(t.created_at)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          t.coin_type === "premium"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-violet-100 text-violet-800"
                        }`}
                      >
                        {t.coin_type === "premium" ? "純金" : "探險幣"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs">
                        {SOURCE_LABEL[t.source] ?? t.source}
                      </span>
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-medium tabular-nums ${
                        t.amount >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {t.amount >= 0 ? "+" : ""}
                      {t.amount}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-800">
                      {t.balance_after}
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">
                      {t.note ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {txPages > 1 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                上一頁
              </Button>
              <span>
                {page} / {txPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= txPages}
                onClick={() => setPage((p) => p + 1)}
              >
                下一頁
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-500">請搜尋並選擇用戶以查看流水帳。</p>
      )}
    </div>
  );
}
