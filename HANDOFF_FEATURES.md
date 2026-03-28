# HANDOFF_FEATURES — 功能狀態

查「哪個功能做完沒、已知問題、視覺待辦、Wave 規劃」時讀此檔。

## 模組完成狀態（✅／🔲）

| 區塊 | 狀態 | 備註 |
|------|------|------|
| Auth／註冊五步／名冊兩步＋興趣→技能 | ✅ | 性別男／女；`TermsModal`；邀請碼強制 |
| 首頁個人卡／今日心情／手風琴／簽到七格／盲盒 | ✅ | 冷卻 `last_checkin_at`；獎勵 DB `streak_reward_settings` |
| 探索 `/explore` 村莊＋市集 | ✅ | SWR、`hidden` tab；Perfect Match 命定師徒 |
| 冒險團 `/guild` 血盟／聊天／信件 | ✅ | 血盟四態；私訊 Realtime；通知無 unstable_cache |
| `UserDetailModal`／`UserCard`／IG 條件顯示 | ✅ | z-index 與 ChatModal 堆疊見實作 |
| 有緣分 Likes | ✅ | `likes` 無 `id`；取消緣分可撤銷 pending/accepted 血盟 |
| 雙人血盟 Alliances | ✅ | UI＋Layer 2/3；**RLS／雲端測試可續補** |
| 酒館 `TavernModal`／禁言 | ✅ | `expires_at`；動態字數上限 |
| 後台 admin（儀表板、用戶、檢舉、邀請、EXP、發布、稽核） | ✅ | moderator 細化權限；`/admin/shop`／`/admin/coins` master |
| 獎池／七日獎勵設定／裝備背包 | ✅ | `prize-engine`；`user_rewards`＋`prize_items.effect_key` |
| 商城 `/shop`＋`/admin/shop` | ✅ | 雙幣別、SKU、每日限購、購買數量、圖片 Cloudinary |
| 改名卡／廣播券／跑馬燈設定 | ✅ | `consumeRenameCardAction`；`system_settings` |
| PWA／Navbar／FloatingToolbar／開門過場 | ✅ | — |
| 月老 `/matchmaking` | 🔲 | 預留頁 |

## 已知問題／風險

- `database.types.ts` **手動維護**；雲端變更後務必同步。
- Trigger／函式若仍引用 **`exp`** 而非 **`total_exp`**，需 🗄️ 修正。
- 部署需 **`SUPABASE_SERVICE_ROLE_KEY`**。
- 新增欄位後 PostgREST 異常：**Reload schema**。
- 雲端若缺 **`loot_box` 獎池**：需補種子（見遷移 `20260329130000_...`／MCP）。

## 視覺效果待辦

- 首頁廣播／獎勵區可再對齊細緻動效與道具卡面。
- **`UserCard`** 若列表要顯示稱號，需另行快取策略（現多為 Modal 路徑查裝備）。

## Wave 規劃摘要

**Wave 1（商城核心）**：`shop_items`／`shop_orders`／`shop_daily_limits`；`purchaseItemAction` 扣款＋發放同 try；後台 CRUD；改名卡／釣魚道具預留。

**Wave 2（獎池與廣播）**：`prize_items.effect_key`；`broadcasts`；`reward-effects.ts`＋`globals.css`；前台廣播橫幅與系統資訊。

**Wave 3（七日獎勵／工具列）**：`streak_reward_settings`；`FloatingToolbar`；裝備背包 48 格；後台七日設定。

**Phase 2.2 後續**：雲端 **RLS** 全面對齊；`messages`／私訊壓力測試；登入心跳 **`last_seen_at`**；探索篩選與技能供需編輯 UX。

## 開發階段對照（精簡）

- **Phase 1 / 1.5**：✅ 地基、Auth、簽到、`date.ts`、暗黑 UI、PWA。
- **Phase 2.1**：✅ 村莊＋市集、`/explore`。
- **Phase 2.2**：🚧 互動已大量接線；**RLS／打磨**為主戰場。
- **Phase 3**：🔲 待產品規劃。

## 詳細交付敘事（長文）

2026-03-28 起之商城修復、Wave 1/2/3 條列、Bug 修復包、IG 審核流程等**完整原文**已歸檔至 **`HANDOFF_HISTORY.md`**（自舊主檔遷移），必要時關鍵字搜尋該檔即可。
