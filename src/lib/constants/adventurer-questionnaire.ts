/**
 * 冒險者問卷：`gender`／性向 slug 為英文 value + 中文 label；**地區**選項 value 與 label 皆為繁中（直接寫入 `users.region`），海外列另於表單填細節後存成 `海外・…`。
 */
export const GENDER_OPTIONS = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "non_binary", label: "非二元／其他" },
  { value: "prefer_not", label: "先不透露" },
] as const;

/** 選到此列時表單顯示自填欄，送出時改寫為 `海外・{自填}` */
export const OVERSEAS_REGION_OPTION_VALUE = "海外（自填）" as const;

const TAIWAN_REGION_LABELS = [
  "基隆市",
  "台北市",
  "新北市",
  "桃園市",
  "新竹市",
  "新竹縣",
  "苗栗縣",
  "台中市",
  "彰化縣",
  "南投縣",
  "雲林縣",
  "嘉義市",
  "嘉義縣",
  "台南市",
  "高雄市",
  "屏東縣",
  "台東縣",
  "花蓮縣",
  "宜蘭縣",
  "澎湖縣",
  "金門縣",
  "連江縣",
] as const;

export const REGION_OPTIONS = [
  ...TAIWAN_REGION_LABELS.map((label) => ({ value: label, label })),
  {
    value: OVERSEAS_REGION_OPTION_VALUE,
    label: "海外（自填）",
  },
] as const;

export const ORIENTATION_OPTIONS = [
  { value: "heterosexual", label: "異性戀" },
  { value: "homosexual", label: "同性戀" },
  { value: "pansexual", label: "泛性戀" },
] as const;

export const OFFLINE_INTENT_OPTIONS = [
  { value: "in_person", label: "願意參加實體聚會" },
  { value: "online_only", label: "只從事線上活動" },
  { value: "both", label: "都可以" },
] as const;

export type GenderValue = (typeof GENDER_OPTIONS)[number]["value"];
export type RegionSelectValue = (typeof REGION_OPTIONS)[number]["value"];
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
  return v === "in_person" || v === "both";
}

/** DB `offline_ok` → 表單預設（boolean 無法還原「都可以」） */
export function offlineOkToIntent(ok: boolean): OfflineIntentValue {
  return ok ? "both" : "online_only";
}
