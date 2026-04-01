import { FISHING_REVEAL_LOTTIE_PATHS } from "@/lib/constants/fishing-lottie";
import type { CollectFishResult } from "@/services/fishing.action";

/** Map server result to public Lottie path (species first, then tier). */
export function getFishingRevealLottiePath(
  result: Extract<CollectFishResult, { ok: true }>,
): string {
  if (result.noMatchFound) {
    return FISHING_REVEAL_LOTTIE_PATHS.normal;
  }
  if (result.fishType === "leviathan") {
    return FISHING_REVEAL_LOTTIE_PATHS.legendary;
  }
  if (result.fishType === "rare") {
    return FISHING_REVEAL_LOTTIE_PATHS.giant;
  }
  if (result.rewardTier === "large") {
    return FISHING_REVEAL_LOTTIE_PATHS.bigfish;
  }
  return FISHING_REVEAL_LOTTIE_PATHS.normal;
}
