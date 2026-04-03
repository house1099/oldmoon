# 傳奇公會 HANDOFF.md

> 每次開新視窗請先讀本檔與 `.cursorrules`

## 🖼️ 商城靜態圖（去背）

- **預設**：放入 **`public/items/`**、**`public/shop/`**、**`public/frames/`** 的商品／框體點陣圖須**去背**（透明底），**除非**使用者明確說保留底色。
- 白底 PNG 可跑 **`npm run process-shop-png-bg`**（見 **`scripts/remove-shop-png-white-bg.mjs`**）。細節與例外見 **`.cursorrules`**「商城與靜態商品圖」。

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
- 月老釣魚（不公開顯示於卡片）：`relationship_status`、`birth_year`、**`matchmaker_age_mode`／`matchmaker_age_older`／`matchmaker_age_younger`**（舊欄 `matchmaker_age_range` 保留不刪）、`matchmaker_region_pref`（JSON 字串）；**`system_settings.matchmaker_age_max`** 為年齡差距上限；**`users`** 月老魚進階欄位（配對邏輯用）：**`height_cm`／`pref_height`**（含 **`height_any`** 都可以不介意）、**`diet_type`／`smoking_habit`／`accept_smoking`／`my_pets`／`accept_pets`／`has_children`／`accept_single_parent`／`fertility_self`／`fertility_pref`／`marriage_view`／`zodiac`／`exclude_zodiac`／`v1_money`／`v3_clingy`／`v4_conflict`**；**`system_settings`** **`matchmaker_lock_*`**、**`matchmaker_height_tall_threshold`／`matchmaker_height_short_threshold`** 與 **`matchmaker_v_max_diff`**

**補充**：`likes` 無 `id`；`alliances` 用 `user_a`／`user_b`／`initiated_by`；通知 `type`、`from_user_id`、`message`、`is_read`；**`banner_check_matchmaker_fields`**、**`matchmaker_lock_height`**（後台開關；**`fishing.action`** 候選池已接 **`matchmaker-locks`** 身高硬鎖）。更細 SSOT／遷移／**RLS 政策與除錯原則**見 `HANDOFF_DB.md`（深查時再開）。

## 📁 關鍵檔案索引

