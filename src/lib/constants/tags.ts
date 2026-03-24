/** 分類＋內建標籤（註冊／編輯標籤共用資料來源） */
export type TagCategory = {
  id: string;
  label: string;
  tags: string[];
};

// ═══ 興趣村莊標籤 ═══
export const INTEREST_CATEGORIES: TagCategory[] = [
  {
    id: "sports",
    label: "🏃 運動健身",
    tags: [
      "籃球",
      "足球",
      "羽球",
      "網球",
      "桌球",
      "游泳",
      "跑步",
      "健身",
      "瑜珈",
      "登山",
      "攀岩",
      "騎車",
      "馬拉松",
      "衝浪",
      "滑板",
    ],
  },
  {
    id: "arts",
    label: "🎵 音樂藝術",
    tags: [
      "唱歌",
      "吉他",
      "鋼琴",
      "小提琴",
      "鼓",
      "DJ",
      "作曲",
      "繪畫",
      "攝影",
      "插畫",
      "書法",
      "手作",
      "陶藝",
      "舞蹈",
      "街舞",
    ],
  },
  {
    id: "entertainment",
    label: "🎮 娛樂休閒",
    tags: [
      "電玩",
      "桌遊",
      "動漫",
      "漫畫",
      "電影",
      "追劇",
      "閱讀",
      "寫作",
      "樂高",
      "釣魚",
      "露營",
      "園藝",
      "料理",
      "烘焙",
      "劇本殺",
    ],
  },
  {
    id: "lifestyle",
    label: "🌍 生活風格",
    tags: [
      "旅遊",
      "背包客",
      "美食探店",
      "咖啡",
      "品酒",
      "時尚穿搭",
      "保養美妝",
      "寵物",
      "植物",
      "室內設計",
      "公益志工",
    ],
  },
  {
    id: "tech",
    label: "💻 科技知識",
    tags: [
      "程式設計",
      "AI",
      "遊戲開發",
      "硬體",
      "投資理財",
      "加密貨幣",
      "股票",
      "創業",
      "行銷",
      "數據分析",
    ],
  },
  {
    id: "growth",
    label: "🧠 學習成長",
    tags: [
      "語言學習",
      "英文",
      "日文",
      "韓文",
      "演講",
      "心理學",
      "哲學",
      "歷史",
      "天文",
      "科學",
    ],
  },
];

// ═══ 技能市集標籤 ═══
export const SKILL_CATEGORIES: TagCategory[] = [
  {
    id: "digital",
    label: "💻 科技數位",
    tags: [
      "程式設計",
      "網頁開發",
      "App 開發",
      "資料分析",
      "AI 應用",
      "影片剪輯",
      "平面設計",
      "UI/UX",
      "SEO",
      "社群行銷",
      "廣告投放",
    ],
  },
  {
    id: "creative",
    label: "🎨 創意設計",
    tags: [
      "插畫",
      "Logo 設計",
      "攝影",
      "修圖",
      "動畫",
      "3D 建模",
      "音樂製作",
      "配音",
      "文案寫作",
    ],
  },
  {
    id: "teaching",
    label: "📚 教學輔導",
    tags: [
      "英文家教",
      "日文教學",
      "韓文教學",
      "數學輔導",
      "程式入門",
      "樂器教學",
      "唱歌指導",
    ],
  },
  {
    id: "business",
    label: "💼 商業職場",
    tags: [
      "簡報製作",
      "Excel",
      "財務分析",
      "創業規劃",
      "商業談判",
      "履歷撰寫",
      "面試指導",
    ],
  },
  {
    id: "life",
    label: "🔧 生活技能",
    tags: [
      "料理教學",
      "烘焙",
      "健身指導",
      "瑜珈教學",
      "汽車保養",
      "植物養護",
    ],
  },
  {
    id: "spiritual",
    label: "🌟 身心靈",
    tags: ["塔羅", "占星", "冥想", "心理諮詢", "人際溝通", "情緒管理"],
  },
];

/** 所有興趣標籤攤平（供 DB 存取比對用） */
export const ALL_INTEREST_TAGS = INTEREST_CATEGORIES.flatMap((c) => c.tags);
export const ALL_SKILL_TAGS = SKILL_CATEGORIES.flatMap((c) => c.tags);
