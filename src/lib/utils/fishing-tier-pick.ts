import type { FishingRewardTier } from "@/types/database.types";

export type TierRemainderMode = "interval_miss" | "normalize";

/** Result of one tier roll: a tier or explicit miss (fallback handled by caller). */
export type TierPickResult = FishingRewardTier | "miss";

/**
 * @param pSmallBp 0..10000 — P(small) in basis points when mode is interval_miss (sum may be < 10000)
 * @param pMediumBp same
 * @param pLargeBp same
 */
export function pickTierFromSettings(
  pSmallBp: number,
  pMediumBp: number,
  pLargeBp: number,
  mode: TierRemainderMode,
): TierPickResult {
  const s = Math.max(0, Math.min(10000, Math.floor(pSmallBp)));
  const m = Math.max(0, Math.min(10000, Math.floor(pMediumBp)));
  const l = Math.max(0, Math.min(10000, Math.floor(pLargeBp)));

  if (mode === "normalize") {
    const sum = s + m + l;
    if (sum <= 0) return "miss";
    const r = Math.random() * sum;
    if (r < s) return "small";
    if (r < s + m) return "medium";
    return "large";
  }

  // interval_miss: roll on 10000; outside cumulative band is miss
  const cap = s + m + l;
  if (cap <= 0) return "miss";
  const r = Math.floor(Math.random() * 10000);
  if (r < s) return "small";
  if (r < s + m) return "medium";
  if (r < s + m + l) return "large";
  return "miss";
}
