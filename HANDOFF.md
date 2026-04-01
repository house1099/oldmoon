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
- 月老釣魚（不公開顯示於卡片）：`relationship_status`、`birth_year`、**`matchmaker_age_mode`／`matchmaker_age_older`／`matchmaker_age_younger`**（舊欄 `matchmaker_age_range` 保留不刪）、`matchmaker_region_pref`（JSON 字串）；**`system_settings.matchmaker_age_max`** 為年齡差距上限

**補充**：`likes` 無 `id`；`alliances` 用 `user_a`／`user_b`／`initiated_by`；通知 `type`、`from_user_id`、`message`、`is_read`。更細 SSOT／遷移／**RLS 政策與除錯原則**見 `HANDOFF_DB.md`（深查時再開）。

## 📁 關鍵檔案索引

- 守衛／Session：`src/middleware.ts`；`deriveAuthStatus`、`getCachedProfile`
- Auth／註冊：`(auth)/login|register|register/invite|register/profile`；`registration-step-indicator.tsx`；`TermsModal`／`terms.ts`
- OAuth／健康：`src/app/auth/callback/route.ts`（成功可帶 **`guild_entrance=1`** 觸發開場）；`src/app/api/ping/route.ts`
- Profile：`profile.action.ts`；`profile-update.action.ts`；`adventurer-profile.action.ts`；**`profile-change.action.ts`**／**`profile-change.repository.ts`**（基本資料變更申請）；**`guild-profile-home.tsx`**（帳號設定：**月老偏好**導向 **`/matchmaking`**、**基本資料變更**申請／撤回 Modal）；**`ProfileBanner.tsx`**（全站資料補填橫幅）；**`/admin/profile-changes`**（後台審核）
- IG 審核：`ig-request.action.ts`；`ig-request.repository.ts`；`/register/pending`
- 簽到／連簽／盲盒：`daily-checkin.action.ts`（第 7 天 **`drawFromPool('loot_box')`**；獎池失敗時 **系統信** 提示）；`streak.repository.ts`；`prize-engine.ts`；`guild-profile-home.tsx`（簽到成功 Modal 內 **`GuildLootBoxReveal`**）；`user.repository`
- 獎勵／廣播／改名／贈禮：`rewards.action.ts`（**`consumeBagExpansionAction`** 背包擴充包使用；血盟批次贈禮成功後 **一則** `notifyUserMailboxSilent`，文案 **`formatGiftBatchMailboxMessage`**）；`rewards.repository.ts`（**`findEquippedTitlesByUserIds`**、**`findEquippedRewardLabels`** 之 **`equippedTitleImageUrl`**、**`allow_player_trade`** 與背包市集條件）；`gift.action.ts`（**`formatGiftBatchMailboxMessage`**、**`confirmGiftsToUserBatchAction`** 單則通知；暱稱搜尋 **`giftItemToUserAction`**）；**`FloatingToolbar`** 背包贈玩家 **`confirmGiftsToUserBatchAction`**（**`stackMenuQty`** 多件一動作一通知）、**自由市場** **`MarketSheet`**／**`market-listing.action.ts`**／**`market-listing.repository.ts`**（**`findRecentSoldListings`**、**`SWR_KEYS.marketRecentSold`**、售出橘點 **`ft_market_sheet_closed_at` 已讀**）；**`components/ui/button`** **`outlineLight`**；`system-settings`
- 商城：`shop.action.ts`（**`purchaseItemAction` → `newRewardIds`／盲盒另回 `lootDraws`**；**`bag_expansion`** 發 **`user_rewards`** 消耗包，**非**直接改 **`inventory_slots`**）；`shop.repository.ts`；**`(app)/shop`**（**「🎁 送給朋友」**；**`loot_box` 不可商城贈送**；**幣別 Tab 下** **`ITEM_TYPE_LABELS`／`shopCategoryFilter`** 種類下拉、**`displayItems`**）；**公會盲盒開箱** **`GuildLootBoxReveal`**（`src/components/loot-box/guild-loot-box-reveal.tsx`，動畫 **`public/animations/guild-loot-box-treasure.json`**，常數 **`src/lib/constants/guild-loot-box-lottie.ts`**）；`(admin)/admin/shop`（盲盒類型表單說明）
- 財務 master：`/admin/coins`（雙 Tab：`coins-admin-client.tsx`）；`adjustCoinsAction`／`getAdminCoinLedgerAction`；L2 `findCoinTransactionsWithFilters`
- 探索：`explore/page.tsx`；`ExploreClient.tsx`；`village.service.ts`；`market.service.ts`
- 配對：`matching.ts`；`role-display.ts`
- 血盟／社交：`alliance.action.ts`；`alliance.repository.ts`；`social.action.ts`（**`getMyLikesListsAction`** 緣分列表）；**`fishing.action.ts`**（**`getFishingStatusAction`／`collectFishAction`** 月老魚）；**`(app)/matchmaking`** 三 Tab（魚池／緣分／配對設定）；**`components/matchmaking/*`**
- 私訊／檢舉：`chat.action.ts`；`chat.repository.ts`；`ChatModal.tsx`；`useChat.ts`
- **Web Push**：`public/sw.js`（**`push`** 含 **`unreadCount` → 角標**）；`service-worker-register.tsx`（`providers.tsx`）；`usePushSubscription.ts`；`PushNotifyGuildRow.tsx`（`guild-profile-home` 帳號設定 Dialog）；`push.action.ts`；`push.repository.ts`；`lib/push/send-push.ts`（**`VAPID_SUBJECT`＋雙鑰** 才發送；**`unreadCount`** 由 **`countConversationsWithUnreadFromOthers`** 合併）
- **PWA 角標**：`lib/utils/app-badge.ts`（**`setPwaAppBadgeFromUnreadChatCount`**／**`clearPwaAppBadge`**）；`app-badge-unread-chat-sync.tsx`（**`(app)/layout.tsx`**，**未讀私訊對話數**＝`useUnreadChatCount`）；登出見 **`guild-profile-home`**／**`register/pending`**
- **PWA 首頁安裝引導**：**`PwaInstallOverlay.tsx`**（**`home-page-client.tsx`**）；**`usePwaInstall.ts`**（**`beforeinstallprompt`**）；**`pwa-install-prompt.ts`**（**`pwa_prompt_dismissed`**、**3 日**冷卻）；**`pwa-install-engagement.ts`**（**`sessionStorage`**，簽到 **`checkinDone`**／**`guild/page`** mount）；**`manifest.json`** 既有 **standalone**
- 通知／信件：`notification.action.ts`；`notification.repository.ts`；`guild/page.tsx` `MailBox`
- 酒館／廣播：`tavern.action.ts`；`TavernModal.tsx`（輸入 **`@`** 游標觸發提及名單、**`getTavernInlineMentionState`**（**`tavern-mentions.ts`**）、篩選／鍵盤選取；左側 **`@`** 鈕 **插入 `@`**；`tavern-message-content.tsx` 解析 **`@暱稱`**）；`TavernMarquee.tsx`（首頁酒館、`tavern_marquee_*`）；`broadcast/BroadcastBanner.tsx`（全站廣播、`broadcast_*`）；`getMarqueeAndBroadcastSettingsAction`；`app-broadcast-chrome.tsx`；`useTavern.ts`
- 後台：`(admin)/layout.tsx`；`admin-shell.tsx`；`admin.action.ts`；`admin.repository.ts`；`admin-permissions.ts`；**`/admin/market`**（**`market-admin-client.tsx`**）
- **後台獎項／獎池**：**`(admin)/admin/prizes/prizes-client.tsx`**（**`avatar_frame`／`card_frame`／`title`**：**`LocalFrameImagePicker`** 含 **`public/items` optgroup**；商城帶入）；**`components/admin/local-frame-image-picker.tsx`**；**`(admin)/admin/shop/shop-admin-client.tsx`**（**`title`** 本機圖 **optgroup**、胸章小預覽；列表 **上架中／已下架** 分頁 + **商品類型** **`item_type`** 篩選）
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
- `market_listings` — 玩家自由市場上架（`buy_market_item`／`cancel_market_listing` RPC）

