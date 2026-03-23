/**
 * 冒險者問卷：送進 DB／JSON 的 value 一律為英文 slug；中文僅供 UI（label）。
 */
export const GENDER_OPTIONS = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "non_binary", label: "非二元" },
  { value: "prefer_not", label: "不便透露" },
] as const;

export const REGION_OPTIONS = [
  { value: "north", label: "台灣 · 北部" },
  { value: "central", label: "台灣 · 中部" },
  { value: "south", label: "台灣 · 南部" },
  { value: "east", label: "台灣 · 東部" },
  { value: "islands", label: "台灣 · 離島" },
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
  { value: "questioning", label: "探索中" },
  { value: "prefer_not", label: "不便透露" },
] as const;

export const OFFLINE_INTENT_OPTIONS = [
  { value: "in_person", label: "願意參與線下活動" },
  { value: "online_only", label: "傾向線上互動" },
  { value: "undecided", label: "尚未決定" },
] as const;

export type GenderValue = (typeof GENDER_OPTIONS)[number]["value"];
export type RegionValue = (typeof REGION_OPTIONS)[number]["value"];
export type OrientationValue = (typeof ORIENTATION_OPTIONS)[number]["value"];
export type OfflineIntentValue = (typeof OFFLINE_INTENT_OPTIONS)[number]["value"];
