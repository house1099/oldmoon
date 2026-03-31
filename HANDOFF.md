# 傳奇公會 HANDOFF.md

> 每次開新視窗請先讀本檔與 `.cursorrules`

## 🌕 目前開發階段

**Phase 2 — 社交核心進行中**：Phase 2.1 村莊＋市集已接線；**下一個優先** Phase 2.2 收尾 — 雲端 **RLS**（政策與維運規則見 **`HANDOFF_DB.md` →「RLS 政策與維運規範」**）、型別對齊、私訊／血盟壓測與 UX；註冊名冊兩步＋`/register/interests`→`/register/skills`、五步指示器、**`/profile/edit-tags`** 已接線。

## 🏛️ 五層架構核心規範

Layer 1（連線）→ Layer 2（Repository）→ Layer 3（Action）→ Layer 4（Hook/SWR）→ Layer 5（UI）

- UI 絕對不直連 Supabase
- 寫入必須經 Layer 3 → Layer 2
- 經驗值欄位唯一 SSOT：`total_exp`

**路徑速記**：L1 `src/lib/supabase/`；L2 `src/lib/repositories/server/*.repository.ts`；L3 `src/services/*.action.ts`；L4 `src/hooks/`、`src/lib/swr/`；L5 `src/components/`、`src/app/`。**台灣日界** `src/lib/utils/date.ts` 之 `taipeiCalendarDateKey()`、`taipeiCalendarDaysBetween()`、`taipeiWallClockHour()`；**簽到冷卻**為台北自然日制（每天 00:00 重置）：同一台北曆日僅能簽一次，以 `users.last_checkin_at` 與 `taipeiCalendarDateKey(last_checkin_at)` 比對（非 24h 滾動）。**頭像**僅 Cloudinary（見 `.cursorrules`），禁止 `supabase.storage` 上傳頭像。

## 🗄️ DB SSOT 關鍵欄位

- `total_exp`（經驗值，由 `exp_logs` trigger 累加）
- `last_checkin_at`（簽到冷卻 SSOT）
- `instagram_handle`（IG 帳號 SSOT）
- `bio_village` / `bio_market`（自白欄位）
- `inventory_slots`（背包格數，預設 16）
- `users.status`（`pending` / `active` / `suspended` / `banned`）

**補充**：`likes` 無 `id`；`alliances` 用 `user_a`／`user_b`／`initiated_by`；通知 `type`、`from_user_id`、`message`、`is_read`。更細 SSOT／遷移／**RLS 政策與除錯原則**見 `HANDOFF_DB.md`（深查時再開）。

## 📁 關鍵檔案索引

