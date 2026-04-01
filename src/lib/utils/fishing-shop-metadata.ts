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

function isBaitOctopus(metadata: Record<string, unknown>): boolean {
  return metadata.bait_octopus === true;
}

/** 解析釣餌 metadata：章魚餌五項加總 100；一般餌四項加總 100 且 leviathan=0。 */
export function validateFishingBaitMetadata(
  metadata: Record<string, unknown>,
): string | null {
  const octopus = isBaitOctopus(metadata);
  const lev = num(metadata.bait_leviathan_rate);

  if (!octopus) {
    if (lev != null && lev !== 0) {
      return "非章魚餌請將 bait_leviathan_rate 設為 0，或設定 bait_octopus: true";
    }
    const keys = [
      "bait_common_rate",
      "bait_rare_rate",
      "bait_legendary_rate",
      "bait_matchmaker_rate",
    ] as const;
    let sum = 0;
    for (const key of keys) {
      const n = num(metadata[key]);
      if (n == null) continue;
      if (n < 0 || n > 100) {
        return `${key} 須為 0–100 的數字`;
      }
      sum += n;
    }
    if (sum === 0) {
      return "釣餌須設定 bait_common_rate～bait_matchmaker_rate 至少一項，且四項加總為 100";
    }
    if (Math.round(sum) !== 100) {
      return `一般魚餌四魚種機率加總須為 100（目前 ${sum}）`;
    }
    return null;
  }

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
    return "章魚餌須設定五魚種機率且加總為 100";
  }
  if (Math.round(sum) !== 100) {
    return `章魚餌五魚種機率加總須為 100（目前 ${sum}）`;
  }
  return null;
}

/** 解析釣竿 metadata：每日上限、拋竿後至可收成之分鐘、收竿後再拋冷卻（可為 0）。 */
export function validateFishingRodMetadata(
  metadata: Record<string, unknown>,
): string | null {
  const max = num(metadata.rod_max_casts_per_day);
  const wait = num(metadata.rod_wait_until_harvest_minutes);
  const after = num(metadata.rod_cooldown_minutes);
  if (max == null || !Number.isInteger(max) || max < 1) {
    return "rod_max_casts_per_day 須為 ≥1 的整數";
  }
  if (wait == null || !Number.isInteger(wait) || wait < 1) {
    return "rod_wait_until_harvest_minutes 須為 ≥1 的整數（拋竿後至可收成之分鐘）";
  }
  if (after != null && (!Number.isInteger(after) || after < 0)) {
    return "rod_cooldown_minutes 須為 ≥0 的整數（收竿後再拋冷卻分鐘，可填 0）";
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

/** 拋竿／收成規則；舊欄位僅 rod_cooldown_minutes 時無法解析（須補 rod_wait_until_harvest_minutes）。 */
export function parseRodFishingRules(metadata: Json | null | undefined): {
  maxPerDay: number;
  waitUntilHarvestMinutes: number;
  cooldownAfterHarvestMinutes: number;
} | null {
  const m =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  const max = num(m.rod_max_casts_per_day);
  const wait = num(m.rod_wait_until_harvest_minutes);
  const after = num(m.rod_cooldown_minutes);
  if (max == null || !Number.isInteger(max) || max < 1) {
    return null;
  }
  if (wait == null || !Number.isInteger(wait) || wait < 1) {
    return null;
  }
  const cooldownAfter =
    after == null ? 0 : Number.isInteger(after) && after >= 0 ? after : null;
  if (cooldownAfter === null) {
    return null;
  }
  return {
    maxPerDay: max,
    waitUntilHarvestMinutes: wait,
    cooldownAfterHarvestMinutes: cooldownAfter,
  };
}

/** @deprecated 使用 parseRodFishingRules；保留供舊程式路徑。 */
export function parseRodCastRules(metadata: Json | null | undefined): {
  maxPerDay: number;
  cooldownMinutes: number;
} | null {
  const r = parseRodFishingRules(metadata);
  if (!r) return null;
  return {
    maxPerDay: r.maxPerDay,
    cooldownMinutes: r.cooldownAfterHarvestMinutes,
  };
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