- 守衛／Session：`src/middleware.ts`；`deriveAuthStatus`、`getCachedProfile`
- Auth／註冊：`(auth)/login|register|register/invite|register/profile`；`registration-step-indicator.tsx`；`TermsModal`／`terms.ts`
- OAuth／健康：`src/app/auth/callback/route.ts`（成功可帶 **`guild_entrance=1`** 觸發開場）；`src/app/api/ping/route.ts`
- Profile：`profile.action.ts`；`profile-update.action.ts`；`adventurer-profile.action.ts`；**`profile-change.action.ts`**／**`profile-change.repository.ts`**（基本資料變更申請）；**`guild-profile-home.tsx`**（帳號設定：**月老偏好**導向 **`/matchmaking`**、**基本資料變更**申請／撤回 Modal）；**`ProfileBanner.tsx`**（全站資料補填橫幅）；**`/admin/profile-changes`**（後台審核）
- IG 審核：`ig-request.action.ts`；`ig-request.repository.ts`；`/register/pending`
- 簽到／連簽／盲盒：`daily-checkin.action.ts`（第 7 天 **`drawFromPool('loot_box')`**；獎池失敗時 **系統信** 提示；**`getMyStreakAction`** 斷簽 **>1** 台北曆日時 **`currentStreak`** 顯示 **0**）；`streak.repository.ts`；`prize-engine.ts`（發稱號／框／廣播時寫入 **`user_rewards.shop_item_id`** 若 **`prize_items.shop_item_id`** 有值）；`guild-profile-home.tsx`（簽到成功 Modal 內 **`GuildLootBoxReveal`**）；`user.repository`
- 獎勵／廣播／改名／贈禮：`rewards.action.ts`（**`consumeBagExpansionAction`** 背包擴充包使用；血盟批次贈禮成功後 **一則** `notifyUserMailboxSilent`，文案 **`formatGiftBatchMailboxMessage`**）；`rewards.repository.ts`（**`findEquippedTitlesByUserIds`**、**`findEquippedRewardLabels`** 之 **`equippedTitleImageUrl`**、**`allow_player_trade`** 與背包市集條件）；`gift.action.ts`（**`formatGiftBatchMailboxMessage`**、**`confirmGiftsToUserBatchAction`** 單則通知；暱稱搜尋 **`giftItemToUserAction`**）；**`FloatingToolbar`** 背包贈玩家 **`confirmGiftsToUserBatchAction`**（**`stackMenuQty`** 多件一動作一通知）、**自由市場** **`MarketSheet`**／**`market-listing.action.ts`**／**`market-listing.repository.ts`**（**`findRecentSoldListings`**、**`SWR_KEYS.marketRecentSold`**、售出橘點 **`ft_market_sheet_closed_at` 已讀**）；**`components/ui/button`** **`outlineLight`**；`system-settings`
- 商城：`shop.action.ts`（**`purchaseItemAction` → `newRewardIds`／盲盒另回 `lootDraws`**；**`bag_expansion`** 發 **`user_rewards`** 消耗包，**非**直接改 **`inventory_slots`**）；`shop.repository.ts`；**`(app)/shop`**（**「🎁 送給朋友」**；**`loot_box` 不可商城贈送**；**幣別 Tab 下** **`ITEM_TYPE_LABELS`／`shopCategoryFilter`** 種類下拉、**`displayItems`**）；**公會盲盒開箱** **`GuildLootBoxReveal`**（`src/components/loot-box/guild-loot-box-reveal.tsx`，動畫 **`public/animations/guild-loot-box-treasure.json`**，常數 **`src/lib/constants/guild-loot-box-lottie.ts`**）；`(admin)/admin/shop`（盲盒類型表單說明）
- 財務 master：`/admin/coins`（雙 Tab：`coins-admin-client.tsx`）；`adjustCoinsAction`／`getAdminCoinLedgerAction`；L2 `findCoinTransactionsWithFilters`
- 探索：`explore/page.tsx`；`ExploreClient.tsx`；`village.service.ts`；`market.service.ts`
- 配對：`matching.ts`；`role-display.ts`
- 血盟／社交：`alliance.action.ts`；`alliance.repository.ts`；`social.action.ts`（**`getMyLikesListsAction`** 緣分列表）；**`fishing.action.ts`**（**`getFishingStatusAction`／`getFishingLogsAction`／`collectFishAction`**、**`fishing_logs`**、**`fishing_enabled`**、月老候選池排除 **`findMatchmakerKeptPeerIds`**（曾確認留存））；**`fishing.repository.ts`**（**`fishing_rewards`**、**`findMatchmakerKeptPeerIds`**、後台日誌查詢）；**`admin.action.ts`**（**`getFishingStatsAction`／`getFishingRewardsAction`／`createFishingRewardAction`／`updateFishingRewardAction`／`deleteFishingRewardAction`／`updateFishingSettingsAction`／`getFishingLogsAdminAction`／`getMatchmakerLogsAction`**）；**`(app)/matchmaking`** 三 Tab（魚池／魚獲／設定）；**`components/matchmaking/*`**
- 私訊／檢舉：`chat.action.ts`；`chat.repository.ts`；`ChatModal.tsx`；`useChat.ts`
- **Web Push**：`public/sw.js`（**`push`** 含 **`unreadCount` → 角標**）；`service-worker-register.tsx`（`providers.tsx`）；`usePushSubscription.ts`；`PushNotifyGuildRow.tsx`（`guild-profile-home` 帳號設定 Dialog）；`push.action.ts`；`push.repository.ts`；`lib/push/send-push.ts`（**`VAPID_SUBJECT`＋雙鑰** 才發送；**`unreadCount`** 由 **`countConversationsWithUnreadFromOthers`** 合併）
- **PWA 角標**：`lib/utils/app-badge.ts`（**`setPwaAppBadgeFromUnreadChatCount`**／**`clearPwaAppBadge`**）；`app-badge-unread-chat-sync.tsx`（**`(app)/layout.tsx`**，**未讀私訊對話數**＝`useUnreadChatCount`）；登出見 **`guild-profile-home`**／**`register/pending`**
- **PWA 首頁安裝引導**：**`PwaInstallOverlay.tsx`**（**`home-page-client.tsx`**）；**`usePwaInstall.ts`**（**`beforeinstallprompt`**）；**`pwa-install-prompt.ts`**（**`pwa_prompt_dismissed`**、**3 日**冷卻）；**`pwa-install-engagement.ts`**（**`sessionStorage`**，簽到 **`checkinDone`**／**`guild/page`** mount）；**`manifest.json`** 既有 **standalone**
- 通知／信件：`notification.action.ts`；`notification.repository.ts`；`guild/page.tsx` `MailBox`
- 酒館／廣播：`tavern.action.ts`；`TavernModal.tsx`（輸入 **`@`** 游標觸發提及名單、**`getTavernInlineMentionState`**（**`tavern-mentions.ts`**）、篩選／鍵盤選取；左側 **`@`** 鈕 **插入 `@`**；`tavern-message-content.tsx` 解析 **`@暱稱`**）；`TavernMarquee.tsx`（首頁酒館、`tavern_marquee_*`）；`broadcast/BroadcastBanner.tsx`（全站廣播、`broadcast_*`）；`getMarqueeAndBroadcastSettingsAction`；`app-broadcast-chrome.tsx`；`useTavern.ts`
- 後台：`(admin)/layout.tsx`；`admin-shell.tsx`；`admin.action.ts`；`admin.repository.ts`；`admin-permissions.ts`；**`/admin/fishing`**（**`fishing-admin-client.tsx`**）；**`/admin/market`**（**`market-admin-client.tsx`**）
- **後台獎項／獎池**：**`(admin)/admin/prizes/prizes-client.tsx`**（**`avatar_frame`／`card_frame`／`title`**：**`LocalFrameImagePicker`** 含 **`public/items` optgroup**；**「從商城商品帶入」** 寫入 **`prize_items.shop_item_id`** 供盲盒發獎連 **`user_rewards`**）；**`components/admin/local-frame-image-picker.tsx`**；**`(admin)/admin/shop/shop-admin-client.tsx`**（**`title`** 本機圖 **optgroup**、胸章小預覽；列表 **上架中／已下架** 分頁 + **商品類型** **`item_type`** 篩選）
- 邀請碼：`invitation.repository.ts`；`invitation.action.ts`
- 公告／廣告：`announcement.*`；`advertisement.*`
- 首頁：`page.tsx`／`home-page-client.tsx`；`guild-profile-home.tsx`（大頭貼右下角 **Eye** → **`UserDetailModal` `publicPreview`**，他人視角裝備預覽）；`FloatingToolbar.tsx`（釣竿／釣餌長按導向 **`/matchmaking`**）
- 版面：`Navbar.tsx`；`app-shell-motion.tsx`（`broadcastExtraTopPx`）；`app-broadcast-chrome.tsx`；`(app)/layout.tsx`（**`PostLoginEntrance`** 包子頁＋**`Navbar`**；開場無 **`bg-black`** 全螢幕，用 **`zinc-950`**／圖）；**`PostLoginEntrance.tsx`**、**`auth-bootstrap.action.ts`**；**`login-form`** **`markPostLoginEntrance`**
- 卡片／Modal：`UserCard.tsx`；**`title-badge-row.tsx`**（稱號胸章＋膠囊；**`sm`／`md`／`lg`／`xl`／`card`**；探索 **`UserCard`** 稱號在**底列**興趣／技能右側 **`card`**（約 **sm×1.1**））；`public/items/title-luffy.png`（稱號胸章範例 **`LUFFY`**，見 **`public/items/README.md`**）；`CardDecorationWrapper.tsx`；`card-decoration.ts`（`CardDecorationConfig`／metadata 解析）；**`modals/UserDetailModal.tsx`**（**`publicPreview`**；英雄區頭像與資訊列 **`gap-6`／`pl-2`**；**`bio_village`／`bio_market`** **`whitespace-pre-wrap`**；**`DialogContent` `overflow-visible`**；頭像／心情與 **`overflow-y-auto`** 捲動區**分層**；header **`px-7`**）；`LevelBadge`／`LevelCardEffect`；`ShopCardFrameOverlay.tsx`；卡框比例 **`CARD_FRAME_OVERLAY_PERCENT`**（`shop-card-frame-preview.ts`，與頭像框 **`MASTER_AVATAR_FRAME_OVERLAY_PERCENT`** 分離）
- 頭像：`Avatar.tsx`；`cloudinary.ts`；`cropImage.ts`；頭像框對齊 **`avatar-frame-layout.ts`**（`shop_items.metadata.frame_layout`）；**`scripts/process-tiger-avatar-frame.py`**
- 型別：`src/types/database.types.ts`；SWR：`src/lib/swr/keys.ts`；等級：`src/lib/constants/levels.ts`；標籤：`src/lib/constants/tags.ts`；月老地區／年齡：`src/lib/utils/matchmaker-region.ts`（**`isAgeMatch`／`AGE_MODE_LABELS`**）

