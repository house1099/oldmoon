import Image from "next/image";

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
