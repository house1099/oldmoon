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
