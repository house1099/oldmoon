import { parseShopFrameLayoutFromMetadata } from "@/lib/utils/avatar-frame-layout";
import type { ShopFrameLayout } from "@/lib/utils/avatar-frame-layout";

export interface CardDecorationConfig {
  cardFrameImageUrl?: string | null;
  cardFrameEffectKey?: string | null;
  cardFrameLayout?: ShopFrameLayout | null;
  cardBgImageUrl?: string | null;
  cardCornerImageUrl?: string | null;
  cardMascotImageUrl?: string | null;
  cardEffectKey?: string | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function readTrimmedString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t || null;
}

/** 從 `shop_items.metadata` 解析卡片裝飾（含框對齊與預留圖層鍵） */
export function parseCardDecorationFromMetadata(
  metadata: unknown,
): CardDecorationConfig {
  if (!isRecord(metadata)) return {};
  const layout = parseShopFrameLayoutFromMetadata(metadata);
  return {
    cardFrameLayout: layout,
    cardBgImageUrl: readTrimmedString(metadata.cardBgImageUrl),
    cardCornerImageUrl: readTrimmedString(metadata.cardCornerImageUrl),
    cardMascotImageUrl: readTrimmedString(metadata.cardMascotImageUrl),
    cardEffectKey: readTrimmedString(metadata.cardEffectKey),
  };
}

/** 合併獎池與商城來源；`prizeDecoration` 欄位優先覆寫同名鍵 */
export function mergeCardDecoration(
  prizeDecoration: Partial<CardDecorationConfig>,
  shopDecoration: Partial<CardDecorationConfig>,
): CardDecorationConfig {
  return { ...shopDecoration, ...prizeDecoration };
}
