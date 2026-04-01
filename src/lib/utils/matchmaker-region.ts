export const TAIWAN_REGIONS = {
  north: ["台北市", "新北市", "基隆市", "桃園市", "新竹市", "新竹縣", "宜蘭縣"],
  central: ["苗栗縣", "台中市", "彰化縣", "南投縣", "雲林縣"],
  south: ["嘉義市", "嘉義縣", "台南市", "高雄市", "屏東縣"],
  east: ["花蓮縣", "台東縣", "澎湖縣", "金門縣", "連江縣"],
} as const;

export const ALL_TAIWAN_CITIES = [
  ...TAIWAN_REGIONS.north,
  ...TAIWAN_REGIONS.central,
  ...TAIWAN_REGIONS.south,
  ...TAIWAN_REGIONS.east,
];

// 解析 matchmaker_region_pref 字串為陣列
export function parseRegionPref(prefJson: string): string[] {
  try {
    const parsed = JSON.parse(prefJson);
    if (Array.isArray(parsed)) return parsed;
    return ["all"];
  } catch {
    return ["all"];
  }
}

// 判斷對方地區是否符合偏好
export function isRegionMatch(
  targetRegion: string | null,
  prefJson: string,
): boolean {
  if (!targetRegion) return false;
  const prefs = parseRegionPref(prefJson);
  if (prefs.includes("all") || prefs.length === 0) return true;
  return prefs.includes(targetRegion);
}

// 顯示用摘要文字
export function formatRegionPrefSummary(prefJson: string): string {
  const prefs = parseRegionPref(prefJson);
  if (prefs.includes("all") || prefs.length === 0) return "全台不限";
  return `已選 ${prefs.length} 個地區`;
}

/** 年齡模式中文對照 */
export const AGE_MODE_LABELS = {
  older: "只找比我年長的",
  younger: "只找比我年輕的",
  both: "年長或年輕都可以",
} as const;

/** 雙向年齡符合判斷：fisher = 釣魚者，candidate = 候選人 */
export function isAgeMatch(
  fisher: {
    birth_year: number;
    matchmaker_age_mode: string;
    matchmaker_age_older: number;
    matchmaker_age_younger: number;
  },
  candidate: {
    birth_year: number;
    matchmaker_age_mode: string;
    matchmaker_age_older: number;
    matchmaker_age_younger: number;
  },
): boolean {
  const diff = fisher.birth_year - candidate.birth_year;

  const fisherOk = checkFisherCondition(fisher, diff);
  if (!fisherOk) return false;

  const reverseDiff = -diff;
  return checkFisherCondition(candidate, reverseDiff);
}

export function checkFisherCondition(
  person: {
    matchmaker_age_mode: string;
    matchmaker_age_older: number;
    matchmaker_age_younger: number;
  },
  /** 正數 = 對方比我年長 */
  diff: number,
): boolean {
  const {
    matchmaker_age_mode,
    matchmaker_age_older,
    matchmaker_age_younger,
  } = person;

  if (matchmaker_age_mode === "older") {
    return diff > 0 && diff <= matchmaker_age_older;
  }
  if (matchmaker_age_mode === "younger") {
    return diff < 0 && Math.abs(diff) <= matchmaker_age_younger;
  }
  if (diff >= 0) return diff <= matchmaker_age_older;
  return Math.abs(diff) <= matchmaker_age_younger;
}
