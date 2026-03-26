"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pin,
  PinOff,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Loader2,
  Megaphone,
  Image as ImageIcon,
} from "lucide-react";
import {
  getAnnouncementsAction,
  createAnnouncementAction,
  updateAnnouncementAction,
  deleteAnnouncementAction,
  toggleAnnouncementPinAction,
  toggleAnnouncementActiveAction,
  getAdvertisementsAction,
  createAdvertisementAction,
  updateAdvertisementAction,
  deleteAdvertisementAction,
  toggleAdvertisementAction,
} from "@/services/admin.action";
import type {
  AnnouncementDto,
  AdvertisementRow,
} from "@/types/database.types";

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

const TABS = ["公告管理", "廣告管理"] as const;
type TabId = (typeof TABS)[number];

export default function PublishPage() {
  const [tab, setTab] = useState<TabId>("公告管理");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Megaphone className="h-6 w-6 text-violet-600" />
        <h1 className="text-xl font-bold text-gray-800">發布中心</h1>
      </div>

      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white text-violet-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "公告管理" && <AnnouncementTab />}
      {tab === "廣告管理" && <AdvertisementTab />}
    </div>
  );
}

// ━━━ Announcement Tab ━━━

function AnnouncementTab() {
  const [items, setItems] = useState<AnnouncementDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<AnnouncementDto | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getAnnouncementsAction();
    if (res.ok) setItems(res.data);
    else toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleTogglePin(id: string, current: boolean) {
    const res = await toggleAnnouncementPinAction(id, !current);
    if (res.ok) {
      toast.success(current ? "已取消置頂" : "已置頂");
      void load();
    } else toast.error(res.error);
  }

  async function handleToggleActive(id: string, current: boolean) {
    const res = await toggleAnnouncementActiveAction(id, !current);
    if (res.ok) {
      toast.success(current ? "已停用" : "已啟用");
      void load();
    } else toast.error(res.error);
  }

  async function handleDelete(id: string) {
    const res = await deleteAnnouncementAction(id);
    if (res.ok) {
      toast.success("已刪除");
      setDeleting(null);
      void load();
    } else toast.error(res.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{items.length} 則公告</span>
        <button
          onClick={() => {
            setEditing(null);
            setShowDialog(true);
          }}
          className="flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          建立公告
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">尚無公告</p>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div
              key={a.id}
              className={`rounded-xl border p-4 transition-colors ${
                a.is_active
                  ? "border-gray-200 bg-white"
                  : "border-gray-100 bg-gray-50 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {a.is_pinned && (
                      <span className="text-amber-500" title="置頂">📌</span>
                    )}
                    <h3 className="font-semibold text-gray-800 truncate">
                      {a.title}
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {a.content}
                  </p>
                  {a.image_url && (
                    <img
                      src={a.image_url}
                      alt=""
                      className="mt-2 h-20 rounded-lg object-cover"
                    />
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                    <span>{a.creator?.nickname ?? "未知"}</span>
                    <span>{fmtDate(a.created_at)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => handleTogglePin(a.id, a.is_pinned)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-amber-500"
                    title={a.is_pinned ? "取消置頂" : "置頂"}
                  >
                    {a.is_pinned ? (
                      <PinOff className="h-4 w-4" />
                    ) : (
                      <Pin className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleToggleActive(a.id, a.is_active)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-500"
                    title={a.is_active ? "停用" : "啟用"}
                  >
                    {a.is_active ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(a);
                      setShowDialog(true);
                    }}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-violet-500"
                    title="編輯"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleting(a.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                    title="刪除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDialog && (
        <AnnouncementDialog
          editing={editing}
          onClose={() => setShowDialog(false)}
          onSaved={() => {
            setShowDialog(false);
            void load();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="刪除公告"
          message="確定要刪除此公告嗎？此操作無法還原。"
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function AnnouncementDialog({
  editing,
  onClose,
  onSaved,
}: {
  editing: AnnouncementDto | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [content, setContent] = useState(editing?.content ?? "");
  const [imageUrl, setImageUrl] = useState(editing?.image_url ?? "");
  const [isPinned, setIsPinned] = useState(editing?.is_pinned ?? false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    if (editing) {
      const res = await updateAnnouncementAction(editing.id, {
        title,
        content,
        image_url: imageUrl || null,
        is_pinned: isPinned,
      });
      if (res.ok) {
        toast.success("已更新");
        onSaved();
      } else toast.error(res.error);
    } else {
      const res = await createAnnouncementAction({
        title,
        content,
        image_url: imageUrl || undefined,
        is_pinned: isPinned,
      });
      if (res.ok) {
        toast.success("已建立");
        onSaved();
      } else toast.error(res.error);
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-gray-800">
          {editing ? "編輯公告" : "建立公告"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              標題 <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="公告標題"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">{title.length}/100</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              內文 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              rows={6}
              placeholder="公告內容..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-400">{content.length}/2000</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              圖片 URL（選填）
            </label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
            {imageUrl && (
              <img
                src={imageUrl}
                alt="preview"
                className="mt-2 h-24 rounded-lg object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded accent-violet-600"
            />
            置頂公告
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !content.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "儲存變更" : "建立"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ━━━ Advertisement Tab ━━━

const POS_BADGE: Record<string, { label: string; cls: string }> = {
  banner: { label: "Banner", cls: "bg-violet-100 text-violet-700" },
  card: { label: "Card", cls: "bg-blue-100 text-blue-700" },
  announcement: { label: "Announce", cls: "bg-amber-100 text-amber-700" },
};

function AdvertisementTab() {
  const [items, setItems] = useState<AdvertisementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<AdvertisementRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getAdvertisementsAction();
    if (res.ok) setItems(res.data);
    else toast.error(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggle(id: string, current: boolean) {
    const res = await toggleAdvertisementAction(id, !current);
    if (res.ok) {
      toast.success(current ? "已停用" : "已啟用");
      void load();
    } else toast.error(res.error);
  }

  async function handleDelete(id: string) {
    const res = await deleteAdvertisementAction(id);
    if (res.ok) {
      toast.success("已刪除");
      setDeleting(null);
      void load();
    } else toast.error(res.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{items.length} 則廣告</span>
        <button
          onClick={() => {
            setEditing(null);
            setShowDialog(true);
          }}
          className="flex items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          建立廣告
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-400">尚無廣告</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-4 py-3 font-medium">標題</th>
                  <th className="px-4 py-3 font-medium">位置</th>
                  <th className="px-4 py-3 font-medium">權重</th>
                  <th className="px-4 py-3 font-medium">狀態</th>
                  <th className="px-4 py-3 font-medium">上架時間</th>
                  <th className="px-4 py-3 font-medium">下架時間</th>
                  <th className="px-4 py-3 font-medium">點擊</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((ad) => {
                  const pos = POS_BADGE[ad.position] ?? {
                    label: ad.position,
                    cls: "bg-gray-100 text-gray-600",
                  };
                  return (
                    <tr key={ad.id} className={ad.is_active ? "" : "opacity-50"}>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {ad.title}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${pos.cls}`}
                        >
                          {pos.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{ad.weight}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            ad.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {ad.is_active ? "啟用" : "停用"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {fmtDate(ad.starts_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {fmtDate(ad.ends_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {ad.click_count}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleToggle(ad.id, ad.is_active)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-500"
                            title={ad.is_active ? "停用" : "啟用"}
                          >
                            {ad.is_active ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditing(ad);
                              setShowDialog(true);
                            }}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-violet-500"
                            title="編輯"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleting(ad.id)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500"
                            title="刪除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {items.map((ad) => {
              const pos = POS_BADGE[ad.position] ?? {
                label: ad.position,
                cls: "bg-gray-100 text-gray-600",
              };
              return (
                <div
                  key={ad.id}
                  className={`rounded-xl border p-4 ${
                    ad.is_active
                      ? "border-gray-200 bg-white"
                      : "border-gray-100 bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-800 truncate">
                        {ad.title}
                      </h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`rounded-full px-2 py-0.5 font-medium ${pos.cls}`}
                        >
                          {pos.label}
                        </span>
                        <span className="text-gray-400">權重 {ad.weight}</span>
                        <span className="text-gray-400">
                          點擊 {ad.click_count}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        {fmtDate(ad.starts_at)} ~ {fmtDate(ad.ends_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggle(ad.id, ad.is_active)}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-blue-500"
                      >
                        {ad.is_active ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditing(ad);
                          setShowDialog(true);
                        }}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-violet-500"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(ad.id)}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showDialog && (
        <AdvertisementDialog
          editing={editing}
          onClose={() => setShowDialog(false)}
          onSaved={() => {
            setShowDialog(false);
            void load();
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="刪除廣告"
          message="確定要刪除此廣告嗎？此操作無法還原。"
          onConfirm={() => handleDelete(deleting)}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function AdvertisementDialog({
  editing,
  onClose,
  onSaved,
}: {
  editing: AdvertisementRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [imageUrl, setImageUrl] = useState(editing?.image_url ?? "");
  const [linkUrl, setLinkUrl] = useState(editing?.link_url ?? "");
  const [position, setPosition] = useState<"banner" | "card" | "announcement">(
    editing?.position ?? "card",
  );
  const [weight, setWeight] = useState(editing?.weight ?? 1);
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [startsAt, setStartsAt] = useState(editing?.starts_at ?? "");
  const [endsAt, setEndsAt] = useState(editing?.ends_at ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    if (editing) {
      const res = await updateAdvertisementAction(editing.id, {
        title,
        description: description || null,
        image_url: imageUrl || null,
        link_url: linkUrl || null,
        position,
        weight,
        is_active: isActive,
        starts_at: startsAt || null,
        ends_at: endsAt || null,
      });
      if (res.ok) {
        toast.success("已更新");
        onSaved();
      } else toast.error(res.error);
    } else {
      const res = await createAdvertisementAction({
        title,
        description: description || undefined,
        image_url: imageUrl || undefined,
        link_url: linkUrl || undefined,
        position,
        weight,
        is_active: isActive,
        starts_at: startsAt || undefined,
        ends_at: endsAt || undefined,
      });
      if (res.ok) {
        toast.success("已建立");
        onSaved();
      } else toast.error(res.error);
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-gray-800">
          {editing ? "編輯廣告" : "建立廣告"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              標題 <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="廣告標題"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              說明文字
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="廣告描述..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              圖片 URL
            </label>
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
            {imageUrl && (
              <img
                src={imageUrl}
                alt="preview"
                className="mt-2 h-24 rounded-lg object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              連結 URL
            </label>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                位置
              </label>
              <select
                value={position}
                onChange={(e) =>
                  setPosition(
                    e.target.value as "banner" | "card" | "announcement",
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              >
                <option value="banner">Banner</option>
                <option value="card">Card</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                權重 (1-10)
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) =>
                  setWeight(
                    Math.min(10, Math.max(1, Number(e.target.value) || 1)),
                  )
                }
                min={1}
                max={10}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                上架時間
              </label>
              <input
                type="datetime-local"
                value={startsAt ? startsAt.slice(0, 16) : ""}
                onChange={(e) =>
                  setStartsAt(
                    e.target.value ? new Date(e.target.value).toISOString() : "",
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                下架時間
              </label>
              <input
                type="datetime-local"
                value={endsAt ? endsAt.slice(0, 16) : ""}
                onChange={(e) =>
                  setEndsAt(
                    e.target.value ? new Date(e.target.value).toISOString() : "",
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded accent-violet-600"
            />
            啟用
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "儲存變更" : "建立"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ━━━ Shared Confirm Dialog ━━━

function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            確定刪除
          </button>
        </div>
      </div>
    </div>
  );
}
