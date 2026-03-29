# 傳奇公會 HANDOFF.md

> 每次開新視窗請先讀本檔與 `.cursorrules`

## 🌕 目前開發階段

**Phase 2 — 社交核心進行中**：Phase 2.1 村莊＋市集已接線；**下一個優先** Phase 2.2 收尾 — 雲端 **RLS**、型別對齊、私訊／血盟壓測與 UX；註冊名冊兩步＋`/register/interests`→`/register/skills`、五步指示器、**`/profile/edit-tags`** 已接線。

## 🏛️ 五層架構核心規範

Layer 1（連線）→ Layer 2（Repository）→ Layer 3（Action）→ Layer 4（Hook/SWR）→ Layer 5（UI）

- UI 絕對不直連 Supabase
- 寫入必須經 Layer 3 → Layer 2
- 經驗值欄位唯一 SSOT：`total_exp`

**路徑速記**：L1 `src/lib/supabase/`；L2 `src/lib/repositories/server/*.repository.ts`；L3 `src/services/*.action.ts`；L4 `src/hooks/`、`src/lib/swr/`；L5 `src/components/`、`src/app/`。**台灣日界** `src/lib/utils/date.ts` 之 `taipeiCalendarDateKey()`；簽到可否以 `users.last_checkin_at`（24h 滾動）為 SSOT。**頭像**僅 Cloudinary（見 `.cursorrules`），禁止 `supabase.storage` 上傳頭像。

## 🗄️ DB SSOT 關鍵欄位

- `total_exp`（經驗值，由 `exp_logs` trigger 累加）
- `last_checkin_at`（簽到冷卻 SSOT）
- `instagram_handle`（IG 帳號 SSOT）
- `bio_village` / `bio_market`（自白欄位）
- `inventory_slots`（背包格數，預設 16）
- `users.status`（`pending` / `active` / `suspended` / `banned`）

**補充**：`likes` 無 `id`；`alliances` 用 `user_a`／`user_b`／`initiated_by`；通知 `type`、`from_user_id`、`message`、`is_read`。更細 SSOT／遷移／RLS 見 `HANDOFF_DB.md`（深查時再開）。

## 📁 關鍵檔案索引

