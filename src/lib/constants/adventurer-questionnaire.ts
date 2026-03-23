/**
 * 冒險者問卷：送進 DB／JSON 的 `value` 一律為英文 slug；`label` 為繁體中文（僅畫面顯示）。
 * profile-form 的 `<SelectItem value={…}>{label}</SelectItem>` 由此對應。
 */
export const GENDER_OPTIONS = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "non_binary", label: "非二元／其他" },
  { value: "prefer_not", label: "先不透露" },
] as const;

export const REGION_OPTIONS = [
  { value: "north", label: "台灣・北部" },
  { value: "central", label: "台灣・中部" },
  { value: "south", label: "台灣・南部" },
  { value: "east", label: "台灣・東部" },
  { value: "islands", label: "台灣・離島" },
  { value: "overseas", label: "海外" },
  { value: "other", label: "其他" },
] as const;

export const ORIENTATION_OPTIONS = [
  { value: "straight", label: "異性戀" },
  { value: "gay", label: "男同志" },
  { value: "lesbian", label: "女同志" },
  { value: "bisexual", label: "雙性戀" },
  { value: "pan", label: "泛性戀" },
  { value: "asexual", label: "無性戀" },
  { value: "questioning", label: "還在探索中" },
  { value: "prefer_not", label: "想先保留隱私" },
] as const;

export const OFFLINE_INTENT_OPTIONS = [
  { value: "in_person", label: "願意參加實體聚會" },
  { value: "online_only", label: "偏好線上互動" },
  { value: "undecided", label: "還沒決定" },
] as const;

export type GenderValue = (typeof GENDER_OPTIONS)[number]["value"];
export type RegionValue = (typeof REGION_OPTIONS)[number]["value"];
export type OrientationValue = (typeof ORIENTATION_OPTIONS)[number]["value"];
export type OfflineIntentValue = (typeof OFFLINE_INTENT_OPTIONS)[number]["value"];