- 守衛／Session：`src/middleware.ts`；`deriveAuthStatus`、`getCachedProfile`
- Auth／註冊：`(auth)/login|register|register/invite|register/profile`；`registration-step-indicator.tsx`；`TermsModal`／`terms.ts`
- OAuth／健康：`src/app/auth/callback/route.ts`（成功可帶 **`guild_entrance=1`** 觸發開場）；`src/app/api/ping/route.ts`
- Profile：`profile.action.ts`；`profile-update.action.ts`；`adventurer-profile.action.ts`
- IG 審核：`ig-request.action.ts`；`ig-request.repository.ts`；`/register/pending`
- 簽到／連簽／盲盒：`daily-checkin.action.ts`（第 7 天 **`drawFromPool('loot_box')`**；獎池失敗時 **系統信** 提示）；`streak.repository.ts`；`prize-engine.ts`；`guild-profile-home.tsx`（簽到成功 Modal 內 **`GuildLootBoxReveal`**）；`user.repository`
- 獎勵／廣播／改名／贈禮：`rewards.action.ts`（血盟批次贈禮成功後 **一則** `notifyUserMailboxSilent`，文案 **`formatGiftBatchMailboxMessage`**）；`rewards.repository.ts`（**`findEquippedTitlesByUserIds`**、**`findEquippedRewardLabels`** 之 **`equippedTitleImageUrl`**）；`gift.action.ts`（**`formatGiftBatchMailboxMessage`**、**`confirmGiftsToUserBatchAction`** 單則通知；暱稱搜尋 **`giftItemToUserAction`**）；**`FloatingToolbar`** 背包贈玩家 **`confirmGiftsToUserBatchAction`**（**`stackMenuQty`** 多件一動作一通知）；`system-settings`
- 商城：`shop.action.ts`（**`purchaseItemAction` → `newRewardIds`／盲盒另回 `lootDraws`**）；`shop.repository.ts`；**`(app)/shop`**（**「🎁 送給朋友」**；**`loot_box` 不可商城贈送**；**幣別 Tab 下** **`ITEM_TYPE_LABELS`／`shopCategoryFilter`** 種類下拉、**`displayItems`**）；**公會盲盒開箱** **`GuildLootBoxReveal`**（`src/components/loot-box/guild-loot-box-reveal.tsx`，動畫 **`public/animations/guild-loot-box-treasure.json`**，常數 **`src/lib/constants/guild-loot-box-lottie.ts`**）；`(admin)/admin/shop`（盲盒類型表單說明）
- 財務 master：`/admin/coins`（雙 Tab：`coins-admin-client.tsx`）；`adjustCoinsAction`／`getAdminCoinLedgerAction`；L2 `findCoinTransactionsWithFilters`
- 探索：`explore/page.tsx`；`ExploreClient.tsx`；`village.service.ts`；`market.service.ts`
- 配對：`matching.ts`；`role-display.ts`
- 血盟／社交：`alliance.action.ts`；`alliance.repository.ts`；`social.action.ts`
- 私訊／檢舉：`chat.action.ts`；`chat.repository.ts`；`ChatModal.tsx`；`useChat.ts`
- **Web Push**：`public/sw.js`（**`push`** 含 **`unreadCount` → 角標**）；`service-worker-register.tsx`（`providers.tsx`）；`usePushSubscription.ts`；`PushNotifyGuildRow.tsx`（`guild-profile-home` 帳號設定 Dialog）；`push.action.ts`；`push.repository.ts`；`lib/push/send-push.ts`（**`VAPID_SUBJECT`＋雙鑰** 才發送；**`unreadCount`** 由 **`countConversationsWithUnreadFromOthers`** 合併）
- **PWA 角標**：`lib/utils/app-badge.ts`（**`setPwaAppBadgeFromUnreadChatCount`**／**`clearPwaAppBadge`**）；`app-badge-unread-chat-sync.tsx`（**`(app)/layout.tsx`**，**未讀私訊對話數**＝`useUnreadChatCount`）；登出見 **`guild-profile-home`**／**`register/pending`**
- **PWA 首頁安裝引導**：**`PwaInstallOverlay.tsx`**（**`home-page-client.tsx`**）；**`usePwaInstall.ts`**（**`beforeinstallprompt`**）；**`pwa-install-prompt.ts`**（**`pwa_prompt_dismissed`**、**3 日**冷卻）；**`pwa-install-engagement.ts`**（**`sessionStorage`**，簽到 **`checkinDone`**／**`guild/page`** mount）；**`manifest.json`** 既有 **standalone**
- 通知／信件：`notification.action.ts`；`notification.repository.ts`；`guild/page.tsx` `MailBox`
- 酒館／廣播：`tavern.action.ts`；`TavernModal.tsx`（輸入 **`@`** 游標觸發提及名單、**`getTavernInlineMentionState`**（**`tavern-mentions.ts`**）、篩選／鍵盤選取；左側 **`@`** 鈕 **插入 `@`**；`tavern-message-content.tsx` 解析 **`@暱稱`**）；`TavernMarquee.tsx`（首頁酒館、`tavern_marquee_*`）；`broadcast/BroadcastBanner.tsx`（全站廣播、`broadcast_*`）；`getMarqueeAndBroadcastSettingsAction`；`app-broadcast-chrome.tsx`；`useTavern.ts`
- 後台：`(admin)/layout.tsx`；`admin-shell.tsx`；`admin.action.ts`；`admin.repository.ts`；`admin-permissions.ts`
- **後台獎項／獎池**：**`(admin)/admin/prizes/prizes-client.tsx`**（**`avatar_frame`／`card_frame`／`title`**：**`LocalFrameImagePicker`** 含 **`public/items` optgroup**；商城帶入）；**`components/admin/local-frame-image-picker.tsx`**；**`(admin)/admin/shop/shop-admin-client.tsx`**（**`title`** 本機圖 **optgroup**、胸章小預覽；列表 **上架中／已下架** 分頁 + **商品類型** **`item_type`** 篩選）
- 邀請碼：`invitation.repository.ts`；`invitation.action.ts`
- 公告／廣告：`announcement.*`；`advertisement.*`
- 首頁：`page.tsx`／`home-page-client.tsx`；`guild-profile-home.tsx`（大頭貼右下角 **Eye** → **`UserDetailModal` `publicPreview`**，他人視角裝備預覽）；`FloatingToolbar.tsx`
- 版面：`Navbar.tsx`；`app-shell-motion.tsx`（`broadcastExtraTopPx`）；`app-broadcast-chrome.tsx`；`(app)/layout.tsx`（**`PostLoginEntrance`** 包子頁＋**`Navbar`**；開場無 **`bg-black`** 全螢幕，用 **`zinc-950`**／圖）；**`PostLoginEntrance.tsx`**、**`auth-bootstrap.action.ts`**；**`login-form`** **`markPostLoginEntrance`**
- 卡片／Modal：`UserCard.tsx`；**`title-badge-row.tsx`**（稱號胸章＋膠囊；**`sm`／`md`／`lg`／`xl`／`card`**；探索 **`UserCard`** 稱號在**底列**興趣／技能右側 **`card`**（約 **sm×1.1**））；`public/items/title-luffy.png`（稱號胸章範例 **`LUFFY`**，見 **`public/items/README.md`**）；`CardDecorationWrapper.tsx`；`card-decoration.ts`（`CardDecorationConfig`／metadata 解析）；**`modals/UserDetailModal.tsx`**（**`publicPreview`**；**`DialogContent` `overflow-visible`**；頭像／心情與 **`overflow-y-auto`** 捲動區**分層**，避免商城頭像框翅膀被裁切；header **`px-7`**）；`LevelBadge`／`LevelCardEffect`；`ShopCardFrameOverlay.tsx`；卡框比例 **`CARD_FRAME_OVERLAY_PERCENT`**（`shop-card-frame-preview.ts`，與頭像框 **`MASTER_AVATAR_FRAME_OVERLAY_PERCENT`** 分離）
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
- `push_subscriptions` — Web Push 訂閱（**`endpoint`／`p256dh`／`auth`**，依使用者 upsert）
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
- `login_streaks` — 連簽狀態（`last_claim_at` 與今日台北曆日差 **>1** 日則斷簽重算；冷卻仍以 `last_checkin_at` 為準）
- `streak_reward_settings` — 七日簽到獎勵設定
- `prize_pools` — 獎池
- `prize_items` — 獎項與加權（含 `effect_key`）
- `prize_logs` — 抽獎紀錄
- `user_rewards` — 使用者道具／稱號／框（關聯 `prize_items`）
- `broadcasts` — 廣播大聲公
- `shop_items` — 商城商品
- `shop_orders` — 商城訂單
- `shop_daily_limits` — 商城每日限購

