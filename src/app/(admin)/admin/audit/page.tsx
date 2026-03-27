"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import { getAdminActionsAction } from "@/services/admin.action";

type AuditAction = {
  id: string;
  admin_id: string;
  target_user_id: string | null;
  action_type: string;
  action_label: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  admin: { nickname: string; avatar_url: string | null };
  target: { nickname: string; avatar_url: string | null } | null;
};

const ACTION_TYPE_OPTIONS = [
  { value: "", label: "全部類型" },
  { value: "exp_grant", label: "EXP 發放" },
  { value: "ban", label: "放逐" },
  { value: "suspend", label: "停權" },
  { value: "unban", label: "解除停權/放逐" },
  { value: "role_change", label: "角色變更" },
  { value: "coin_adjust", label: "金幣調整" },
  { value: "tavern_ban", label: "酒館禁言" },
  { value: "ig_review", label: "IG 審核" },
];

const BADGE_STYLE: Record<string, string> = {
  exp_grant: "bg-emerald-100 text-emerald-700",
  ban: "bg-red-100 text-red-700",
  suspend: "bg-red-100 text-red-700",
  unban: "bg-green-100 text-green-700",
  role_change: "bg-blue-100 text-blue-700",
  coin_adjust: "bg-amber-100 text-amber-700",
  tavern_ban: "bg-orange-100 text-orange-700",
  ig_review: "bg-violet-100 text-violet-700",
};

function formatTaipeiTime(iso: string): string {
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

export default function AdminAuditPage() {
  const [actions, setActions] = useState<AuditAction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionType, setActionType] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / 30)), [total]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getAdminActionsAction({
      page,
      actionType: actionType || undefined,
      search: search || undefined,
    });
    if (!res.ok) {
      setError(res.error);
      setActions([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setActions(res.data.actions as AuditAction[]);
    setTotal(res.data.total);
    setLoading(false);
  }, [page, actionType, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">📋 操作記錄</h1>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={actionType}
          onChange={(e) => {
            setActionType(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white"
        >
          {ACTION_TYPE_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setSearch(searchInput.trim());
              setPage(1);
            }
          }}
          placeholder="搜尋操作者或目標暱稱"
          className="rounded-xl border border-gray-200 px-3 py-2 text-sm w-full sm:max-w-sm"
        />
        <button
          type="button"
          onClick={() => {
            setSearch(searchInput.trim());
            setPage(1);
          }}
          className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          搜尋
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="grid grid-cols-12 gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500">
          <div className="col-span-3">時間</div>
          <div className="col-span-3">操作者</div>
          <div className="col-span-4">操作內容</div>
          <div className="col-span-2">目標用戶</div>
        </div>

        {loading ? (
          <div className="px-4 py-10 text-sm text-gray-500">載入中...</div>
        ) : error ? (
          <div className="px-4 py-10 text-sm text-red-600">{error}</div>
        ) : actions.length === 0 ? (
          <div className="px-4 py-10 text-sm text-gray-500">查無操作記錄</div>
        ) : (
          actions.map((action) => (
            <div
              key={action.id}
              className="grid grid-cols-12 gap-2 border-b border-gray-100 px-4 py-3 text-sm"
            >
              <div className="col-span-3 text-gray-600">
                {formatTaipeiTime(action.created_at)}
              </div>
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <Avatar
                    src={action.admin.avatar_url}
                    nickname={action.admin.nickname}
                    size={26}
                  />
                  <span className="text-gray-800">{action.admin.nickname}</span>
                </div>
              </div>
              <div className="col-span-4">
                <div className="flex items-start gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE_STYLE[action.action_type] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {action.action_type}
                  </span>
                  <span className="text-gray-700">
                    {action.action_label ?? action.reason ?? "（無描述）"}
                  </span>
                </div>
              </div>
              <div className="col-span-2 text-gray-700">
                {action.target?.nickname ?? "—"}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40"
        >
          上一頁
        </button>
        <span>
          {page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40"
        >
          下一頁
        </button>
      </div>
    </div>
  );
}
