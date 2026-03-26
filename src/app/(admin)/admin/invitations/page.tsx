"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Copy,
  Plus,
  Layers,
  Ban,
  TreePine,
  BarChart3,
  Loader2,
} from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import {
  getInvitationCodesAction,
  generateInvitationCodeAction,
  generateBatchInvitationCodesAction,
  revokeInvitationCodeAction,
  getInvitationTreeAction,
} from "@/services/admin.action";
import type {
  InvitationCodeDto,
  InvitationCodeRow,
} from "@/types/database.types";
import type { InvitationTreeNodeDto } from "@/services/admin.action";

// ─── Helpers ───

type CodeStatus = "available" | "used" | "revoked" | "expired";

function getCodeStatus(row: InvitationCodeDto): CodeStatus {
  if (row.is_revoked) return "revoked";
  if (row.used_by) return "used";
  if (row.expires_at && new Date(row.expires_at) < new Date()) return "expired";
  return "available";
}

const STATUS_BADGE: Record<CodeStatus, { label: string; cls: string }> = {
  available: {
    label: "未使用",
    cls: "bg-emerald-100 text-emerald-700",
  },
  used: {
    label: "已使用",
    cls: "bg-blue-100 text-blue-700",
  },
  revoked: {
    label: "已撤銷",
    cls: "bg-red-100 text-red-700",
  },
  expired: {
    label: "已過期",
    cls: "bg-gray-100 text-gray-500",
  },
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("已複製！"),
    () => toast.error("複製失敗"),
  );
}

// ─── Tab types ───

type Tab = "list" | "tree" | "stats";

// ─── Main Page ───

export default function InvitationsPage() {
  const [tab, setTab] = useState<Tab>("list");

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">📨 邀請碼管理</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {([
          { key: "list" as Tab, label: "邀請碼列表", icon: Layers },
          { key: "tree" as Tab, label: "邀請樹狀圖", icon: TreePine },
          { key: "stats" as Tab, label: "使用統計", icon: BarChart3 },
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

      {tab === "list" && <InvitationList />}
      {tab === "tree" && <InvitationTree />}
      {tab === "stats" && <InvitationStats />}
    </div>
  );
}

// ═══════════════════════════════════════
// Tab 1: Invitation List
// ═══════════════════════════════════════