**舊路由**：`/village`、`/market` → `/explore`；`/alliances`、`/inbox` → `/guild`。

## 🗄️ 資料庫表清單

- `users` — 會員主檔（暱稱、等級、`total_exp`、自白、標籤、幣、狀態、月老釣魚偏好欄位、`matchmaker_opt_in` 等）
- `profile_change_requests` — 地區／性向／出生年變更申請（pending／approved／rejected）
- `exp_logs` — 經驗變動日誌（觸發器累加 `total_exp`）
- `fishing_rewards` — 釣魚獎品（魚種／tier／幣／EXP／商城道具、**機率權重** `weight`＝百分點的百分之一、限量庫存）
- `fishing_tier_settings` — 每魚種 **小／中／大獎 tier** 抽選（basis points、`interval_miss`／`normalize`）
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
- `prize_items` — 獎項與加權（含 `effect_key`、可選 **`shop_item_id`** → 盲盒／抽獎發 **`user_rewards`** 時供市集上架對應商城 SKU）
- `prize_logs` — 抽獎紀錄
- `user_rewards` — 使用者道具／稱號／框（關聯 `prize_items`）；**`quantity`**（釣餌等可堆疊）
- `broadcasts` — 廣播大聲公
- `shop_items` — 商城商品（**`is_archived`**：後台封存，玩家端 **`findActiveShopItems`** 排除）
- `shop_orders` — 商城訂單
- `shop_daily_limits` — 商城每日限購
- `market_listings` — 玩家自由市場上架（`buy_market_item`／`cancel_market_listing` RPC）

