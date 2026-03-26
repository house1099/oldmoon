import Image from "next/image";

/**
 * 領袖雷框／Lottie 縮放百分比（單一設定源在 `master-avatar-frame.ts`）。
 * `MasterAvatarShell` 由此匯入；改數值請編輯 `src/lib/constants/master-avatar-frame.ts` 後存檔並重新整理頁面（必要時重啟 `npm run dev`）。
 */
export { MASTER_AVATAR_FRAME_OVERLAY_PERCENT } from "@/lib/constants/master-avatar-frame";

interface AvatarProps {
  src?: string | null;
  nickname?: string | null;
  size?: number;
  className?: string;
}

export default function Avatar({
  src,
  nickname,
  size = 48,
  className = "",
}: AvatarProps) {
  const trimmed = src?.trim() || null;

  if (trimmed) {
    const optimizedSrc = trimmed.includes("cloudinary.com")
      ? trimmed.replace(
          "/upload/",
          `/upload/w_${size * 2},h_${size * 2},c_fill,q_auto,f_auto/`,
        )
      : trimmed;
    const isCloudinary = trimmed.includes("cloudinary.com");

    return (
      <div
        className={`relative flex-shrink-0 overflow-hidden rounded-full bg-zinc-700 ${className}`}
        style={{ width: size, height: size }}
      >
        {isCloudinary ? (
          <Image
            src={optimizedSrc}
            alt={nickname ?? "冒險者"}
            fill
            sizes={`${size}px`}
            className="object-cover"
            loading="lazy"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- 非 Cloudinary 遠端圖未列入 next.config
          <img
            src={trimmed}
            alt={nickname ?? "冒險者"}
            className="h-full w-full object-cover"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full bg-zinc-700 ${className}`}
      style={{ width: size, height: size }}
    >
      <span
        className="font-medium text-white"
        style={{ fontSize: size * 0.35 }}
      >
        {nickname?.[0]?.toUpperCase() ?? "?"}
      </span>
    </div>
  );
}