## ✅ 最近完成（最新 5 次任務）

1. **2026-03-31 — 資料卡頭像框裁切修正 + 前台商城種類篩選**：**`UserDetailModal`** **`DialogContent` `overflow-visible`**；**`relative z-[2]`** 內 **頭像／心情** 與 **`flex-1 overflow-y-auto`** 捲動區**分離**（商城頭像框翅膀不再被捲動層裁切）；header **`px-7`**。**`(app)/shop/page.tsx`** **`shopCategoryFilter`**、**`ITEM_TYPE_LABELS`**／**`SHOP_CATEGORY_KEYS`**、**`displayItems`** **`useMemo`**；幣別 Tab 下種類 **`select`**；**`switchTab`** 重設 **全部**；空態 **「此分類暫無商品」**。**`npm run build`** 通過。詳見 **`HANDOFF_HISTORY.md`**（**「UserDetailModal 頭像框裁切修正與前台商城種類篩選（2026-03-31）」**）。
2. **2026-03-31 — 首頁他人視角預覽 + 商城管理分頁／類型篩選**：**`UserDetailModal`** 新增 **`publicPreview`**（略過 **`getModalSocialStatusAction`**、隱藏聊聊／緣分／血盟／信譽／領袖工具、頂部說明文案）；**`guild-profile-home.tsx`** 大頭貼右下角 **Lucide `Eye`** 開預覽（**`stopPropagation`**，與快捷列同風格圓鈕）；**`shop-admin-client.tsx`** **上架中／已下架** 分頁（**`is_active`**）+ **商品類型** 下拉（**`ITEM_TYPE_OPTIONS`**／**`item_type`**，桌機表與手機卡片共用 **`filteredItems`**）。詳見 **`HANDOFF_HISTORY.md`**（**「首頁他人視角預覽與商城管理分頁／類型篩選（2026-03-31）」**）。
3. **2026-03-31 — 獎池權重輸入與私訊日期**：**`prizes-client.tsx`** 權改用 **`weightStr`** 控制輸入（可清空再輸入）；**`saveAllWeights`／新增獎項** 送出前驗證 **≥1**；機率加總用 **`resolvedPrizeItemWeight`**（空或非法暫回伺服器權重）。**`ChatModal.tsx`** 依 **台北曆日** 插入 **今天／昨天／月日（週）** 分隔列。詳見 **`HANDOFF_HISTORY.md`**（**「獎池權重輸入與私訊日期（2026-03-31）」**）。
4. **2026-03-31 — 贈禮單則通知（一動作一信件／Push）**：**`gift.action.ts`** 匯出 **`formatGiftBatchMailboxMessage`**，**`confirmGiftsToUserBatchAction`** 沿用；**`FloatingToolbar`** 背包贈一般玩家改 **`giftPlayerRewardIds`＋`confirmGiftsToUserBatchAction`**（**`stackMenuQty`** 多件同次送出僅一則通知）；**`rewards.action.ts`** **`giftUserRewardsToAlliancePartnerBatchAction`** 成功後 **`notifyUserMailboxSilent`** 一則摘要（同文案 helper）。商城 **`confirmGiftsToUserBatchAction`** 行為不變。詳見 **`HANDOFF_HISTORY.md`**（**「贈禮單則通知與共用信件文案（2026-03-31）」**）。
5. **2026-03-31 — 酒館 `@` 提及改輸入觸發＋篩選**：**`tavern-mentions.ts`** **`getTavernInlineMentionState`**；**`TavernModal`** 游標同步、直向名單、**`includes`** 篩選、**`↑`／`↓`／`Enter`／`Esc`**、左側 **`@`** 改 **插入 `@`**；與貼圖列互斥。詳見 **`HANDOFF_HISTORY.md`**（**「酒館 @ 提及輸入觸發與篩選（2026-03-31）」**）。

