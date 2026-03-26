"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { DAILY_CHECKIN_ALREADY_CLAIMED } from "@/lib/constants/daily-checkin";
import { claimDailyCheckin } from "@/services/daily-checkin.action";
import {
  getMyRecentExpLogsAction,
  type ExpLogProfileEntry,
} from "@/services/exp-logs.action";
import { requestIgChangeAction } from "@/services/ig-request.action";
import { updateMyProfile } from "@/services/profile-update.action";
import { uploadAvatarToCloudinary } from "@/lib/utils/cloudinary";
import { getCroppedImg } from "@/lib/utils/cropImage";
import { createClient } from "@/lib/supabase/client";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import LoadingButton, { PendingLabel } from "@/components/ui/LoadingButton";
import Avatar from "@/components/ui/Avatar";
import {
  CalendarCheck,
  ChevronRight,
  Lock,
  LogOut,
  PencilLine,
  Settings,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GENDER_OPTIONS,
  INTEREST_TAG_OPTIONS,
  LEGACY_ORIENTATION_MAP,
  LEGACY_REGION_MAP,
  ORIENTATION_OPTIONS,
  REGION_OPTIONS,
  resolveLegacyLabel,
  resolveOfflineOkLabel,
} from "@/lib/constants/adventurer-questionnaire";
import { LEVEL_MIN_EXP_BY_LEVEL, getLevelTierByExp } from "@/lib/constants/levels";
import type { UserRow } from "@/lib/repositories/server/user.repository";
import { cn } from "@/lib/utils";
import { getMoodCountdown, isMoodActive } from "@/lib/utils/mood";
import { getActiveAnnouncementsAction } from "@/services/announcement.action";
import { getHomeAdsAction } from "@/services/advertisement.action";
import { recordAdClickAction } from "@/services/advertisement.action";
import type { AnnouncementRow, AdvertisementRow } from "@/types/database.types";

const IOS_TEXTAREA_CLASS =
  "w-full resize-none rounded-2xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-base text-white transition-colors placeholder:text-zinc-600 focus:border-white/30 focus:outline-none";

function levelProgressPercent(level: number, totalExp: number): number {
  if (level >= 10) return 100;
  const cur = LEVEL_MIN_EXP_BY_LEVEL[level - 1] ?? 0;
  const next = LEVEL_MIN_EXP_BY_LEVEL[level] ?? cur;
  if (next <= cur) return 100;
  return Math.min(
    100,
    Math.max(0, ((totalExp - cur) / (next - cur)) * 100),
  );
}

function interestLabel(slug: string): string {
  return INTEREST_TAG_OPTIONS.find((o) => o.value === slug)?.label ?? slug;
}

function normalizeTotalExp(v: UserRow["total_exp"]): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeLevel(v: UserRow["level"]): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(10, Math.floor(n));
}

/** 必須為模組層元件：若在父元件內宣告，每次 render 型別參考變更會整段 remount，textarea 失焦、行動鍵盤會收起。 */
function AccordionSection({
  id,
  title,
  openSection,
  setOpenSection,
  children,
  titleRight,
  renderHeader,
}: {
  id: string;
  title: string;
  openSection: string | null;
  setOpenSection: (v: string | null) => void;
  children: ReactNode;
  titleRight?: ReactNode;
  renderHeader?: (args: {
    isOpen: boolean;
    toggle: () => void;
  }) => ReactNode;
}) {
  const isOpen = openSection === id;
  function toggle() {
    setOpenSection(isOpen ? null : id);
  }
  return (
    <div className="border-t border-white/10">
      {renderHeader ? (
        renderHeader({ isOpen, toggle })
      ) : (
        <div className="flex w-full items-center gap-2 px-1 py-4">
          <button
            type="button"
            onClick={toggle}
            className="min-w-0 flex-1 text-left text-sm font-medium text-white"
          >
            {title}
          </button>
          {titleRight ? (
            <div className="flex shrink-0 items-center gap-2">{titleRight}</div>
          ) : null}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={isOpen}
            className="shrink-0 text-zinc-400 transition-transform duration-200 hover:text-white"
          >
            <span className={isOpen ? "inline-block rotate-180" : "inline-block"}>
              ▼
            </span>
          </button>
        </div>
      )}
      {isOpen ? <div className="pb-4">{children}</div> : null}
    </div>
  );
}

function AnnouncementClampedPreview({
  content,
  textClassName,
  expandHintClassName,
}: {
  content: string;
  textClassName: string;
  expandHintClassName: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [content]);

  return (
    <>
      <p
        ref={ref}
        className={cn("mt-1 text-sm leading-relaxed line-clamp-2", textClassName)}
      >
        {content}
      </p>
      {truncated ? (
        <span
          className={cn("mt-0.5 block text-xs", expandHintClassName)}
          aria-hidden
        >
          ⋯ 展開
        </span>
      ) : null}
    </>
  );
}