- 守衛／Session：`src/middleware.ts`；`deriveAuthStatus`、`getCachedProfile`
- Auth／註冊：`(auth)/login|register|register/invite|register/profile`；`registration-step-indicator.tsx`；`TermsModal`／`terms.ts`
- OAuth／健康：`src/app/auth/callback/route.ts`；`src/app/api/ping/route.ts`
- Profile：`profile.action.ts`；`profile-update.action.ts`；`adventurer-profile.action.ts`
- IG 審核：`ig-request.action.ts`；`ig-request.repository.ts`；`/register/pending`
- 簽到／連簽／盲盒：`daily-checkin.action.ts`；`streak.repository.ts`；`prize-engine.ts`；`user.repository`
- 獎勵／廣播／改名：`rewards.action.ts`；`rewards.repository.ts`；`system-settings`
- 商城：`shop.action.ts`；`shop.repository.ts`；`(app)/shop`；`(admin)/admin/shop`
- 財務 master：`/admin/coins`（雙 Tab：`coins-admin-client.tsx`）；`adjustCoinsAction`／`getAdminCoinLedgerAction`；L2 `findCoinTransactionsWithFilters`
- 探索：`explore/page.tsx`；`ExploreClient.tsx`；`village.service.ts`；`market.service.ts`
- 配對：`matching.ts`；`role-display.ts`
- 血盟／社交：`alliance.action.ts`；`alliance.repository.ts`；`social.action.ts`
- 私訊／檢舉：`chat.action.ts`；`chat.repository.ts`；`ChatModal.tsx`；`useChat.ts`
- 通知／信件：`notification.action.ts`；`notification.repository.ts`；`guild/page.tsx` `MailBox`
- 酒館／廣播：`tavern.action.ts`；`TavernMarquee.tsx`（首頁酒館、`tavern_marquee_*`）；`broadcast/BroadcastBanner.tsx`（全站廣播、`broadcast_*`）；`getMarqueeAndBroadcastSettingsAction`；`app-broadcast-chrome.tsx`；`useTavern.ts`
- 後台：`(admin)/layout.tsx`；`admin-shell.tsx`；`admin.action.ts`；`admin.repository.ts`；`admin-permissions.ts`
- 邀請碼：`invitation.repository.ts`；`invitation.action.ts`
- 公告／廣告：`announcement.*`；`advertisement.*`
- 首頁：`page.tsx`／`home-page-client.tsx`；`guild-profile-home.tsx`；`FloatingToolbar.tsx`
- 版面：`Navbar.tsx`；`app-shell-motion.tsx`（`broadcastExtraTopPx`）；`app-broadcast-chrome.tsx`；`(app)/layout.tsx`
- 卡片／Modal：`UserCard.tsx`；`UserDetailModal.tsx`；`LevelBadge`／`LevelCardEffect`；`ShopCardFrameOverlay.tsx`；卡框比例 **`CARD_FRAME_OVERLAY_PERCENT`**（`shop-card-frame-preview.ts`，與頭像框 **`MASTER_AVATAR_FRAME_OVERLAY_PERCENT`** 分離）
- 頭像：`Avatar.tsx`；`cloudinary.ts`；`cropImage.ts`；頭像框對齊 **`avatar-frame-layout.ts`**（`shop_items.metadata.frame_layout`）；**`scripts/process-tiger-avatar-frame.py`**
- 型別：`src/types/database.types.ts`；SWR：`src/lib/swr/keys.ts`；等級：`src/lib/constants/levels.ts`；標籤：`src/lib/constants/tags.ts`

**舊路由**：`/village`、`/market` → `/explore`；`/alliances`、`/inbox` → `/guild`。

## 🗄️ 資料庫表清單

- `users` — 會員主檔（暱稱、等級、`total_exp`、自白、標籤、幣、狀態等）
- `exp_logs` — 經驗變動日誌（觸發器累加 `total_exp`）
- `likes` — 有緣分（`from_user`／`to_user`，無單列 `id`）
- `alliances` — 雙人血盟與狀態
- `conversations` — 私訊對話（成對 `user_a`／`user_b`）
- `chat_messages` — 私訊訊息
- `messages` — 舊式一對一訊息（若仍存在則並存至完全遷移）
- `blocks` — 封鎖
- `reports` — 檢舉
- `notifications` — 信件／站內通知
- `tavern_messages` — 酒館公開訊息
- `tavern_bans` — 酒館禁言（含 `expires_at`）
- `admin_actions` — 後台操作稽核（含 `action_label`）
- `moderator_permissions` — 版主細項權限
- `system_settings` — 平台鍵值設定（標籤上限、跑馬燈、等級門檻等）
- `announcements` — 公告
- `advertisements` — 廣告素材
- `ad_clicks` — 廣告點擊紀錄
- `ig_change_requests` — IG 變更申請
- `invitation_codes` — 邀請碼
- `invitation_code_uses` — 邀請碼使用紀錄
- `coin_transactions` — 幣種流水
- `topup_orders` — 儲值訂單
- `login_streaks` — 連簽狀態（與 `last_checkin_at` 冷卻分離）
- `streak_reward_settings` — 七日簽到獎勵設定
- `prize_pools` — 獎池
- `prize_items` — 獎項與加權（含 `effect_key`）
- `prize_logs` — 抽獎紀錄
- `user_rewards` — 使用者道具／稱號／框（關聯 `prize_items`）
- `broadcasts` — 廣播大聲公
- `shop_items` — 商城商品
- `shop_orders` — 商城訂單
- `shop_daily_limits` — 商城每日限購

## ✅ 最近完成（最新 3 次任務）