function InvitationList() {
  const [codes, setCodes] = useState<InvitationCodeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | CodeStatus>("all");
  const [showGenerate, setShowGenerate] = useState(false);
  const [showBatch, setShowBatch] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getInvitationCodesAction();
    if (res.ok) setCodes(res.data);
    else toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all"
    ? codes
    : codes.filter((c) => getCodeStatus(c) === filter);

  async function handleRevoke(id: string) {
    if (!confirm("確定要撤銷此邀請碼？")) return;
    const res = await revokeInvitationCodeAction(id);
    if (res.ok) {
      toast.success("邀請碼已撤銷");
      load();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={() => setShowGenerate(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          產生邀請碼
        </button>
        <button
          onClick={() => setShowBatch(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300 transition-colors"
        >
          <Layers className="w-4 h-4" />
          批量產生
        </button>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="ml-auto text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white"
        >
          <option value="all">全部</option>
          <option value="available">未使用</option>
          <option value="used">已使用</option>
          <option value="revoked">已撤銷</option>
          <option value="expired">已過期</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-400 py-12">
          {filter === "all" ? "尚無邀請碼" : "此篩選條件無結果"}
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">邀請碼</th>
                  <th className="text-left px-4 py-3 font-medium">建立者</th>
                  <th className="text-left px-4 py-3 font-medium">狀態</th>
                  <th className="text-left px-4 py-3 font-medium">使用者</th>
                  <th className="text-left px-4 py-3 font-medium">建立時間</th>
                  <th className="text-left px-4 py-3 font-medium">到期時間</th>
                  <th className="text-left px-4 py-3 font-medium">備註</th>
                  <th className="text-left px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => {
                  const status = getCodeStatus(c);
                  const badge = STATUS_BADGE[status];
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-mono font-semibold tracking-wider text-gray-900">
                        {c.code}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.creator?.nickname ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.user?.nickname ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {fmtDate(c.created_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {fmtDate(c.expires_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">
                        {c.note || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {status === "available" && (
                            <>
                              <button
                                onClick={() => copyText(c.code)}
                                className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200 transition-colors"
                                title="複製"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRevoke(c.id)}
                                className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs hover:bg-red-100 transition-colors"
                                title="撤銷"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((c) => {
              const status = getCodeStatus(c);
              const badge = STATUS_BADGE[status];
              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold tracking-wider text-gray-900">
                      {c.code}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>建立者：{c.creator?.nickname ?? "—"}</p>
                    {c.user && <p>使用者：{c.user.nickname}</p>}
                    <p>建立：{fmtDate(c.created_at)}</p>
                    {c.expires_at && <p>到期：{fmtDate(c.expires_at)}</p>}
                    {c.note && <p>備註：{c.note}</p>}
                  </div>
                  {status === "available" && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => copyText(c.code)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200"
                      >
                        <Copy className="w-3.5 h-3.5" /> 複製
                      </button>
                      <button
                        onClick={() => handleRevoke(c.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs hover:bg-red-100"
                      >
                        <Ban className="w-3.5 h-3.5" /> 撤銷
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {showGenerate && (
        <GenerateDialog
          onClose={() => setShowGenerate(false)}
          onCreated={load}
        />
      )}
      {showBatch && (
        <BatchDialog onClose={() => setShowBatch(false)} onCreated={load} />
      )}
    </>
  );
}

// ─── Generate Single Dialog ───

function GenerateDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [days, setDays] = useState(30);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InvitationCodeRow | null>(null);

  async function handleGenerate() {
    setLoading(true);
    const res = await generateInvitationCodeAction({
      expiresInDays: days,
      note: note || undefined,
    });
    setLoading(false);
    if (res.ok) {
      setResult(res.data);
      onCreated();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">產生邀請碼</h2>

        {!result ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                有效天數（0 = 永不過期）
              </label>
              <input
                type="number"
                min={0}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備註（選填）
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="例：活動贈送"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full text-sm text-gray-600 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-5 py-2 rounded-full bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {loading ? "產生中…" : "確認產生"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">邀請碼已產生：</p>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <span className="font-mono text-2xl font-bold tracking-[0.2em] text-violet-700">
                {result.code}
              </span>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => copyText(result.code)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
              >
                <Copy className="w-4 h-4" /> 複製邀請碼
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full text-sm text-gray-600 hover:bg-gray-100"
              >
                關閉
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Batch Dialog ───

function BatchDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [count, setCount] = useState(10);
  const [days, setDays] = useState(30);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InvitationCodeRow[]>([]);

  async function handleBatch() {
    setLoading(true);
    const res = await generateBatchInvitationCodesAction({
      count,
      expiresInDays: days,
      note: note || undefined,
    });
    setLoading(false);
    if (res.ok) {
      setResults(res.data);
      onCreated();
    } else {
      toast.error(res.error);
    }
  }

  function copyAll() {
    const text = results.map((r) => r.code).join("\n");
    copyText(text);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900">批量產生邀請碼</h2>

        {results.length === 0 ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                數量（1–50）
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={count}
                onChange={(e) =>
                  setCount(Math.min(50, Math.max(1, Number(e.target.value))))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                有效天數（0 = 永不過期）
              </label>
              <input
                type="number"
                min={0}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備註（選填）
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="例：批次發放"
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full text-sm text-gray-600 hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleBatch}
                disabled={loading}
                className="px-5 py-2 rounded-full bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {loading ? "產生中…" : `產生 ${count} 張`}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">
              已產生 {results.length} 張邀請碼：
            </p>
            <div className="bg-gray-50 rounded-xl p-3 max-h-64 overflow-y-auto space-y-1">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-1 px-2"
                >
                  <span className="font-mono font-semibold tracking-wider text-sm text-gray-800">
                    {r.code}
                  </span>
                  <button
                    onClick={() => copyText(r.code)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={copyAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
              >
                <Copy className="w-4 h-4" /> 全部複製
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-full text-sm text-gray-600 hover:bg-gray-100"
              >
                關閉
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Tab 2: Invitation Tree
// ═══════════════════════════════════════

function InvitationTree() {
  const [roots, setRoots] = useState<InvitationTreeNodeDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInvitationTreeAction().then((res) => {
      if (res.ok) setRoots(res.data);
      else toast.error(res.error);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (roots.length === 0) {
    return <p className="text-center text-gray-400 py-12">尚無用戶資料</p>;
  }

  return (
    <div className="space-y-1">
      {roots.map((node) => (
        <TreeNode key={node.id} node={node} depth={0} />
      ))}
    </div>
  );
}

function TreeNode({
  node,
  depth,
}: {
  node: InvitationTreeNodeDto;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const maxDepth = 5;

  return (
    <div>
      <button
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={`flex items-center gap-2.5 w-full text-left py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors ${
          !hasChildren ? "cursor-default" : ""
        }`}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {depth > 0 && (
          <span className="w-4 border-l-2 border-b-2 border-gray-300 h-4 -ml-3 -mt-2 flex-shrink-0 rounded-bl" />
        )}
        <Avatar
          src={node.avatar_url}
          nickname={node.nickname}
          size={28}
        />
        <span className="text-sm font-medium text-gray-800">
          {node.nickname}
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 font-medium">
          Lv.{node.level}
        </span>
        <span className="text-xs text-gray-400 ml-auto">
          {fmtDate(node.created_at)}
        </span>
        {hasChildren && (
          <span className="text-xs text-gray-400">
            {expanded ? "▾" : "▸"} ({node.children.length})
          </span>
        )}
      </button>
      {expanded && hasChildren && depth < maxDepth && (
        <div className="relative">
          {depth < maxDepth - 1 && (
            <div
              className="absolute top-0 bottom-0 border-l border-gray-200"
              style={{ left: `${(depth + 1) * 24 + 12}px` }}
            />
          )}
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// Tab 3: Statistics
// ═══════════════════════════════════════

function InvitationStats() {
  const [codes, setCodes] = useState<InvitationCodeDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInvitationCodesAction().then((res) => {
      if (res.ok) setCodes(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const total = codes.length;
  const used = codes.filter((c) => c.used_by).length;
  const available = codes.filter(
    (c) => getCodeStatus(c) === "available",
  ).length;
  const revoked = codes.filter((c) => c.is_revoked).length;
  const expired = codes.filter(
    (c) => getCodeStatus(c) === "expired",
  ).length;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekNew = codes.filter(
    (c) => new Date(c.created_at) >= weekAgo,
  ).length;

  const rate = total > 0 ? ((used / total) * 100).toFixed(1) : "0";

  const cards = [
    { label: "總邀請碼數", value: total, color: "text-gray-900" },
    { label: "已使用 / 使用率", value: `${used} / ${rate}%`, color: "text-blue-600" },
    { label: "未使用", value: available, color: "text-emerald-600" },
    { label: "已撤銷", value: revoked, color: "text-red-600" },
    { label: "已過期", value: expired, color: "text-gray-500" },
    { label: "本週新產生", value: weekNew, color: "text-violet-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-gray-200 bg-white p-5"
        >
          <p className="text-xs text-gray-500 mb-1">{c.label}</p>
          <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}
