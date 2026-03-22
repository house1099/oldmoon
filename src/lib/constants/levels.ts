/**
 * 冒險者等級稱號與門檻（累積 total_exp ≥ minExp 即達該 Lv）。
 * 與 DB `calculate_level`／Trigger 使用之門檻一致（SSOT）：
 * Lv1:0, Lv2:10, Lv3:30, Lv4:60, Lv5:100, Lv6:150, Lv7:210, Lv8:280, Lv9:360, Lv10:450
 */
export type LevelTier = {
  /** 花色／階位符號 */
  symbol: string;
  /** 顯示用稱號 */
  title: string;
  /** 達成此階所需最低累積 EXP（含）；與 🗄️ 門檻表同一欄位語意 */
  minExp: number;
};

/**
 * 與 SQL 門檻一一對應（索引 0 = Lv1 … 索引 9 = Lv10）。
 * UI 預覽／教學用；真實等級仍以 DB `users.level` 為準。
 */
export const LEVEL_MIN_EXP_BY_LEVEL: readonly number[] = [
  0, 10, 30, 60, 100, 150, 210, 280, 360, 450,
] as const;

/** 由低至高排列；各階 minExp 與 `LEVEL_MIN_EXP_BY_LEVEL` 相同 */
export const LEVEL_TIERS: readonly LevelTier[] = [
  { symbol: "♣️", title: "見習冒險者", minExp: 0 },
  { symbol: "♦️", title: "銅階冒險者", minExp: 10 },
  { symbol: "♥️", title: "銀階冒險者", minExp: 30 },
  { symbol: "♠️", title: "金階冒險者", minExp: 60 },
  { symbol: "🌟", title: "星耀冒險者", minExp: 100 },
  { symbol: "✨", title: "閃耀冒險者", minExp: 150 },
  { symbol: "🔮", title: "秘法冒險者", minExp: 210 },
  { symbol: "⚔️", title: "征戰冒險者", minExp: 280 },
  { symbol: "🛡️", title: "守護冒險者", minExp: 360 },
  { symbol: "🌙", title: "月老認證勇者", minExp: 450 },
] as const;

/** 依累積 EXP 取得目前階（無匹配時回傳最低階） */
export function getLevelTierByExp(totalExp: number): LevelTier {
  let current = LEVEL_TIERS[0];
  for (const tier of LEVEL_TIERS) {
    if (totalExp >= tier.minExp) current = tier;
  }
  return current;
}

/** 1-based level 數字（與 DB users.level 對齊）；最高為 10 */
export function getLevelNumberFromExp(totalExp: number): number {
  let n = 1;
  for (let i = 0; i < LEVEL_TIERS.length; i++) {
    if (totalExp >= LEVEL_TIERS[i].minExp) n = i + 1;
  }
  return n;
}