1. **2026-03-30 — 卡框專用 `CARD_FRAME_OVERLAY_PERCENT` + 範例 PNG**：`src/lib/constants/shop-card-frame-preview.ts` 新增 **`CARD_FRAME_OVERLAY_PERCENT`**（預設 **100**，與頭像框 **`MASTER_AVATAR_FRAME_OVERLAY_PERCENT`（160）** 分離）。**`ShopCardFrameOverlay`** 改以此常數縮放框圖；後台 **`shop-admin-client`** 卡片外框預覽改與前台相同（置中、`width/height` 同百分比 + **`frame_layout`** 的 **`shopFrameLayoutStyle`**）。範例資產 **`public/frames/cards/cny-money-bag-card-frame.png`**（736×520、中心近白改透明）。仍套於 **`LevelCardEffect`（UserCard）**、**`UserDetailModal`**、**`guild-profile-home`** 三處。細部對齊可再改常數或商品 **`metadata.frame_layout.scalePercent`**（50–200）。
2. **2026-03-30 — 商城 card_frame PNG overlay 與批次附掛**：**`ShopCardFrameOverlay`** 承接 **`card_frame`** 圖片與 **`effect_key`**（取代 Modal／home 直接掛 **`rewardEffectClassName`**）。**`findEquippedRewardLabels`** 補 **`equippedCardFrameLayout`**；**`findEquippedCardFramesByUserIds`** 附掛至 **`village.service`**、**`market.service`**、**`alliance.action`**、**`chat.action`**、**`tavern.repository`**、**`TavernMessageDto.user`** 等。無 DB migration。
3. **2026-03-30 — 裝備頭像框全站列表＋個人檔外溢；框線／背包政策**：**`findEquippedAvatarFramesByUserIds`**；**`/explore`**、血盟、聊天、酒館、**`ChatModal`** 我方頭像等。**`guild-profile-home`** **`overflow-visible`**、**`MasterAvatarShell`** **`frameEffectKey`**。**`SHOP_FRAME_LAYOUT_OFFSET_MAX_ABS`**（±80）、領袖不再自動本地金框、裝備長按贈送／刪除等見 **`HANDOFF_HISTORY.md`**（列表快取延遲、信件頭像未併框亦載於該檔）。

## ⚠️ 目前已知問題

- `database.types.ts` 手動維護，雲端 schema 變更後須同步。
- 若雲端 `coin_transactions.source` 有 **CHECK／enum** 未含 **`admin_adjust`**，後台調整幣會寫入失敗，需補 DDL 與型別。
- 觸發器／函式若仍引用舊欄位 `exp` 而非 `total_exp` 需修正。
- 雲端若缺 `loot_box` 獎池需補種子（見遷移 `20260329130000_shop_image_marquee_loot_box.sql`／MCP）。
- `alliances`／私訊／`likes` 等 **RLS** 與 production 測試仍待補強。
- `/admin/users` 篩選 `ig_pending` 完整列表邏輯待 Layer 2 擴充（見歷史紀錄）。

## 🔲 下一步待辦

1. **Phase 2.2／雲端**：`alliances`、私訊、`likes` 等 RLS 與 production 測試；Schema 與 `database.types.ts` 對齊。
2. **產品／UX**：`/explore` 篩選與技能供需編輯；登入心跳 `last_seen_at`。
3. **維運**：雲端缺獎池時補種子；重大 DDL 後 Reload schema。
4. **功能規劃深查**：模組 ✅/🔲、視覺待辦見 `HANDOFF_FEATURES.md`。

## 📚 子檔案說明

- `HANDOFF_HISTORY.md`：所有歷史任務完整紀錄（**不主動讀取**）
- `HANDOFF_DB.md`：遷移、RLS、DDL 補丁、欄位細節（深查 DB 時）
- `HANDOFF_FEATURES.md`：功能完成度、Wave 摘要、視覺待辦（查產品狀態時）
