"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import type { MarketListingWithDetail } from "@/lib/repositories/server/market-listing.repository";
import type { MarketListingStatus } from "@/types/database.types";
import {
  adminCancelListingAction,
  getAllListingsForAdminAction,
  getMarketSettingsSnapshotAction,
  getMarketStatsAction,
  getSoldListingsForAdminAction,
  getSuspiciousListingsAction,
  updateMarketSettingsAction,
} from "@/services/market-listing.action";

const PAGE_SIZE = 20;

type TabId = "board" | "listings" | "sold" | "alerts" | "settings";

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

function currencyLabel(t: "free_coins" | "premium_coins"): string {
  return t === "premium_coins" ? "純金" : "探險幣";
}

function statusLabel(s: MarketListingStatus): string {
  switch (s) {
    case "active":
      return "上架中";
    case "sold":
      return "已售出";
    case "cancelled":
      return "已下架";
    case "expired":
      return "已過期";
    default:
      return s;
  }
}

function statusBadgeClass(s: MarketListingStatus): string {
  switch (s) {
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "sold":
      return "bg-blue-100 text-blue-800";
    case "cancelled":
      return "bg-zinc-200 text-zinc-700";
    case "expired":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function MarketAdminClient({ role }: { role: string }) {
  const isMaster = role === "master";
  const [tab, setTab] = useState<TabId>("board");

  const [stats, setStats] = useState<{
    activeCount: number;
    todaySoldCount: number;
    totalSoldAmount: { free: number; premium: number };
    suspiciousCount: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [snapshot, setSnapshot] = useState<{
    market_tax_rate: string | null;
    market_max_listings_per_user: string | null;
    market_listing_days: string | null;
    market_enabled: string | null;
  } | null>(null);

  const [marketCloseOpen, setMarketCloseOpen] = useState(false);
  const [marketOpenOpen, setMarketOpenOpen] = useState(false);
  const [marketBusy, setMarketBusy] = useState(false);

  const [listSellerDraft, setListSellerDraft] = useState("");
  const [listItemDraft, setListItemDraft] = useState("");
  const [listStatus, setListStatus] = useState<
    "all" | MarketListingStatus
  >("all");
  const [listSeller, setListSeller] = useState("");
  const [listItem, setListItem] = useState("");
  const [listPage, setListPage] = useState(1);
  const [listRows, setListRows] = useState<MarketListingWithDetail[]>([]);
  const [listTotal, setListTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);

  const [soldSellerDraft, setSoldSellerDraft] = useState("");
  const [soldBuyerDraft, setSoldBuyerDraft] = useState("");
  const [soldSeller, setSoldSeller] = useState("");
  const [soldBuyer, setSoldBuyer] = useState("");
  const [soldPage, setSoldPage] = useState(1);
  const [soldRows, setSoldRows] = useState<MarketListingWithDetail[]>([]);
  const [soldTotal, setSoldTotal] = useState(0);
  const [soldLoading, setSoldLoading] = useState(false);

  const [suspicious, setSuspicious] = useState<MarketListingWithDetail[]>([]);
  const [suspiciousLoading, setSuspiciousLoading] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<MarketListingWithDetail | null>(
    null,
  );
  const [cancelReasonDraft, setCancelReasonDraft] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);

  const [taxStr, setTaxStr] = useState("");
  const [maxListStr, setMaxListStr] = useState("");
  const [daysStr, setDaysStr] = useState("");
  const [savingKey, setSavingKey] = useState<
    null | "tax" | "max" | "days"
  >(null);

  const loadSnapshot = useCallback(async () => {
    try {
      const s = await getMarketSettingsSnapshotAction();
      setSnapshot(s);
    } catch (e) {
      console.error(e);
      toast.error("讀取設定失敗");
    }
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const s = await getMarketStatsAction();
      setStats(s);
    } catch (e) {
      console.error(e);
      toast.error("讀取統計失敗");
      setStats(null);
    }
    setStatsLoading(false);
  }, []);

  const loadListings = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await getAllListingsForAdminAction({
        sellerNickname: listSeller.trim() || undefined,
        itemName: listItem.trim() || undefined,
        status: listStatus,
        page: listPage,
        pageSize: PAGE_SIZE,
      });
      setListRows(res.data);
      setListTotal(res.total);
    } catch (e) {
      console.error(e);
      toast.error("讀取上架列表失敗");
      setListRows([]);
      setListTotal(0);
    }
    setListLoading(false);
  }, [listSeller, listItem, listStatus, listPage]);

  const loadSold = useCallback(async () => {
    setSoldLoading(true);
    try {
      const res = await getSoldListingsForAdminAction({
        sellerNickname: soldSeller.trim() || undefined,
        buyerNickname: soldBuyer.trim() || undefined,
        page: soldPage,
        pageSize: PAGE_SIZE,
      });
      setSoldRows(res.data);
      setSoldTotal(res.total);
    } catch (e) {
      console.error(e);
      toast.error("讀取成交紀錄失敗");
      setSoldRows([]);
      setSoldTotal(0);
    }
    setSoldLoading(false);
  }, [soldSeller, soldBuyer, soldPage]);

  const loadSuspicious = useCallback(async () => {
    setSuspiciousLoading(true);
    try {
      const rows = await getSuspiciousListingsAction();
      setSuspicious(rows);
    } catch (e) {
      console.error(e);
      toast.error("讀取異常列表失敗");
      setSuspicious([]);
    }
    setSuspiciousLoading(false);
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (tab !== "board") return;
    void loadStats();
    void loadSnapshot();
  }, [tab, loadStats, loadSnapshot]);

  useEffect(() => {
    if (tab !== "listings") return;
    void loadListings();
  }, [tab, loadListings]);

  useEffect(() => {
    if (tab !== "sold") return;
    void loadSold();
  }, [tab, loadSold]);

  useEffect(() => {
    if (tab !== "alerts") return;
    void loadSuspicious();
  }, [tab, loadSuspicious]);

  useEffect(() => {
    if (tab !== "settings") return;
    void loadSnapshot();
  }, [tab, loadSnapshot]);

  useEffect(() => {
    if (tab !== "settings" || !snapshot) return;
    setTaxStr(snapshot.market_tax_rate ?? "");
    setMaxListStr(snapshot.market_max_listings_per_user ?? "");
    setDaysStr(snapshot.market_listing_days ?? "");
  }, [tab, snapshot]);

  const marketEnabled = snapshot?.market_enabled !== "false";
  const listTotalPages = Math.max(1, Math.ceil(listTotal / PAGE_SIZE));
  const soldTotalPages = Math.max(1, Math.ceil(soldTotal / PAGE_SIZE));

  async function applyMarketEnabled(enabled: boolean) {
    setMarketBusy(true);
    const r = await updateMarketSettingsAction({ market_enabled: enabled });
    setMarketBusy(false);
    setMarketCloseOpen(false);
    setMarketOpenOpen(false);
    if (!r.ok) {
      toast.error("更新失敗");
      return;
    }
    toast.success(enabled ? "已開放拍賣場" : "已關閉拍賣場");
    void loadSnapshot();
  }

  async function confirmForceCancel() {
    if (!cancelTarget || cancelBusy) return;
    setCancelBusy(true);
    const r = await adminCancelListingAction(cancelTarget.id);
    setCancelBusy(false);
    setCancelTarget(null);
    setCancelReasonDraft("");
    if (!r.ok) {
      toast.error(r.error ?? "下架失敗");
      return;
    }
    toast.success("已強制下架");
    void loadStats();
    void loadListings();
    void loadSuspicious();
  }

  function filterIntInput(raw: string): string {
    return raw.replace(/\D/g, "");
  }

  async function saveTax() {
    const n = parseInt(taxStr.trim(), 10);
    if (!Number.isFinite(n) || n < 0 || n > 20) {
      toast.error("手續費率須為 0–20 的整數");
      return;
    }
    setSavingKey("tax");
    const r = await updateMarketSettingsAction({ market_tax_rate: n });
    setSavingKey(null);
    if (!r.ok) {
      toast.error("儲存失敗");
      return;
    }
    toast.success("已更新手續費率");
    void loadSnapshot();
  }

  async function saveMaxListings() {
    const n = parseInt(maxListStr.trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 20) {
      toast.error("上限須為 1–20 的整數");
      return;
    }
    setSavingKey("max");
    const r = await updateMarketSettingsAction({
      market_max_listings_per_user: n,
    });
    setSavingKey(null);
    if (!r.ok) {
      toast.error("儲存失敗");
      return;
    }
    toast.success("已更新上架上限");
    void loadSnapshot();
  }

  async function saveListingDays() {
    const n = parseInt(daysStr.trim(), 10);
    if (!Number.isFinite(n) || n < 1 || n > 30) {
      toast.error("天數須為 1–30 的整數");
      return;
    }
    setSavingKey("days");
    const r = await updateMarketSettingsAction({ market_listing_days: n });
    setSavingKey(null);
    if (!r.ok) {
      toast.error("儲存失敗");
      return;
    }
    toast.success("已更新上架天數");
    void loadSnapshot();
  }

  function listingCard(row: MarketListingWithDetail, showActions: boolean) {
    return (
      <div
        key={row.id}
        className="rounded-lg border border-gray-200 bg-white p-3 text-sm md:hidden"
      >
        <p className="font-medium text-gray-900">{row.shop_item.label}</p>
        <p className="text-xs text-gray-500">{row.shop_item.item_type}</p>
        <p className="mt-1 text-gray-700">賣家：{row.seller.nickname}</p>
        <p className="tabular-nums text-violet-700">
          {row.price} {currencyLabel(row.currency_type)}
        </p>
        <span
          className={`mt-1 inline-block rounded px-2 py-0.5 text-xs ${statusBadgeClass(row.status)}`}
        >
          {statusLabel(row.status)}
        </span>
        <p className="mt-1 text-xs text-gray-500">
          上架：{formatTaipei(row.created_at)}
        </p>
        {showActions && row.status === "active" ? (
          <Button
            type="button"
            variant="outlineLight"
            size="sm"
            className="mt-2 border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => setCancelTarget(row)}
          >
            強制下架
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">市場管理</h1>
      <p className="text-sm text-gray-500">
        玩家自由市場監控、上架與成交查詢；強制下架與系統參數（領袖專用）。
      </p>

      <div className="flex flex-wrap gap-1 border-b border-gray-200">
        {(
          [
            ["board", "監控看板"],
            ["listings", "上架管理"],
            ["sold", "成交紀錄"],
            ["alerts", "異常警報"],
            ["settings", "系統設定"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "board" ? (
        <>
          {statsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : stats ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-3xl font-bold tabular-nums text-violet-600">
                  {stats.activeCount}
                </p>
                <p className="mt-1 text-xs text-gray-500">上架中</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-3xl font-bold tabular-nums text-gray-900">
                  {stats.todaySoldCount}
                </p>
                <p className="mt-1 text-xs text-gray-500">今日成交</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-3xl font-bold tabular-nums text-violet-600">
                  {stats.totalSoldAmount.free} 🪙
                </p>
                <p className="mt-1 text-xs text-gray-500">探險幣總成交</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-center">
                <p className="text-3xl font-bold tabular-nums text-amber-600">
                  {stats.totalSoldAmount.premium} 💎
                </p>
                <p className="mt-1 text-xs text-gray-500">純金總成交</p>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-800">拍賣場狀態</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  marketEnabled
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {marketEnabled ? "開放中" : "已關閉"}
              </span>
              {isMaster ? (
                marketEnabled ? (
                  <Button
                    type="button"
                    variant="outlineLight"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => setMarketCloseOpen(true)}
                  >
                    關閉拍賣場
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="bg-violet-600 text-white hover:bg-violet-700"
                    onClick={() => setMarketOpenOpen(true)}
                  >
                    開放拍賣場
                  </Button>
                )
              ) : null}
            </div>
          </div>

          {stats && stats.suspiciousCount > 0 ? (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
              ⚠️ 有 {stats.suspiciousCount}{" "}
              筆疑似異常交易，請至「異常警報」Tab 查看
            </div>
          ) : null}
        </>
      ) : null}

      {tab === "listings" ? (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-end gap-2">
              <label className="block min-w-[8rem] flex-1 text-sm text-gray-700">
                賣家暱稱
                <input
                  type="text"
                  value={listSellerDraft}
                  onChange={(e) => setListSellerDraft(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="關鍵字…"
                />
              </label>
              <label className="block min-w-[8rem] flex-1 text-sm text-gray-700">
                道具名稱
                <input
                  type="text"
                  value={listItemDraft}
                  onChange={(e) => setListItemDraft(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="關鍵字…"
                />
              </label>
              <label className="block min-w-[6rem] text-sm text-gray-700">
                狀態
                <select
                  value={listStatus}
                  onChange={(e) =>
                    setListStatus(e.target.value as typeof listStatus)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="all">全部</option>
                  <option value="active">上架中</option>
                  <option value="sold">已售出</option>
                  <option value="cancelled">已下架</option>
                  <option value="expired">已過期</option>
                </select>
              </label>
              <button
                type="button"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                onClick={() => {
                  setListPage(1);
                  setListSeller(listSellerDraft.trim());
                  setListItem(listItemDraft.trim());
                }}
              >
                搜尋
              </button>
            </div>
          </div>

          {listLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2">道具名稱</th>
                      <th className="px-3 py-2">類型</th>
                      <th className="px-3 py-2">賣家</th>
                      <th className="px-3 py-2">價格</th>
                      <th className="px-3 py-2">狀態</th>
                      <th className="px-3 py-2">上架時間</th>
                      <th className="px-3 py-2">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {listRows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/60">
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {row.shop_item.label}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {row.shop_item.item_type}
                        </td>
                        <td className="px-3 py-2">{row.seller.nickname}</td>
                        <td className="px-3 py-2 tabular-nums text-violet-700">
                          {row.price} {currencyLabel(row.currency_type)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${statusBadgeClass(row.status)}`}
                          >
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {formatTaipei(row.created_at)}
                        </td>
                        <td className="px-3 py-2">
                          {row.status === "active" ? (
                            <button
                              type="button"
                              className="text-xs font-medium text-red-600 hover:underline"
                              onClick={() => setCancelTarget(row)}
                            >
                              強制下架
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 md:hidden">
                {listRows.map((row) => listingCard(row, true))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-500">
                  共 {listTotal} 筆，第 {listPage} / {listTotalPages} 頁
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outlineLight"
                    size="sm"
                    disabled={listPage <= 1}
                    onClick={() => setListPage((p) => Math.max(1, p - 1))}
                  >
                    上一頁
                  </Button>
                  <Button
                    type="button"
                    variant="outlineLight"
                    size="sm"
                    disabled={listPage >= listTotalPages}
                    onClick={() =>
                      setListPage((p) => Math.min(listTotalPages, p + 1))
                    }
                  >
                    下一頁
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      ) : null}

      {tab === "sold" ? (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex flex-wrap items-end gap-2">
              <label className="block min-w-[8rem] flex-1 text-sm text-gray-700">
                賣家暱稱
                <input
                  type="text"
                  value={soldSellerDraft}
                  onChange={(e) => setSoldSellerDraft(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block min-w-[8rem] flex-1 text-sm text-gray-700">
                買家暱稱
                <input
                  type="text"
                  value={soldBuyerDraft}
                  onChange={(e) => setSoldBuyerDraft(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <button
                type="button"
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
                onClick={() => {
                  setSoldPage(1);
                  setSoldSeller(soldSellerDraft.trim());
                  setSoldBuyer(soldBuyerDraft.trim());
                }}
              >
                搜尋
              </button>
            </div>
          </div>

          {soldLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2">道具名稱</th>
                      <th className="px-3 py-2">賣家</th>
                      <th className="px-3 py-2">買家</th>
                      <th className="px-3 py-2">成交價</th>
                      <th className="px-3 py-2">賣家實收</th>
                      <th className="px-3 py-2">成交時間</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {soldRows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/60">
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {row.shop_item.label}
                        </td>
                        <td className="px-3 py-2">{row.seller.nickname}</td>
                        <td className="px-3 py-2">
                          {row.buyer?.nickname ?? "—"}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-violet-700">
                          {row.price} {currencyLabel(row.currency_type)}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-emerald-700">
                          {row.seller_received ?? "—"}{" "}
                          {currencyLabel(row.currency_type)}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {row.sold_at ? formatTaipei(row.sold_at) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 md:hidden">
                {soldRows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-lg border border-gray-200 bg-white p-3 text-sm"
                  >
                    <p className="font-medium">{row.shop_item.label}</p>
                    <p className="text-gray-700">
                      賣家 {row.seller.nickname} → 買家{" "}
                      {row.buyer?.nickname ?? "—"}
                    </p>
                    <p className="tabular-nums text-violet-700">
                      成交 {row.price} {currencyLabel(row.currency_type)}
                    </p>
                    <p className="tabular-nums text-emerald-700">
                      實收 {row.seller_received ?? "—"}{" "}
                      {currencyLabel(row.currency_type)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {row.sold_at ? formatTaipei(row.sold_at) : "—"}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gray-500">
                  共 {soldTotal} 筆，第 {soldPage} / {soldTotalPages} 頁
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outlineLight"
                    size="sm"
                    disabled={soldPage <= 1}
                    onClick={() => setSoldPage((p) => Math.max(1, p - 1))}
                  >
                    上一頁
                  </Button>
                  <Button
                    type="button"
                    variant="outlineLight"
                    size="sm"
                    disabled={soldPage >= soldTotalPages}
                    onClick={() =>
                      setSoldPage((p) => Math.min(soldTotalPages, p + 1))
                    }
                  >
                    下一頁
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      ) : null}

      {tab === "alerts" ? (
        <>
          <p className="text-sm text-gray-600">
            以下為價格 ≤ 1 或 &gt; 99,999 的上架單，請人工審查。
          </p>
          {suspiciousLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : suspicious.length === 0 ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              ✅ 目前沒有異常交易
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2">道具名稱</th>
                      <th className="px-3 py-2">賣家</th>
                      <th className="px-3 py-2">價格</th>
                      <th className="px-3 py-2">狀態</th>
                      <th className="px-3 py-2">上架時間</th>
                      <th className="px-3 py-2">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {suspicious.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/60">
                        <td className="px-3 py-2 font-medium text-gray-900">
                          {row.shop_item.label}
                        </td>
                        <td className="px-3 py-2">{row.seller.nickname}</td>
                        <td className="px-3 py-2 tabular-nums text-violet-700">
                          {row.price} {currencyLabel(row.currency_type)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs ${statusBadgeClass(row.status)}`}
                          >
                            {statusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {formatTaipei(row.created_at)}
                        </td>
                        <td className="px-3 py-2">
                          {row.status === "active" ? (
                            <button
                              type="button"
                              className="text-xs font-medium text-red-600 hover:underline"
                              onClick={() => setCancelTarget(row)}
                            >
                              強制下架
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 md:hidden">
                {suspicious.map((row) => listingCard(row, true))}
              </div>
            </>
          )}
        </>
      ) : null}

      {tab === "settings" ? (
        <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-4">
          {!isMaster ? (
            <p className="text-sm text-amber-800">
              僅領袖可修改系統參數；以下為目前設定值。
            </p>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-800">
              手續費率（market_tax_rate）
            </label>
            <p className="text-xs text-gray-500">0 = 免手續費，最高 20</p>
            <div className="flex flex-wrap items-end gap-2">
              <input
                type="text"
                inputMode="numeric"
                disabled={!isMaster}
                value={taxStr}
                onChange={(e) => setTaxStr(filterIntInput(e.target.value))}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                placeholder="0–20"
              />
              {isMaster ? (
                <Button
                  type="button"
                  className="bg-violet-600 text-white hover:bg-violet-700"
                  disabled={savingKey === "tax"}
                  onClick={() => void saveTax()}
                >
                  {savingKey === "tax" ? "儲存中…" : "儲存"}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-800">
              每人上架上限（market_max_listings_per_user）
            </label>
            <p className="text-xs text-gray-500">
              同時最多可上架幾件道具（1–20）
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <input
                type="text"
                inputMode="numeric"
                disabled={!isMaster}
                value={maxListStr}
                onChange={(e) => setMaxListStr(filterIntInput(e.target.value))}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                placeholder="1–20"
              />
              {isMaster ? (
                <Button
                  type="button"
                  className="bg-violet-600 text-white hover:bg-violet-700"
                  disabled={savingKey === "max"}
                  onClick={() => void saveMaxListings()}
                >
                  {savingKey === "max" ? "儲存中…" : "儲存"}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-800">
              上架天數（market_listing_days）
            </label>
            <p className="text-xs text-gray-500">
              道具上架後幾天自動到期（1–30）
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <input
                type="text"
                inputMode="numeric"
                disabled={!isMaster}
                value={daysStr}
                onChange={(e) => setDaysStr(filterIntInput(e.target.value))}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                placeholder="1–30"
              />
              {isMaster ? (
                <Button
                  type="button"
                  className="bg-violet-600 text-white hover:bg-violet-700"
                  disabled={savingKey === "days"}
                  onClick={() => void saveListingDays()}
                >
                  {savingKey === "days" ? "儲存中…" : "儲存"}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 text-sm text-gray-600">
            <p className="font-medium text-gray-800">目前設定值</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>
                手續費率：{snapshot?.market_tax_rate ?? "（未設定）"}
              </li>
              <li>
                上架上限：{snapshot?.market_max_listings_per_user ?? "（未設定）"}
              </li>
              <li>
                上架天數：{snapshot?.market_listing_days ?? "（未設定）"}
              </li>
              <li>
                拍賣場：{" "}
                {snapshot?.market_enabled === "false" ? "已關閉" : "開放中"}
              </li>
            </ul>
          </div>
        </div>
      ) : null}

      <AlertDialog open={marketCloseOpen} onOpenChange={setMarketCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>關閉拍賣場？</AlertDialogTitle>
            <AlertDialogDescription>
              玩家將無法上架與購買市集道具，直到再次開放。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={marketBusy}
              onClick={(e) => {
                e.preventDefault();
                void applyMarketEnabled(false);
              }}
            >
              確認關閉
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={marketOpenOpen} onOpenChange={setMarketOpenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>開放拍賣場？</AlertDialogTitle>
            <AlertDialogDescription>
              玩家將可恢復使用自由市場上架與購買。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-violet-600 hover:bg-violet-700"
              disabled={marketBusy}
              onClick={(e) => {
                e.preventDefault();
                void applyMarketEnabled(true);
              }}
            >
              確認開放
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(o) => {
          if (!o) {
            setCancelTarget(null);
            setCancelReasonDraft("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>強制下架？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法復原；道具將解除上架狀態。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <label className="block text-sm text-gray-700">
            理由（選填，僅供備註）
            <textarea
              value={cancelReasonDraft}
              onChange={(e) => setCancelReasonDraft(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={2}
            />
          </label>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelBusy}
              onClick={(e) => {
                e.preventDefault();
                void confirmForceCancel();
              }}
            >
              {cancelBusy ? "處理中…" : "確認下架"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
