"use client";

import React, { useState, useCallback, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { X, CheckCircle, XCircle, PartyPopper } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  getReportsAction,
  resolveReportAction,
  getUserDetailAction,
  type ReportWithUsers,
} from "@/services/admin.action";

const TABS = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待處理" },
  { key: "upheld", label: "已成立" },
  { key: "dismissed", label: "不成立" },
];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  upheld: "bg-red-100 text-red-700",
  dismissed: "bg-gray-100 text-gray-600",
};

export default function AdminReportsPage() {
  const [tab, setTab] = useState("all");
  const [reports, setReports] = useState<ReportWithUsers[]>([]);
  const [total, setTotal] = useState(0);
  const [isPending, startTransition] = useTransition();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportWithUsers | null>(
    null,
  );
  const [targetReputation, setTargetReputation] = useState<number | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolveVerdict, setResolveVerdict] = useState<
    "upheld" | "dismissed"
  >("upheld");

  const fetchReports = useCallback(
    (status: string) => {
      startTransition(async () => {
        const result = await getReportsAction({
          status: status === "all" ? undefined : status,
          page: 1,
          pageSize: 50,
        });
        if (result.ok) {
          setReports(result.data.reports);
          setTotal(result.data.total);
        }
      });
    },
    [],
  );

  useEffect(() => {
    fetchReports(tab);
  }, [tab, fetchReports]);

  const openDetail = async (report: ReportWithUsers) => {
    setSelectedReport(report);
    setSheetOpen(true);
    setTargetReputation(null);

    const detailRes = await getUserDetailAction(report.reported_user_id);
    if (detailRes.ok && detailRes.data) {
      setTargetReputation(detailRes.data.reputation_score ?? 100);
    }
  };

  const handleResolve = async () => {
    if (!selectedReport || !resolveNote.trim()) return;

    const result = await resolveReportAction(
      selectedReport.id,
      resolveVerdict,
      resolveNote,
    );
    if (result.ok) {
      toast.success(
        resolveVerdict === "upheld" ? "檢舉成立，已扣除信譽分" : "檢舉不成立",
      );
      setShowResolveDialog(false);
      setResolveNote("");
      setSheetOpen(false);
      fetchReports(tab);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">檢舉管理</h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Report list */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {reports.length === 0 ? (
          <div className="py-16 text-center">
            <PartyPopper className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400">目前沒有待處理檢舉 🎉</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {reports.map((r) => (
              <div
                key={r.id}
                className="p-4 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => openDetail(r)}
              >
                {r.reported_avatar ? (
                  <img
                    src={r.reported_avatar}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">
                    {r.reported_nickname?.[0] ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">
                      {r.reported_nickname ?? "未知"}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_BADGE[r.status] ?? ""}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    檢舉人：{r.reporter_nickname ?? "未知"} · {r.reason}
                  </p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(r.created_at).toLocaleDateString("zh-TW")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Report Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>檢舉詳情</SheetTitle>
              <button
                onClick={() => setSheetOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </SheetHeader>

          {selectedReport && (
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <p className="text-xs text-gray-400 mb-1">被檢舉者</p>
                <p className="font-medium text-gray-900">
                  {selectedReport.reported_nickname ?? "未知"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">檢舉者</p>
                <p className="font-medium text-gray-700">
                  {selectedReport.reporter_nickname ?? "未知"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">檢舉原因</p>
                <p className="text-sm text-gray-700">{selectedReport.reason}</p>
              </div>
              {selectedReport.description && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">詳細說明</p>
                  <p className="text-sm text-gray-700">
                    {selectedReport.description}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-1">被檢舉者目前信譽分</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-violet-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, targetReputation ?? 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {targetReputation ?? "—"}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">時間</p>
                <p className="text-sm text-gray-700">
                  {new Date(selectedReport.created_at).toLocaleString("zh-TW")}
                </p>
              </div>

              {selectedReport.status === "pending" && (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setResolveVerdict("upheld");
                      setResolveNote("");
                      setShowResolveDialog(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    成立（-10 信譽）
                  </button>
                  <button
                    onClick={() => {
                      setResolveVerdict("dismissed");
                      setResolveNote("");
                      setShowResolveDialog(true);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    不成立
                  </button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Resolve dialog */}
      {showResolveDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowResolveDialog(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">
              {resolveVerdict === "upheld"
                ? "確認成立檢舉"
                : "確認不成立檢舉"}
            </h3>
            {resolveVerdict === "upheld" && (
              <p className="text-sm text-red-600">
                成立將自動扣除被檢舉者 10 點信譽分
              </p>
            )}
            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              placeholder="處理備註..."
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowResolveDialog(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleResolve}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors"
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
