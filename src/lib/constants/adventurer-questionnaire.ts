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

/** Step 2：核心價值觀（各題選一 slug，依序寫入 `users.core_values`） */
export const CORE_VALUES_QUESTIONS = [
  {
    key: "social_pace",
    question: "在公會裡，你較嚮往的互動節奏是？",
    options: [
      { value: "slow_burn", label: "細水長流，慢慢認識" },
      { value: "active_party", label: "熱絡組隊，常常上線" },
      { value: "solo_friendly", label: "偶爾揪團，也享受單人任務" },
    ],
  },
  {
    key: "values_priority",
    question: "若只能選一項，你更看重？",
    options: [
      { value: "honesty", label: "真誠坦白" },
      { value: "respect", label: "彼此尊重與界線" },
      { value: "growth", label: "一起成長與探索" },
    ],
  },
  {
    key: "conflict_style",
    question: "遇到意見不合時，你通常？",
    options: [
      { value: "talk_it_out", label: "攤開溝通" },
      { value: "cool_down", label: "先冷靜再想" },
      { value: "agree_disagree", label: "尊重差異、各自保留" },
    ],
  },
] as const;

/** Step 3：興趣／技能標籤（slug → 顯示文案） */
export const INTEREST_TAG_OPTIONS = [
  { value: "gaming", label: "電玩／桌遊" },
  { value: "anime", label: "動漫／二次元" },
  { value: "music", label: "音樂／演唱會" },
  { value: "outdoor", label: "戶外／登山" },
  { value: "food", label: "美食探店" },
  { value: "reading", label: "閱讀／寫作" },
  { value: "sports", label: "運動健身" },
  { value: "art", label: "藝術創作" },
  { value: "travel", label: "旅行" },
  { value: "photo", label: "攝影" },
  { value: "tech", label: "科技／程式" },
  { value: "spiritual", label: "身心靈" },
  { value: "pets", label: "毛孩同好" },
  { value: "volunteer", label: "公益志工" },
  { value: "boardgames", label: "劇本殺／密室" },
] as const;

export type InterestTagValue = (typeof INTEREST_TAG_OPTIONS)[number]["value"];

/** 前端 `offlineIntent` → DB `offline_ok` */
export function offlineIntentToOfflineOk(v: OfflineIntentValue): boolean {
  return v === "in_person";
}

/** DB `offline_ok` → 表單預設（false 時無法區分「僅線上」與「未決」，預設為僅線上） */
export function offlineOkToIntent(ok: boolean): OfflineIntentValue {
  return ok ? "in_person" : "online_only";
}