function HomeBannerCarousel({ ads }: { ads: AdvertisementRow[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (ads.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % ads.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [ads.length]);

  useEffect(() => {
    if (ads.length === 0) return;
    setIndex((i) => Math.min(i, ads.length - 1));
  }, [ads.length]);

  function handleClick(ad: AdvertisementRow) {
    if (ad.link_url) window.open(ad.link_url, "_blank");
    void recordAdClickAction(ad.id);
  }

  return (
    <div className="relative w-full">
      <div className="relative h-40 w-full overflow-hidden rounded-2xl">
        {ads.map((ad, i) => (
          <button
            key={ad.id}
            type="button"
            onClick={() => handleClick(ad)}
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              i === index
                ? "z-10 opacity-100"
                : "pointer-events-none z-0 opacity-0",
            )}
          >
            {ad.image_url ? (
              <img
                src={ad.image_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-violet-900/40" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            {ad.image_url ? (
              <span className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)] truncate text-left font-semibold text-white">
                {ad.title}
              </span>
            ) : (
              <span className="absolute inset-0 z-10 flex items-center justify-center px-4 text-center font-semibold text-white">
                {ad.title}
              </span>
            )}
          </button>
        ))}
      </div>
      {ads.length > 1 ? (
        <div
          className="pointer-events-none absolute bottom-2 left-0 right-0 z-20 flex justify-center gap-1.5"
          aria-hidden
        >
          {ads.map((ad, i) => (
            <span
              key={ad.id}
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                i === index ? "bg-white" : "bg-white/40",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function GuildProfileHome({ profile }: { profile: UserRow }) {
  const router = useRouter();
  const totalExpSafe = normalizeTotalExp(profile.total_exp);
  const levelSafe = normalizeLevel(profile.level);
  const tier = getLevelTierByExp(totalExpSafe);
  const progress = levelProgressPercent(levelSafe, totalExpSafe);

  const [bioVillage, setBioVillage] = useState(profile.bio_village ?? "");
  const [bioMarket, setBioMarket] = useState(profile.bio_market ?? "");
  const [savingBioVillage, setSavingBioVillage] = useState(false);
  const [savingBioMarket, setSavingBioMarket] = useState(false);
  const [igPublic, setIgPublic] = useState(profile.ig_public);
  const [igInput, setIgInput] = useState("");
  const [showIgChangeInput, setShowIgChangeInput] = useState(false);
  const [savingInstagram, setSavingInstagram] = useState(false);
  const [igRequestSubmitting, setIgRequestSubmitting] = useState(false);
  const [moodInput, setMoodInput] = useState(() =>
    isMoodActive(profile.mood_at ?? null) ? (profile.mood ?? "") : "",
  );
  const [moodAt, setMoodAt] = useState<string | null>(profile.mood_at ?? null);
  const [savingMood, setSavingMood] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [igSaving, setIgSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    profile.avatar_url?.trim() || null,
  );
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinDone, setCheckinDone] = useState(false);
  const [cooldown, setCooldown] = useState<{
    hours: number;
    mins: number;
  } | null>(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [expLogs, setExpLogs] = useState<ExpLogProfileEntry[]>([]);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [homeAds, setHomeAds] = useState<AdvertisementRow[]>([]);
  const [expandedAnnouncement, setExpandedAnnouncement] = useState<AnnouncementRow | null>(null);

  useEffect(() => {
    setBioVillage(profile.bio_village ?? "");
    setBioMarket(profile.bio_market ?? "");
    setIgPublic(profile.ig_public);
    const at = profile.mood_at ?? null;
    setMoodAt(at);
    setMoodInput(isMoodActive(at) ? (profile.mood ?? "") : "");
    setAvatarUrl(profile.avatar_url?.trim() || null);
  }, [profile]);

  useEffect(() => {
    getActiveAnnouncementsAction().then(setAnnouncements).catch(() => {});
    getHomeAdsAction().then(setHomeAds).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editOpen) return;
    setIgInput("");
    setShowIgChangeInput(false);
  }, [editOpen, profile.instagram_handle]);

  const handleIosTextareaFocus = useCallback(
    (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setTimeout(() => {
        e.target.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await getMyRecentExpLogsAction();
      if (cancelled) return;
      if (r.ok) setExpLogs(r.logs);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile.id, profile.updated_at]);

  useEffect(() => {
    const update = () => {
      const remaining = getMoodCountdown(moodAt);
      setCountdown(remaining);
      if (!remaining && moodAt) {
        setMoodInput("");
        setMoodAt(null);
      }
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [moodAt]);

  /** 過期或無效時清空輸入並重置 moodAt；有效期內則在過期瞬間清空 */
  useEffect(() => {
    if (!moodAt || !isMoodActive(moodAt)) {
      setMoodInput("");
      return;
    }
    const expiry = new Date(moodAt).getTime() + 24 * 60 * 60 * 1000;
    const ms = expiry - Date.now();
    if (ms <= 0) {
      setMoodInput("");
      setMoodAt(null);
      return;
    }
    const t = window.setTimeout(() => {
      setMoodInput("");
      setMoodAt(null);
    }, ms);
    return () => clearTimeout(t);
  }, [moodAt]);

  useEffect(() => {
    const lastCheckin = profile.last_checkin_at
      ? new Date(profile.last_checkin_at).getTime()
      : 0;
    const now = Date.now();
    const remainMs = 24 * 60 * 60 * 1000 - (now - lastCheckin);

    if (remainMs > 0) {
      setCooldown({
        hours: Math.floor(remainMs / (1000 * 60 * 60)),
        mins: Math.floor((remainMs % (1000 * 60 * 60)) / (1000 * 60)),
      });
      setCheckinDone(true);
    } else {
      setCheckinDone(false);
      setCooldown(null);
    }
  }, [profile.last_checkin_at]);

  useEffect(() => {
    if (!checkinDone) return;
    const timer = setInterval(() => {
      const lastCheckin = profile.last_checkin_at
        ? new Date(profile.last_checkin_at).getTime()
        : 0;
      const remainMs = 24 * 60 * 60 * 1000 - (Date.now() - lastCheckin);
      if (remainMs <= 0) {
        setCheckinDone(false);
        setCooldown(null);
      } else {
        setCooldown({
          hours: Math.floor(remainMs / (1000 * 60 * 60)),
          mins: Math.floor((remainMs % (1000 * 60 * 60)) / (1000 * 60)),
        });
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [checkinDone, profile.last_checkin_at]);

  useEffect(() => {
    if (!cropOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [cropOpen]);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const closeCropModal = useCallback(() => {
    setCropSrc((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return "";
    });
    setCropOpen(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, []);

  async function handleSaveMood() {
    if (!moodInput.trim()) return;
    setSavingMood(true);
    const now = new Date().toISOString();
    try {
      const result = await updateMyProfile({
        mood: moodInput.trim(),
        mood_at: now,
      });
      if (result.ok === false) {
        toast.error("❌ 操作失敗，請稍後再試");
        return;
      }
      setMoodAt(now);
      toast.success("今日心情已更新 ✨");
      router.refresh();
    } finally {
      setSavingMood(false);
    }
  }

  async function handleSaveBio(type: "village" | "market") {
    if (type === "village") {
      setSavingBioVillage(true);
      try {
        const result = await updateMyProfile({
          bio_village: bioVillage.trim(),
        });
        if (result.ok === false) {
          toast.error("❌ 操作失敗，請稍後再試");
          return;
        }
        toast.success("✅ 已更新");
        router.refresh();
      } finally {
        setSavingBioVillage(false);
      }
    } else {
      setSavingBioMarket(true);
      try {
        const result = await updateMyProfile({
          bio_market: bioMarket.trim(),
        });
        if (result.ok === false) {
          toast.error("❌ 操作失敗，請稍後再試");
          return;
        }
        toast.success("✅ 已更新");
        router.refresh();
      } finally {
        setSavingBioMarket(false);
      }
    }
  }

  async function handleConfirmBindIg() {
    if (!igInput.trim()) return;
    setSavingInstagram(true);
    try {
      const result = await updateMyProfile({
        instagram_handle: igInput.trim(),
      });
      if (result.ok === false) {
        toast.error("❌ 操作失敗，請稍後再試");
        return;
      }
      toast.success("IG 帳號已綁定");
      setIgInput("");
      router.refresh();
    } finally {
      setSavingInstagram(false);
    }
  }

  async function handleSubmitIgChangeRequest() {
    if (!igInput.trim()) {
      toast.error("請填寫新的 IG 帳號");
      return;
    }
    setIgRequestSubmitting(true);
    try {
      const r = await requestIgChangeAction(igInput.trim());
      if (!r.ok) {
        toast.error("❌ 操作失敗，請稍後再試");
        return;
      }
      toast.success("申請已送出，等待管理員審核");
      setShowIgChangeInput(false);
      setIgInput("");
      router.refresh();
    } finally {
      setIgRequestSubmitting(false);
    }
  }

  async function onIgPublicChange(checked: boolean) {
    const prev = igPublic;
    setIgPublic(checked);
    setIgSaving(true);
    try {
      const result = await updateMyProfile({ ig_public: checked });
      if (result.ok === false) {
        setIgPublic(prev);
        toast.error("❌ 操作失敗，請稍後再試");
        return;
      }
      toast.success("IG 公開狀態已更新");
      router.refresh();
    } finally {
      setIgSaving(false);
    }
  }

  function handleIgToggle() {
    if (
      igSaving ||
      savingInstagram ||
      igRequestSubmitting ||
      savingMood ||
      savingBioVillage ||
      savingBioMarket
    ) {
      return;
    }
    void onIgPublicChange(!igPublic);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("請選擇圖片檔案");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("圖片請小於 5MB");
      return;
    }
    setCropSrc((prev) => {
      if (prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropOpen(true);
  }

  async function handleCropConfirm() {
    if (!cropSrc || !croppedAreaPixels) {
      toast.error("請稍候畫面載入完成");
      return;
    }
    setUploading(true);
    try {
      const blob = await getCroppedImg(cropSrc, croppedAreaPixels);
      const mime = blob.type || "image/jpeg";
      const file = new File([blob], "avatar.jpg", { type: mime });
      const cloudUrl = await uploadAvatarToCloudinary(file);
      const result = await updateMyProfile({ avatar_url: cloudUrl });
      if (result.ok === false) {
        toast.error("❌ 操作失敗，請稍後再試");
        return;
      }
      setAvatarUrl(cloudUrl);
      toast.success("大頭貼已更新");
      closeCropModal();
      router.refresh();
    } catch (err) {
      console.error("❌ 頭像裁切或上傳:", err);
      toast.error("❌ 操作失敗，請稍後再試");
    } finally {
      setUploading(false);
    }
  }

  async function onCheckin() {
    setCheckinLoading(true);
    try {
      const result = await claimDailyCheckin();
      if (result.ok === false) {
        if (
          result.error === DAILY_CHECKIN_ALREADY_CLAIMED ||
          /duplicate/i.test(result.error)
        ) {
          toast.success("還在冷卻中，明天再來！");
          setCheckinDone(true);
          setCooldown({
            hours: result.remainHours ?? 23,
            mins: result.remainMins ?? 59,
          });
          return;
        }
        toast.error("❌ 操作失敗，請稍後再試");
        return;
      }
      toast.success("+1 EXP！繼續加油 ⚔️");
      setCheckinDone(true);
      setCooldown({ hours: 23, mins: 59 });
      router.refresh();
    } finally {
      setCheckinLoading(false);
    }
  }

  async function onLogout() {
    setLogoutLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } finally {
      setLogoutLoading(false);
    }
  }

  const hasIg = Boolean(profile.instagram_handle?.trim());
  const genderLabel = resolveLegacyLabel(profile.gender, GENDER_OPTIONS);
  const regionLabel = resolveLegacyLabel(
    profile.region,
    REGION_OPTIONS,
    LEGACY_REGION_MAP,
  );
  const orientationLabel = resolveLegacyLabel(
    profile.orientation,
    ORIENTATION_OPTIONS,
    LEGACY_ORIENTATION_MAP,
  );
  const offlineLabel = resolveOfflineOkLabel(profile.offline_ok);

  const pinnedAnnouncements = announcements.filter((a) => a.is_pinned);
  const normalAnnouncements = announcements.filter((a) => !a.is_pinned);
  const bannerAds = homeAds.filter((ad) => ad.position === "banner");
  const cardAds = homeAds.filter((ad) => ad.position === "card");

  return (
    <main className="flex w-full flex-col gap-6">
      {bannerAds.length > 0 ? (
        <section aria-label="贊助橫幅">
          <HomeBannerCarousel ads={bannerAds} />
        </section>
      ) : null}

      {announcements.length > 0 && (
        <div className="space-y-3">
          {pinnedAnnouncements.map((a) => (
            <div
              key={a.id}
              role="button"
              tabIndex={0}
              onClick={() => setExpandedAnnouncement(a)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setExpandedAnnouncement(a);
                }
              }}
              className="w-full cursor-pointer rounded-2xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-left backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0">📌</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-amber-300">{a.title}</h3>
                  <AnnouncementClampedPreview
                    content={a.content}
                    textClassName="text-amber-100/80"
                    expandHintClassName="text-amber-400/90"
                  />
                  {a.image_url && (
                    <img
                      src={a.image_url}
                      alt=""
                      className="mt-2 max-h-40 w-full rounded-xl object-cover"
                    />
                  )}
                  <p className="mt-2 text-xs text-amber-500/60">
                    {new Intl.DateTimeFormat("zh-TW", {
                      timeZone: "Asia/Taipei",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(a.created_at))}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {normalAnnouncements.length > 0 && (
            <div className="space-y-2">
              {normalAnnouncements.map((a) => (
                <div
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedAnnouncement(a)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedAnnouncement(a);
                    }
                  }}
                  className="w-full cursor-pointer rounded-xl border border-zinc-700/30 bg-zinc-900/50 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
                >
                  <h4 className="text-sm font-medium text-zinc-200">{a.title}</h4>
                  <AnnouncementClampedPreview
                    content={a.content}
                    textClassName="text-zinc-400"
                    expandHintClassName="text-zinc-500"
                  />
                  <p className="mt-2 text-[10px] text-zinc-500">
                    {new Intl.DateTimeFormat("zh-TW", {
                      timeZone: "Asia/Taipei",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(a.created_at))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {expandedAnnouncement && (
        <Dialog open onOpenChange={() => setExpandedAnnouncement(null)}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{expandedAnnouncement.title}</DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                {new Intl.DateTimeFormat("zh-TW", {
                  timeZone: "Asia/Taipei",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(expandedAnnouncement.created_at))}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                {expandedAnnouncement.content}
              </p>
              {expandedAnnouncement.image_url && (
                <img
                  src={expandedAnnouncement.image_url}
                  alt=""
                  className="w-full rounded-xl object-cover"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <section className="glass-panel relative p-6 sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #fff 0, transparent 45%), radial-gradient(circle at 80% 80%, #a78bfa 0, transparent 40%)",
          }}
          aria-hidden
        />

        <div className="relative flex w-full flex-col items-center gap-5 text-center">
          <div
            className={`relative mx-auto overflow-hidden rounded-full border-2 border-white/20 bg-gradient-to-b from-zinc-800 to-zinc-950 shadow-[inset_0_2px_14px_rgba(255,255,255,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50 ${
              uploading || cropOpen
                ? "cursor-not-allowed opacity-80"
                : "cursor-pointer"
            }`}
            style={{ width: 96, height: 96 }}
            role="button"
            tabIndex={uploading || cropOpen ? -1 : 0}
            aria-label="更換大頭貼"
            aria-disabled={uploading || cropOpen}
            onClick={() => {
              if (uploading || cropOpen) return;
              fileInputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if (uploading || cropOpen) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <Avatar
              src={avatarUrl}
              nickname={profile?.nickname}
              size={96}
              className="border-0 bg-transparent"
            />

            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                <span className="text-xs text-white">上傳中…</span>
              </div>
            )}

            {!uploading && (
              <div className="absolute inset-0 hidden items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity md:flex md:hover:opacity-100">
                <span className="text-xs font-medium text-white">更換</span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleAvatarChange(e)}
            />
          </div>

          <div className="w-full space-y-2">
            <p className="font-serif text-xl tracking-wide text-zinc-100 sm:text-2xl">
              {profile.nickname}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 text-sm">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/35 bg-gradient-to-r from-violet-950/80 to-zinc-900/90 px-3 py-1 text-xs font-semibold tabular-nums tracking-wide text-violet-100 shadow-md shadow-violet-950/40"
                title="等級徽章"
              >
                Lv.{levelSafe}
              </span>
              <span className="text-violet-200/95">
                {tier.symbol} {tier.title}
              </span>
            </div>
            <p className="text-center text-[11px] leading-relaxed text-zinc-500 sm:text-xs">
              <span className="text-zinc-400">性別</span> {genderLabel}
              <span className="mx-1.5 text-zinc-600" aria-hidden>
                ·
              </span>
              <span className="text-zinc-400">地區</span> {regionLabel}
              <span className="mx-1.5 text-zinc-600" aria-hidden>
                ·
              </span>
              <span className="text-zinc-400">性向</span> {orientationLabel}
              <span className="mx-1.5 text-zinc-600" aria-hidden>
                ·
              </span>
              <span className="text-zinc-400">線下</span> {offlineLabel}
            </p>
          </div>

          <div className="w-full max-w-md space-y-1.5">
            <div className="flex justify-between gap-2 text-[11px] text-zinc-400 sm:text-xs">
              <span className="tabular-nums text-cyan-200/90">
                EXP {totalExpSafe.toLocaleString("zh-TW")}
              </span>
              <span>
                {levelSafe < 10
                  ? `下一階 ${(
                      LEVEL_MIN_EXP_BY_LEVEL[levelSafe] ?? 0
                    ).toLocaleString("zh-TW")} EXP`
                  : "已達傳奇之巔"}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full border border-slate-400/25 bg-zinc-950/80 shadow-inner">
              <div
                className="mercury-exp-fill h-full rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        className="rounded-3xl border border-violet-500/30 bg-violet-950/40 backdrop-blur-xl p-4 space-y-3"
        style={{ boxShadow: '0 0 20px rgba(139,92,246,0.15)' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">
            ✨ 今日心情
          </span>
          {countdown ? (
            <span className="text-xs text-violet-300/70">{countdown}</span>
          ) : null}
        </div>

        <textarea
          value={moodInput}
          onChange={(e) => setMoodInput(e.target.value)}
          onFocus={handleIosTextareaFocus}
          placeholder="今天的心情是..."
          maxLength={50}
          rows={2}
          className={cn(
            IOS_TEXTAREA_CLASS,
            "border-violet-500/20 py-2.5 focus:border-violet-400/50",
          )}
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-600">{moodInput.length}/50</span>
          <LoadingButton
            className="px-5 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 disabled:opacity-40 bg-violet-600/80 text-white hover:bg-violet-500/80 border border-violet-400/30"
            loading={savingMood}
            loadingText="更新中…"
            disabled={!moodInput.trim()}
            onClick={handleSaveMood}
          >
            確認
          </LoadingButton>
        </div>
      </section>

      {cardAds.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-zinc-500">贊助</p>
          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {cardAds.map((ad) => (
              <button
                key={ad.id}
                type="button"
                onClick={() => {
                  if (ad.link_url) window.open(ad.link_url, "_blank");
                  void recordAdClickAction(ad.id);
                }}
                className="flex h-[236px] w-[240px] min-w-[240px] max-w-[240px] shrink-0 flex-col overflow-hidden rounded-2xl border border-zinc-700/20 bg-zinc-900/40 text-left"
              >
                {ad.image_url ? (
                  <div className="relative h-32 w-full shrink-0 overflow-hidden">
                    <img
                      src={ad.image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-16 w-full shrink-0 items-center justify-center bg-zinc-800/60 px-2">
                    <span className="line-clamp-1 text-center text-sm font-medium text-zinc-200">
                      {ad.title}
                    </span>
                  </div>
                )}
                <div className="flex min-h-0 flex-1 flex-col gap-1 p-3">
                  {ad.image_url ? (
                    <h4 className="line-clamp-1 text-sm font-medium text-zinc-200">
                      {ad.title}
                    </h4>
                  ) : null}
                  {ad.description ? (
                    <p className="line-clamp-2 text-xs text-zinc-400">
                      {ad.description}
                    </p>
                  ) : (
                    <div className="min-h-0 flex-1" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="glass-panel overflow-hidden p-0 shadow-xl">
        <p className="border-b border-white/10 px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-zinc-400">
          我的狀態
        </p>
        <div className="px-4 pb-4">
          <AccordionSection
            id="bio"
            title="自白"
            openSection={openSection}
            setOpenSection={setOpenSection}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs text-zinc-400">興趣自白</p>
                <textarea
                  value={bioVillage}
                  onChange={(e) => setBioVillage(e.target.value)}
                  onFocus={handleIosTextareaFocus}
                  placeholder="說說你的興趣..."
                  maxLength={200}
                  rows={3}
                  className={IOS_TEXTAREA_CLASS}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600">
                    {bioVillage.length}/200
                  </span>
                  <LoadingButton
                    className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-white/20 active:scale-95 disabled:opacity-40"
                    loading={savingBioVillage}
                    loadingText="處理中…"
                    onClick={() => void handleSaveBio("village")}
                  >
                    確認修改
                  </LoadingButton>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-zinc-400">技能自白</p>
                <textarea
                  value={bioMarket}
                  onChange={(e) => setBioMarket(e.target.value)}
                  onFocus={handleIosTextareaFocus}
                  placeholder="說說你能提供的技能..."
                  maxLength={200}
                  rows={3}
                  className={IOS_TEXTAREA_CLASS}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600">
                    {bioMarket.length}/200
                  </span>
                  <LoadingButton
                    className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-white/20 active:scale-95 disabled:opacity-40"
                    loading={savingBioMarket}
                    loadingText="處理中…"
                    onClick={() => void handleSaveBio("market")}
                  >
                    確認修改
                  </LoadingButton>
                </div>
              </div>
            </div>
          </AccordionSection>

          <AccordionSection
            id="reputation"
            title="信譽與紀錄"
            openSection={openSection}
            setOpenSection={setOpenSection}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">註冊時間</span>
                  <span className="text-white">
                    {profile.created_at
                      ? new Date(profile.created_at).toLocaleDateString("zh-TW")
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">邀請碼</span>
                  <span className="font-mono text-white">
                    {profile.invite_code ?? "尚未生成"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">推薦人</span>
                  <span className="text-white">
                    {profile.invited_by ?? "—"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-zinc-400">近三個月經驗值紀錄</p>
                <div className="overflow-x-auto">
                  <div
                    className="flex gap-2 pb-2"
                    style={{ minWidth: "max-content" }}
                  >
                    {expLogs.map((log) => (
                      <div
                        key={log.id}
                        className="flex-shrink-0 rounded-2xl border border-white/10 bg-zinc-900/60 px-3 py-2 text-center"
                      >
                        <p className="text-xs text-zinc-400">
                          {new Date(log.created_at).toLocaleDateString(
                            "zh-TW",
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </p>
                        <p className="text-sm font-medium text-white">
                          {log.delta_exp >= 0 ? "+" : ""}
                          {log.delta_exp} EXP
                        </p>
                        <p className="text-xs text-zinc-500">{log.source}</p>
                      </div>
                    ))}
                    {expLogs.length === 0 ? (
                      <p className="text-xs text-zinc-500">尚無紀錄</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </AccordionSection>

          <AccordionSection
            id="tags"
            title="興趣與技能標籤"
            openSection={openSection}
            setOpenSection={setOpenSection}
            renderHeader={({ isOpen, toggle }) => (
              <div className="flex w-full items-center justify-between gap-2 px-1 py-4">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <button
                    type="button"
                    onClick={toggle}
                    className="text-left text-sm font-medium text-white"
                  >
                    興趣與技能標籤
                  </button>
                  <Link
                    href="/profile/edit-tags"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800/60 border border-white/10 text-zinc-400 hover:text-white transition-colors text-xs"
                  >
                    ✏️ 編輯
                  </Link>
                </div>
                <button
                  type="button"
                  onClick={toggle}
                  aria-expanded={isOpen}
                  className="shrink-0"
                >
                  <span
                    className={`transition-transform duration-200 text-xs text-zinc-500 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    ▼
                  </span>
                </button>
              </div>
            )}
          >
            <div className="space-y-4">
              {profile.interests && profile.interests.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
                    興趣村莊
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-violet-500/40 bg-violet-500/20 px-3 py-1 text-xs text-violet-200"
                      >
                        {interestLabel(tag)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {(profile.skills_offer?.length ?? 0) > 0 ||
              (profile.skills_want?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                    技能市集
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills_offer?.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 text-xs text-amber-200"
                      >
                        {tag}
                      </span>
                    ))}
                    {profile.skills_want?.map((tag) => (
                      <span
                        key={`want-${tag}`}
                        className="rounded-full border border-sky-500/40 bg-sky-500/20 px-3 py-1 text-xs text-sky-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {!profile.interests?.length &&
              !profile.skills_offer?.length &&
              !profile.skills_want?.length ? (
                <p className="text-xs text-zinc-500">尚未填寫任何標籤</p>
              ) : null}
            </div>
          </AccordionSection>
        </div>
      </section>

      <nav className="flex w-full flex-col gap-0" aria-label="個人頁操作">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="mb-3 flex w-full items-center justify-between rounded-2xl border border-white/5 bg-zinc-900/50 p-4 text-left text-zinc-100 transition hover:border-violet-500/25 hover:bg-zinc-900/70"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-violet-950/50 text-violet-200">
              <PencilLine className="size-5" aria-hidden />
            </span>
            <span className="font-medium">帳號設定</span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-zinc-500" aria-hidden />
        </button>

        {profile.role === "master" ? (
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="mb-3 flex w-full cursor-pointer items-center justify-between rounded-2xl border border-zinc-700/30 bg-zinc-900/50 p-3 text-left active:opacity-90"
          >
            <span className="flex items-center gap-3">
              <Settings
                className="h-4 w-4 shrink-0 text-zinc-500"
                aria-hidden
              />
              <span className="text-sm text-zinc-400">管理後台</span>
            </span>
            <ChevronRight
              className="h-4 w-4 shrink-0 text-zinc-600"
              aria-hidden
            />
          </button>
        ) : null}

        <button
          type="button"
          disabled={checkinLoading || checkinDone}
          onClick={onCheckin}
          className={cn(
            "mb-3 flex w-full items-center justify-between rounded-2xl border p-4 text-left transition disabled:pointer-events-none",
            checkinDone
              ? "cursor-not-allowed border-zinc-700/50 bg-zinc-900/40 text-zinc-500 opacity-85 backdrop-blur-sm"
              : "border-white/10 bg-gradient-to-r from-amber-950/55 via-zinc-900/55 to-violet-950/45 text-zinc-100 shadow-md shadow-black/25 hover:border-amber-400/30 hover:from-amber-900/50 hover:via-zinc-900/50 hover:to-violet-900/40 active:scale-[0.99]",
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                checkinDone
                  ? "bg-zinc-800/80 text-zinc-500"
                  : "bg-amber-950/50 text-amber-200 ring-1 ring-amber-500/25",
              )}
            >
              {checkinDone ? (
                <Lock className="size-5" aria-hidden />
              ) : (
                <CalendarCheck className="size-5" aria-hidden />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-medium">
                {checkinLoading ? (
                  <PendingLabel
                    text="處理中…"
                    className="justify-start text-sm font-medium"
                  />
                ) : checkinDone && cooldown ? (
                  `⏳ 還有 ${cooldown.hours} 小時 ${cooldown.mins} 分`
                ) : checkinDone ? (
                  "⏳ 簽到冷卻中"
                ) : (
                  "📅 每日簽到（+1 EXP）"
                )}
              </span>
            </span>
          </span>
          {!checkinDone ? (
            <ChevronRight className="size-5 shrink-0 text-zinc-500" aria-hidden />
          ) : null}
        </button>

        <button
          type="button"
          disabled={logoutLoading}
          onClick={onLogout}
          className="flex w-full items-center justify-between rounded-2xl border border-white/5 bg-zinc-900/50 p-4 text-left text-zinc-100 transition hover:border-red-500/35 hover:bg-red-950/25 disabled:pointer-events-none disabled:opacity-60"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-red-950/35 text-red-200">
              <LogOut className="size-5" aria-hidden />
            </span>
            <span className="font-medium">
              {logoutLoading ? "連線中…" : "結束連線（登出）"}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-zinc-500" aria-hidden />
        </button>
      </nav>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b border-white/10 px-4 pb-3 pt-4">
            <DialogTitle className="text-zinc-100">帳號設定</DialogTitle>
            <DialogDescription className="text-zinc-400">
              更多資料請在首頁各區塊直接編輯。已綁定 IG
              後若要修改須送審；公開與否開關仍會立即寫入。
            </DialogDescription>
          </DialogHeader>
          <div className="flex max-h-[min(70vh,520px)] flex-col gap-5 overflow-y-auto px-4 py-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-white">Instagram 帳號</p>

              {hasIg ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 rounded-full border border-white/10 bg-zinc-900/40 px-4 py-3">
                    <span className="text-sm text-zinc-400">@</span>
                    <span className="flex-1 text-sm text-white">
                      {profile.instagram_handle}
                    </span>
                    <span className="text-xs text-zinc-500">已綁定</span>
                  </div>

                  {showIgChangeInput ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/60 px-4 py-3 transition-colors focus-within:border-white/30">
                        <span className="text-sm text-zinc-400">@</span>
                        <input
                          type="text"
                          value={igInput}
                          onChange={(e) =>
                            setIgInput(e.target.value.replace(/\s/g, ""))
                          }
                          placeholder="新的 IG 帳號"
                          autoComplete="username"
                          className="min-w-0 flex-1 border-0 bg-transparent text-base text-white outline-none placeholder:text-zinc-600"
                        />
                      </div>
                      <div className="flex gap-2">
                        <LoadingButton
                          className="flex-1 rounded-full bg-white/10 py-2 text-sm text-white transition-all hover:bg-white/20 active:scale-95 disabled:opacity-40"
                          loading={igRequestSubmitting}
                          loadingText="處理中…"
                          disabled={!igInput.trim()}
                          onClick={handleSubmitIgChangeRequest}
                        >
                          確認送出申請
                        </LoadingButton>
                        <button
                          type="button"
                          disabled={igRequestSubmitting}
                          onClick={() => {
                            setShowIgChangeInput(false);
                            setIgInput("");
                          }}
                          className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={igRequestSubmitting}
                      onClick={() => setShowIgChangeInput(true)}
                      className="w-full rounded-full bg-white/10 py-2 text-sm text-white transition-all hover:bg-white/20 active:scale-95 disabled:opacity-40"
                    >
                      申請修改 IG 帳號
                    </button>
                  )}

                  <p className="text-center text-xs text-zinc-500">
                    申請後由公會管理員審核，審核通過才會更新
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/60 px-4 py-3 transition-colors focus-within:border-white/30">
                    <span className="text-sm text-zinc-400">@</span>
                    <input
                      type="text"
                      value={igInput}
                      onChange={(e) =>
                        setIgInput(e.target.value.replace(/\s/g, ""))
                      }
                      placeholder="your_ig_handle"
                      autoComplete="username"
                      className="min-w-0 flex-1 border-0 bg-transparent text-base text-white outline-none placeholder:text-zinc-600"
                    />
                  </div>
                  <LoadingButton
                    className="w-full rounded-full bg-white/10 py-2 text-sm text-white transition-all hover:bg-white/20 active:scale-95 disabled:opacity-40"
                    loading={savingInstagram}
                    loadingText="處理中…"
                    disabled={!igInput.trim()}
                    onClick={handleConfirmBindIg}
                  >
                    確認設定
                  </LoadingButton>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-900/60 px-4 py-4">
              <div className="min-w-0 pr-3">
                <p className="text-sm font-medium text-white">
                  IG 狀態：{igPublic ? "公開" : "不公開"}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  切換後立即寫入資料庫
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={igPublic}
                aria-label={igPublic ? "IG 狀態：公開" : "IG 狀態：不公開"}
                disabled={
                  igSaving ||
                  savingInstagram ||
                  igRequestSubmitting ||
                  savingMood ||
                  savingBioVillage ||
                  savingBioMarket
                }
                onClick={handleIgToggle}
                className={cn(
                  "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:pointer-events-none disabled:opacity-50",
                  igPublic ? "bg-blue-500" : "bg-zinc-600",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200",
                    igPublic ? "translate-x-6" : "translate-x-1",
                  )}
                />
              </button>
            </div>
          </div>

          <DialogFooter className="flex justify-center border-t border-white/10 bg-black/20 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
            <Button
              type="button"
              variant="outline"
              className="mx-auto max-w-[80%] border-white/15 text-zinc-100"
              onClick={() => setEditOpen(false)}
            >
              關閉
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {cropOpen && cropSrc ? (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black"
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-crop-title"
        >
          <div className="glass-panel shrink-0 border-b border-white/10 px-4 py-3 text-center shadow-2xl backdrop-blur-xl">
            <p
              id="avatar-crop-title"
              className="text-sm font-medium tracking-wide text-zinc-100"
            >
              調整頭像
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              拖曳與縮放，圓形區域即為裁切範圍
            </p>
          </div>

          <div className="relative min-h-0 flex-1 w-full bg-black">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <div className="glass-panel shrink-0 border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-md gap-3">
              <button
                type="button"
                disabled={uploading}
                onClick={closeCropModal}
                className="flex-1 rounded-full border border-white/15 bg-zinc-900/70 px-5 py-2.5 text-sm text-zinc-200 transition hover:bg-zinc-800/90 disabled:opacity-50"
              >
                取消
              </button>
              <LoadingButton
                className="flex-1 rounded-full border border-violet-400/35 bg-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-950/50 transition hover:bg-violet-500 disabled:pointer-events-none disabled:opacity-45"
                loading={uploading}
                loadingText="處理中…"
                disabled={!croppedAreaPixels}
                onClick={handleCropConfirm}
              >
                確認裁切
              </LoadingButton>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
