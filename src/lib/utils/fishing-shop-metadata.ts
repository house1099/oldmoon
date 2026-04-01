import type { FishType } from "@/types/database.types";
import type { Json } from "@/types/database.types";

const FISH_RATE_KEYS: { key: string; fish: FishType }[] = [
  { key: "bait_common_rate", fish: "common" },
  { key: "bait_rare_rate", fish: "rare" },
  { key: "bait_legendary_rate", fish: "legendary" },
  { key: "bait_matchmaker_rate", fish: "matchmaker" },
  { key: "bait_leviathan_rate", fish: "leviathan" },
];

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** 解析釣餌 metadata：五魚種百分比加總應為 100。 */
export function validateFishingBaitMetadata(
  metadata: Record<string, unknown>,
): string | null {
  let sum = 0;
  for (const { key } of FISH_RATE_KEYS) {
    const n = num(metadata[key]);
    if (n == null) continue;
    if (n < 0 || n > 100) {
      return `${key} 須為 0–100 的數字`;
    }
    sum += n;
  }
  if (sum === 0) {
    return "釣餌機率須設定 bait_common_rate 等至少一項，且加總為 100";
  }
  if (Math.round(sum) !== 100) {
    return `釣餌五魚種機率加總須為 100（目前 ${sum}）`;
  }
  return null;
}

/** 解析釣竿 metadata：每日上限與冷卻（分鐘）。 */
export function validateFishingRodMetadata(
  metadata: Record<string, unknown>,
): string | null {
  const max = num(metadata.rod_max_casts_per_day);
  const cool = num(metadata.rod_cooldown_minutes);
  if (max == null || !Number.isInteger(max) || max < 1) {
    return "rod_max_casts_per_day 須為 ≥1 的整數";
  }
  if (cool == null || !Number.isInteger(cool) || cool < 1) {
    return "rod_cooldown_minutes 須為 ≥1 的整數（分鐘）";
  }
  return null;
}

/** 自釣餌 metadata 取得各魚種權重；若全缺則預設 100% common。 */
export function parseBaitFishWeights(
  metadata: Json | null | undefined,
): Record<FishType, number> {
  const m =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  const out: Record<FishType, number> = {
    common: 0,
    rare: 0,
    legendary: 0,
    matchmaker: 0,
    leviathan: 0,
  };
  let any = false;
  for (const { key, fish } of FISH_RATE_KEYS) {
    const n = num(m[key]);
    if (n != null && n > 0) {
      out[fish] = n;
      any = true;
    }
  }
  if (!any) {
    out.common = 100;
  }
  return out;
}

export function baitHasMatchmakerChance(metadata: Json | null | undefined): boolean {
  const m =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  const v = num(m.bait_matchmaker_rate);
  return v != null && v > 0;
}

export function parseRodCastRules(metadata: Json | null | undefined): {
  maxPerDay: number;
  cooldownMinutes: number;
} | null {
  const m =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  const max = num(m.rod_max_casts_per_day);
  const cool = num(m.rod_cooldown_minutes);
  if (
    max == null ||
    !Number.isInteger(max) ||
    max < 1 ||
    cool == null ||
    !Number.isInteger(cool) ||
    cool < 1
  ) {
    return null;
  }
  return { maxPerDay: max, cooldownMinutes: cool };
}

/** 依權重抽魚種（加總不必為 100，會內部正規化）。 */
export function rollFishTypeFromWeights(weights: Record<FishType, number>): FishType {
  const entries = (Object.keys(weights) as FishType[]).filter(
    (k) => (weights[k] ?? 0) > 0,
  );
  if (entries.length === 0) return "common";
  const total = entries.reduce((s, k) => s + (weights[k] ?? 0), 0);
  let r = Math.random() * total;
  for (const fish of entries) {
    r -= weights[fish] ?? 0;
    if (r <= 0) return fish;
  }
  return entries[entries.length - 1]!;
}
