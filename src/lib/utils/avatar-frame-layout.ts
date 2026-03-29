import type { CSSProperties } from "react";

/** 商城 `shop_items.metadata` 內頭像框／卡框對齊用（與舊鍵 `avatar_frame_layout` 相容） */
export type ShopFrameLayout = {
  offsetXPercent: number;
  offsetYPercent: number;
  scalePercent: number;
};

export const DEFAULT_SHOP_FRAME_LAYOUT: ShopFrameLayout = {
  offsetXPercent: 0,
  offsetYPercent: 0,
  scalePercent: 100,
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readLayoutObj(raw: unknown): ShopFrameLayout | null {
  if (!isRecord(raw)) return null;
  const ox = Number(raw.offsetXPercent);
  const oy = Number(raw.offsetYPercent);
  const sc = Number(raw.scalePercent);
  if (!Number.isFinite(ox) || !Number.isFinite(oy) || !Number.isFinite(sc)) return null;
  return {
    offsetXPercent: ox,
    offsetYPercent: oy,
    scalePercent: sc > 0 ? sc : 100,
  };
}

/** 從商品 metadata 解析框線對齊（優先 `frame_layout`，其次 `avatar_frame_layout`） */
export function parseShopFrameLayoutFromMetadata(metadata: unknown): ShopFrameLayout | null {
  if (!isRecord(metadata)) return null;
  return (
    readLayoutObj(metadata.frame_layout) ??
    readLayoutObj(metadata.avatar_frame_layout) ??
    null
  );
}

export function shopFrameLayoutStyle(layout: ShopFrameLayout | null | undefined): CSSProperties {
  const { offsetXPercent, offsetYPercent, scalePercent } =
    layout ?? DEFAULT_SHOP_FRAME_LAYOUT;
  return {
    transform: `translate(${offsetXPercent}%, ${offsetYPercent}%) scale(${scalePercent / 100})`,
    transformOrigin: "center center",
  };
}