## ⚠️ 目前已知問題

- `database.types.ts` 手動維護，雲端 schema 變更後須同步。
- 若雲端 `coin_transactions.source` 有 **CHECK／enum** 未含 **`admin_adjust`**，後台調整幣會寫入失敗，需補 DDL 與型別。
- 觸發器／函式若仍引用舊欄位 `exp` 而非 `total_exp` 需修正。
- 雲端若缺 `loot_box` 獎池需補種子（見遷移 `20260329130000_shop_image_marquee_loot_box.sql`／MCP）。
- `alliances`／私訊／`likes` 等 **RLS** 細節與 production 測試仍待對照 **`HANDOFF_DB.md`** 規範逐表確認。
- `/admin/users` 篩選 `ig_pending` 完整列表邏輯待 Layer 2 擴充（見歷史紀錄）。

## 🔲 下一步待辦

1. **Phase 2.2／雲端**：`alliances`、私訊、`likes` 等政策與 **`HANDOFF_DB.md` RLS 規範**一致化；production 測試；Schema 與 `database.types.ts` 對齊。
2. **產品／UX**：`/explore` 篩選與技能供需編輯；登入心跳 `last_seen_at`。
3. **維運**：雲端缺獎池時補種子；重大 DDL 後 Reload schema。
4. **功能規劃深查**：模組 ✅/🔲、視覺待辦見 `HANDOFF_FEATURES.md`。

## 📚 子檔案說明

- `HANDOFF_HISTORY.md`：所有歷史任務完整紀錄（**不主動讀取**）
- `HANDOFF_DB.md`：遷移、**RLS 政策與維運規範**、DDL 補丁、欄位細節（深查 DB 時）
- `HANDOFF_FEATURES.md`：功能完成度、Wave 摘要、視覺待辦（查產品狀態時）