## ✅ 最近完成（最新 5 次任務）

1. **2026-04-01 — 月老年齡三欄位／月老頁三 Tab／釣魚 Action**：遷移 **`20260401500000_matchmaker_age_mode.sql`**；雲端 **Supabase MCP `apply_migration`**；**`users`** **`matchmaker_age_mode`／`matchmaker_age_older`／`matchmaker_age_younger`**、**`system_settings.matchmaker_age_max`**；**`database.types.ts`**；**`profile-update.action.ts`**（**`getMatchmakerAgeMaxAction`** 驗證）；**`matchmaker-region.ts`** **`isAgeMatch`**；**`fishing.action.ts`**；**`user.repository`／`like.repository`／`chat.repository`／`rewards.repository`** 擴充；**`/matchmaking`** **Tabs**（魚池／緣分列表／配對設定）；**`guild-profile-home`** 月老區改導向 **`/matchmaking`**；**`FloatingToolbar`** 釣具導向月老；**`Navbar`** 月老圖示 **Fish**。**`npx tsc --noEmit`**、**`npm run build`** 通過。詳見 **`HANDOFF_HISTORY.md`**（**「月老年齡三欄位與月老頁重構（2026-04-01）」**）。
2. **2026-04-01 — 基本資料變更申請 UI／Banner／後台審核**：**`SWR_KEYS`** **`myProfileChangeRequest`／`profileBannerSettings`**；**`guild-profile-home.tsx`** 月老配對池開關、待審核摘要／撤回、申請 Modal、**`/?accountSettings=profileChange`** 深連結；**`ProfileBanner.tsx`**＋**`(app)/layout.tsx`**；**`/admin/profile-changes`**（**`profile-changes-client.tsx`** 待審核／所有申請）；**`admin-shell.tsx`** 角標、**`middleware.ts`** 版主路徑；**`getDashboardStats`** **`pendingProfileChangeCount`**、儀表板統計卡；**`settings-client.tsx`** Banner 區塊；**`profile-change.repository.ts`** 審核者 embed。**`npx tsc --noEmit`**、**`npm run build`** 通過。詳見 **`HANDOFF_HISTORY.md`**（**「基本資料變更申請 UI／Banner／後台審核（2026-04-01）」**）。
3. **2026-04-01 — 基本資料變更申請系統地基**：遷移 **`20260401400000_profile_change_requests.sql`**；雲端 **Supabase MCP `execute_sql`**；**`users.matchmaker_opt_in`**、**`profile_change_requests`**（**`profile_change_status`** enum、RLS 自選、**pending 唯一**）、**`system_settings`** **`profile_banner_*`**；**`database.types.ts`**；**`profile-change.repository.ts`**／**`profile-change.action.ts`**（申請／撤回／後台審核／**Banner** **`unstable_cache`**）；**`updateMyProfile`** 支援 **`matchmaker_opt_in`**。**`npx tsc --noEmit`**、**`npm run build`** 通過。詳見 **`HANDOFF_HISTORY.md`**（**「基本資料變更申請系統地基（2026-04-01）」**）。
4. **2026-04-01 — 釣魚系統地基（月老偏好）**：遷移 **`20260401200000_users_fishing_fields.sql`**；雲端 **Supabase MCP `execute_sql`**；**`users`** 新增 **`relationship_status`／`birth_year`／`matchmaker_age_range`／`matchmaker_region_pref`**；**`database.types.ts`**；註冊 **`profile-form.tsx`** Step2 出生年＋感情狀態；**`completeAdventurerProfile`**／**`updateMyProfile`** 驗證與寫入；**`guild-profile-home.tsx`** 帳號設定「🎣 月老釣魚偏好」＋地區 **Dialog**；**`matchmaker-region.ts`**。**`npx tsc --noEmit`**、**`npm run build`** 通過。詳見 **`HANDOFF_HISTORY.md`**（**「釣魚系統地基（2026-04-01）」**）。
5. **2026-04-01 — 自由市場橘點已讀＋後台按鈕對比**：**`FloatingToolbar`** 售出橘點改為僅在 **關閉 `MarketSheet` 後**仍 **24h 內新成交**時顯示（**`lastMarketSheetClosedAt`＋`sessionStorage` `ft_market_sheet_closed_at`**，對齊酒館「關閉即已讀」）；快捷列文字膠囊改 **白字／較不透明底**（含 **廣播管理**）。**`Button`** 新增 **`outlineLight`**（白底深字，不受 **`dark` 根**影響）；**`market-admin-client`／`shop-admin-client`／`prizes-client`** 之 **`outline`** 改 **`outlineLight`** 修正分頁等灰字看不清。**`npx tsc --noEmit`**、**`npm run build`** 通過。詳見 **`HANDOFF_HISTORY.md`**（**「自由市場橘點已讀與後台按鈕對比（2026-04-01）」**）。

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