## 🎣 釣魚機率（兩層、不互斥）

- **第一層**：`shop_items.metadata`（釣餌）— `bait_profile`／`bait_*_rate` 等由 **`parseBaitFishWeightsForHarvest`**（`fishing-shop-metadata.ts`）決定 **魚種大類**（common／rare／legendary／matchmaker／leviathan）權重。
- **第二層**：`fishing_rewards` + `fishing_tier_settings` — 大類確定後，在該類內依 **`weight`**（basis points）與 tier 設定抽**具體獎勵**（`fishing.action.ts`）。
- **章魚餌三欄加總**：稀有／傳說／深海巨獸須合計 **100**；驗證與收成使用 **`BAIT_OCTOPUS_RATE_SUM_EPSILON`**（`0.0001`）容差，以支援 **0.01%** 等級小數並吸收浮點誤差。後台表單「目前合計」與後端一致。
- **營運商品對照（範例，各為獨立 `shop_items`）**：**蝦仁豬心餌** → `bait_profile: heart`＋`bait_matchmaker_rate: 100`（月老魚）；**蟲蟲餌** → `normal`＋`bait_common_rate: 100`（普通魚）；**章魚餌** → `octopus`＋三欄機率（稀有／傳說／深海巨獸）。
- **營運查 metadata**（Supabase SQL）：🗄️ `select name, metadata from shop_items where item_type = 'fishing_bait' and name ilike '%關鍵字%';`；釣竿：`item_type = 'fishing_rod'` 看 **`rod_tier`**／**`rod_cooldown_minutes`**（未填冷卻時對應 **`system_settings`** `fishing_rod_cooldown_{basic,mid,high}_minutes`）。

## ✅ 最近完成（最新 8 次任務）

