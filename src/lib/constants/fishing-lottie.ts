/** Public URLs for fishing Lottie files under public/animations/. */
export const FISHING_LOOP_LOTTIE_PATH = "/animations/fishing.json";
export const FISHING_REVEAL_LOTTIE_PATHS = {
  legendary: "/animations/legendary.json",
  giant: "/animations/giant.json",
  bigfish: "/animations/bigfish.json",
  normal: "/animations/normal.json",
} as const;

export type FishingRevealLottieKey = keyof typeof FISHING_REVEAL_LOTTIE_PATHS;
