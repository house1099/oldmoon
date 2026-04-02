import type { FishType } from "@/types/database.types";
import type { Json } from "@/types/database.types";

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export type BaitType = "normal" | "octopus" | "heart";

export function detectBaitType(metadata: Record<string, unknown>): BaitType {
  const matchmakerRate = Number(metadata.bait_matchmaker_rate ?? 0);
  const commonRate = Number(metadata.bait_common_rate ?? 0);
  const leviathanRate = Number(metadata.bait_leviathan_rate ?? 0);
  const rareRate = Number(metadata.bait_rare_rate ?? 0);
  const legendaryRate = Number(metadata.bait_legendary_rate ?? 0);

  if (matchmakerRate === 100) return "heart";
  if (commonRate === 100) return "normal";
  if (rareRate > 0 || legendaryRate > 0 || leviathanRate > 0) return "octopus";
  return "normal";
}

export function validateBaitMetadata(metadata: Record<string, unknown>): {
  valid: boolean;
  error?: string;
} {
  const baitType = detectBaitType(metadata);

  if (baitType === "normal") {
    const common = Number(metadata.bait_common_rate ?? 0);
    if (common !== 100) {
      return { valid: false, error: "普通餌料：bait_common_rate 必須等於 100" };
    }
  }

  if (baitType === "heart") {
    const matchmaker = Number(metadata.bait_matchmaker_rate ?? 0);
    if (matchmaker !== 100) {
      return { valid: false, error: "愛心餌料：bait_matchmaker_rate 必須等於 100" };
    }
  }

  if (baitType === "octopus") {
    const rare = Number(metadata.bait_rare_rate ?? 0);
    const legendary = Number(metadata.bait_legendary_rate ?? 0);
    const leviathan = Number(metadata.bait_leviathan_rate ?? 0);
    const total = rare + legendary + leviathan;
    if (Math.abs(total - 100) > 0.01) {
      return {
        valid: false,
        error: `章魚餌料：稀有魚+傳說魚+深海巨獸機率加總必須等於 100（目前 ${total}）`,
      };
    }
  }

  return { valid: true };
}

/** @deprecated 使用 validateBaitMetadata */
export function validateFishingBaitMetadata(
  metadata: Record<string, unknown>,
): string | null {
  const r = validateBaitMetadata(metadata);
  return r.valid ? null : r.error ?? null;
}

/** 釣竿：收成等待必填；每日上限預設 1、拋竿冷卻預設 480 分（可在 metadata 覆寫）。 */
export function validateFishingRodMetadata(
  metadata: Record<string, unknown>,
): string | null {
  const max = num(metadata.rod_max_casts_per_day);
  const wait = num(metadata.rod_wait_until_harvest_minutes);
  const after = num(metadata.rod_cooldown_minutes);
  if (max != null && (!Number.isInteger(max) || max < 1)) {
    return "rod_max_casts_per_day 須為 ≥1 的整數";
  }
  if (wait != null && (!Number.isInteger(wait) || wait < 1)) {
    return "rod_wait_until_harvest_minutes 須為 ≥1 的整數（拋竿後至可收成之分鐘）";
  }
  if (after != null && (!Number.isInteger(after) || after < 0)) {
    return "rod_cooldown_minutes 須為 ≥0 的整數（拋竿後再拋冷卻分鐘）";
  }
  return null;
}

const ZERO: Record<FishType, number> = {
  common: 0,
  rare: 0,
  legendary: 0,
  matchmaker: 0,
  leviathan: 0,
};

/**
 * 收成用：依餌類型給權重；章魚餌不會落回普通魚，非愛心餌不含月老魚。
 * 舊版 parseBaitFishWeights 若全缺欄會預設 common，已移除。
 */