1. **2026-04-07 — 獎池 `prize_items.shop_item_id`、盲盒發獎寫入背包供市集**：遷移 **`20260407120000_prize_items_shop_item_id.sql`**（MCP **`prize_items_shop_item_id`**）；**`prize-engine.ts`** **`insertUserReward`** 補 **`shop_item_id`**；**`admin.action`** **`createPrizeItemAction`／`updatePrizeItemAction`**；**`prizes-client`** 商城帶入時儲存關聯。詳見 **`HANDOFF_HISTORY.md`**（`### 2026-04-07`）。
2. **2026-04-06 — 身高 `height_any`、月老留存排除、簽到斷簽顯示**：**`matchmaker-locks`** **`height_any`**；**`fishing.repository`** **`findMatchmakerKeptPeerIds`**＋**`fishing.action`** 候選池排除；**`getMyStreakAction`** 斷簽顯示 **0**；**`matchmaker-settings-tab`**；遷移 **`pref_height_any_comment`**；Git **`1a6abbd`**。詳見 **`HANDOFF_HISTORY.md`**（`### 2026-04-06`）。
3. **2026-04-03 — 釣魚倒數 ceil／樂觀可收竿、釣竿 SKU 限購、月老收入魚獲／放生**：**`fishing-panel`** **`formatRemainHms`／`PendingHarvestCountdown`／`CooldownTimer`** 與 **`fishing-cast.repository`** 一致採 **`Math.ceil`**；**`harvestReadyByServerOrLocal`** 過 **`pendingHarvestReadyAtIso`** 時樂觀切「可收竿」；**`rewards.repository`** **`userHasFishingRodForShopItem`**；**`shop.action`** **`fishing_rod`** 每人每 **`shop_items.id`** 一把、每次購買數量 1、贈送時 **`giftRecipientUserId`** 檢查受贈者；**`confirmHarvestFishAction`** **`matchmakerOutcome`** **`collect`／`release`**（放生不 **`notifyMatchmakerPeerCaught`**、**`fish_item.matchmakerReleased`**）；**`fishing-reward-modal`** **收入魚獲／放生**＋確認對話；**`catch-panel`** **已放生** 標籤。應用層限購；未加 DB unique（若無遺留重複列可再補 partial index）。**`npx tsc --noEmit`**、**`npm run build`** 通過後推送。詳見 **`HANDOFF_HISTORY.md`**。
4. **2026-04-03 — 餌三商品對照＋章魚小數容差＋魚池單層捲動**：DB **`shop_items`** 修正 **蝦仁豬心餌＝heart（月老）**、**蟲蟲餌＝normal（普通魚）**、**章魚餌＝octopus**；**`fishing-shop-metadata.ts`** 新增 **`BAIT_OCTOPUS_RATE_SUM_EPSILON`**，`validateBaitMetadata`／**`parseBaitFishWeightsForHarvest`** 章魚三欄加總與後台預覽共用；**`shop-admin-client`** 說明與合計顯示 **`toFixed(4)`**；**`app-shell-motion`** 改 **`flex`＋`flex-1`＋`min-h-0`** 讓子頁吃滿高度；**`matchmaking/page`** 根節點改 **`min-h-0 flex-1`**（移除 `calc(100dvh-…)` 避免雙層捲動與頂部黑帶）。**`npx tsc --noEmit`**、**`npm run build`** 通過後推送。
5. **2026-04-03 — 餌 `bait_profile` 唯一 SSOT、魚池捲動觸控**：**`detectBaitType`** 僅讀 **`bait_profile`**（**不再**讀 **`metadata.bait_kind`**，避免誤存 `octopus` 導致後台／前台永遠成章魚餌）；商城餌存檔 **`delete built.bait_kind`**；切換「普通餌／愛心餌」清空章魚三欄；**`matchmaking/page`** 主內容 **`touch-pan-y`**＋**`overscroll-y-contain`**；**`FishingRodStrip`** 橫列 **`touch-manipulation`**＋**`overscroll-x-contain`**。Git **`88fa719`**（**`fix(fishing): bait_profile-only detect, strip bait_kind on save, matchmaking scroll touch`**）。
6. **2026-04-03 — 釣魚四項議題（餌 `bait_profile`、收竿倒數、商城冷卻解析、機率 SSOT）**：**`fishing-shop-metadata`** **`detectBaitType`** 優先讀 **`bait_profile`**；餌存檔寫入 profile；**`getRodCastSnapshot`**／**`FishingStatusDto`** 補 **`pendingHarvestReadyAtIso`**；**`fishing-panel`** **`PendingHarvestCountdown`** 本地每秒更新；**`resolveRodCooldownResolution`**＋**商城釣竿**顯示解析後冷卻與來源；**`HANDOFF`** 補兩層機率說明與營運查詢 SQL。詳見 **`HANDOFF_HISTORY.md`（`### 2026-04-03 — 釣魚 UX／metadata／機率 SSOT`）**；Git **`5504b85`**。
7. **2026-04-03 — 月老魚性向篩選修正、配對綁定（站內信）、IG 強制顯示**：**`matchmaker-locks.ts`** **`checkGenderOrientation`** 改為英文 slug 正規化＋**`isOrientationMatch`**（與 DB／`matching.ts` 一致），修正異性戀男男誤配；**`user.repository`** 月老候選池補 **`instagram_handle`／`interests`／`bio_village`**；**`fishing.action.ts`** **`MatchmakerCollectPeer`**、**`HarvestPreviewPayload`** 補 peer 欄位、**`confirmHarvestFishAction`** 確認收成後 **`notifyUserMailboxSilent`** 通知被釣者；**`fishing-reward-modal`** 月老卡 IG 區塊；**`UserDetailModal`** **`forceShowIg`**；**`catch-panel`** 月老標記＋開啟詳情強制 IG。**`npx tsc --noEmit`**、**`npm run build`** 通過。詳見 **`HANDOFF_HISTORY.md`（`### 2026-04-03 — 月老魚性向篩選、綁定與 IG 強制顯示`）**。
8. **2026-04-03 — 全站動態設定系統（`useAppSettings`、合併 `fishing_age_max`、替換硬編碼）**：合併 **`fishing_age_max`→`matchmaker_age_max`**（DB＋admin.action＋fishing-admin-client＋page）；新增 6 個 `system_settings` keys（`broadcast_message_max_length`、`chat_message_max_length`、`inventory_max_slots`、`bag_expansion_slots_per_use`、`nickname_max_length`、`bio_field_max_length`）；新增 **`src/services/public-settings.action.ts`**（`getPublicAppSettingsAction`＋`unstable_cache` 60s＋`system_settings` tag）；新增 **`src/hooks/useAppSettings.ts`**（SWR＋`fallbackData`）；替換前台硬編碼：**`matchmaker-settings-tab`**（年齡／身高／三觀）、**`FloatingToolbar`**（背包／暱稱／廣播）、**`ChatModal`**（私訊 500）、**`guild-profile-home`**（自介 200／暱稱／廣播）、**`MarketSheet`**（上架限制說明）；後台 **`/admin/settings`** 新增「📱 前台顯示設定」區塊（6 欄位含範圍驗證）。**`npx tsc --noEmit`**、**`npm run build`** 通過。詳見 **`HANDOFF_HISTORY.md`**。

