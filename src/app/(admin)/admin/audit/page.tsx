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

const ACTION_LABEL: Record<string, string> = {
  exp_grant: "EXP 發放",
  ban: "放逐",
  suspend: "停權",
  unban: "解除停權",
  role_change: "角色變更",
  coin_adjust: "金幣調整",
  tavern_ban: "酒館禁言",
  ig_review: "IG 審核",
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

function getResultText(action: AuditAction): string {
  const md = action.metadata ?? {};
  if (action.action_type === "exp_grant") {
    const delta = Number(md.delta ?? 0);
    return `${delta >= 0 ? "+" : ""}${delta} EXP`;
  }
  if (action.action_type === "coin_adjust") {
    const amount = Number(md.amount ?? 0);
    const coinType = md.coin_type === "premium" ? "純金" : "探險幣";
    return `${amount >= 0 ? "+" : ""}${amount} ${coinType}`;
  }
  if (action.action_type === "ig_review") {
    return md.verdict === "approved" ? "核准" : "拒絕";
  }
  return action.reason?.trim() || "已完成";
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

      <div className="space-y-3">
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-sm text-gray-500">
            載入中...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-10 text-sm text-red-600">
            {error}
          </div>
        ) : actions.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-sm text-gray-500">
            查無操作記錄
          </div>
        ) : (
          actions.map((action) => {
            const targetName = action.target?.nickname ?? "（無目標）";
            const resultText = getResultText(action);
            const typeLabel = ACTION_LABEL[action.action_type] ?? action.action_type;
            return (
              <article
                key={action.id}
                className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">{formatTaipeiTime(action.created_at)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Avatar
                        src={action.admin.avatar_url}
                        nickname={action.admin.nickname}
                        size={24}
                      />
                      <span className="text-sm font-medium text-gray-900">
                        {action.admin.nickname}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${BADGE_STYLE[action.action_type] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {typeLabel}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg bg-gray-50 px-2.5 py-2">
                    <p className="text-[11px] text-gray-400">目標用戶</p>
                    <p className="text-sm text-gray-800">{targetName}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-2.5 py-2">
                    <p className="text-[11px] text-gray-400">操作結果</p>
                    <p className="text-sm text-gray-800">{resultText}</p>
                  </div>
                </div>

                <p className="mt-2 text-sm text-gray-700 leading-6">
                  {action.action_label ?? action.reason ?? "（無描述）"}
                </p>

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-violet-700 hover:text-violet-800">
                    查看詳情
                  </summary>
                  <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 p-2 text-xs text-gray-600 space-y-1">
                    <p>
                      <span className="text-gray-400">action_type：</span>
                      {action.action_type}
                    </p>
                    <p>
                      <span className="text-gray-400">admin_id：</span>
                      {action.admin_id}
                    </p>
                    <p>
                      <span className="text-gray-400">target_user_id：</span>
                      {action.target_user_id ?? "null"}
                    </p>
                    <p>
                      <span className="text-gray-400">metadata：</span>
                    </p>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all text-[11px] text-gray-700">
                      {JSON.stringify(action.metadata ?? {}, null, 2)}
                    </pre>
                  </div>
                </details>
              </article>
            );
          })
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