export function parseBaitFishWeightsForHarvest(
  metadata: Json | null | undefined,
): { ok: true; weights: Record<FishType, number> } | { ok: false; error: string } {
  const m =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  const t = detectBaitType(m);

  if (t === "heart") {
    const mm = Number(m.bait_matchmaker_rate ?? 0);
    if (Math.abs(mm - 100) > 0.01) {
      return {
        ok: false,
        error: "愛心餌（月老）metadata 無效：bait_matchmaker_rate 須為 100。",
      };
    }
    return {
      ok: true,
      weights: { ...ZERO, matchmaker: 100 },
    };
  }

  if (t === "octopus") {
    const rare = num(m.bait_rare_rate) ?? 0;
    const legendary = num(m.bait_legendary_rate) ?? 0;
    const leviathan = num(m.bait_leviathan_rate) ?? 0;
    const sum = rare + legendary + leviathan;
    if (Math.abs(sum - 100) > 0.01) {
      return {
        ok: false,
        error: `章魚餌 metadata 無效：稀有+傳說+深海巨獸須合計 100（目前 ${sum}）。`,
      };
    }
    return {
      ok: true,
      weights: {
        ...ZERO,
        rare,
        legendary,
        leviathan,
      },
    };
  }

  const common = num(m.bait_common_rate) ?? 0;
  if (Math.abs(common - 100) > 0.01) {
    return {
      ok: false,
      error: "普通餌 metadata 無效：bait_common_rate 須為 100。",
    };
  }
  return {
    ok: true,
    weights: { ...ZERO, common: 100 },
  };
}

/** @deprecated 請使用 parseBaitFishWeightsForHarvest；保留供測試／舊引用。 */
export function parseBaitFishWeights(
  metadata: Json | null | undefined,
): Record<FishType, number> {
  const r = parseBaitFishWeightsForHarvest(metadata);
  if (r.ok) return r.weights;
  return { ...ZERO, common: 100 };
}

/** 是否為愛心餌（月老魚）；舊邏輯「任意 matchmaker 機率」已廢棄。 */
export function baitHasMatchmakerChance(metadata: Json | null | undefined): boolean {
  const m =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  return detectBaitType(m) === "heart";
}

/** 釣竿商品 metadata `rod_tier` 為 basic／mid／high 且未填 `rod_cooldown_minutes` 時，套用系統預設分鐘數。 */
export type RodTierCooldownDefaults = {
  basic: number;
  mid: number;
  high: number;
};

/** 拋竿／收成規則；缺欄位時預設 maxPerDay=1、waitUntilHarvestMinutes=1、cooldown 依 tier 或 480。 */
export function parseRodFishingRules(
  metadata: Json | null | undefined,
  opts?: { tierCooldownMinutes?: RodTierCooldownDefaults | null },
): {
  maxPerDay: number;
  waitUntilHarvestMinutes: number;
  cooldownAfterCastMinutes: number;
} | null {
  const m =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  const maxRaw = num(m.rod_max_casts_per_day);
  const waitRaw = num(m.rod_wait_until_harvest_minutes);
  const afterRaw = num(m.rod_cooldown_minutes);

  const maxPerDay =
    maxRaw == null ? 1 : Number.isInteger(maxRaw) && maxRaw >= 1 ? maxRaw : null;
  const waitUntilHarvestMinutes =
    waitRaw == null
      ? 1
      : Number.isInteger(waitRaw) && waitRaw >= 1
        ? waitRaw
        : null;

  let cooldownAfterCastMinutes: number | null;
  if (afterRaw != null) {
    if (!Number.isInteger(afterRaw) || afterRaw < 0) {
      cooldownAfterCastMinutes = null;
    } else {
      cooldownAfterCastMinutes = afterRaw;
    }
  } else {
    const tr = m.rod_tier;
    const tier =
      tr === "basic" || tr === "mid" || tr === "high" ? tr : null;
    if (tier && opts?.tierCooldownMinutes) {
      cooldownAfterCastMinutes = opts.tierCooldownMinutes[tier];
    } else {
      cooldownAfterCastMinutes = 480;
    }
  }

  if (maxPerDay == null || waitUntilHarvestMinutes == null || cooldownAfterCastMinutes == null) {
    return null;
  }
  return {
    maxPerDay,
    waitUntilHarvestMinutes,
    cooldownAfterCastMinutes,
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
    cooldownMinutes: r.cooldownAfterCastMinutes,
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