## 🤝 下一個 Agent 接續（釣魚／商城，2026-04-03）

- **已上線重點**：餌類型以 **`shop_items.metadata.bait_profile`** 為準；收竿／拋竿冷卻倒數與後端 **`Math.ceil`** 對齊，**`pendingHarvestReadyAtIso`** 可樂觀切「可收竿」；**釣竿**每人每 **`shop_items.id`** 一把（**`purchaseItemAction`**＋贈送檢查受贈者）；**月老魚**收成為 **收入魚獲**（通知對方）或 **放生**（不通知、**`fish_item.matchmakerReleased`**）；魚獲列表 **已放生** 標籤。
- **蝦仁豬心／蟲蟲餌／章魚餌**：雲端 **`shop_items.metadata`** 已對照 **heart／normal／octopus**（見「最近完成」）；若其他環境仍錯，後台該商品選對類型後儲存即可。
- **8 小時 vs 釣魚後台 1440 分**：全站 **basic** 預設只影響 **`rod_tier: basic`** 且 **未填** **`rod_cooldown_minutes`** 的釣竿；**high** 預設為 480 分（8h）。請對照該釣竿商品的 **`rod_tier`**／**`rod_cooldown_minutes`**（見商城表單「解析後拋竿冷卻」）。
- **關鍵檔案**：**`fishing-shop-metadata.ts`**、**`shop-admin-client.tsx`**、**`fishing-panel.tsx`**、**`fishing-reward-modal.tsx`**、**`catch-panel.tsx`**、**`matchmaking/page.tsx`**、**`fishing.action.ts`**、**`shop.action.ts`**、**`rewards.repository.ts`**、**`fishing-cast.repository.ts`**。

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
