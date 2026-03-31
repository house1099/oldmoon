"use client";

import { useMemo } from "react";
import { toast } from "sonner";
import { getShopLocalImageOptionsAction } from "@/services/admin.action";

export type LocalFrameImageBuckets = {
  framesRoot: string[];
  framesAvatars: string[];
  framesCards: string[];
  /** `public/items`（稱號胸章等，與商城本機下拉一致） */
  items: string[];
};

type Props = {
  rewardType: "avatar_frame" | "card_frame" | "title";
  imageUrl: string;
  onImageUrlChange: (url: string) => void;
  buckets: LocalFrameImageBuckets;
  onBucketsChange: (b: LocalFrameImageBuckets) => void;
  selectId: string;
  manualInputId: string;
};

export async function fetchLocalFrameBuckets(): Promise<
  LocalFrameImageBuckets | null
> {
  const res = await getShopLocalImageOptionsAction();
  if (!res.ok) {
    toast.error(res.error);
    return null;
  }
  return {
    framesRoot: res.data.framesRoot,
    framesAvatars: res.data.framesAvatars,
    framesCards: res.data.framesCards,
    items: res.data.items,
  };
}

export function LocalFrameImagePicker({
  rewardType,
  imageUrl,
  onImageUrlChange,
  buckets,
  onBucketsChange,
  selectId,
  manualInputId,
}: Props) {
  const trimmed = imageUrl.trim();
  const inList = useMemo(() => {
    if (rewardType === "title") {
      return new Set(buckets.items);
    }
    if (rewardType === "avatar_frame") {
      return new Set([
        ...buckets.framesAvatars,
        ...buckets.framesRoot,
      ]);
    }
    return new Set([...buckets.framesCards, ...buckets.framesRoot]);
  }, [rewardType, buckets]);

  const selectValue = inList.has(trimmed) ? trimmed : "";

  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-500" htmlFor={selectId}>
        {rewardType === "title"
          ? "稱號胸章圖（與商城相同：掃描 public/items）"
          : "框架圖片（與商城相同：掃描 public）"}
      </label>
      <div className="grid grid-cols-[1fr_auto] items-start gap-2">
        <select
          id={selectId}
          value={selectValue}
          aria-label={
            rewardType === "title"
              ? "從 public/items 選擇稱號胸章圖"
              : "從 public 資料夾選擇框架圖檔"
          }
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            onImageUrlChange(v);
          }}
          className="block w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        >
          <option value="">從資料夾直接選圖（最穩定）</option>
          {rewardType === "title" ? (
            buckets.items.length > 0 ? (
              <optgroup label="items/（稱號胸章建議）">
                {buckets.items.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </optgroup>
            ) : null
          ) : rewardType === "avatar_frame" ? (
            <>
              {buckets.framesAvatars.length > 0 ? (
                <optgroup label="frames/avatars/（頭像框建議）">
                  {buckets.framesAvatars.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {buckets.framesRoot.length > 0 ? (
                <optgroup label="frames/ 根目錄（legacy）">
                  {buckets.framesRoot.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </>
          ) : (
            <>
              {buckets.framesCards.length > 0 ? (
                <optgroup label="frames/cards/（卡框建議）">
                  {buckets.framesCards.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              {buckets.framesRoot.length > 0 ? (
                <optgroup label="frames/ 根目錄（legacy）">
                  {buckets.framesRoot.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </optgroup>
              ) : null}
            </>
          )}
        </select>
        <button
          type="button"
          onClick={() => {
            void (async () => {
              const next = await fetchLocalFrameBuckets();
              if (next) {
                onBucketsChange(next);
                toast.success("已重新讀取圖片清單");
              }
            })();
          }}
          className="shrink-0 rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50"
        >
          重新掃描
        </button>
      </div>
      <div>
        <label className="sr-only" htmlFor={manualInputId}>
          框架圖片路徑手動輸入
        </label>
        <input
          id={manualInputId}
          type="text"
          value={imageUrl}
          onChange={(e) => onImageUrlChange(e.target.value)}
          placeholder={
            rewardType === "title"
              ? "/items/title-badge.png"
              : rewardType === "avatar_frame"
                ? "/frames/avatars/example.png"
                : "/frames/cards/example.png"
          }
          className="mt-0.5 w-full rounded-lg border border-gray-200 px-2 py-1 text-sm"
        />
        <p className="mt-0.5 text-[10px] text-gray-500">
          {rewardType === "title"
            ? "稱號胸章建議放 public/items/，透明底 PNG／WebP、正方形構圖；亦可貼 Cloudinary URL。"
            : rewardType === "avatar_frame"
              ? "頭像框建議放 public/frames/avatars/；亦可貼 Cloudinary URL。"
              : "卡框建議放 public/frames/cards/；亦可貼 Cloudinary URL。商城卡框其餘圖層（背景等）不寫入獎項。"}
        </p>
      </div>
    </div>
  );
}
