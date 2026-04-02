"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  LEGACY_ORIENTATION_MAP,
  LEGACY_REGION_MAP,
  ORIENTATION_OPTIONS,
  REGION_OPTIONS,
  resolveLegacyLabel,
} from "@/lib/constants/adventurer-questionnaire";
import type { ProfileChangeRequestWithUser } from "@/lib/repositories/server/profile-change.repository";
import type { ProfileChangeStatus } from "@/types/database.types";
import {
  approveProfileChangeRequestAction,
  getAllProfileChangeRequestsAction,
  getPendingProfileChangeRequestsAction,
  rejectProfileChangeRequestAction,
} from "@/services/profile-change.action";

const PAGE_SIZE = 20;
const PENDING_SWR_KEY = "admin-profile-changes-pending-list";

function formatTaipei(iso: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function orientationLabel(v: string | null): string {
  return resolveLegacyLabel(v, ORIENTATION_OPTIONS, LEGACY_ORIENTATION_MAP);
}

function regionLabel(v: string | null): string {
  return resolveLegacyLabel(v, REGION_OPTIONS, LEGACY_REGION_MAP);
}

function statusBadge(status: ProfileChangeStatus) {
  switch (status) {
    case "pending":
      return (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          待審核
        </span>
      );
    case "approved":
      return (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
          已通過
        </span>
      );
    case "rejected":
      return (
        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
          已拒絕
        </span>
      );
    default:
      return status;
  }
}

function summarizeRequest(row: ProfileChangeRequestWithUser): string {
  const parts: string[] = [];
  if (row.new_region != null && String(row.new_region).trim() !== "") {
    parts.push("地區");
  }
  if (row.new_orientation != null && String(row.new_orientation).trim() !== "") {
    parts.push("性向");
  }
  if (row.new_birth_year != null) {
    parts.push("出生年");
  }
  if (row.new_height_cm != null) {
    parts.push("身高");
  }
  return parts.length > 0 ? parts.join("、") : "—";
}

function RequestDeltas({ row }: { row: ProfileChangeRequestWithUser }) {
  const u = row.user;
  const lines: { key: string; text: string }[] = [];
  if (row.new_region != null && String(row.new_region).trim() !== "") {
    lines.push({
      key: "r",
      text: `地區：${regionLabel(u.region)} → ${row.new_region}`,
    });
  }
  if (row.new_orientation != null && String(row.new_orientation).trim() !== "") {
    lines.push({
      key: "o",
      text: `性向：${orientationLabel(u.orientation)} → ${orientationLabel(row.new_orientation)}`,
    });
  }
  if (row.new_birth_year != null) {
    const oldY = u.birth_year != null ? String(u.birth_year) : "—";
    lines.push({
      key: "y",
      text: `出生年份：${oldY} → ${row.new_birth_year}`,
    });
  }
  if (row.new_height_cm != null) {
    const oldH = u.height_cm != null ? `${u.height_cm} cm` : "—";
    lines.push({
      key: "h",
      text: `身高：${oldH} → ${row.new_height_cm} cm`,
    });
  }
  if (lines.length === 0) {
    return <p className="text-sm text-gray-500">（無變更欄位）</p>;
  }
  return (
    <ul className="space-y-1 text-sm text-gray-700">
      {lines.map((l) => (
        <li key={l.key}>{l.text}</li>
      ))}
    </ul>
  );
}

export default function ProfileChangesClient() {
  const searchParams = useSearchParams();
  const [mainTab, setMainTab] = useState<"pending" | "all">("pending");

  const {
    data: pendingRows,
    isLoading: pendingLoading,
    mutate: mutatePending,
  } = useSWR(PENDING_SWR_KEY, getPendingProfileChangeRequestsAction, {
    revalidateOnFocus: true,
  });

  const [allStatus, setAllStatus] = useState<"" | ProfileChangeStatus>("");
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [nicknameApplied, setNicknameApplied] = useState("");
  const [allPage, setAllPage] = useState(1);
  const [allLoading, setAllLoading] = useState(false);
  const [allRows, setAllRows] = useState<ProfileChangeRequestWithUser[]>([]);
  const [allTotal, setAllTotal] = useState(0);

  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveBusy, setApproveBusy] = useState(false);
  const [rejectRow, setRejectRow] = useState<ProfileChangeRequestWithUser | null>(
    null,
  );
  const [rejectReason, setRejectReason] = useState("");
  const [rejectBusy, setRejectBusy] = useState(false);

  useEffect(() => {
    if (searchParams.get("filter") === "pending") {
      setMainTab("pending");
    }
  }, [searchParams]);

  const loadAll = useCallback(async () => {
    setAllLoading(true);
    try {
      const r = await getAllProfileChangeRequestsAction({
        status: allStatus || undefined,
        nickname: nicknameApplied.trim() || undefined,
        page: allPage,
        pageSize: PAGE_SIZE,
      });
      setAllRows(r.data);
      setAllTotal(r.total);
    } catch {
      toast.error("載入失敗");
      setAllRows([]);
      setAllTotal(0);
    } finally {
      setAllLoading(false);
    }
  }, [allStatus, nicknameApplied, allPage]);

  useEffect(() => {
    if (mainTab !== "all") return;
    void loadAll();
  }, [mainTab, loadAll]);

  const allTotalPages = Math.max(1, Math.ceil(allTotal / PAGE_SIZE));

  async function onConfirmApprove() {
    if (!approveId) return;
    setApproveBusy(true);
    try {
      const r = await approveProfileChangeRequestAction(approveId);
      if (!r.ok) {
        toast.error("操作失敗");
        return;
      }
      toast.success("已通過");
      setApproveId(null);
      await mutatePending();
      if (mainTab === "all") await loadAll();
    } finally {
      setApproveBusy(false);
    }
  }

  async function onConfirmReject() {
    if (!rejectRow) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("請填寫拒絕原因");
      return;
    }
    setRejectBusy(true);
    try {
      const r = await rejectProfileChangeRequestAction(rejectRow.id, reason);
      if (!r.ok) {
        if (r.error === "reason_required") {
          toast.error("請填寫拒絕原因");
        } else {
          toast.error("操作失敗");
        }
        return;
      }
      toast.success("已拒絕");
      setRejectRow(null);
      setRejectReason("");
      await mutatePending();
      if (mainTab === "all") await loadAll();
    } finally {
      setRejectBusy(false);
    }
  }

  const pendingList = pendingRows ?? [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">資料變更審核</h2>

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setMainTab("pending")}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            mainTab === "pending"
              ? "bg-violet-100 text-violet-800"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          待審核
        </button>
        <button
          type="button"
          onClick={() => setMainTab("all")}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            mainTab === "all"
              ? "bg-violet-100 text-violet-800"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          所有申請
        </button>
      </div>

      {mainTab === "pending" ? (
        <div>
          {pendingLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : pendingList.length === 0 ? (
            <p className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-600">
              ✅ 目前沒有待審核的申請
            </p>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 bg-white md:block">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        用戶
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        申請內容
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        申請時間
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-gray-700">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingList.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {row.user.avatar_url ? (
                              <Image
                                src={row.user.avatar_url}
                                alt=""
                                width={36}
                                height={36}
                                className="rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-500">
                                ?
                              </div>
                            )}
                            <span className="font-medium text-gray-900">
                              {row.user.nickname}
                            </span>
                          </div>
                        </td>
                        <td className="max-w-md px-4 py-3">
                          <RequestDeltas row={row} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {formatTaipei(row.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-500"
                              onClick={() => setApproveId(row.id)}
                            >
                              ✅ 通過
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setRejectRow(row);
                                setRejectReason("");
                              }}
                            >
                              ❌ 拒絕
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {pendingList.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      {row.user.avatar_url ? (
                        <Image
                          src={row.user.avatar_url}
                          alt=""
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                          ?
                        </div>
                      )}
                      <span className="font-semibold text-gray-900">
                        {row.user.nickname}
                      </span>
                    </div>
                    <div className="mt-3">
                      <RequestDeltas row={row} />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {formatTaipei(row.created_at)}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                        onClick={() => setApproveId(row.id)}
                      >
                        ✅ 通過
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          setRejectRow(row);
                          setRejectReason("");
                        }}
                      >
                        ❌ 拒絕
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4">
            <label className="text-sm text-gray-700">
              狀態
              <select
                value={allStatus}
                onChange={(e) => {
                  setAllStatus(e.target.value as "" | ProfileChangeStatus);
                  setAllPage(1);
                }}
                className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">全部</option>
                <option value="pending">待審核</option>
                <option value="approved">已通過</option>
                <option value="rejected">已拒絕</option>
              </select>
            </label>
            <label className="text-sm text-gray-700">
              暱稱
              <input
                type="text"
                value={nicknameDraft}
                onChange={(e) => setNicknameDraft(e.target.value)}
                className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="搜尋暱稱"
              />
            </label>
            <Button
              type="button"
              onClick={() => {
                setNicknameApplied(nicknameDraft);
                setAllPage(1);
              }}
            >
              搜尋
            </Button>
          </div>

          {allLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 bg-white md:block">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        用戶暱稱
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        申請項目摘要
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        狀態
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        審核者
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">
                        申請時間
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {row.user.nickname}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {summarizeRequest(row)}
                        </td>
                        <td className="px-4 py-3">{statusBadge(row.status)}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {row.reviewer_nickname ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {formatTaipei(row.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {allRows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900">
                        {row.user.nickname}
                      </span>
                      {statusBadge(row.status)}
                    </div>
                    <p className="mt-2 text-sm text-gray-700">
                      摘要：{summarizeRequest(row)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      審核者：{row.reviewer_nickname ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatTaipei(row.created_at)}
                    </p>
                  </div>
                ))}
              </div>

              {allTotal > PAGE_SIZE ? (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={allPage <= 1}
                    onClick={() => setAllPage((p) => Math.max(1, p - 1))}
                  >
                    上一頁
                  </Button>
                  <span className="text-sm text-gray-600">
                    {allPage} / {allTotalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={allPage >= allTotalPages}
                    onClick={() =>
                      setAllPage((p) => Math.min(allTotalPages, p + 1))
                    }
                  >
                    下一頁
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      <AlertDialog open={approveId !== null} onOpenChange={() => setApproveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認通過此申請？</AlertDialogTitle>
            <AlertDialogDescription>
              通過後會立即更新該用戶的資料。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <Button
              onClick={() => void onConfirmApprove()}
              disabled={approveBusy}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              {approveBusy ? "處理中…" : "確認通過"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rejectRow !== null} onOpenChange={() => setRejectRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>拒絕申請</DialogTitle>
          </DialogHeader>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="拒絕原因（必填）"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectRow(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => void onConfirmReject()}
              disabled={rejectBusy}
            >
              {rejectBusy ? "處理中…" : "確認拒絕"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
