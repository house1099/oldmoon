# 月老事務所：傳奇公會 V2.0 — 交接文件

與 Vibe Coder／架構師同步專案狀態用。**每次在新視窗、新對話或調整架構前，請先讀本檔與根目錄 `.cursorrules`。**

## 🌕 目前開發階段：Phase 2 — 社交核心（進行中）

**下一視窗／下一階段預設焦點**：**Phase 2.2** — **Likes（有緣分）**、**Alliances（血盟）**、使用者詳情 Modal、雲端 **RLS** 與型別對齊。註冊 **名冊兩步＋`/register/interests`（興趣）→ `/register/skills`（技能，可跳過）**、**五步指示器（1—5）**、性別僅 **男／女**，與 **`/profile/edit-tags`** 已接線；Phase 2.1 村莊＋市集已接線，見下表與「關鍵檔案索引」。

### 🛠️ 核心工具基準（Layer 4）

- **`src/lib/utils/date.ts`**：全系統唯一「公會日曆／時間基準點」。
  - **`taipeiCalendarDateKey()`**：強制使用 **`Asia/Taipei`** 產出 **`YYYY-MM-DD`**。
  - **規範**：嚴禁在 Action 或 Repository 中直接使用 `toISOString().slice(0, 10)`；必須引用此工具以確保台灣日界一致。

### 🏛️ 五層架構狀態（速覽）

- **Layer 1（連線）**：Supabase Client／Server／Admin 已完備。
- **Layer 2（資料）**：`user.repository.ts`（含 **`updateLastCheckinAt`**）、`exp.repository.ts` 支援 **`total_exp`**（SSOT）；**`chat.repository.ts`**（**`conversations`**／**`chat_messages`**／**`blocks`**／**`reports`**，admin，供私訊／封鎖／檢舉接線）。
- **Layer 3（業務）**：`daily-checkin.action.ts` 之 **`claimDailyCheckin`** 以 **`users.last_checkin_at`** 為簽到 **24h 滾動冷卻** SSOT；**`exp_logs.unique_key`** 為 **`daily_checkin:{userId}:{timestamp}`**；**`chat.action.ts`**（開啟對話／訊息／列表／封鎖／檢舉）、**`notification.action.ts`**（**`getMyNotificationsAction`**（**直接** **`loadNotificationsForUser`**，**不**包 **`unstable_cache`**；批量載入發送者）／**`insertMailboxNotificationAction`／`notifyUserMailboxSilent`**／**`markNotificationReadAction`**／**`markAllNotificationsReadAction`**／清除／未讀數）。
- **Layer 4（狀態／常數）**：`levels.ts`（門檻 0〜1350）、Zod 驗證已就緒；**`date.ts`** 之 **`taipeiCalendarDateKey()`** 仍為全系統**日曆日** SSOT（簽到冷卻**不再**依此判斷）；**`useChat.ts`** — **`useConversations`**／**`useMessages`**、**`useUnreadNotificationCount`**、**`useUnreadChatConversationsCount`**／**`useUnreadChatCount`**（別名，**`SWR_KEYS.unreadChatConversations`**；**`SWR_KEYS.conversations`**／**`messages(id)`**／**`unreadNotifications`**）；**`useTavern.ts`**（**`SWR_KEYS.tavernMessages`**、**Realtime `tavern_messages` INSERT**）。
- **Layer 5（UI）**：**`Navbar.tsx`**（五項 **lucide** 圖示底欄：**Home／Compass／Swords／Heart／ShoppingBag**）、**`LevelFrame.tsx`**（等級框元件；探索列表卡改用 **`LevelBadge`**）、**`UserCard`**（**`ui/UserCard.tsx`**）、**`UserCardSkeleton`**（市集列表首次載入）、**`/explore`**（**Server Component** 預載村莊；**`ExploreClient`** 頂部 **safe-area**、村莊＋市集 **tab**、**市集 `useSWR`（query key + `keepPreviousData`）**＋**`hidden`／`block` 切 tab 不 unmount**）、**`/guild`**（**`hidden` 切 tab**；**血盟** **`AllianceList`**＋**pending 角標**；**聊天** **`useConversations`**＋**`ChatModal`**；**信件** **`SWR_KEYS.notifications`**＋**`useUnreadNotificationCount`** 紅點；血盟列點擊 **`getOrCreateConversationAction`** 開聊）、**`UserDetailModal`** 內 **`ChatModal`**（私訊＋Realtime＋檢舉）、**`/matchmaking`**／**`/shop`**（預留）。

### 📈 開發進度

- [x] **Phase 1.5**：帳號體系、Google 登入預留、暗黑視覺升級、時區校正（日鍵集中於 **`date.ts`**）。
- [x] **Phase 2.1（核心已交付）**：探索 **Tab「興趣村莊」** 同縣市＋**性向雙向篩選**＋**`master`／`moderator` 置頂**→**興趣分數**→**等級**排序、列表卡僅興趣（最多 3 +N）；**Tab「技能市集」** 全台＋**Perfect Match（命定師徒）**→**互補／同好分數**→**等級**、**`getMarketUsersAction`** 搜尋；入口 **`/explore`**（**Server** 預載村莊；**`ExploreClient`** 以 **`useSWR`** 綁村莊／市集 **Server Action**；**tab 以 `hidden` 切換不重打列表**）；**`village.service`** **`unstable_cache` 30s**、**`market.service`** 基礎列表 **60s**、**`getCachedMySkills`（60s，`profileCacheTag`）** 避免每次搜尋重查自己技能、**關鍵字篩選在列表快取回傳後**；舊 **`/village`**／**`/market`** → **`redirect('/explore')`**；Layer 2 **`findVillageUsers`**／**`findMarketUsers`**；Layer 4 **`matching.ts`**。可持續打磨 UX／RLS。
- [ ] **Phase 2.2（進行中）**：**Likes** 已接線；**雙人血盟**（**`public.alliances`**：`user_a`／`user_b`／`initiated_by`）UI 與 Layer 2／3 已接線；詳情 Modal 血盟四態＋IG 解鎖；**`/guild`** 血盟列表與 tab 徽章；**RLS** 可後補。

### 前台 Bug 修復紀錄（2026-03-26）

1. **`UserDetailModal` IG 區塊**：顯示條件 SSOT — 僅在 **`instagram_handle` 有值** 且（**`ig_public === true`** 或 **血盟 `allianceStatus === 'accepted'`**）時渲染；**`ig_public === false` 且非血盟**時不顯示 IG。
2. **`/guild` 信件（`MailBox`）**：通知卡片可點；**`Dialog`** 顯示詳情（發送者頭像＋暱稱、依 **`type`** 的完整文案或 **`message`**、台北時間 **`Intl` `Asia/Taipei`**）、**「查看對方資料」**（**`getMemberProfileByIdAction`** → **`UserDetailModal`**，無 **`from_user_id`** 則無按鈕）；關閉 Modal 時若未讀則 **`markNotificationReadAction(id)`** 單筆已讀並 **`mutate` SWR**。層級：**通知 Modal** **`z-[200]`／`z-[210]`**；**`UserDetailModal`** **`z-[800]`／`z-[810]`**；取消緣分底欄 **`z-[820]`**；**`LeaderToolsSheet`** **`z-[830]`／`z-[840]`**（確認對話 **`z-[850]`**）；**`ChatModal`** **`z-[700]`／`z-[720]`**（**`UserDetailModal`** 自聊天內開啟時疊於其上，**`z-[800]+`**）。**`Dialog`** 的 overlay／popup 帶 **`data-no-chat-inert`**，避免 **ChatModal** 對 **`body`** 子節點設 **`inert`** 時誤傷疊加的 Dialog。**`DialogContent`** 支援可選 **`overlayClassName`**。
3. **首頁今日心情**：**`guild-profile-home.tsx`** 僅保留**一處**獨立區塊（**`placeholder="今天的心情是..."`**）；移除覆蓋式「趕快填寫…」占位層與 **`text-transparent`** 雙層視覺，避免像兩個心情區塊；樣式維持 **`rounded-3xl`**、**`border-violet-500/30`**、**`bg-violet-950/40`**、**`backdrop-blur-xl`**、紫微 **`box-shadow`**。
4. **`UserCard`／`UserDetailModal` 完全重構（深色奢華、極簡層次）**：
   - **實作位置**：**`src/components/ui/UserCard.tsx`**（**`src/components/cards/UserCard.tsx`** 僅 re-export）；**`LevelBadge`** — **`src/components/ui/LevelBadge.tsx`**。
   - **列表卡規則（村莊／市集分開）**：**`variant="village"`** — 興趣標籤最多 **3 +N**、**無**市集技能列；**`variant="market"`** — **能教／想學**各最多 **2 +N**、**無**村莊興趣列；共通 — **頭像 56px**、**`activity_status === 'active'`** 綠點否則灰點、**`resting`** 顯示 **「💤 休息中」**、**`mood` + `mood_at` 24h 內** 顯示今日心情膠囊；市集 **命定師徒**（**`perfectMatch`**）— 琥珀光暈邊框＋右上角 **「⚔️ 命定師徒」**。**`getRoleDisplay(role)`** 仍用於皇冠／暱稱色階。
   - **`UserDetailModal`**：**永遠顯示完整資訊**（雙自白 **`bio_village`／`bio_market`**、興趣村莊**全部**標籤、技能市集分 **我能教／我想學**、IG 區塊條件不變、**master** 信譽條＋領袖工具）；版面為 **頂部英雄區（固定）**＋**可捲動內容**＋**底部固定操作**（聊聊／緣分／血盟四態／領袖工具）；頭像角標依 **`activity_status`**；等級旁 **`LEVEL_TIERS`** 稱號。
   - **Layer 2 `select` SSOT**：**`findVillageUsers`** 與 **`findMarketUsers`** 之 **`select`** 須涵蓋列表與 Modal 資料鍊所需：**`id, nickname, avatar_url, level, region, role, mood, mood_at, activity_status, interests, skills_offer, skills_want, bio_village, bio_market`**（另含 **`gender`／`orientation`／`last_seen_at`／`instagram_handle`／`ig_public`** 等既有欄位，依函式現況為準）。

### 角色識別、探索排序與命定師徒（2026-03-26）

- **`src/lib/utils/role-display.ts`**：**`getRoleDisplay(role)`** 回傳 **`crown`** + **`nameClass`** — **`master`** → **👑**、`text-amber-300 font-semibold`；**`moderator`** → **🛡️**、`text-blue-300 font-semibold`；其餘 **`crown: null`**、`text-zinc-100`。套用：**`UserCard`**（**`src/components/ui/UserCard.tsx`**，**`cards/UserCard.tsx`** re-export）、**`UserDetailModal`**、**`TavernModal`** 訊息列、**`/guild`** 血盟（待確認／夥伴）與聊天列表暱稱。
- **興趣村莊排序**（**`getVillageUsersAction`**／**`village.service.ts`**）：性向篩選後 — **①** **`master`／`moderator` 置頂** → **②** **`calcInterestScore` 高→低** → **③** 同分 **`level` 高→低**。**`findVillageUsers`** **`select`** 含 **`role`**、**`level`**、**`mood`**、**`mood_at`**、**`activity_status`** 及卡片／Modal 欄位（見上「前台 Bug 修復」第 4 點）。
- **技能市集排序**（**`getMarketUsersAction`**／**`market.service.ts`**）：**不做** staff 置頂 — **①** **Perfect Match**（雙向技能契合）→ **②** **互補分** → **③** **同好分** → **④** 同分 **`level` 高→低**。**`findMarketUsers`** **`select`** 同上（**`level`**、**`role`**、心情與活躍狀態等列表與詳情所需欄位）。
- **命定師徒**：市集 UI 將原「靈魂伴侶／完美匹配」文案改為 **「⚔️ 命定師徒」**（**`MarketContent.tsx`**）；**`.perfect-match-market-shell`** 高光樣式不變（**`globals.css`** 註解同步）。

### 廣告顯示與後台（2026-03-26 起）

- **Layer 2 `findActiveHomeAds`**：併查 **`position = banner`**（最多 **15** 則）與 **`card`**（最多 **3** 則），權重降序、**`is_active`** 與上下架時間窗與先前一致；**`getHomeAdsAction`** 仍回傳單一陣列，**UI 依 `position` 分流**（橫幅輪播／卡片橫滑互不混用）。
- **首頁 `guild-profile-home`**：**公告區塊上方**為 **Banner 輪播**（僅有 banner 時渲染；**`h-40` `rounded-2xl`**、底層漸層＋標題；**4 秒**自動切換、**`duration-500` opacity**；**多則**底部白點指示；**單則**不輪播、不顯示點；點擊有 **`link_url`** 則 **`window.open(..., '_blank')`** 並 **`recordAdClickAction`**）。**公告**：**`w-full` 滿版垂直堆疊**（置頂琥珀卡＋一般 **`space-y-2`**），**無橫向滑動**；內文 **`line-clamp-2`**，超過顯示 **「⋯ 展開」**（**`useLayoutEffect` 偵測截斷**）；點整卡開 **Dialog**。**今日心情下方「贊助」橫滑**僅 **`card`**：固定 **`min/max-w-[240px]`**、整卡 **`h-[236px]`**；有圖 **`h-32` `object-cover`**；無圖 **`h-16` `bg-zinc-800/60`** 置中標題；標題／說明 **truncate／line-clamp-2** 規格見程式。
- **後台 `/admin/publish`（廣告）**：位置 **badge／select** 使用中文對照 **`AD_POSITION_LABELS`**（橫幅／卡片／公告置頂），**DB 與 API 仍存英文 `banner`／`card`／`announcement`**。**權重**改純數字文字輸入，**送出時**驗證 **1–10**。**`/admin/exp`**（EXP **1–1000**）、**`/admin/invitations`**（批量 **1–50**、有效天數 **≥0**）同樣改 **`type="text"`** 過濾數字、**送出時 toast 驗證**。

### 通知系統（信件／`notifications`）（2026-03-26 起）

- **讀取效能**：**`getMyNotificationsAction`** 直接呼叫 **`loadNotificationsForUser`**（**不**使用 **`unstable_cache`**，避免 SWR 觸發時 Next 資料快取造成信件列表首包過慢）；通知列 **最多 50 筆**；發送者以 **`from_user_id` 去重後單次 `users.in('id', …)`** 批量載入。**寫入**後仍 **`revalidateTag(notifications-{userId})`**（常數 **`src/lib/constants/notification-cache.ts`**）。**`/guild` `MailBox`**：**`revalidateOnFocus: false`**、**`dedupingInterval: 3000`**，與全域 30s dedupe 區隔以減少不必要重打。
- **冒險團 `MailBox`**（**`guild/page.tsx`**）：載入中顯示 **3 枚** **`glass-panel` + `animate-pulse`** 骨架（圓形頭像位＋兩條橫條），避免空白。
- **寫入 API（Layer 3）**：**`insertMailboxNotificationAction`**（寫入＋**`revalidateTag`**，供領袖邀請碼等需回報錯誤）、**`notifyUserMailboxSilent`**（管理員副作用：**`catch` 僅 `console.error`**，不拋錯）。
- **`invitation_code`**：**`LeaderToolsSheet`**「產生並發送邀請碼」改為 **`generateInvitationCodeAction`** → **`insertMailboxNotificationAction`**（**`type: 'invitation_code'`**、**`from_user_id`**＝領袖、**`user_id`**＝對方），**不再**經 **`getOrCreateConversationAction`／`sendMessageAction`**。
- **管理員操作 → 信件（`type: 'system'`，皆 `notifyUserMailboxSilent`）**：**`banUserAction`／`suspendUserAction`／`unbanUserAction`／`adjustExpAction`／`adjustReputationAction`／`updateUserRoleAction`**（升 **moderator**／降 **member**）、**`reviewIgRequestFromAdminAction`**（核准／拒絕）、**`batchGrantExpAction`／`grantExpToAllAction`／`grantExpByLevelAction`**（對 **`batchGrantExp` 回傳之 `successfulUserIds`** 每人一則 **`🎁 你獲得了 +{delta} EXP！活動名稱：{source}`**，**`Promise.allSettled`** 並行寫入）。**`reviewIgRequestAction`**（**`ig-request.action.ts`**／前台審核頁）成功後同樣對申請者寫入核准／拒絕文案。**酒館**：**`banTavernUserAction`／`unbanTavernUserAction`**（**`tavern.action.ts`**，僅 **master**）同步 **`insertAdminAction`**（**`tavern_ban`／`tavern_unban`**）與上述通知文案。

## Phase 2.1 首頁個人卡重構（完成）

- **iOS／PWA**：首頁三處 **textarea**（今日心情、興趣自白、技能自白）使用 **`text-base`（16px）** 避免 Safari 聚焦自動縮放；**`onFocus` → `scrollIntoView({ block: 'center' })`**（延遲 300ms）減輕鍵盤頂動；根 **`layout.tsx`** **`viewport.maximumScale: 1`** + **`viewport-fit=cover`**（**不**使用 **`user-scalable=no`**）
- **帳號設定 Dialog**：**無 IG** 時可直接 **`updateMyProfile({ instagram_handle })`** 綁定；**已有 IG** 時畫面鎖定顯示，改帳須 **`requestIgChangeAction`** 寫入 **`ig_change_requests`**，由 **admin／leader** 於 **`/admin/ig-requests`** 審核（**`reviewIgRequestAction`**）。**`ig_public`** 開關仍即時寫入
- **今日心情**：與頭像卡同級之**獨立區塊**（**全頁僅此一段**，勿再疊第二層占位 UI）；**微光紫邊**（**`border-violet-500/30`**、**`box-shadow: 0 0 20px rgba(139,92,246,0.15)`**）、**`bg-violet-950/40`**、**`backdrop-blur-xl`**、**`rounded-3xl`**；標題列 **✨ 今日心情** 左對齊、**`getMoodCountdown`** 或「已過期」右對齊（**`text-violet-300/70`**）；**窄版** **`textarea`**（**`placeholder="今天的心情是..."`**、**`rows={2}`**、**`py-2.5`**、**`border-violet-500/20`** **`focus:border-violet-400/50`**）；確認為**小膠囊**（**`px-5 py-1.5 text-xs`**、**`bg-violet-600/80`**），儲存中 **「更新中…」**
- **我的狀態**：同一 `glass-panel` 內僅含三區，皆為**手風琴**（`openSection` 單開），**預設收折**，點標題展開
  - **自白**：**`bio_village`**（興趣自白）+ **`bio_market`**（技能自白），各自獨立確認按鈕
  - **信譽與紀錄**：**`created_at`**、**`invite_code`**、**`invited_by`**、**`exp_logs`** 近三個月橫向滑動（Layer 3 **`getMyRecentExpLogsAction`** → Layer 2 **`findRecentExpLogsForUser`**）
  - **興趣與技能標籤**：**雙區抬頭**——**興趣村莊**（紫）+ **技能市集**（琥珀抬頭；**`skills_offer`** 琥珀標籤、**`skills_want`** 天藍標籤，兩者合併於同一區，有任一即顯示）；全空時占位文案；手風琴**標題列**上 **✏️ 編輯** 為 **`Link` → `/profile/edit-tags`**，緊貼標題文字**後方**（**`onClick` → `stopPropagation`**，點編輯不觸發折疊）

## DB 欄位 SSOT 確認

- **經驗值**：**`total_exp`**（SSOT），**`exp`** 欄位廢棄勿用
- **IG**：**`instagram_handle`**（SSOT），**`ig_handle`** 欄位廢棄勿用
- **自白**：**`bio_village`** = 興趣自白，**`bio_market`** = 技能自白，**`bio`** 欄位暫保留（通用自白／Modal）

### 🗄️ 資料庫異動紀錄（交接必備）

- **`users`**：**`role`**（**`text`**，預設 **`member`**；**`admin`**／**`leader`** 可審核 IG 申請）、**`bio`**（text，可 null）、**`bio_village`**／**`bio_market`**、**`invite_code`**、**`invited_by`**、**`interests`**（**`text[]`**）、**`skills_offer`**／**`skills_want`**、**`core_values`**（**`jsonb`**，註冊 Step2 三題核心價值 slug 陣列；應用層／型別見 **`database.types.ts`** **`string[]`**）、**`instagram_handle`**、**`ig_public`**、**`mood`**、**`mood_at`**、**`last_checkin_at`**（簽到 24h 冷卻 SSOT）、**`last_seen_at`**、**`activity_status`**（**`text`**，**`'active'`**／**`'resting'`**／**`'hidden'`**，預設 **`active`**）等與 **`database.types.ts`** 一致。遷移見 **`supabase/migrations/20260324120000_users_last_checkin_at.sql`**（**`core_values`** 若雲端尚未建立，請於 SQL Editor 補 **`jsonb`** 欄並 **Reload schema**）。
- **`activity_status`（營運規則）**：雲端 **`pg_cron`** 每日 **UTC 19:00**（台北次日 **03:00**）執行維護：**7** 天未簽到 → **`resting`**；**15** 天未簽到 → **`hidden`** 且 **`reputation_score - 20`**（🗄️ 實作以雲端 SQL／Job 為準）。前台：**`findVillageUsers`**／**`findMarketUsers`** 排除 **`activity_status = 'hidden'`**（探索列表不可見）；**簽到成功**後 Layer 2 **`restoreActivityOnCheckin`**（**`activity_status = 'active'`**，**`reputation_score`** **+1** 上限 **100**，語意等同 🗄️ **`LEAST(reputation_score + 1, 100)`**），由 **`claimDailyCheckin`** 成功路徑 **`catch` 僅 `console.error`** 靜默呼叫。UI：**`UserCard`** 僅 **`resting`** 顯示 **「💤 休息中」**；**`UserDetailModal`** 英雄區 **`resting`** 為 **灰階小膠囊**（**`💤 休息中`**）；**`reputation_score < 30`** 時 **master** 區與後台 **`/admin/users`** Sheet 信譽旁顯示 **「⚠️ 建議封鎖」**（Modal 信譽列為數值＋**⚠️**）。
- **酒館 `TavernModal`**（**`z-[500]`**）：訊息列別人靠左（頭像可點 **`getMemberProfileByIdAction`** → **`UserDetailModal` `z-[800]+`**，自己不開）；自己靠右紫氣泡；底部輸入區 **`border-t`**、**`pb-[max(0.75rem,env(safe-area-inset-bottom))]`**、字數 **50**、**`Send`** 圓鈕；禁言時輸入／貼圖鈕／送出 **disabled**，**placeholder**「你已被禁止在酒館發言」。**`LeaderToolsSheet`** 頂部 **`pt-[max(1.5rem,env(safe-area-inset-top))]`**；EXP 輸入 **`type="text"`** 過濾數字、送出驗證 **1–1000**。
- **`ig_change_requests`**：**`user_id`**、**`old_handle`**、**`new_handle`**、**`status`**（**`pending`**／**`approved`**／**`rejected`**）、**`reviewed_by`**、**`reviewed_at`**、**`created_at`**；已 **ENABLE RLS**（政策可後補）；遷移見 **`supabase/migrations/20260324100000_ig_change_requests_and_user_role.sql`**。
- **註冊建檔**：**`completeAdventurerProfile`** 為避免 PostgREST／欄位快取問題，**insert 不帶 `bio`**（自介於個人頁 **`profile-update`** 填寫）。
- **`invitation_codes`**：**`id`**（uuid PK）、**`code`**（text UNIQUE，8碼英數大寫）、**`created_by`**（uuid → `users`）、**`used_by`**（uuid nullable → `users`）、**`used_at`**、**`expires_at`**、**`is_revoked`**（boolean default false）、**`note`**（text nullable）、**`created_at`**。Layer 2 **`invitation.repository.ts`**（**`findAllInvitationCodes`**、**`findInvitationByCode`**、**`insertInvitationCode`**、**`insertInvitationCodes`**、**`revokeInvitationCode`**、**`claimInvitationCode`**、**`findInvitationTree`**）；Layer 3 在 **`admin.action.ts`**（**`getInvitationCodesAction`**、**`generateInvitationCodeAction`**、**`generateBatchInvitationCodesAction`**、**`revokeInvitationCodeAction`**、**`getInvitationTreeAction`**、**`validateInviteCodeAction`**、**`claimInviteCodeAfterRegisterAction`**）。
- **`announcements`**：**`id`**（uuid PK）、**`title`**（text）、**`content`**（text）、**`image_url`**（text nullable）、**`is_pinned`**（boolean default false）、**`is_active`**（boolean default true）、**`created_by`**（uuid → `users`）、**`created_at`**、**`updated_at`**。Layer 2 **`announcement.repository.ts`**（**`findAllAnnouncements`**、**`findActiveAnnouncements`**、**`insertAnnouncement`**、**`updateAnnouncement`**、**`deleteAnnouncement`**）；Layer 3 公告管理在 **`admin.action.ts`**（**`getAnnouncementsAction`**、**`createAnnouncementAction`**、**`updateAnnouncementAction`**、**`deleteAnnouncementAction`**、**`toggleAnnouncementPinAction`**、**`toggleAnnouncementActiveAction`**）；前台 **`announcement.action.ts`**（**`getActiveAnnouncementsAction`**，`unstable_cache` 60s）。
- **`advertisements`**（已存在）：廣告管理 Layer 2 在 **`admin.repository.ts`**（**`findAllAdvertisements`**、**`findActiveHomeAds`**、**`insertAdvertisement`**、**`updateAdvertisement`**、**`deleteAdvertisement`**、**`recordAdClick`**）；Layer 3 在 **`admin.action.ts`**（**`getAdvertisementsAction`**、**`createAdvertisementAction`**、**`updateAdvertisementAction`**、**`deleteAdvertisementAction`**、**`toggleAdvertisementAction`**）；前台 **`advertisement.action.ts`**（**`getHomeAdsAction`**（`unstable_cache` 300s）、**`recordAdClickAction`**）。
- DDL 變更後若仍報「找不到欄位」，至 Supabase **Settings → API** 嘗試 **重新載入 Schema**。
- **`likes`**：已接線（**`from_user`**／**`to_user`**）。**雲端表無 `id` 欄位**（僅複合語意上的雙 uuid）；**`insertLike`** 只做 **insert**、**`Promise<void>`**，**不** `.select()` 讀回列；**`findLike`**／**`checkMutualLike`** 之 **`.select`** 僅 **`from_user, to_user`**，避免讀取不存在的欄位。型別見 **`database.types.ts`** **`likes.Row`**。
- **`alliances`**：**雙人血盟 SSOT**（**`user_a`**、**`user_b`**、**`initiated_by`**、**`status`**：`pending`／`accepted`／`dissolved`、`created_at`）；建議 **`UNIQUE (user_a, user_b)`**（約束名 **`alliances_pair_unique`**，遷移 **`20260325183000_alliances_pair_unique.sql`**）。**`database.types.ts`** 與 Layer 2 **`alliance.repository.ts`**、Layer 3 **`alliance.action.ts`** 僅使用此表。
- **`user_alliances`**：**已廢棄**（曾規劃之分表，勿建）；**`supabase/migrations/20260325120000_user_alliances_pair.sql`** 檔首已標 **DEPRECATED**，**請勿在 Supabase 執行**。
- **`conversations`**／**`chat_messages`**／**`blocks`**／**`reports`**：Layer 2 **`chat.repository.ts`** 與 **`database.types.ts`** 已預留型別與函式（**`getOrCreateConversation`**、**`findConversationById`**、**`getMessages`**、**`sendMessage`**、**`getMyConversations`**、**`markMessagesAsRead`**、**`blockUser`**、**`unblockUser`**、**`isBlocked`**、**`submitReport`**）。Layer 3 **`chat.action.ts`** 經 **`auth.getUser()`** 驗證後呼叫 repository。雲端若尚無表，請補 🗄️ DDL 並 **Reload schema**。
- **`tavern_messages`**／**`tavern_bans`**：酒館廣場公開聊天與禁言。Layer 2 **`tavern.repository.ts`**（admin：**`findTavernMessages`**、**`insertTavernMessage`**、**`isTavernBanned`**、**`insertTavernBan`**／**`deleteTavernBan`**、**`findAllTavernBans`**、**`deleteTavernMessage`**）；Layer 3 **`tavern.action.ts`**（列表／發送／**master** 禁言解除／刪訊／**`getTavernBansAction`**）；**Realtime** 需將 **`tavern_messages`** 加入 **`supabase_realtime`** publication（遷移 **`20260326120000_tavern_messages_and_bans.sql`**）；RLS：**`authenticated` SELECT** 訊息表以利即時訂閱，寫入僅後端 **service role**。
- **`notifications`**：**`type`**（**非** **`kind`**）、**`from_user_id`**（**非** **`from_user`**／**`metadata.from_user`**）、**`message`**、**`is_read`**（**boolean**）、**`created_at`**。寫入 Layer 2 **`notification.repository.ts`** **`insertNotification`**；讀取見 Layer 3 **`notification.action.ts`**（**admin** 分開查 **`notifications`** 與 **`users`**，避免 PostgREST FK embed 問題）；批次已讀／刪除／未讀數依 **`is_read`**。舊雲端若仍為 **`kind`／`read_at`** 等，請套用遷移 **`20260325220000_notifications_type_from_user_message.sql`** 並 **Reload schema**。

---

## 新視窗／新架構 — 30 秒啟動

| 步驟 | 動作 |
|------|------|
| 1 | 讀 **`.cursorrules`**（五層禁則、回報格式、`total_exp` 等） |
| 2 | 讀本檔 **「目前開發階段」→「關鍵檔案索引」→「雲端 DDL」** |
| 3 | 實作時遵守：**UI 不直連 DB**；寫入經 **Layer 3 → Layer 2**；經驗值欄位僅 **`total_exp`** |
| 4 | **Phase 2 戰場**：**`/explore`**（村莊＋市集）；**`/guild`**（血盟 tab 待接線）；**下一波** **Phase 2.2**（Likes／Alliances／Modal） |

**Git**：`main` 含 Phase 1.5、**`date.ts`**、**LevelFrame**、**市集／村莊**、註冊 **`bio` insert 省略** 與 **`skills_*`** 型別對齊等。新架構若搬遷目錄，請同步更新本檔與 `.cursorrules`。

---

## 關鍵檔案索引（查程式用）

| 主題 | 路徑 |
|------|------|
| 守衛／Session | `src/middleware.ts`（**`config.matcher`** 排除 **`api`** 等）；**`deriveAuthStatus`** 僅 **`findProfileById`**（**Edge 不可用** **`unstable_cache`**）。**`getAuthStatus`**（`auth.service.ts`）另經 **`getCachedProfile`**（`get-cached-profile.ts`，**`unstable_cache` 30s**）供 RSC 換頁減查 |
| PWA／圖示 | **`public/manifest.json`**（**`theme_color`／`background_color`：`#0f0a1e`**；**`/icons/icon-192x192.png`**、**`icon-512x512.png`**、**`apple-touch-icon.png`**）；**`src/app/layout.tsx`** **`viewport.themeColor`** + **`metadata.icons.apple`** → **`theme-color`** meta、**`apple-touch-icon`** link |
| Auth UI | `src/app/(auth)/login/*`、`register/*`、`register/profile/*`；註冊五步指示器 **`src/components/auth/registration-step-indicator.tsx`**（**`1`—`5`**）；**`register-form.tsx`** 條款勾選旁 **「冒險者公會使用者條款」** 可點開 **`TermsModal`**（內文 **`src/lib/constants/terms.ts`** **`TERMS_OF_SERVICE`**） |
| OAuth callback | `src/app/auth/callback/route.ts` |
| Keep-alive（監控／喚醒） | **`GET /api/ping`** — `src/app/api/ping/route.ts` 回傳 **`{ ok: true, time }`**（**`time`** 為伺服器 **`toISOString()`**）；供 Uptime、cron 或緩解無伺服器冷啟動 |
| 補名冊（含 IG） | `src/services/adventurer-profile.action.ts`（註冊 insert **不帶 `bio`**） |
| 讀取他人 profile（Modal） | **`src/services/profile.action.ts`** — **`getMyProfileAction`**、**`getMemberProfileByIdAction`**（冒險團血盟詳情等） |
| 每日簽到 +1 EXP | `src/services/daily-checkin.action.ts`（**`claimDailyCheckin`**；冷卻 **`users.last_checkin_at`**）；成功後靜默 **`restoreActivityOnCheckin`**（**`active`** + 信譽 **+1** 上限 **100**）；**`updateLastCheckinAt`** 見 `user.repository.ts`；**`insertExpLog`（`delta`+`delta_exp`）** 見 `exp.repository.ts`；機讀錯誤 **`DAILY_CHECKIN_ALREADY_CLAIMED`**（**`already_claimed`**）見 `daily-checkin.ts`；**`taipeiCalendarDateKey()`** 仍供其他日曆日用途，**簽到判斷已不採用** |
| 編輯自介／分域自白／**`instagram_handle`**／IG 公開／心情 | `src/services/profile-update.action.ts`（**支援部分欄位 patch**；**`mood`** 時更新 **`mood_at`**；**`bio_village`**／**`bio_market`**；**`instagram_handle`** 經 **`instagramHandleSchema`**；空字串寫入 **null**） |
| IG 變更申請／審核 | `src/services/ig-request.action.ts`（**`requestIgChangeAction`**、**`reviewIgRequestAction`**、**`getPendingIgRequestsAction`**）→ **`src/lib/repositories/server/ig-request.repository.ts`**（**admin client** 寫入 **`ig_change_requests`**、核准時更新 **`users.instagram_handle`**） |
|| 管理員後台 | **src/app/(admin)/layout.tsx**（獨立 layout、sidebar；根層 **`text-gray-900`** + **`[color-scheme:light]`**）；**/admin**（儀表板 **`page.tsx`** 為 client：統計卡 **`router.push`** 至 **`/admin/users?filter=…`**／**`/admin/reports?filter=pending`** 等）、**/admin/users**（**`searchParams.filter`**：`today`／`pending`／`active`／`ig_pending`；見檔末變更紀錄）、**/admin/invitations**、**/admin/exp**、**/admin/publish**、**/admin/reports**、**/admin/roles**（master only）、**/admin/settings**（Wave 2） |
|| 邀請碼管理（Layer 2） | **src/lib/repositories/server/invitation.repository.ts**（**`findAllInvitationCodes`**、**`findInvitationByCode`**、**`insertInvitationCode`**/**`insertInvitationCodes`**、**`revokeInvitationCode`**／**`revokeUnusedInvitationCodes`**、**`claimInvitationCode`**、**`findInvitationTree`**、**`findSystemSettingByKey`**） |
|| 公告管理（Layer 2） | **src/lib/repositories/server/announcement.repository.ts**（**`findAllAnnouncements`**、**`findActiveAnnouncements`**、**`insertAnnouncement`**、**`updateAnnouncement`**、**`deleteAnnouncement`**） |
|| 前台公告（Layer 3） | **src/services/announcement.action.ts**（**`getActiveAnnouncementsAction`**，`unstable_cache` 60s） |
|| 前台廣告（Layer 3） | **src/services/advertisement.action.ts**（**`getHomeAdsAction`**（`unstable_cache` 300s）、**`recordAdClickAction`**） |
|| 管理員後台 Layer 2 | **src/lib/repositories/server/admin.repository.ts** |
|| 管理員後台 Layer 3 | **src/services/admin.action.ts** |
|| 管理員常數 | **src/lib/constants/admin-permissions.ts** |
| 個人頁 EXP 紀錄 | `src/services/exp-logs.action.ts`（**`getMyRecentExpLogsAction`**）→ **`exp.repository`** **`findRecentExpLogsForUser`** |
| 首頁個人頁 UI | `src/app/(app)/page.tsx`（**`'use client'`**、**`useMyProfile`** SWR + **`HomePageSkeleton`**、背景 **`HomeParticlesBackground`**：**`fetch('/particles.json')`**（**`public/particles.json`**），失敗則退回 **`src/config/home-particles.json`**；**`fixed inset-0 z-[1]`**、**`background.color` 透明**、內容 **`z-10`**） → `guild-profile-home.tsx`（**公告上方**：**banner 輪播**；**公告區塊**（**滿版垂直堆疊**、**`line-clamp-2`＋「⋯ 展開」**、整卡 **Dialog**）；**今日心情下方**：**card 贊助橫滑**（最多 3 則、固定卡尺寸；點擊開連結並 **`recordAdClickAction`**）） |
| 頁面切換「開門」過場 | **`src/components/layout/app-shell-motion.tsx`**：**`pathname` 變更**（**`/` 首頁不播**）→ 上／下扇 **`fixed`** 覆蓋**整個視口**（各 **`h-1/2`**、**`z-[9999]`**），**不受內容區高度／`overflow` 裁切**；**`splash`** **`backgroundSize: 100% 200%`**、**`center top`／`bottom`**（**X** 中線接縫）。**時序**：關 **100ms** → 停 **1s** → 開 **1s**。扇門 **`pointer-events-none`**；過場中外層暫 **`pointer-events-auto`** 阻擋誤觸；**idle** 時上下扇分別 **`-translate-y-full`／`translate-y-full`** 完全離開可視區。內容區 **`min-h-[100dvh]`**、**`pt-[calc(2rem+env(safe-area-inset-top,0px))]`** 預留頂部 **`TavernMarquee`**；**無 `overflow-hidden`**；**pb** 預留底欄＋底部 **`bg-zinc-950`** 條避免切頁藍線。**`GuildTabProvider`**／**`Navbar`**（**`z-40`**）／**`TavernFab`** 掛在 **`src/app/(app)/layout.tsx`**，與 **`AppShellMotion`** 同層，**不受開門動畫裁切**；過場層在上，播完 idle 後不擋導航。 |
| 酒館廣場（全頁） | **`TavernMarquee`**（**`src/components/tavern/TavernMarquee.tsx`**）：頂欄跑馬燈最新 5 則、**`useTavern`**；**`TavernFab`**＋**`TavernModal`**（**`src/components/tavern/TavernFab.tsx`**／**`TavernModal.tsx`**）全螢幕聊天、貼圖、**master** 長按訊息刪除；**`globals.css`** **`.animate-marquee`**。 |
| 酒館 Layer 2／3 | **`src/lib/repositories/server/tavern.repository.ts`**、**`src/services/tavern.action.ts`**（**`getTavernMessagesAction`**、**`sendTavernMessageAction`**、**`getMyTavernBanStatusAction`**、**`banTavernUserAction`**／**`unbanTavernUserAction`**、**`deleteTavernMessageAction`**、**`getTavernBansAction`**）。 |
| 後台酒館禁言 | **`/admin/users`** **`users-client.tsx`**（僅 **viewerIsMaster**）：**`AlertDialog`** → **`banTavernUserAction`**／**`unbanTavernUserAction`**；**`getUserDetailAction`** 回傳含 **`tavern_banned`**。 |
| SWR：聊天／未讀通知 | **`src/hooks/useChat.ts`** — **`useConversations`**、**`useMessages`**、**`useUnreadNotificationCount`**、**`useUnreadChatConversationsCount`**／**`useUnreadChatCount`**（別名；**`SWR_KEYS.unreadChatConversations`**；Layer 3 **`getUnreadChatConversationsCountAction`**） |
| 頭像裁切＋Cloudinary | **`react-easy-crop`** 全螢幕裁切；**`src/lib/utils/cropImage.ts`**（**`getCroppedImg`**）；**`src/lib/utils/cloudinary.ts`**（**`uploadAvatarToCloudinary`**）→ **`updateMyProfile({ avatar_url })`**（**禁止** **`supabase.storage`** 上傳頭像）；**顯示** **`src/components/ui/Avatar.tsx`**（**`next/image`** + Cloudinary **`/upload/w_{2×size},h_{2×size},c_fill,q_auto,f_auto/`**；**`next.config.mjs`** **`images.remotePatterns`**：**`res.cloudinary.com`**） |
| 底部導航 | **`src/components/layout/Navbar.tsx`**（**五項 lucide**；**冒險團**圖示：**有未讀信件或私訊時** **紅點**＋**玫瑰發光**；在 **`/guild` 且子 tab 為「聊天」** 時不計入私訊未讀以免重複提示，**信件未讀仍顯示**） |
| 探索（村莊＋市集） | **`explore/page.tsx`**（**Server**：**`getVillageUsersAction`** 預載村莊）；**`ExploreClient.tsx`**（**`useSWR`** **`SWR_KEYS.villageUsers`** ＋ **`fallbackData`／`revalidateOnMount: false`**；市集 **`SWR_KEYS.marketUsers(query)`**、**`keepPreviousData`**；**`hidden`／`block`** 切 tab）；市集初次 **`isLoading`** 時 **6×`UserCardSkeleton`** |
| 列表骨架屏 | **`src/components/ui/UserCardSkeleton.tsx`**（**`animate-pulse`**） |
| 冒險團 | **`guild/page.tsx`**：**血盟**夥伴列（**`alliance.repository`** 併 **`role`**）→ **`getMemberProfileByIdAction`** → **`UserDetailModal`**；**聊天** 列表暱稱 **`getRoleDisplay`**；**聊聊** 再開 **`ChatModal`**；**你：／對方：** 預覽、**未讀紅點**；頂部 **聊天／信件** tab **紅點**；**`GuildTabProvider`**（**`guild-tab-context.tsx`**）掛於 **`(app)/layout.tsx`**，同步子 tab 供 **`Navbar`**；**信件** — 點卡片開 **`Dialog`** 詳情、可開 **`UserDetailModal`**；**`notifications`** **`type`／`message`／`is_read`／`from_user_id`** |
| 雙人血盟（Layer 3） | **`src/services/alliance.action.ts`**（**`getAllianceStatusAction`**、**`requestAllianceAction`**、**`respondAllianceAction`**、**`dissolveAllianceAction`**、**`getMyAlliancesAction`**、**`getPendingRequestsAction`**） |
| 雙人血盟（Layer 2） | **`src/lib/repositories/server/alliance.repository.ts`** |
| 私訊／封鎖／檢舉（Layer 2） | **`src/lib/repositories/server/chat.repository.ts`**（**`conversations`**、**`chat_messages`**、**`blocks`**、**`reports`**；見 🗄️ 與 **`database.types.ts`**） |
| 私訊／封鎖／檢舉（Layer 3） | **`chat.action.ts`** — 上列＋**`getUnreadChatConversationsCountAction`**、**`ConversationListItemDto`**（**`hasUnreadFromPartner`**）；**新訊息不再 `insertNotification`**（僅導航／聊天列表提示） |
| 通知（Layer 3） | **`src/services/notification.action.ts`** — **`getMyNotificationsAction`**（**≤50** 筆、發送者 **`in` 批量查**；**無** **`unstable_cache`**）、**`insertMailboxNotificationAction`／`notifyUserMailboxSilent`**、**`markNotificationReadAction`**、**`markAllNotificationsReadAction`**、**`clearAllNotificationsAction`**、**`getUnreadNotificationCountAction`** |
| 月老／商店預留 | `src/app/(app)/matchmaking/page.tsx`、`src/app/(app)/shop/page.tsx`（**即將開放**） |
| 舊路由轉址 | **`/village`**、**`/market`** → **`/explore`**；**`/alliances`**、**`/inbox`** → **`/guild`** |
| 使用者詳情 Modal | **`UserDetailModal.tsx`**：**永遠顯示完整自白／興趣／技能**（可捲動區）；**IG** 僅在 **`instagram_handle` 有值** 且（**`ig_public === true`** 或 **血盟 `accepted`**）時顯示；**「開啟」** 外連（**`instagram.ts`** strip **`@`**）；頂部 **今日心情**（**`mood` + `mood_at` 24h 內**）、**`activity_status`** 角標；關閉 **`ChatModal`** 時 **`mutate`** **`conversations`／`unreadChatConversations`**；**master** 信譽條（**<30** **⚠️**）＋**`LeaderToolsSheet`**；自訂關閉鈕（**`showCloseButton={false}`**）；層級 **`z-[800]`／`z-[810]`**；從 **`ChatModal`** 點對方訊息頭像可再開詳情（**`dynamic` 載入**避免與 **`ChatModal`** 循環依賴） |
| 領袖快捷面板 | **`src/components/modals/LeaderToolsSheet.tsx`**（僅 **master** 可見；從 **`UserDetailModal`** 觸發；右側滑出 **`w-80` `z-[830]`／`z-[840]`**） |
| 私訊全螢幕 UI | **`ChatModal.tsx`**（**`z-[700]`**）：對方訊息頭像 **`cursor-pointer`**，**`getMemberProfileByIdAction(sender_id)`** 載入後開 **`UserDetailModal`（`z-[800]+`）**；載入中該頭像 **`opacity-60`** 並防連點；己方頭像不點擊；送出／開啟讀取後／**Realtime INSERT** 皆 **`mutate(SWR_KEYS.conversations)`**＋**`unreadChatConversations`** |
| 有緣分＋互讚／Modal 合併載入 | **`src/services/social.action.ts`**（**`getModalSocialStatusAction`**：一次 **`auth.getUser()`** + **`Promise.all`**：**`findLike`** 雙向 + **`findAllianceBetween`**；仍含 **`getLikeStatusForTargetAction`**／**`checkMutualLikeWithTargetAction`**／**`toggleLikeAction`**） |
| 技能市集（邏輯） | `src/services/market.service.ts`（**`getMarketUsersAction`**：Perfect Match → 互補 → 同好 → **等級**；**`getCachedMySkills`** **`unstable_cache` 60s** **`tags: profileCacheTag`**、**`unstable_cache` 60s** 快取 **`findMarketUsers`**、**搜尋篩選在列表快取回傳後**）；UI **命定師徒** 文案見 **`MarketContent`** |
| 配對工具 | **`src/lib/utils/matching.ts`**（**`isOrientationMatch`**、**`calcInterestScore`**、**`calcSkillScore`**）；**角色顯示** **`src/lib/utils/role-display.ts`**（**`getRoleDisplay`**：👑／🛡️） |
| Users Repository | `src/lib/repositories/server/user.repository.ts`（**`findActiveUsers`**、**`findVillageUsers`**、**`findMarketUsers`**（排除 **`hidden`**）、**`updateLastCheckinAt`**、**`restoreActivityOnCheckin`**） |
| EXP 寫入 | `src/lib/repositories/server/exp.repository.ts` |
| 等級 SSOT | `src/lib/constants/levels.ts` |
| 問卷選項 | `src/lib/constants/adventurer-questionnaire.ts` |
| 註冊條款內文 | **`src/lib/constants/terms.ts`**（**`TERMS_OF_SERVICE`**）；**`src/components/auth/TermsModal.tsx`** |
| 興趣／技能標籤選項（分類＋內建標籤） | SSOT **`src/lib/constants/tags.ts`**（**`ALL_INTEREST_TAGS`／`ALL_SKILL_TAGS`**）；**`interests.ts`／`skills.ts`** 僅 re-export |
| 註冊標籤 Step4／Step5 | **`src/components/register/TagSelector.tsx`**；**`/register/interests`**（興趣必選，**`sessionStorage.reg_interests`**）完成後 **`router.push('/register/skills')`**；**`/register/skills`** 為完整頁面：**我能教**（上）／**我想學**（下）、**`completeRegistration`** 一次寫入，**可跳過**（技能空陣列）；**歡迎 Modal** 僅於 Step5；舊路徑 **`skills-offer`／`skills-want`** 仍 **`redirect('/register/interests')`**（建議先補興趣） |
| 登入後編輯標籤 | **`/profile/edit-tags`**（**`edit-tags-client.tsx`**）；與註冊共用 **`register/TagSelector.tsx`** + **`tags.ts`**；三 **`TagSelector`** 皆 **`defaultOpenCategory={null}`**（預設收折）；三 Tab（興趣／能教／想學），**`updateMyProfile`** 分開儲存 |
| Zod／不雅字／IG 格式 | `src/lib/validation/*.ts`、`src/lib/utils/forbidden-words.ts` |
| DB 型別 | `src/types/database.types.ts`（含 **`ig_change_requests`**、**`users.role`**、**`skills_offer`**／**`skills_want`**、**`conversations`**／**`chat_messages`**／**`blocks`**／**`reports`**、**`tavern_messages`**／**`tavern_bans`**、**`TavernMessageDto`** 等） |
| SWR Keys | **`src/lib/swr/keys.ts`** — 含 **`SWR_KEYS.tavernMessages`** |
| 市集命定師徒高光 | `src/app/globals.css`（**`.perfect-match-market-shell`**，Perfect Match 外環；文案 **命定師徒**） |
| 防重複點擊按鈕 | **`src/components/ui/LoadingButton.tsx`**（**`PendingLabel`** spinner）；註冊／首頁個人卡／**`UserDetailModal`** 等重要操作採用；**Sonner** 成功／失敗文案見下「Toast 統一規範」 |

---

# 目前開發階段

**Phase 1：地基建設**（✅ **已完成**）

| 狀態 | 說明 |
|------|------|
| ✅ 已完成 | 專案骨架、五層目錄、Layer 1 連線、Schema 型別與常數、**守衛（`src/middleware.ts`）**、SSOT 等級門檻、`exp_logs` 防重複領獎（Layer 2） |
| ✅ 已完成 | **Auth 全流程**：`/login`、`/register`、`/register/profile`、首頁 `/(app)/`；Email／密碼經 Supabase Auth；補齊 profile 經 **`completeAdventurerProfile`**（admin `createProfile`）；**Vercel 部署可成功登入並進入公會** |

**Phase 1.5：體驗與營運細節**（✅ **已完成**）

| 狀態 | 說明 |
|------|------|
| ✅ 已完成 | **OAuth IG 補填**：Google 等略過註冊 Step1 時，`user_metadata` 可能無 `instagram_handle`；`/register/profile` 由伺服端判斷 **`needsProfileInstagram`**，動態顯示必填 IG 欄位；**`completeAdventurerProfile`** 接受 **`instagramHandleFromForm`**，metadata 有值時優先採 metadata，否則驗證表單並寫入 **`users.instagram_handle`**。 |
| ✅ 已完成 | **每日簽到**：**24h 滾動冷卻**以 **`users.last_checkin_at`** 為 SSOT；**`exp_logs.unique_key`** 為 **`daily_checkin:{userId}:{timestamp}`**。**`taipeiCalendarDateKey()`** 仍保留供其他日曆邏輯，**不再**作為簽到可否之依據。 |

**Phase 2：社交核心**（🚧 **進行中** — **2.1 村莊＋市集已接線**；**2.2 互動／血盟為下一波**）

| 狀態 | 說明 |
|------|------|
| ✅ 已接線 | Layer 2 **`findActiveUsers`**（通用活躍列表）；**`findVillageUsers`**（同縣市 **`active`**）；**`findMarketUsers`**（全台 **`active`**，精簡欄位） |
| ✅ 已接線 | Layer 3 **`getVillageUsersAction`**：**`matching.isOrientationMatch`** 雙向篩選 → **`calcInterestScore`** 排序；**`unstable_cache` 30s**（**`village-{userId}-{region}`**） |
| ✅ 已接線 | Layer 3 **`getMarketUsersAction`**：**`calcSkillScore`**（互補優先、同好次之）＋檔內 **Perfect Match**（**`skills_want`／`skills_offer`**）優先浮上；**`findMarketUsers`** **60s** 快取；**`getCachedMySkills`**（**60s**、**`profileCacheTag`** 與 profile 一併失效）；**關鍵字篩選在列表快取回傳後** |
| ✅ 已接線 | Layer 5 **`/explore`**：**Server** 預載村莊 → **`ExploreClient`**；頂部 **Switch** 村莊／市集（**市集 `useSWR`**＋**`hidden` 切 tab**）；**`UserCard`** 分 **`variant`**（村莊興趣 **3+N**、市集能教／想學各 **2+N**）；**`UserDetailModal`** **永遠**完整自白／興趣／技能 |
| ✅ 交接確認 | **`users`** 須 **`interests` 為 `text[]`**，並建議具 **`bio`**、**`skills_offer`**、**`skills_want`**（見 🗄️）；DDL 後必要時 **重載 API Schema** |

**Phase 3**：待產品規劃後於此文件更新。

---

# Phase 1 收尾紀錄（雲端對齊與除錯）

### `public.users` 與程式約定（務必與 Supabase 一致）

- **暱稱**：`nickname`（**非** `display_name`）。
- **問卷欄位**（與「自介」分開）：`gender`、`region`、`orientation`、`offline_ok`（boolean）；**自介**為獨立欄位 **`users.bio`**（text，可 null）。**`gender`／性向／線下意願**為英文 slug + 繁中 label；**`region`** 新制為**繁中縣市或 `海外・{自填}`** 直接寫入 DB（舊資料可能仍為區域 slug）。定義於 **`src/lib/constants/adventurer-questionnaire.ts`**。
- **Phase 1.5 擴充欄位**：**`instagram_handle`**、**`ig_public`**、**`mood`**、**`mood_at`**（見下方 🗄️）。
- **性向（`orientation`）隱私與用途（產品規則）**：
  - **私密欄位**：**絕對禁止**在 **`UserDetailModal`**、**`UserCard`**（村莊／市集列表卡）顯示性向；**僅**在 **`guild-profile-home.tsx`**（本人首頁）顯示給自己看。
  - **配對**：後台可依 **`orientation`** 自動篩選配對邏輯；**前端不呈現**任何依性向的篩選條件或外露說明。
  - **DB 語意**：**`users.orientation`** 為**配對用途、非展示欄位**（展示面僅本人首頁例外）。
- **累積經驗值**：欄位名必為 **`total_exp`**（**勿**使用不存在的 `exp` 欄位名；Trigger／函式亦須對齊 `total_exp`）。
- **等級**：`level`；新建 profile 時 insert 帶入 `total_exp: 0`、`level: 1` 初值（真實數值仍由雲端 Trigger／規則為準）。
- **狀態**：`status`（`active`／`banned`），Middleware 會處理放逐流程。
- **Phase 2 社交**：**`last_seen_at`**；**`interests`**（**`text[]`**，村莊排序用）；**`skills_offer`**／**`skills_want`**（市集 Perfect Match **僅**依此兩欄，**不**退回興趣）。型別見 **`src/types/database.types.ts`**。

### 登入與補資料流程（簡述）

1. 未登入造訪受保護路由 → Middleware → `/login`（可帶 `next=`）。
2. `/register` 註冊後（視專案是否開信箱驗證）→ 導向 `/register/profile` 補 **nickname + 問卷**（OAuth 若無 IG metadata，同頁 **動態補填 IG**）。
3. `completeAdventurerProfile` 以 **admin client** 寫入 `users`（**不帶 `bio`**；**`instagram_handle`** metadata 優先）；通用 **`bio`** 首頁未提供表單，仍可由 **`updateMyProfile({ bio })`** 等管道寫入。失敗時 **`console.error("❌ 伺服器寫入失敗詳細原因:", error)`**。
4. Profile 就緒後 → **`/register/interests`**（**Step4** 指示器：興趣＋選填技能同頁；完成後**全螢幕 Modal** 選 **進入公會** **`/`** 或 **月老配對** **`/register/matchmaking`**）；**`completeRegistration`** 寫入 **`interests`／`skills_offer`／`skills_want`**（未勾技能市集則兩技能陣列為空）（精簡頭像卡＋等級進度；**今日心情**為獨立頂層卡片；**我的狀態**內自白／信譽與紀錄／興趣與技能標籤為**手風琴**預設收折；**「帳號設定」** **Dialog** 僅 **IG 帳號**＋**`ig_public`**；簽到、登出；頁面容器 **`pb-32` + `safe-area-inset-bottom`** 防 Navbar 遮擋）。

### Admin／環境

- **`src/lib/supabase/admin.ts`** 使用 **`process.env.SUPABASE_SERVICE_ROLE_KEY`**（與 Vercel 後台變數名稱須**完全一致**、區分大小寫）。

---

# 五層架構進度（總表）

| 層級 | 路徑／約定 | 目前進度 |
|------|------------|----------|
| **Layer 1** 連線 | `src/lib/supabase/` | ✅ `client.ts`、`server.ts`、`admin.ts`；`Database` 型別已注入 client |
| **Layer 2** 資料 | `src/lib/repositories/server/` | ✅ `user.repository.ts`（`findProfileById`、`createProfile`、**`findActiveUsers`**、**`findVillageUsers`**、**`findMarketUsers`**、**`updateLastCheckinAt`**）、`exp.repository.ts`（admin）；`client/` 尚空 |
| **Layer 3** 業務 | `src/services/` | ✅ **`village.service.ts`**、**`market.service.ts`**（快取如前）；✅ **`profile.action.ts`**（**`getMyProfileAction`**） |
| **Layer 4** 狀態 | `src/hooks/`、`src/lib/swr/`、`src/store/`、`src/lib/constants/`、`src/lib/validation/`、`src/lib/utils/` | ✅ **`useMyProfile`**（**SWR** **`profile`** key）；✅ **`useChat.ts`**：**`useConversations`**、**`useMessages`**、**`useUnreadNotificationCount`**；✅ **`SWR_KEYS`**（含 **`conversations`**／**`messages`**／**`unreadNotifications`**／**`notifications`**）、**`SWRProvider`**；⏳ **Zustand** 尚未實作；✅ **常數、Zod schema、forbidden-words**；✅ **`date.ts`**（台灣日界 SSOT）；✅ **`matching.ts`**（性向／興趣／技能分數） |
| **Layer 5** UI | `src/components/*`、`src/app/*` | ✅ shadcn；**`Navbar`**（五欄底欄）、**`AppShellMotion`**（**`pathname`** 上下對開 **`splash`**、**`100% 200%`** 半圖）、**`/explore`**（**`ExploreClient`**）、**`/guild`**、**`/matchmaking`**、**`/shop`**、**`UserCard`**、**`LevelFrame`**、個人頁與認證殼 |

**規則重申**：UI 不得直連 Supabase／SQL；僅 Layer 1 建立 client；寫入 `exp_logs` 等應經 Layer 2 → Layer 3。

---

# 已完成模組（細項）

- [x] `.cursorrules`、`HANDOFF.md`、`.env.example`
- [x] Next.js 14（App Router、TS、Tailwind v3、ESLint、`src/`）
- [x] 套件：Supabase、`zustand`、`zod`、`lucide-react`、shadcn（button、input、dialog、sonner、**select**、**tabs**、**textarea**、**accordion**、**alert-dialog**、**switch**）
- [x] **PWA（standalone）**：**`public/manifest.json`**（**`display": "standalone"`**、`start_url` **`/`**、**`theme_color`／`background_color`：`#0f0a1e`**；**icons**：**`/icons/icon-192x192.png`**、**`icon-512x512.png`**、**`apple-touch-icon.png`**）；**`src/app/layout.tsx`**：**`metadata.manifest`**、**`metadata.icons.apple`**、**`viewport.themeColor: "#0f0a1e"`**、**`appleWebApp`**、**`viewportFit: cover`** 等；**`middleware`** 放行 **`/manifest.json`**。
- [x] **Auth UI（單一面板）**：**`GuildAuthShell`** 將標題與表單收進**同一 `.glass-panel`**；登入／註冊表單 **Label／Input／Button** 統一 **高對比 `text-zinc-100`**，動線集中、減少上下留白分離。
- [x] **個人頁 V1 風格**：**`guild-profile-home.tsx`** 為 **今日心情獨立卡**、**我的狀態手風琴** + **帳號設定 Dialog**（IG 帳號／公開開關）；首頁 **textarea** **`text-base`** + **`scrollIntoView` 聚焦** 減輕 iOS 鍵盤跳動；根 **`viewport.maximumScale: 1`**；首頁容器 **`pb-[max(8rem,calc(8rem+env(safe-area-inset-bottom,0px)))]`**。
- [x] `src/types/database.types.ts`（`users`：問卷 + **`bio`**、**`core_values`**、**`skills_offer`**、**`skills_want`**、**`instagram_handle`**、**`ig_public`**、**`mood`**、**`mood_at`**、**`total_exp`**、**`level`**、**`status`**、**`last_seen_at`**、**`interests`**；**`likes`**、**`alliances`**、`exp_logs` 等）
- [x] `src/lib/constants/levels.ts`（稱號與 EXP 門檻 — 見下方 **SSOT**）
- [x] `src/lib/constants/adventurer-questionnaire.ts`（問卷英文 value／繁中 label）
- [x] Step 3 Schema（雲端）：Trigger 維護 **`users.total_exp`**、**`users.level`**；**`exp_logs.unique_key` UNIQUE**（見下方 **Unique Key**）
- [x] Middleware：`src/middleware.ts`（Next.js 使用 `src/` 時之約定路徑；排除 `/_next`、`/static`、`/api/*`、靜態副檔名；Session → 無則 `/login`；有 Session 無 profile → `/register/profile`；`banned` → SignOut + `/login?error=banned`）
- [x] `exp.repository.ts`：`insertExpLog` 將 Postgres **`23505`** 轉為 **`DuplicateExpRewardError`**（「你已經領取過這份獎勵了喵！」）
- [x] `vercel.json`：標示 `nextjs`（路由由 App Router + Middleware 處理，無需額外 rewrites）
- [x] 環境：`SUPABASE_SERVICE_ROLE_KEY` 為 Middleware／admin repository **必要**

### 五層目錄對照（`src/`）

| 路徑 | 層級 |
|------|------|
| `lib/supabase/` | Layer 1 |
| `lib/repositories/client/`、`lib/repositories/server/` | Layer 2 |
| `services/` | Layer 3 |
| `lib/hooks/`、`store/` | Layer 4 |
| `components/ui/`、`components/auth/`、`cards/`、`modals/`、`layout/`、`shared/` | Layer 5 |

---

# SSOT：等級與門檻對齊（Single Source of Truth）

**約定**：玩家「真實等級」以 **資料庫** 為準 — `users.level`（與 **`total_exp`**）由雲端 **Trigger／函式**依門檻計算。

- **`src/lib/constants/levels.ts`**：`LEVEL_MIN_EXP_BY_LEVEL`／`LEVEL_TIERS`、`getLevelTierByExp`、`getLevelNumberFromExp` 僅供 **UI 文案、預覽、教學**；門檻須與 🗄️ **`calculate_level`** 對齊：**Lv1:0, Lv2:10, Lv3:40, Lv4:80, Lv5:150, Lv6:250, Lv7:400, Lv8:600, Lv9:900, Lv10:1350**。
- **變更流程**：調整門檻時 **同一個小塊拼圖** 內同步（1）🗄️ Trigger／SQL 常數（2）`levels.ts`（3）必要時更新本段說明。
- **長期選項**：可改由後端回傳「當前階顯示用 DTO」單一來源，仍須與 DB 規則一致。

---

# Unique Key：防重複領獎與報錯處理

**機制**：`exp_logs.unique_key` 欄位在 DB 為 **UNIQUE**。**每日簽到**之 **`unique_key`** 為 **`daily_checkin:{userId}:{timestamp}`**（每次簽到一鍵，靠 **`users.last_checkin_at`** 的 **24h** 規則避免濫刷；舊曆日式 **`daily_checkin:{YYYY-MM-DD}:{userId}`** 可能仍存在於歷史列）。其他需「一日一鍵」之獎勵仍應以 **`taipeiCalendarDateKey()`** 拼鍵，**勿**用 UTC `toISOString().slice(0,10)` 當台灣日界。

**應用層約定**（實作 EXP 領獎／任務時遵守）：

1. **Layer 2**：`insertExpLog` 已將 **`23505`** 轉成 **`DuplicateExpRewardError`**（預設訊息：**「你已經領取過這份獎勵了喵！」**）；其餘錯誤原樣拋出。
2. **Layer 3**：可再攔截 `DuplicateExpRewardError` 做冪等成功／toast；若自行呼叫 repository，亦可補攔 **`23505`**。
3. **Layer 5**：只顯示友善文案（toast／dialog），**不**把原始 SQL 或內部 key 暴露給使用者。
4. 非簽到、需 **台灣日曆日** 之 `unique_key` 規則仍使用 **`src/lib/utils/date.ts` 之 `taipeiCalendarDateKey()`**；簽到專用鍵格式見上段。

---

# 進行中任務

- **Phase 2.2（優先）**：**雙人血盟**（**`public.alliances`**）與 **Modal／冒險團** UI 已接線；續：**RLS 政策**、**`messages`**／私訊、雲端 **alliances** 欄位與測試。
- **打磨（可並行）**：**`/explore`** 內村莊／市集篩選、編輯 **技能供需** 表單（Layer 5 → Layer 3 → Layer 2）、登入心跳更新 **`last_seen_at`**。

# 下一步（Phase 2 建議方向）

- **雲端**：確認 **`public.users`** 欄位型別（**`interests` = `text[]`**）；**`skills_*`** 建 **`default '{}'`**；DDL 後 **API Schema 重載**。
- **產品**：Likes／Alliances 流程與 Modal 互動；Schema 變更時同步 **`database.types.ts`**。

---

## 🗄️ Phase 2 欄位補齊（`public.users`）

若 Supabase 尚無下列欄位，可於 SQL Editor 執行（**與 `database.types.ts` 對齊後再跑**）：

🗄️
```sql
alter table public.users
  add column if not exists last_seen_at timestamptz null;

alter table public.users
  add column if not exists interests text[] not null default '{}';

alter table public.users
  add column if not exists bio text null;

alter table public.users
  add column if not exists skills_offer text[] not null default '{}';

alter table public.users
  add column if not exists skills_want text[] not null default '{}';
```

- **`interests`** 若改為 **jsonb** 陣列，請同步調整 **`database.types.ts`** 與讀寫邏輯。
- 既有使用者：`last_seen_at` 為 null 時，村莊查詢會將其排在**較後**（`nullsFirst: false`）。

### 🗄️ Phase 1.5 欄位補齊（`public.users`，與個人頁／註冊一致）

若尚無下列欄位，於 SQL Editor 執行（**先對齊 `database.types.ts` 再跑**）：

🗄️
```sql
alter table public.users
  add column if not exists instagram_handle text null;

alter table public.users
  add column if not exists ig_public boolean not null default false;

alter table public.users
  add column if not exists mood text null;

alter table public.users
  add column if not exists mood_at timestamptz null;
```

### 🗄️ 首頁個人卡：分域自白與邀請欄位（`public.users`）

若尚無下列欄位，於 SQL Editor 執行（或套用 **`supabase/migrations/20260323140000_users_bio_split_invite.sql`**）：

🗄️
```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio_village text,
  ADD COLUMN IF NOT EXISTS bio_market text,
  ADD COLUMN IF NOT EXISTS invite_code text,
  ADD COLUMN IF NOT EXISTS invited_by uuid;

NOTIFY pgrst, 'reload schema';
```

# 待解決問題 (Known Issues)

- `database.types.ts` 手動維護；雲端 Schema 變更後請同步型別
- 若雲端 Trigger／函式仍引用舊欄名（例如 `exp` 而非 **`total_exp`**），需在 🗄️ 修正
- 部署環境須具備 **`SUPABASE_SERVICE_ROLE_KEY`**（Middleware／admin）
- 新增欄位後若 PostgREST 仍報「找不到欄位」：Dashboard **API → Reload schema**；並確認欄位建在 **`public.users`**

# 環境變數檢查清單

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`（僅伺服端／Edge／CI，勿進前端 bundle）
- [ ] `NEXT_PUBLIC_APP_URL`（PWA／OAuth redirect 等）

---

### 2025-03-23 — 任務 4：頂級深色 UI 與簽到／有緣分修復

- **Layer 5**：**`dialog.tsx`** 預設 **`bg-zinc-950`**、**`border-zinc-800`**、**`shadow-2xl`**、**`max-h-[85vh] overflow-y-auto`**；遮罩加深為 **`bg-black/70`**。**`globals.css`** 之 **`.glass-panel`** 改為 **`bg-zinc-950/80 backdrop-blur-xl rounded-3xl shadow-2xl`**。認證殼 **`(auth)/layout`**、**`GuildAuthShell`**、**`login-form`／`register-form`**（**`auth-styles.ts`** 共用 Input／主按鈕／Google 次按鈕樣式）與首頁 **`/(app)/page.tsx`** 置中留白。**`guild-profile-home`**：放大頭像、等級徽章、操作改為圖示橫向列表；簽到重複改 **success toast**。**`UserDetailModal`**：載入有緣分狀態、按鈕實心愛心與 Sonner 回饋。
- **Layer 2／3**：**`exp.repository`** 匯出 **`isUniqueConstraintError`** 供簽到攔截。重複簽到字串常數見 **`src/lib/constants/daily-checkin.ts`**（**`DAILY_CHECKIN_ALREADY_TODAY`**），**`daily-checkin.action`** 僅匯出 async；仍使用 **`taipeiCalendarDateKey()`**。**`like.repository`**：**`mapLikeRepositoryError`**；雲端 **`likes`** 欄位見下方 **任務 5**。**`social.action`**：**`getLikeStatusForTargetAction`**、**`toggleLikeAction`** 回傳 **`liked`** 並以友善訊息包裝 DB 錯誤。

### 2025-03-23 — 任務 5：`likes` 欄位對齊（42703）與註冊問卷深色統一

- **Layer 2／型別**：Supabase **`public.likes`** 實際欄名為 **`from_user`**、**`to_user`**（非 `from_user_id`）。已同步 **`database.types.ts`** 與 **`like.repository.ts`** 之 insert／eq／delete／互查邏輯，修正 PostgREST **42703**（未定義欄位）導致的有緣分 500。
- **Layer 3**：**`social.action.ts`** 僅透過 repository，無需解構列欄位；無程式變更需求。
- **Layer 5**：**`register/profile/profile-form.tsx`** 廢除 **`CYAN_FOCUS`**，改採 **`auth-styles.ts`**（**`guildAuthInputClass`**、**`guildAuthSelectTriggerClass`**、**`guildAuthSelectContentClass`**、**`guildAuthPrimaryButtonClass`** 等）；步驟指示、核心價值與興趣區塊使用 **`.glass-panel`**／紫色 focus，與登入／註冊 Step1 視覺一致。

### 2025-03-23 — 任務 6：膠囊認證 UI、個人頁獨立儲存與 Modal 精緻化

- **Layer 5**：**`auth-styles.ts`** 膠囊輸入（**`rounded-full`**、**`bg-zinc-900/50`**、**`placeholder:text-zinc-600`**）；**`guildAuthInputClass`**（左圖示＋**`pl-11`**）、**`guildAuthInputStandaloneClass`**（無圖示時 **Step2** 暱稱／IG）；Google 按鈕 **淺色膠囊**＋彩色 **SVG**。**`login-form`／`register-form`**（路徑：**`src/app/(auth)/…`**）內嵌 **Lucide** 圖示。**`guild-profile-home`**：編輯 Modal 順序為 **今日心情 → 自白 → IG（`Switch`）**；廢除底部整批儲存；各欄 **「確認修改」** 觸發 **`<AlertDialog>`** 後呼叫 **`updateMyProfile`**；成功 **Sonner**、**不關閉** Modal。**Accordion** 內容外層 **高亮底框**。**`UserDetailModal`**：頭像 **正圓**、標籤／技能區 **gap-3 + p-4**、底部 **膠囊按鈕**與愛心 **縮放回饋**。
- **Layer 3**：**`profile-update.action.ts`** 之 **`updateMyProfile`** 改為**可選欄位** partial update，並先 **`findProfileById`** 驗證；避免只改自介卻重設 **`mood_at`**。

### 2025-03-23 — 任務 7：登入極簡膠囊、安全區與名片按鈕對齊

- **Layer 5**：**`src/app/(auth)/login/login-form.tsx`** 為登入表單實作；**`src/components/auth/login-form.tsx`** 為同名 **re-export** 方便索引。移除 Email／密碼外顯 **Label**，改 **Placeholder**＋**`aria-label`**；密碼欄 **`Eye`／`EyeOff`**（**`right-4`**）切換顯示，**`pr-12`** 保留膠囊 **`rounded-full`**。**`/(app)/page.tsx`** 頂部 **`pt-[max(3rem,env(safe-area-inset-top,0px))]`**（至少 **pt-12**，適配瀏海／動態島）。**`guild-profile-home`** 編輯 Modal 底部「關閉」**`max-w-[80%]`** 置中（**IG 已為 `Switch`**）。**`UserDetailModal`**：內文與底部按鈕共用 **`max-w-[min(100%,22rem)]`**（**`sm:max-w-full`** 與內容等寬延展）；緣分按鈕文案 **「💖 送出緣分」**／已送出 **「已送出緣分」**。

### 2025-03-23 — 任務 11：IG 即時儲存、頭像上傳、簽到與列表體驗

- **Layer 5 — `guild-profile-home.tsx`（歷史）**：**IG** 即時寫入等見後續任務。**頭像**：已改為 **全螢幕黑底裁切 Modal**（**`react-easy-crop`**，**`aspect={1}`**、**`cropShape="round"`**、**`showGrid={false}`**，頂／底 **glass-panel**）；選圖後先裁切，**`getCroppedImg`**（**`cropImage.ts`**）輸出 **Blob** → **`File`** → **`uploadAvatarToCloudinary`** → **`updateMyProfile({ avatar_url })`**。**已移除** Supabase Storage **`avatars` bucket** 上傳路徑（**無** **`supabase.storage.from()`**）。
- **Layer 5 — 極簡導覽**：探索／市集頁移除左上角 **「返回公會大廳」**（現統一於 **`/explore`**）。**`UserCard`** 移除 **`HoverCard`**，整卡 **`role="button"`** 點擊開 **UserDetailModal**。
- **Layer 5 — `UserDetailModal`**：左 **💬 聊聊**、右 **🤍 送出緣分**／**💖 已送出緣分**（emoji＋文字，無額外 Lucide 愛心）；已送出再點先 **AlertDialog**「你確定要結束這段緣分嗎？」。
- **Layer 3 — `daily-checkin.action.ts`**：catch 時 **`console.error`** 印出完整錯誤與 **`JSON.stringify`**（含 **keys**）。
- **Layer 2 — `exp.repository.ts`**：**`insertExpLog`** 僅接受 **`{ user_id, unique_key, source }`**（**`ExpLogInsertPayload`**），**不傳 `delta_exp`**，交給 DB **DEFAULT**；錯誤時 **`logSupabaseError`**。**`database.types.ts`** 之 **`exp_logs.Insert.delta_exp`** 改為**可選**。
- **Layer 3 — `profile-update.action.ts`**：支援 **`avatar_url`**；失敗時加強 **`console.error`**。

**🗄️ 雲端建議**：若簽到 insert 報缺少 **`delta_exp`**，請為 **`public.exp_logs.delta_exp`** 設定 **DEFAULT**（例如 **`1`**）與既有 Trigger 一致。

### 2025-03-23 — 任務 12：簽到真實錯誤、台北曆日預檢與 UI 冷卻

- **Layer 3 — `daily-checkin.action.ts`**：**`claimDailyCheckin`** 不再在未知錯誤時回傳固定「簽到失敗，請稍後再試」；改以 **`formatCheckinErrorForClient`** 組合 PostgREST／Postgres 的 **`code`、`message`、`details`、`hint`** 回傳至前端（便於對照 Vercel Log）。catch 內 **`console.error("❌ 簽到原始錯誤物件:", JSON.stringify(error, null, 2))`**，失敗再嘗試 **`getOwnPropertyNames`** 序列化。新增 **`getDailyCheckinCooldownInfo`**：讀取 **`findLatestDailyCheckinByUserId`**，以 **`taipeiCalendarDateKey()`** 比對 **`unique_key`** 格式 **`daily_checkin:{YYYY-MM-DD}:{user_id}`**（異常時退回 **`created_at`** 的台北曆日）；若已為今日則不進入 insert。
- **Layer 2 — `exp.repository.ts`**：新增 **`findLatestDailyCheckinByUserId`**；**`insertExpLog`** 僅以 **`{ user_id, unique_key, source }`** 物件 insert，**payload 不含 `delta_exp` 鍵**。
- **Layer 4 — `date.ts`**：**`nextTaipeiCalendarDateAfter`**、**`formatTaipeiDateKeyForDisplay`**（下次可簽日期繁中顯示）。
- **Layer 5 — `guild-profile-home.tsx`**：簽到錯誤 **`toast.error(result.error)`** 顯示真實原因；若訊息含 **`duplicate`**（不分大小寫）或常數 **`DAILY_CHECKIN_ALREADY_TODAY`**，改 **`toast.success("今日已經簽到過了喵！")`** 並同步冷卻狀態。已簽到時按鈕鎖定、**`Lock`** 圖示與「下次可簽到」文案（台北曆日切換後）。

*最後更新：2025-03-23 — **任務 14**：`exp_logs` 同時維護 **`delta`** 與 **`delta_exp`**（`insertExpLog` 預設各 **1**，避免 **23502 NOT NULL**）；簽到前以 **`findDailyCheckinForUserOnTaipeiDay`**（**`unique_key`** + **`source = daily_checkin`**）判斷當日是否已簽，回傳 **`error: DAILY_CHECKIN_ALREADY_TODAY`**；個人頁簽到鈕冷卻為深灰半透明、**`⏳ 回報冷卻中 (約 23 小時)`**，未簽到為漸層質感；成功 **toast**：「簽到成功！獲得 +1 EXP 喵！」。*

### 2025-03-23 — 任務 14：`exp_logs` **delta**／**delta_exp** 與 24H 冷卻 UI

- **🗄️ `exp_logs`**：雲端可同時存在 **`delta`** 與 **`delta_exp`**（皆 NOT NULL 時，應用層 **`insertExpLog`** 明確帶入 **1**，與 DB 預設值雙重保險）。**`database.types.ts`** 之 **`Row`**／**`Insert`** 已對齊。
- **Layer 2 — `exp.repository.ts`**：**`insertExpLog`** payload 含 **`delta`**、**`delta_exp`**（預設 **1**，可覆寫）；**`findDailyCheckinForUserOnTaipeiDay`** 以 **`daily_checkin:{YYYY-MM-DD}:{user_id}`** 之 **`unique_key`** 並 **`source = daily_checkin`** 查詢。
- **Layer 3 — `daily-checkin.action.ts`**：**`claimDailyCheckin`**／**`getDailyCheckinCooldownInfo`** 依上列查詢判斷當日；已簽回傳 **`error: DAILY_CHECKIN_ALREADY_TODAY`**（常數見 **`src/lib/constants/daily-checkin.ts`**）。
- **Layer 5 — `guild-profile-home.tsx`**：今日已簽 **disabled**、深灰半透明、主文案 **⏳ 回報冷卻中 (約 23 小時)**；未簽 **漸層**按鈕；簽到成功 **`toast.success("簽到成功！獲得 +1 EXP 喵！")`**。

---

*（歷史）**任務 12**：簽到錯誤透明化、曆日預檢、冷卻 UI 與 UTF-8 友善字串（Server Action 純 JSON 可序列化物件）。*

### 2025-03-23 — 任務 14：`delta`／`delta_exp` 對齊（23502）、曆日查詢與冷卻 UI

- **Layer 2 — `exp.repository.ts`**：**`insertExpLog`** 明確送出 **`delta: 1`**、**`delta_exp: 1`**（可於 **`ExpLogInsertPayload`** 覆寫），與雲端 **`exp_logs`** 並存之 **`delta`**／**`delta_exp`** NOT NULL 對齊，避免 **23502**。改以 **`findDailyCheckinForUserOnTaipeiDay(userId, ymd)`** 依 **`unique_key === daily_checkin:{YYYY-MM-DD}:{userId}`** 查當日是否已簽（與 UNIQUE 索引一致）。
- **Layer 3 — `daily-checkin.action.ts`**：**`claimDailyCheckin`**／**`getDailyCheckinCooldownInfo`** 皆以 **`taipeiCalendarDateKey()`** 與上述查詢預檢；若當日已有列則 **`error: DAILY_CHECKIN_ALREADY_TODAY`**（常數值為機讀 slug **`"DAILY_CHECKIN_ALREADY_TODAY"`**）。
- **型別 — `database.types.ts`**：**`exp_logs.Row`／`Insert`／`Update`** 補上 **`delta`** 欄位說明。
- **常數 — `daily-checkin.ts`**：**`DAILY_CHECKIN_ALREADY_TODAY`** 改為 slug **`DAILY_CHECKIN_ALREADY_TODAY`**；UI 仍以友善 **toast** 回饋，勿直接顯示該字串給使用者。
- **Layer 5 — `guild-profile-home.tsx`**：已簽到時按鈕 **disabled**、**深灰半透明**樣式、主文案 **「⏳ 回報冷卻中 (約 23 小時)」**；簽到成功 **「簽到成功！獲得 +1 EXP 喵！」**。

*最後更新：2025-03-23 — 頭像 **react-easy-crop** 全螢幕裁切＋**Cloudinary**；**`cropImage.getCroppedImg`**；**廢除 Supabase Storage 頭像上傳**；同步 **`.cursorrules`**。*

### 2025-03-24 — IG 變更申請與審核（`ig_change_requests`）

- **🗄️**：**`public.ig_change_requests`** 表 + **`users.role`**（預設 **`member`**，**`admin`**／**`leader`** 可進 **`/admin/ig-requests`**）。遷移檔 **`supabase/migrations/20260324100000_ig_change_requests_and_user_role.sql`**。
- **型別**：**`database.types.ts`** 新增 **`ig_change_requests`**、**`users.role`**。
- **Layer 2**：**`ig-request.repository.ts`** — **`insertIgChangeRequest`**、**`getPendingIgRequests`**（embed **`users!ig_change_requests_user_id_fkey`**）、**`reviewIgRequest`**（核准時先改 **`users.instagram_handle`** 再更新申請列）。
- **Layer 3**：**`ig-request.action.ts`** — **`requestIgChangeAction`**（**`instagramHandleSchema`**）、**`reviewIgRequestAction`**、**`getPendingIgRequestsAction`**。
- **Layer 5**：**`guild-profile-home`** 帳號設定 — 無 IG 直接綁定；有 IG 鎖定 + 展開輸入後送審。**`/admin/ig-requests`** 待審列表 + **核准／拒絕**。

### 2025-03-24 — 簽到冷卻改為 24h 滾動（`last_checkin_at`）

- **規格**：簽到冷卻為 **24 小時滾動**（非台北曆日切換）；**`users.last_checkin_at`** 為 SSOT。
- **廢棄**：以 **`taipeiCalendarDateKey()`**／曆日 **`unique_key`** 作為「今日是否已簽」之判斷（**`taipeiCalendarDateKey()`** 函數**保留**，供其他日曆用途）。
- **Layer 2**：**`user.repository.ts`** 新增 **`updateLastCheckinAt(userId)`**（admin 更新 **`last_checkin_at`**）。
- **Layer 3**：**`claimDailyCheckin`** 讀寫 **`last_checkin_at`**、寫入 **`exp_logs`** 時 **`unique_key`** 為 **`daily_checkin:{userId}:{timestamp}`**；冷卻內回傳 **`error: DAILY_CHECKIN_ALREADY_CLAIMED`**（**`already_claimed`**）及 **`remainHours`／`remainMins`**。已移除 **`getDailyCheckinCooldownInfo`**（個人頁改由 **`profile.last_checkin_at`** 推算）。
- **Layer 5**：**`guild-profile-home.tsx`** 進入頁面即以 **`profile.last_checkin_at`** 初始化冷卻 state；點擊簽到成功後**立刻**鎖定 UI 並顯示剩餘時分；**每分鐘**更新倒數。
- **🗄️**：**`supabase/migrations/20260324120000_users_last_checkin_at.sql`**（**`users.last_checkin_at`**）。
- **常數**：**`DAILY_CHECKIN_ALREADY_CLAIMED`**（**`already_claimed`**）；**`DAILY_CHECKIN_ALREADY_TODAY`** 為別名（相容舊引用）。

### 2025-03-24 — 註冊 UX：移除名冊內重複興趣步、指示器縮小、`TagSelector` 預設收折、卡片加寬

- **Layer 5 — `profile-form.tsx`**：移除第三步「技能與興趣」標籤區（與 **`/register/interests`** 重複）；名冊僅兩步（基本資料＋性向／線下／核心價值），**「完成並進入公會」**於第二步送出；**`completeAdventurerProfile`** 傳 **`interests: []`**。
- **Layer 3 — `adventurer-profile.action.ts`**：建檔允許 **`interests` 為空陣列**（興趣改由 Step4／**`completeRegistration`** 寫入）；仍限制最多 **12** 個。
- **Layer 5 — `registration-step-indicator.tsx`**：數字圈 **w-6 h-6**、**`text-[10px]`**、連接線 **w-4**、**`gap-1`**，外層 **px-2 py-3** 利於窄螢幕。
- **Layer 5 — `TagSelector.tsx`**：新增 **`defaultOpenCategory?: string | null`**（**`null`**＝全部分類預設收折；未傳則維持展開第一個分類）。
- **Layer 5 — `/register/interests`、`/register/skills`**：兩頁 **`TagSelector`** 皆 **`defaultOpenCategory={null}`**；外層 **max-w-xl**、**px-3**。

### 2026-03-24 — 首頁今日心情質感、標籤編輯鈕位置

- **Layer 5 — `guild-profile-home.tsx`**：**今日心情**獨立卡改為**微光紫邊框**（**`border-violet-500/30`** + **紫色柔光 `box-shadow`**）、**較矮**輸入區（**`rows={2}`**、**`py-2.5`**）、**小膠囊確認鈕**（**`text-xs`**）；標題與倒數／過期文案**左右對齊**。
- **Layer 5 — 同上**：**興趣與技能標籤**手風琴改用 **`titleRow`**：**✏️ 編輯** **`Link`** 移至標題文字**正後方**，**`e.stopPropagation()`** 避免誤觸折疊。

### 2026-03-24 — 探索頁 SSR 與 village／market 快取

- **Layer 5 — `/explore`**：**`page.tsx`** 為 **Server Component**，伺服端 **`await getVillageUsersAction()`** 預載村莊列表，傳入 **`ExploreClient`**（**`initialVillageUsers`**）；市集資料改由 **`ExploreClient`** 內 **`useSWR`** 載入（見下 **「`ExploreClient` 改用 SWR」**）。**`VillageContent`／`MarketContent`** 以 **`hidden`／`block`** 切 tab，**不 unmount**。
- **Layer 5 — `ExploreClient.tsx`**（client）：tab、**`query`**；**`useSWR(SWR_KEYS.villageUsers, …)`** ＋ **`fallbackData: initialVillageUsers`**、**`revalidateOnMount: false`**；**`useSWR(SWR_KEYS.marketUsers(query), …)`** ＋ **`keepPreviousData: true`**；**`onQueryChange`** 僅 **`setQuery`**。**`MarketContent`** 仍為搜尋 **300ms debounce**、初次載入 **6×`UserCardSkeleton`**。
- **Layer 3 — `village.service.ts`**：**`unstable_cache`** 包住村莊查詢與篩選排序，**`revalidate: 30`**，key **`village-{userId}-{region}`**。
- **Layer 3 — `market.service.ts`**：**`unstable_cache`** 包住 **`findMarketUsers`**（**`revalidate: 60`**，key **`market-{userId}`**）與 **`getCachedMySkills`**（同 TTL、**`profileCacheTag`**）；**關鍵字搜尋在列表快取回傳後篩選**；**Perfect Match** 與分數排序仍於快取回傳後計算。

### 2025-03-24 — PWA manifest 圖示與主題色 **`#0f0a1e`**

- **Layer 5／靜態**：**`public/manifest.json`** 更新 **icons**（192／512 **maskable**、180 **apple-touch**）、**`theme_color`／`background_color`** 皆 **`#0f0a1e`**。
- **Layer 5 — `app/layout.tsx`**：**`viewport.themeColor`**、**`metadata.icons.apple`**（**`/icons/apple-touch-icon.png`**），與 manifest 對齊。
- **靜態資源**：由既有 **`icons/192.png`**、**`512.png`**、**`ios/180.png`** 複製為 manifest 路徑（**`icon-192x192.png`** 等），避免 404。

### 2025-03-24 — 底欄圖示還原、今日心情紫微光、探索 safe-area、列表骨架屏

- **Layer 5 — `Navbar.tsx`**：恢復 **lucide** 圖示（**Home、Compass、Swords、Heart、ShoppingBag**）；**`w-5 h-5`**；選中 **`text-violet-400`**、未選 **`text-zinc-500`**；標籤 **`text-[10px] mt-0.5`**；**`py-2 flex-1`** 欄位；**`/`** 僅 **`pathname === '/'`** 為 active。
- **Layer 5 — `guild-profile-home.tsx`**：**今日心情**外層改 **深紫微光**（**`bg-violet-950/40`**、**`border-violet-500/20`**、**`rounded-3xl`**、**`shadow-2xl backdrop-blur-xl`**），與其他 **`glass-panel`** 區隔。
- **Layer 5 — `/explore`**：sticky 頂欄 **`pt-[max(1rem,env(safe-area-inset-top))]`** 避 **iPhone 瀏海**。
- **Layer 5**：新增 **`UserCardSkeleton`**；**`MarketContent`**（及舊版村莊載入）載入時 **6** 枚骨架取代純文字「載入中」。（後續：村莊改 SSR 後不再使用骨架，見下「探索頁 SSR」條。）

### 2025-03-24 — 底部導航五項、`/explore`／`/guild`、舊路由 redirect

- **Layer 5 — `Navbar.tsx`**：（歷史）曾為五項純文字＋底線；現已改回 **lucide** 圖示（見上一則）。
- **Layer 5 — `/explore`**：（歷史）曾為**整頁 Client**；現已改為 **`explore/page.tsx` Server** ＋ **`ExploreClient`**（見 **2026-03-24 — 探索頁 SSR 與快取**）。頂部 **pill Switch**（🏡 興趣村莊／⚔️ 技能市集）；內容為 **`VillageContent`**、**`MarketContent`**（**`src/components/explore/`**）。
- **Layer 5 — `/guild`**：**血盟／聊天／信件** 三 tab；血盟為佔位（待 **getMyAlliancesAction** 等）；聊天／信件預留文案。（**雙人血盟已於 2026-03-24 接線**，見下則。）
- **Layer 5 — `/matchmaking`**、**`/shop`**：**glass-panel**「即將開放」預留頁。
- **路由**：**`/village`**、**`/market`** → **`redirect('/explore')`**；**`/alliances`**、**`/inbox`** → **`redirect('/guild')`**。
- **`app-shell-motion`**：底部留白改 **`pb-[calc(5.25rem+env(safe-area-inset-bottom))]`** 以配合五欄底欄。

### 2026-03-24 — 雙人血盟（`alliances`）、Modal 與冒險團

- **🗄️ SSOT**：**`public.alliances`**（**`user_a`**、**`user_b`**、**`initiated_by`**、**`status`**、`created_at`）；**`alliance.repository`** 僅 **`.from('alliances')`**；新列 **insert** 時 **`user_a`／`user_b`** 採字串字典序固定對，與雲端 **UNIQUE** 約束對齊。
- **`user_alliances`**：**廢棄**；**`20260325120000_user_alliances_pair.sql`** 僅留 **DEPRECATED** 註解與註解掉的 DDL，**勿執行**。
- **型別**：**`database.types.ts`** 之 **`alliances`** 已改為上列雙人血盟形狀；**`UserAllianceRow`／`user_alliances` 型別已移除**。
- **Layer 2**：**`alliance.repository.ts`** — **`.from('alliances')`**、成對查詢（**`and(user_a…,user_b…)` OR 反向**）；**已接受血盟**／**待確認（對方發起）** 改為**先查血盟再逐筆查 **`users`****，避免 PostgREST FK embed 問題。
- **Layer 3**：**`alliance.action.ts`** — **Modal** 用 **狀態／申請／回應／解除**；列表用 **我的血盟**／**待確認**；**`reactivateAllianceFromDissolved`** 處理 **`dissolved` → 再申請**（更新 **`initiated_by`**，型別 **`Update`** 仍僅 **`status`**，層級 2 以斷言寫入）。
- **Layer 3 — `social.action.ts`**：**`checkMutualLikeWithTargetAction`**（雙向互讚，血盟區塊前置）。
- **Layer 5 — `UserDetailModal.tsx`**：僅 **雙向互讚** 顯示血盟區；四態：**無**／**已送出**／**待確認**／**血盟夥伴**＋解除；**Instagram**：**`ig_public === true`** 或 **血盟已成立** 且 **`instagram_handle`** 有值時顯示 **@**。
- **Layer 5 — `/guild`**：**`AllianceList`** 待確認申請（接受／拒絕）＋血盟夥伴列表；**血盟** tab **角標**與列表皆 **`useSWR`**（**`pendingAlliances`／`myAlliances`**），操作成功後 **`mutate`**；**三 tab 內容**以 **`hidden`／`block`** 切換，**`AllianceList` 不隨 tab unmount**。

### 2025-03-24 — 村莊／市集：matching、Layer 2 分域、`getVillageUsersAction`／`getMarketUsersAction`

- **Layer 4**：新增 **`src/lib/utils/matching.ts`** — **`isOrientationMatch`**（雙向 **`canSee`**）、**`calcInterestScore`**、**`calcSkillScore`**（互補／同好）。
- **Layer 2**：**`findVillageUsers`**（同縣市、**`active`**、精簡 **`select`**，含 IG 欄）；**`findMarketUsers`** 改為全台 **`active`**、精簡 **`select`**（**不含** IG 欄）。
- **Layer 3**：**`getVillageUsersAction`**、**`getMarketUsersAction`**（**`'use server'`**）；村莊：**性向篩選**＋**興趣分數**排序；市集：**互補優先、同好次之**，**Perfect Match** 仍優先浮上，**暱稱／技能**關鍵字篩選。
- **Layer 5**：**`VillageContent`** 列表 **不**顯示技能（**`UserCard`** **`variant="village"`**，興趣最多 **3 +N**）；**`MarketContent`** 搜尋（**300ms debounce**）、**`variant="market"`**（**skills_offer** 琥珀、**skills_want** 天藍，各最多 **3 +N**）；兩者併入 **`/explore`**；完整技能與自白仍在 **`UserDetailModal`**。

### 2025-03-24 — 註冊條款 Modal（`terms.ts`／`TermsModal`）

- **Layer 4**：新增 **`src/lib/constants/terms.ts`**，匯出 **`TERMS_OF_SERVICE`**（傳奇公會使用者條款全文）。
- **Layer 5**：新增 **`src/components/auth/TermsModal.tsx`**（可滾動內文、關閉與「我已閱讀並同意條款」）。
- **Layer 5 — `register-form.tsx`**：條款區改為 **「我同意」**（**`label`** 連結勾選框）＋可點 **「冒險者公會使用者條款」** **`button`** 開啟 **`TermsModal`**（避免連結包在 **`label`** 內誤觸勾選）。

### 2025-03-24 — 註冊五步／Step5 Modal、性別二元、明確上一步路由

- **Layer 4 — `adventurer-questionnaire.ts`**：**`GENDER_OPTIONS`** 僅 **`male`／`female`（男／女）**；舊值 **`non_binary`／`prefer_not`** 若仍在 DB，顯示可經 **`resolveLegacyLabel`**／原字串 fallback。
- **Layer 5 — `registration-step-indicator.tsx`**：**`activeStep: 1 | 2 | 3 | 4 | 5`**，圈圈 **1—2—3—4—5**。
- **Layer 5 — `/register/interests`**：**`RegistrationStepIndicator activeStep={4}`**；僅興趣 **`TagSelector`**；完成時 **`sessionStorage.setItem('reg_interests', …)`** 後 **`router.push('/register/skills')`**；**無**完成 Modal；**上一步** **`router.push('/register/profile')`**（**不使用** **`router.back()`**）。
- **Layer 5 — `/register/skills`**：完整 **Client** 頁；讀 **`reg_interests`** 與 **`skillsOffer`／`skillsWant`**，呼叫 **`completeRegistration`**；**我能教**在上、**我想學**在下；**跳過**以空技能陣列完成；成功後**全螢幕歡迎 Modal**；**上一步** **`router.push('/register/interests')`**。
- **Layer 5 — `profile-form.tsx`**：名冊第一步之**上一步** **`router.push('/register')`**；內部步驟仍 **`goBack`**（**`setStep`**）。
- **Layer 3**：**`completeRegistration`** 仍於 Step5（或跳過）寫入 **`interests`／`skills_offer`／`skills_want`**。

### 2025-03-24 — 舊問卷資料顯示相容與遷移 SQL（待手動執行）

- **Layer 4 — `adventurer-questionnaire.ts`**：**`resolveLegacyLabel`**（新選項 → **`LEGACY_*_MAP`** → 原字串）、**`resolveOfflineOkLabel`**（**`offline_ok` boolean**）；**`LEGACY_REGION_MAP`**（含 **`island`／`islands`**）、**`LEGACY_ORIENTATION_MAP`**、**`LEGACY_OFFLINE_MAP`**。
- **Layer 5**：**`UserDetailModal`**、**`UserCard`** 之地區／線下顯示經 **`resolveLegacyLabel`**／**`resolveOfflineOkLabel`**（**不**顯示性向）；**`guild-profile-home`** 本人問卷摘要含性別・地區・性向・線下（性向僅此處展示）。
- **🗄️**：**`supabase/migrations/20260324150000_migrate_legacy_region_orientation.sql`** 已產生，**請確認後再在 Supabase 手動執行**，勿當作自動部署唯一依賴。

### 2025-03-24 — 註冊問卷 UI（Step1／2）與 UserDetailModal 緣分

- **Layer 4 — `adventurer-questionnaire.ts`**：**Step1** 性別英文 value、中文 label（**僅** **`male`／`female`（男／女）**）；**地區**改為完整台灣縣市（value／label 皆繁中），**海外（自填）**另填文字後存 **`海外・…`**；**Step2** 性向三選（**`heterosexual`／`homosexual`／`pansexual`**）；線下意願 **`in_person`／`online_only`／`both`**（**`offline_ok`**：`in_person` 或 `both` 為 **true**）。
- **Layer 5 — `profile-form.tsx`**：上一步／下一步與完成鈕 **`flex-1` + `py-4`** 統一高度；**`/register/interests` 等標籤頁**主按鈕 **`py-4`**。性別、地區、性向、線下意願為**原生 `<select>`**（iOS／Android 系統選擇器可滾動）；**`@base-ui` Select** 已移除。性別／地區另見 **「註冊五步指示器…」** 之膠囊 **`rounded-full`** 樣式與全線 **1〜5** 步指示器。
- **Layer 3 — `adventurer-profile.action.ts`**：**`questionnaire.region`** 改為 **`string`**（已解析繁中）；伺服端檢查非空與長度。
- **Layer 5 — `UserDetailModal.tsx`**：緣分鈕 **`handleToggleLike`／`confirmCancelLike`** 與 **`toggleLikeAction`**；**`AlertDialog`** 標題「確定取消緣分？」、**再想想／確定取消**（**`glass-panel`**）；初始狀態仍由 **`getLikeStatusForTargetAction`** 載入。

### 2025-03-24 — 註冊標籤三步與編輯頁（`interests`／`skills_offer`／`skills_want`）

- **Layer 4**：**`src/lib/constants/tags.ts`**（**`TagCategory`**、**`INTEREST_CATEGORIES`／`SKILL_CATEGORIES`**、**`ALL_*_TAGS`**）；**`interests.ts`／`skills.ts`** re-export。
- **Layer 5 — 註冊**（後續已拆 Step4／Step5，見下方 **2025-03-24 — 註冊五步／Step5 Modal**）：**`src/components/register/TagSelector.tsx`**；**`/register/interests`** → **`/register/skills`**；**`/register/matchmaking`**（預留）。
- **Layer 5 — 事後編輯**（歷史）：曾用 **`onboarding/TagSelector`**；已於後續改為與註冊相同之 **`register/TagSelector`**（見 **2025-03-24 — edit-tags／Git 規則**）。
- **Layer 3**：**`register.action.ts`** 之 **`completeRegistration`** 經 **`user.repository`** **`updateProfile`** 寫入 **`interests`／`skills_offer`／`skills_want`**。
- **註冊動線**：**`middleware`** 放行 **`/register/interests`**、**`/register/skills`**（完整技能頁）、**`/register/matchmaking`**，以及舊路徑 **`/register/skills-offer`／`skills-want`**（**`redirect`** 至 **`/register/interests`**）；須已登入且**已建 profile**。
- **事後修改**：**`/profile/edit-tags`** 三 Tab（興趣／能教／想學），各 Tab 獨立 **「儲存」**；首頁 **「興趣與技能標籤」** 手風琴標題旁 **✏️ 編輯**（**`Link`**、`stopPropagation`）連結至此頁。
- **Layer 3**：**`updateMyProfile`**（**`profile-update.action.ts`**）支援 **`interests`／`skills_offer`／`skills_want`**；**`revalidatePath('/profile/edit-tags')`**。
- **配對語意**：市集 **Perfect Match** 仍以 **我想要的 ∩ 對方提供的** 與 **對方想要的 ∩ 我提供的** 為基礎（**`skills_want` ↔ `skills_offer`** 互相呼應）；村莊經 **`isOrientationMatch`** 後以 **`calcInterestScore`**（興趣重疊數）排序。

### 2025-03-24 — UserDetailModal／UserCard／首頁 EXP 文案

- **Layer 5 — `UserDetailModal.tsx`**：頂部資訊區**下方**顯示**今日心情**（**`isMoodActive` + `getMoodCountdown`**，僅有效期內）；自白改為 **`bio_village`**／**`bio_market`** 雙欄，移除單一 **`bio`** 區；興趣／技能改為**雙區抬頭**（**興趣村莊**紫標、**技能市集**琥珀／天藍標籤合併）。緣分按鈕：**`getLikeStatusForTargetAction`** 載入初始狀態（**`likeLoading`**）、**`toggleLikeAction`** 更新 **已送出／送出**；已送出時再點以 **`AlertDialog`** 二次確認「你確定要結束這段緣分嗎？」後才取消。呼叫端傳入之 **`UserRow`** 須含 **`mood`、`mood_at`、`bio_village`、`bio_market`、`interests`、`skills_offer`、`skills_want`**；村莊／市集列表經 **`findVillageUsers`**／**`findMarketUsers`** 之精簡 **`select`** 已涵蓋（市集列不含 **`instagram_handle`**／**`ig_public`**，Modal 內 IG 區可能為空）。
- **Layer 5 — `UserCard.tsx`（村莊／市集共用）**：**`variant="village"`** 僅顯示興趣（最多 **3 +N**）；**`variant="market"`** 顯示 **skills_offer／skills_want**（各最多 **3 +N**）；列表頭像 **48px 正圓**；無頭像時 **首字**占位。
- **Layer 5 — `guild-profile-home.tsx`**：等級列旁數值標籤由 **`total_exp`** 改為 **`EXP`**（數值仍為 **`total_exp`**）。

### 2025-03-24 — `.cursorrules` Git 自動推送；**`/profile/edit-tags`** 統一 **`register/TagSelector`**；移除 **`onboarding/TagSelector`**

- **`.cursorrules`**：**「Git 自動推送規則」** — 任務完成／修改完畢／已實作／已更新時，預設執行 **`git add -A`** → **`git commit -m "feat/fix: …"`** → **`git push`**（使用者明令不要推送時除外）。
- **Layer 5**：**`edit-tags-client.tsx`** 改為 **`import TagSelector from '@/components/register/TagSelector'`**，分類自 **`@/lib/constants/tags`**；興趣與能教／想學皆 **`customAllowed`**、**`maxCustom={3}`**；仍 **`updateMyProfile`**。
- **移除**：**`src/components/onboarding/TagSelector.tsx`**（已無引用）。

### 2025-03-24 — 註冊標籤：`tags.ts`、`register/TagSelector`、合併 Step4 **`/register/skills`**

- **Layer 4**：新增 **`src/lib/constants/tags.ts`**（興趣／技能分類與內建標籤、**`ALL_INTEREST_TAGS`／`ALL_SKILL_TAGS`**）；**`interests.ts`／`skills.ts`** 改為自 **`tags.ts`** re-export。
- **Layer 5**：新增 **`src/components/register/TagSelector.tsx`**（已選預覽、分類手風琴、可選自訂標籤）；**`/register/interests`**（Step3，興趣暫存 **`sessionStorage.reg_interests`**）→ **`/register/skills`**（Step4，**我能教／我想學**切換）→ **`/`** 或 **`/register/matchmaking`**（月老預留頁）。
- **Layer 3**：新增 **`src/services/register.action.ts`** **`completeRegistration`**（**`updateProfile`** 一次寫入三欄位）。
- **相容**：**`/register/skills-offer`／`skills-want`** 改為 **`redirect('/register/skills')`**；**`middleware`** 補登 **`/register/skills`**、**`/register/matchmaking`**。

### 2025-03-24 — `/register/interests` 單頁合併技能；**`/register/skills`** 改轉址

- **（已由「註冊五步／Step5 Modal」取代）** 歷史：**`interests`** 曾合併技能勾選與 **`completeRegistration`**；**`/register/skills`** 曾改 **`redirect('/register/interests')`**。現行流程見上方 **2025-03-24 — 註冊五步／Step5 Modal、性別二元、明確上一步路由**。

### 2025-03-24 — `LoadingButton`、防連點與 Toast 統一

- **Layer 5 — `src/components/ui/LoadingButton.tsx`**：共用 **`LoadingButton`**（內部 **`useRef` lock** 防連點；可選 **`loading` 受控**）＋ **`PendingLabel`**（spinner + 文案，預設 **「處理中…」**）；**`active:scale-95`**，**disabled** 時 **`disabled:active:scale-100`**；可轉傳 **`aria-label`** 等 button 屬性。
- **套用處**：**`register-form`** 建立帳號；**`profile-form`** 下一步（**`LoadingButton`**）／完成（**`PendingLabel` + `loading`**）；**`/register/skills`** 完成（自管 **submitting**）；**`guild-profile-home`** 簽到列（**`PendingLabel`**）、今日心情／雙自白／帳號設定 IG／裁切確認；**`UserDetailModal`** 緣分鈕（**`LoadingButton`**，`likeLoading` 時 **disabled**）＋取消緣分 **AlertDialog** 確定鈕內 **PendingLabel**。
- **註冊名冊**：**`profile-form`** 之 **「下一步」** 以 **`LoadingButton`** 包 **`goNext()`**（**`await Promise.resolve()`** 後執行，避免同幀連點）；完成送出維持 **`<button type="submit">`** + **`PendingLabel`**。
- **Toast 規範（Sonner）**：簽到成功 **「+1 EXP！繼續加油 ⚔️」**；已簽／冷卻 **「還在冷卻中，明天再來！」**；送出緣分 **「💖 緣分已送出！」**（互有緣分仍保留 **🎉 互有緣分！**）；取消緣分 **「緣分已取消」**；自白成功 **「✅ 已更新」**；心情 **「今日心情已更新 ✨」**；IG 綁定 **「IG 帳號已綁定」**；IG 申請 **「申請已送出，等待管理員審核」**；上述流程之 API 失敗統一 **「❌ 操作失敗，請稍後再試」**（表單驗證類訊息仍可維持原 **toast.error** 具體文案）。

### 2025-03-24 — 性向隱私：`UserDetailModal`／`UserCard` 移除展示

- **Layer 5**：**`UserDetailModal.tsx`**、**`UserCard.tsx`** 完全移除性向列；**`guild-profile-home.tsx`** 仍顯示本人性向（見「`public.users` 與程式約定」之**性向隱私與用途**）。
- **文件**：**`HANDOFF.md`** 補充 **`orientation`** 為配對用非展示欄位、後台可篩選但前端不呈現篩選條件。

### 2025-03-24 — `users.core_values`（jsonb）與註冊問卷原生 `<select>`

- **🗄️**：**`public.users.core_values`** 為 **`jsonb`**（註冊 Step2 三題答案 slug 陣列）；與 **`completeAdventurerProfile`**／**`database.types.ts`** 對齊；雲端若缺欄請補 DDL 並 **Reload schema**。
- **Layer 5 — `profile-form.tsx`**：性別、地區、性向、線下意願四欄改為**原生 `<select>`**，避免 **Base UI Select** 在窄螢幕／iOS 選單超出畫面；框內顯示選項**中文 label**，空白為灰色 **「請選擇…」** 佔位；步進與送出前驗證必填。

### 2025-03-24 — 註冊四步指示器、帳號頁膠囊與名冊 Step2 下拉樣式

- **Layer 5 — 全線步驟語意**（五步指示器）：**`1`**＝**`/register`**；**`2`—`3`**＝**`/register/profile`** 內兩步（暱稱／問卷＋核心價值）；**`4`**＝**`/register/interests`**；**`5`**＝**`/register/skills`**。名冊內已不再含第三段興趣標籤（已移除與 Step4 重複之「技能與興趣」區）。
- **Layer 5 — `register-form.tsx`**：標題 **「加入傳奇公會」**、副標 **「建立你的冒險者帳號」**；**Email／密碼／確認密碼／IG／邀請碼** 為登入同款**膠囊原生 `input`**（**`bg-zinc-900/50`**、**`rounded-full`**、**`pl-11`**、**`text-base`**）；密碼與確認欄 **Eye／EyeOff** 切換；**送出前**檢查兩次密碼一致、**至少 6 字且含英文＋數字**（不符則 **toast**，不呼叫 **signUp**）；IG 輸入即時 **`replace` 空白**。
- **Layer 5 — `profile-form.tsx`**：性別、地區下拉改 **膠囊形原生 `<select>`**（**`rounded-full`**、**`bg-zinc-900/50`**、**`ChevronDown`** 右側裝飾、**`colorScheme: dark`**）；性向／線下維持原 **rounded-2xl** 原生選單（內容不變）。

### 2025-03-23 — iOS textarea 與帳號設定 Dialog

- **Layer 5 — `guild-profile-home.tsx`**：今日心情／興趣自白／技能自白 **textarea** 改 **`text-base`**，**`onFocus`** 內 **`setTimeout` + `scrollIntoView({ behavior: 'smooth', block: 'center' }, 300)`**。**「帳號設定」Dialog**（導覽列同文案）：移除通用 **bio** 與 **`AlertDialog`**；保留 **IG 帳號輸入**（**確認儲存**）與 **`ig_public`** 開關；說明引導至首頁區塊編輯。
- **Layer 3 — `profile-update.action.ts`**：**`updateMyProfile`** 支援 **`instagram_handle`**（**`instagramHandleSchema`**；空字串 → **null**）。
- **Layer 5 — `app/layout.tsx`**：**`export const viewport`** 增 **`maximumScale: 1`**（**不**用 **`user-scalable=no`**），與 **`text-base`** 並用抑制 iOS 聚焦縮放。

### 2025-03-23 — 首頁個人卡：今日心情獨立卡、狀態手風琴、標籤雙區

- **Layer 5 — `guild-profile-home.tsx`**：**今日心情**自「我的狀態」移出，與頭像卡同級之獨立 **`glass-panel`**，常駐展開。**我的狀態**僅含三區：**自白**、**信譽與紀錄**、**興趣與技能標籤**，皆以 **`openSection`** 手風琴呈現，預設收折。**興趣與技能標籤**改為 **興趣村莊**（紫抬頭／紫標籤）與 **技能市集**（琥珀抬頭；**`skills_offer`** 琥珀、**`skills_want`** 天藍，合併顯示）。編輯 Modal 說明同步指向「今日心情」卡片與「我的狀態」手風琴。

### 2025-03-23 — 編輯 Modal：IG 公開開關（藍色可視化）

- **Layer 5 — `guild-profile-home.tsx`**：編輯資料 Modal 內 **IG 公開** 改為 **`role="switch"`** 自訂按鈕軌道（**`bg-blue-500`**／**`bg-zinc-600`**、白球位移），取代 shadcn **`Switch`**，行為仍為 **`onIgPublicChange` → `updateMyProfile({ ig_public })`**。

### 2025-03-23 — 頭像：react-easy-crop 裁切＋Cloudinary（廢除 Storage 上傳）

- **依賴**：**`react-easy-crop`**（**`npm install react-easy-crop`**）。
- **Layer 4 Utils**：**`src/lib/utils/cropImage.ts`** — **`getCroppedImg(imageSrc, pixelCrop)`**，以 **`canvas.drawImage`** 裁切 **react-easy-crop** 之 **`croppedAreaPixels`**，**`toBlob`** 回傳 **Blob**。
- **Layer 4 Utils**：**`src/lib/utils/cloudinary.ts`** — **`uploadAvatarToCloudinary(File)`**（unsigned preset、**`folder: avatars`**）。
- **Layer 5 — `guild-profile-home.tsx`**：選圖後開啟 **fixed 全螢幕** 黑底裁切層；**膠囊按鈕**「取消」（關閉並 **`revokeObjectURL`**）、「確認裁切」（**`getCroppedImg` → File → Cloudinary → `updateMyProfile`**）；上傳中鎖定按鈕與主頭像觸發。
- **Layer 3 — `profile-update.action.ts`**：僅接受 **HTTPS** **`avatar_url`**；註解已標明**不**經 Supabase Storage。
- **專案內** **`guild-profile-home`／`updateMyProfile`** 已**無** **`supabase.storage`**／**`bucket`**／**`avatars` bucket** 上傳程式碼（**`createClient()`** 仍用於 **登出**）。

### 2026-03-24 — 效能修復 Phase 1：Middleware／RSC 重複查詢 Profile

- **Layer 1／快取**：新增 **`src/lib/supabase/get-cached-profile.ts`** — **`getCachedProfile(userId)`** 以 **`unstable_cache`** 包住 **`findProfileById`**，**`revalidate: 30`**，**`tags: [\`profile-${userId}\`]`**（與 **`revalidateTag`** 對齊）。
- **Layer 3 — `auth-status.ts`／`auth.service.ts`**：**`deriveAuthStatus`**（Middleware）僅 **`findProfileById`**；**`getAuthStatus`**（RSC）使用 **`getCachedProfile`**（**`unstable_cache` 30s**）。**禁止**在 Middleware 鏈上 import **`next/cache`**，否則 Edge 報 **`incrementalCache missing in unstable_cache`**／**`MIDDLEWARE_INVOCATION_FAILED`**。
- **Layer 3**：**`updateMyProfile`**（**`profile-update.action.ts`**）成功後 **`revalidateTag(profileCacheTag(user.id))`**；**`completeAdventurerProfile`**（**`adventurer-profile.action.ts`**）成功後同樣 **`revalidateTag`**，避免更新後仍讀舊快取。**`updateMyProfile`** 內驗證用 **`findProfileById`** 仍為即時讀取（未改為快取）。

### 2026-03-24 — 效能修復 Phase 2：頭像優化（Avatar／Cloudinary／next/image）

- **設定**：**`next.config.mjs`** 新增 **`images.remotePatterns`**：**`https://res.cloudinary.com/**`**。
- **Layer 5**：新增 **`src/components/ui/Avatar.tsx`** — **`next/image`**（**`loading="lazy"`**、**`sizes`**）；Cloudinary URL 將 **`/upload/`** 改為 **`/upload/w_{size×2},h_{size×2},c_fill,q_auto,f_auto/`**；非 Cloudinary 之 **`avatar_url`** 仍用 **`<img>`**（未列入 **`remotePatterns`** 時避免執行期錯誤）。
- **套用**：**`UserCard`**、**`UserDetailModal`**、**`/guild`** 血盟／待確認列表、**`guild-profile-home`** 首頁大頭貼（**`div` wrapper** 保留點擊上傳、**`fileInputRef`**、上傳中遮罩與桌面 **「更換」** hover）。

### 領袖頭像雷框（`master`／`MasterAvatarShell`）

- **設定檔**：**`src/lib/constants/master-avatar-frame.ts`** — **`MASTER_AVATAR_FRAME_OVERLAY_PERCENT`**（雷框 PNG）、**`MASTER_AVATAR_LIGHTNING_OVERLAY_PERCENT`**（閃電 Lottie，建議略大於框）；**`FRAME_SIZE_PERCENT`** 為框比例別名（除錯用）。
- **`Avatar.tsx`**（**`use client`**）：自設定檔 **import** **`FRAME_SIZE_PERCENT`**；首次掛載時 **`console.log('當前框框比例:', FRAME_SIZE_PERCENT)`**（全頁只印一次）；根節點 **`data-frame-size-percent`** 供 DevTools 對照；並 **re-export** 三常數。**`MasterAvatarShell`** 自 **`Avatar.tsx`** 讀取框／閃電兩個百分比。
- **裁切**：**`.glass-panel`** 在 **`globals.css`** 含 **`overflow-hidden`**，會切掉超出圓形的雷框；**`guild-profile-home`** 頂部個人區塊在 **`role === "master"`** 時加 **`!overflow-visible`** 覆蓋；頭像區外層 **`flex`** 直欄亦加 **`overflow-visible`**。**圖層**：雷框／Lottie 在 **下層**（**`z-[1]`／`z-[2]`**），**圓形照片在上層**（**`z-[10]`**），避免 PNG 壓臉；框／閃電仍可依百分比 **> 100%** 向外超出 **`size`**。上傳／「更換」遮罩仍在按鈕上 **z-20**。
- **套用點**：**`UserCard`**、**`UserDetailModal`**、**`/guild`**、**`ChatModal`**、**`TavernModal`**、**`LeaderToolsSheet`**、**`guild-profile-home`**。
- **除錯**：改常數後請**硬重新整理**或**重啟 `npm run dev`**；確認 **`role === "master"`**。

### 2026-03-24 — 效能修復 Phase 3：Modal 社交狀態合併查詢

- **Layer 3 — `social.action.ts`**：新增 **`getModalSocialStatusAction(targetUserId)`** 與型別 **`ModalSocialStatus`** — 單次 **`createClient().auth.getUser()`** 後 **`Promise.all`**：**`findLike`**（我→對方）、**`findLike`**（對方→我）、**`findAllianceBetween`**（與 **`getAllianceStatusAction`** 相同資料來源）；回傳 **`isLiked`／`isLikedByThem`／`isMutualLike`／`allianceStatus`／`allianceId`／`currentUserId`**。
- **Layer 5 — `UserDetailModal.tsx`**：移除 **`getLikeStatusForTargetAction`**、**`checkMutualLikeWithTargetAction`**、**`getAllianceStatusAction`** 與瀏覽器 **`createClient().auth.getUser()`** 等**多段** **`useEffect`**；改為 **`open` 時**一次 **`getModalSocialStatusAction`**；緣分切換、取消緣分、血盟申請／接受／解除後皆 **`getModalSocialStatusAction`** 刷新。**Modal 開啟時由多次伺服端／客戶端 auth 查詢收斂為合併 action 內 1 次 **`getUser`**（客戶端不再為 Modal 單獨拉 session）。**

### 2026-03-24 — 效能修復 Phase 4：市集搜尋快取自己的技能

- **Layer 3 — `market.service.ts`**：新增 **`getCachedMySkills(userId)`** — **`unstable_cache`** 僅查 **`skills_offer`／`skills_want`**，**`revalidate: 60`**，**`tags: [profileCacheTag(userId)]`**；**`getMarketUsersAction`** 改用它取代每次 **`users` `.select`**。**`updateMyProfile`**（及建檔 **`completeAdventurerProfile`**）既有 **`revalidateTag(profileCacheTag)`** 會一併失效此快取，無需額外 **`revalidateTag`**。

## 效能修復紀錄（Phase 1-4）

Phase 1 — Middleware Profile 快取

- **`getCachedProfile`**（**`unstable_cache` 30s**）
- **middleware** 與首頁 RSC 共用快取
- **效果**：每次換頁減少 1 次 DB 查詢

Phase 2 — 頭像優化

- **`next/image`** + Cloudinary 縮圖參數
- **Avatar** 共用元件
- **效果**：頭像從原圖縮為顯示尺寸，節省 90%+ 流量

Phase 3 — Modal 查詢合併

- **`getModalSocialStatusAction`** 一次 auth + 並行查詢
- **效果**：**`/explore` First Load -57kB**，Modal 開啟 3 次 auth → 1 次

Phase 4 — 市集搜尋快取

- **`getCachedMySkills`**（跟著 profile cache 失效）
- **效果**：搜尋不重複查自己的技能

### 2026-03-24 — Keep-alive API（`/api/ping`）

- **API**：**`src/app/api/ping/route.ts`** — **`GET /api/ping`** 回傳 **`{ ok: true, time }`**，**`time`** 為 **`new Date().toISOString()`**（UTC）；作為 keep-alive／健康檢查端點，見上表「關鍵檔案索引」。

### 2026-03-24 — Middleware：`matcher` 排除 **`api`**

- **`src/middleware.ts`**：**`export const config.matcher`** 負向先行斷言含 **`api`**（並含 **`manifest.json`**、**`icons`**、**`.*\..*`** 等），**`/api/*`** 整段不掛載 middleware，**`/api/ping`** 不經 Session／Profile 流程；函式內 **`isApiOrStatic`**（**`pathname.startsWith("/api/")`**）仍保留，雙重保險。

### 2026-03-25 — 修復 Middleware：`unstable_cache` 不可於 Edge 使用

- **現象**：Vercel **`MIDDLEWARE_INVOCATION_FAILED`**／**`Invariant: incrementalCache missing in unstable_cache`**。
- **原因**：**`deriveAuthStatus`** 經 **`getCachedProfile`** 呼叫 **`next/cache`** 之 **`unstable_cache`**；Middleware 跑在 **Edge**，無 **incremental cache**。
- **修正**：**`deriveAuthStatus`**（**`auth-status.ts`**）改為僅 **`findProfileById`**；**`getAuthStatus`**（**`auth.service.ts`**）保留 **`getCachedProfile`**。共用 **`buildAuthStatus`**。

### 2026-03-25 — 首頁今日心情卡／興趣標籤「編輯」強制重套用

- **Layer 5 — `guild-profile-home.tsx`**：**今日心情**獨立區外層已依規格重設（**`rounded-3xl`**、**`border-violet-500/30`**、**`bg-violet-950/40`**、**`backdrop-blur-xl`**、**`p-4 space-y-3`**、**紫微光 `box-shadow`**）；標題 **✨ 今日心情** 與倒數 **還有 …**；確認鈕改為指定之紫膠囊 class。**興趣與技能標籤**手風琴標題列：**✏️ 編輯** 改為 **`Link` → `/profile/edit-tags`**（**`stopPropagation`**），與標題文字同一行左側、▼ 仍在右側。

### 2026-03-25 — Tab 切換效能：`/guild` 與 `/explore` 避免重複 API

- **Layer 5 — `guild/page.tsx`**：**血盟／聊天／信件** 改為 **`hidden`／`block`** 顯示，**`AllianceList` 單次 mount**，切 tab **不再**因切換而重打列表 API。（後續見下 **「`/guild` 改用 SWR」**：角標與列表改由 **`useSWR`**＋**`mutate`** 更新。）
- **Layer 5 — `ExploreClient.tsx`**：（後續見 **「`ExploreClient` 改用 SWR」**）以 **`useSWR`** 取代 **`useEffect` 預載市集**；**`VillageContent`／`MarketContent`** 仍 **`hidden`／`block`** 切 tab。
- **效能**：減少 **tab 往返**時之重複 **Server Action** 請求。

### 2026-03-25 — SWR 基礎架構（套件與 Provider）

- **依賴**：安裝 **`swr`** 套件（**`npm install swr`**）。
- **Layer 4**：新增 **`src/lib/swr/keys.ts`** — 匯出 **`SWR_KEYS`** 常數（**`profile`／`villageUsers`／`marketUsers(query)`／`myAlliances`／`pendingAlliances`**；後續擴充 **`conversations`／`messages(id)`／`unreadNotifications`／`notifications`**，見 **`useChat.ts`**）。
- **Layer 5／設定**：新增 **`src/lib/swr/provider.tsx`** — **`SWRConfig`** 全域預設：**`revalidateOnFocus: false`**、**`revalidateOnReconnect: true`**、**`dedupingInterval: 30000`**（30 秒內不重複請求）、**`errorRetryCount: 2`**。
- **Layer 5 — `src/app/(app)/layout.tsx`**：**`SWRProvider`** 包住 **`AppShellMotion`** 與 **children**。
- **範圍**：尚未改動任何頁面或資料抓取邏輯，僅基礎架構（Provider + keys）。

### 2026-03-25 — `ExploreClient` 改用 SWR（村莊＋市集）

- **Layer 5 — `src/components/explore/ExploreClient.tsx`**：**`useSWR(SWR_KEYS.villageUsers, () => getVillageUsersAction().then(…))`**，**`fallbackData: initialVillageUsers`**、**`revalidateOnFocus: false`**、**`revalidateOnMount: false`**（沿用 SSR 列表，進客戶端不強制重抓）。
- **市集**：**`useSWR(SWR_KEYS.marketUsers(query), () => getMarketUsersAction(query).then(…))`**，**`revalidateOnFocus: false`**、**`keepPreviousData: true`**（搜尋換 key 時保留上一筆列表，**`isLoading`** 僅無快取資料時為 true，搭配 **`MarketContent`** 可減少骨架閃爍）。
- **移除**：市集 **`useState`（列表／loading／loaded）**、**`useEffect` 預載**、**`handleMarketQueryChange` 內重複呼叫 action**；搜尋僅更新 **`query`**，由 SWR key 觸發請求。
- **`explore/page.tsx`**：維持僅伺服端預載村莊，**無** **`initialMarketUsers`**。

### 2026-03-25 — `/guild` 改用 SWR（血盟列表與角標）

- **Layer 5 — `src/app/(app)/guild/page.tsx`**：**`GuildPage`** 以 **`useSWR(SWR_KEYS.pendingAlliances, getPendingRequestsAction)`** 取得 **`pendingCount`**（角標）；**`AllianceList`** 以 **`useSWR(SWR_KEYS.myAlliances, getMyAlliancesAction)`** 與 **`useSWR(SWR_KEYS.pendingAlliances, …)`** 取得列表資料。
- **移除**：**`useState`／`useEffect`／`useCallback`** 手動載入與 **`onListsChanged`** callback。
- **更新**：接受血盟成功後 **`mutatePending()`** 與 **`mutateAlliances()`**；拒絕後 **`mutatePending()`**；與 **`GuildPage`** 共用 **`pendingAlliances`** key，角標與待確認列表一併 revalidate。
- **UI**：初次載入 **`alliancesLoading || pendingLoading`** 時仍顯示原骨架屏。

### 2026-03-25 — 首頁改為 Client Component + SWR（`useMyProfile`）

- **Layer 4 Hook**：新增 **`src/hooks/useMyProfile.ts`** — **`useSWR(SWR_KEYS.profile, () => getMyProfileAction())`**、**`revalidateOnMount: true`**；回傳 **`{ profile, isLoading, mutate }`**。
- **Layer 3**：新增 **`src/services/profile.action.ts`** — **`getMyProfileAction()`**（**`'use server'`**）：**`createClient().auth.getUser()`** → **`getCachedProfile(userId)`**，未登入回傳 **`null`**。
- **Layer 5 — `src/app/(app)/page.tsx`**：改為 **`'use client'`**；以 **`useMyProfile`** 取代原 **`getAuthStatus` SSR**；**`isLoading || !profile`** 時顯示 **`HomePageSkeleton`**（頭像卡＋心情卡＋狀態卡三組 `animate-pulse`）；`profile === null` 時 **`router.push('/login')`**（客戶端防禦；主防線仍為 **middleware**）。
- **Middleware**：matcher 仍包含 **`/`**，未登入時 Edge 端 redirect **`/login`**，**不需修改**。
- **`/` First Load JS**：**227 kB**（原 222 kB，增 ~5 kB SWR client bundle）；路由從 `ƒ Dynamic` 變 `○ Static`（殼靜態預渲染、資料客戶端載入）。
- **SWR 改造完成**：**`/`（home）**、**`/explore`**、**`/guild`** 三頁皆已改用 **`useSWR`**。

### 2026-03-25 — `AppShellMotion` 頁面切換動畫（輕量）

- **Layer 5 — `src/components/layout/app-shell-motion.tsx`**：（**已由 2026-03-26 開門動畫取代**，見下則。）曾使用 **`AnimatePresence`** **`mode="sync"`**、**`motion.div`** **opacity** **0.08s**。

### 2026-03-26 — 首頁公告滿版垂直堆疊 + 路由「開門」過場（splash 雙扇 → 簾幕由下往上）

- **Layer 5 — `guild-profile-home.tsx`**：公告改 **`w-full`** 垂直列表；置頂／一般樣式與 **`line-clamp-2`＋「⋯ 展開」**（截斷偵測）；整卡開 **Dialog**。
- **Layer 5 — `app-shell-motion.tsx`**：（**後續**）改**上下對開**：**`pathname` 變更** → 上／下扇合屏（**150ms**）→ 停 **150ms** → 上往上、下往下滑出（**1.8s**）；**`splash`** **`backgroundSize: 100% 200%`** + **`center top`／`bottom`**（**X** 中線接縫、各頁一致）；**`z-30`**、**`--nav-reserve`**。（**再後續**：改 **`fixed` 全視窗**、**時序 100ms／1s／1s**、首頁不播等 — 見檔末 **「2026-03-26 — Layer 5：過場 fixed 全視窗…」**。）
- **Layer 3 — `notification.action.ts`**：**`getMyNotificationsAction`** 移除 **`unstable_cache`**，改直接 **`loadNotificationsForUser`**（改善 **`/guild` 信件** SWR 首包體感）。
- **Layer 5 — `guild/page.tsx` `MailBox`**：**`revalidateOnFocus: false`**、**`dedupingInterval: 3000`**。

### 2026-03-25 — 首頁「今日心情」框深紫微光（規格對齊）

- **Layer 5 — `guild-profile-home.tsx`**：今日心情區最外層 **`section`** 使用 **`rounded-3xl border border-violet-500/30 bg-violet-950/40 backdrop-blur-xl p-4 space-y-3`** 與 **`boxShadow: '0 0 20px rgba(139,92,246,0.15)'`**；標題列 **✨ 今日心情** 與 **還有 {countdown}**（**`countdown &&`**）；確認鈕為紫膠囊（**`px-5 py-1.5 rounded-full text-xs`** 等）。

### 2026-03-25 — `/profile/edit-tags` 標籤分類預設全收折

- **Layer 5 — `edit-tags-client.tsx`**：興趣／能教／想學三個 **`TagSelector`** 皆加上 **`defaultOpenCategory={null}`**，與註冊 **`/register/interests`**、**`/register/skills`** 一致，進頁時分類手風琴**預設全部收折**。

### 2026-03-25 — **`likes`** 雲端無 **`id`**／Layer 2 查詢對齊

- **🗄️**：**`public.likes`** 僅 **`from_user`**、**`to_user`**（無 **`id`**）；**`database.types.ts`** 之 **`likes.Row`／`Insert`／`Update`** 已移除 **`id`**（及多餘 **`created_at`** 型別），與實表一致。
- **Layer 2 — `like.repository.ts`**：**`insertLike`** 改為 **`Promise<void>`**，insert 後**不** `.select()`；**`findLike`**、**`checkMutualLike`** 之 **`.select('from_user, to_user')`**，避免 PostgREST 讀取不存在欄位。

### 2026-03-25 — 有緣分／血盟 UX 與 **`alliances`** 成對唯一

- **Layer 2 — `like.repository.ts`**：**`likes`** 表無 **`id`**；**`insertLike`** 僅 **insert**、**`Promise<void>`**、不讀回傳列；**`findLike`**／**`checkMutualLike`** 僅 **`.select('from_user, to_user')`**（與上則一致，避免 **42703**）。
- **Layer 5 — `UserDetailModal.tsx`**：**「申請血盟」** 按鈕 **`allianceRequesting`** 防連點、**disabled** 與轉圈 **「處理中…」**。
- **Layer 3 — `social.action.ts`**：**`toggleLikeAction`** 在 **取消愛心**（**`deleteLike`** 成功）後，若雙人血盟為 **`pending`** 或 **`accepted`**，以 **`updateAlliance(…, { status: 'dissolved' })`** 自動撤銷；失敗吞掉不影響取消緣分。
- **🗄️**：專案內新增遷移 **`supabase/migrations/20260325183000_alliances_pair_unique.sql`**（**`alliances_pair_unique`** on **`(user_a, user_b)`**）；雲端若尚無此約束，請於 Supabase SQL Editor 執行或套用遷移。

### 2026-03-25 — Layer 2 **`chat.repository`** 與聊天相關型別

- **Layer 2**：新增 **`src/lib/repositories/server/chat.repository.ts`** — **admin client**；**`getOrCreateConversation`**、**`findConversationById`**、**`getMessages`**、**`sendMessage`**、**`getMyConversations`**、**`markMessagesAsRead`**、**`blockUser`**、**`unblockUser`**、**`isBlocked`**、**`submitReport`**。
- **型別**：**`database.types.ts`** 新增 **`conversations`**、**`chat_messages`**、**`blocks`**、**`reports`** 之 **Row／Insert／Update**（及匯出 **`ConversationRow`**、**`ChatMessageRow`**、**`BlockRow`**、**`ReportRow`**）。
- **實作備註**：**`getOrCreateConversation`** 以 **`.eq(user_a).eq(user_b)`** 查既有列（字典序 **`[a,b].sort()`**）；**`sendMessage`** 更新對話 **`last_message`**／**`last_message_at`** 失敗時僅 **`console.error`**，不影響訊息寫入。
- **🗄️**：雲端須建立對應 **`public`** 表與 RLS／FK 後再接 Layer 3／UI；與既有 **`messages`**（舊式一對一訊息）表可並存至遷移完成。

### 2026-03-25 — Layer 3 **`chat.action`**／**`notification.action`**

- **Layer 3 — `src/services/chat.action.ts`**：**`getOrCreateConversationAction`**、**`getMessagesAction`**（先以 **`findConversationById`** 確認 **`user_a`／`user_b`** 含目前使用者，再 **`getMessages`**＋**`markMessagesAsRead`**）、**`sendMessageAction`**（長度 ≤500、**`trim`**）、**`getMyConversationsAction`**（附 **`partner`** **`findProfileById`**）、**`blockUserAction`**／**`unblockUserAction`**、**`submitReportAction`**（寫入 **`reports`** 後 **`blockUser`**）。**`createClient()`** 與專案一致為**同步**（無 **`await`**）。
- **Layer 2 補充**：**`chat.repository`** 新增 **`findConversationById`**，供上述權限檢查。
- **Layer 3 — `src/services/notification.action.ts`**：**`getMyNotificationsAction`**（欄位 **`kind`／`title`／`body`／`read_at`／`metadata`**，與 **`database.types`** 一致；發送者由 **`metadata.from_user`** 或 **`from_user_id`** 解析後 **`findProfileById`**）、**`markAllNotificationsReadAction`**（**`read_at`** 設為目前時間，**`.is('read_at', null)`**）、**`clearAllNotificationsAction`**、**`getUnreadNotificationCountAction`**（**`read_at` is null**）。

### 2026-03-25 — Layer 4 **`useChat`** 與 **SWR_KEYS**（聊天／通知）

- **Layer 4 — `src/hooks/useChat.ts`**（**`'use client'`**）：**`useConversations`** — **`useSWR(SWR_KEYS.conversations, getMyConversationsAction)`**、**`revalidateOnFocus: false`**；**`useMessages(conversationId)`** — key **`SWR_KEYS.messages(id)`** 或 **`null`**、**`getMessagesAction`**、**`refreshInterval: 0`**（預留 Realtime，不輪詢）；**`useUnreadNotificationCount`** — **`SWR_KEYS.unreadNotifications`**、**`getUnreadNotificationCountAction`**、**`revalidateOnFocus: true`**、**`refreshInterval: 30_000`**；回傳 **`isLoading`**／**`mutate`**（未讀數另含 **`count`**）。
- **Layer 4 — `src/lib/swr/keys.ts`**：新增 **`conversations`**、**`messages(conversationId)`**、**`unreadNotifications`**、**`notifications`**（供通知列表等後續接線）。

### 2026-03-25 — Layer 5 **`ChatModal`** 與 **`UserDetailModal`** 聊聊接線

- **Layer 5 — `src/components/chat/ChatModal.tsx`**：全螢幕私訊；**`useMessages`**（**`open`** 時才訂閱 key）；**Realtime** 監聽 **`chat_messages`** **INSERT** 後 **`mutate`**；**`sendMessageAction`** 送出與錯誤 **toast**；檢舉原因選單後 **`submitReportAction`**（後端已 **`blockUser`**）成功 **toast** 並關閉；safe-area 頂底；主層 **`z-[100]`**、檢舉層 **`z-[110]`**。
- **Layer 5 — `UserDetailModal.tsx`**：**💬 聊聊** 呼叫 **`getOrCreateConversationAction`**，成功則 **`ChatModal`**（**`targetUser`**／**`socialStatus.currentUserId`**）；關閉詳情 Modal 時重置 **`showChat`**／**`conversationId`**；開啟對話中按鈕 **disabled** 與「開啟中…」。

### 2026-03-25 — **`/guild`** 聊天／信件 Tab、血盟開聊、信件未讀紅點

- **Layer 5 — `guild/page.tsx`**：**`ChatList`** — **`useConversations`** 列表（**`last_message`／`last_message_at`**、**`partner`**），點列開 **`ChatModal`**（**`createClient().auth.getUser()`** 取 **`currentUserId`**；**`partner` 缺漏**時以 **`user_a`／`user_b`** 推導對象 id）。
- **同上 — `MailBox`**：**`useSWR(SWR_KEYS.notifications, getMyNotificationsAction)`**；**`read_at`** 判斷未讀與紫框；**`kind`** 對應文案（**`like`**、**`alliance_*`**、**`system`** 等）或退回 **`body`／`title`**；**`markAllNotificationsReadAction`**／**`clearAllNotificationsAction`** 成功後 **`mutate` 列表**＋**`useSWRConfig().mutate(SWR_KEYS.unreadNotifications)`** 同步底欄紅點。
- **同上 — `AllianceList`**：夥伴列改 **`button`**，**`getOrCreateConversationAction(partner.id)`** 後 **`ChatModal`**；**`chatOpeningId`** 防連點與「開啟中…」；失敗 **toast**。
- **同上 — `GuildPage`**：**`useUnreadNotificationCount`**；**信件** tab **紅點**（**>9** 顯示 **9+**）；**血盟** pending 角標同規則 **9+**。
- **`ChatModal`**：**Supabase Realtime** **`chat_messages`** **INSERT** 即時 **`mutate`**（與探索／詳情 Modal 行為一致）。

### 2026-03-25 — 通知寫入、取消愛心 Sheet z-index、心情過期清空

- **Layer 3 — `alliance.action.ts`**：**`requestAllianceAction`** 成功後 **`notifyAllianceRequest`**（**`insertNotification`**：**`type: "alliance_request"`**、**`from_user_id`**）；**`respondAllianceAction`** 接受後寫入 **`type: "alliance_accepted"`** 給 **`initiated_by`**（見下「通知欄位 **`type`／`from_user_id`**」）。
- **（後續已改）** 新私訊**不再**寫入 **`notifications`**，見下 **「2026-03-25 — 冒險團私訊 UX」**。
- **Layer 5 — `UserDetailModal.tsx`**：取消愛心 Sheet 容器 **`z-50`** → **`z-[100]`**，確保蓋過 Radix Dialog。
- **Layer 5 — `guild-profile-home.tsx`**：心情倒數 **`useEffect`** 過期時 **`setMoodInput("") + setMoodAt(null)`**；過期清空 **`useEffect`** 的 **`setTimeout`** 回呼同步 **`setMoodAt(null)`**。

### 2026-03-25 — 血盟／通知查詢分開查、通知欄位對齊、診斷用 **`console.error`**

- **Layer 2 — `alliance.repository.ts`**：**`findAcceptedAlliancesWithPartners`**／**`findPendingIncomingWithRequester`** 不再使用 **`users!alliances_*_fkey`** embed，改為查 **`alliances`** 後 **`Promise.all`** 查 **`users`**（待確認仍 **`neq('initiated_by', userId)`**＋**`or(user_a,user_b)`**，與字典序成對語意一致）。
- **Layer 3 — `notification.action.ts`**：**`getMyNotificationsAction`** 僅 **`select`** 通知欄位，再以 **`from_user_id`** 分查發送者；錯誤時 **`console.error('getMyNotificationsAction 失敗:', error)`**。
- **型別／寫入**：**`notifications`** 以 **`type`**（非 **`kind`**）、**`from_user_id`**（非 **`metadata.from_user`**）、**`message`**、**`is_read`** 與 DB 一致；**`alliance.action`／`chat.action`／`social.action`** 之 **`insertNotification`** 已對齊；**`/guild`** **`MailBox`** 以 **`notif.type`／`notif.is_read`** 顯示。
- **🗄️**：新增遷移 **`supabase/migrations/20260325220000_notifications_type_from_user_message.sql`**（舊表 **`kind`／`title`／`body`／`metadata`／`read_at`** → 新欄位）；雲端需執行後 **Reload schema**。
- **診斷**：**`notifyAllianceRequest`**、接受血盟後通知、**`sendMessageAction`** 內通知之靜默 **`catch`** 改為 **`console.error`**；**`getMyAlliancesAction`** **`catch`** 改為 **`getMyAlliancesAction 失敗:`**。

### 2026-03-25 — 冒險團私訊 UX：預覽、未讀、底欄紅點、血盟詳情、IG 連結

- **🗄️**：**`conversations.last_message_sender_id`**（最後一則發送者，列表 **你：／對方：**）；遷移 **`20260325230000_conversations_last_message_sender.sql`**。
- **Layer 2 — `chat.repository.ts`**：**`sendMessage`** 更新 **`last_message_sender_id`**；**`getConversationIdsWithUnreadFromOthers`**、**`countConversationsWithUnreadFromOthers`**（**`chat_messages`** **`sender_id != 我`** 且 **`is_read = false`**）。
- **Layer 3 — `chat.action.ts`**：**`getMyConversationsAction`** 回傳 **`hasUnreadFromPartner`**；**`getUnreadChatConversationsCountAction`**；**`sendMessageAction`** **不再** **`insertNotification`**（私訊僅靠聊天列表＋底欄／tab 紅點）。
- **Layer 3 — `profile.action.ts`**：**`getMemberProfileByIdAction`**（已登入讀取他人 **`UserRow`**，血盟詳情 Modal）。
- **Layer 4**：**`useUnreadChatConversationsCount`**、**`SWR_KEYS.unreadChatConversations`**；**`GuildTabProvider`**／**`useGuildTabContext`**（**`/guild`** 子 tab 同步）。
- **Layer 5 — `Navbar`**：**冒險團**圖示未讀 **紅點**＋**`drop-shadow` 發光**（**信件 ∪ 私訊**；**`/guild`＋聊天 tab** 時略過私訊未讀計入底欄）。
- **Layer 5 — `guild/page.tsx`**：血盟夥伴 → **`UserDetailModal`**；聊天列 **預覽前綴**、**未讀紅點**；**聊天／信件** tab **紅點**。
- **Layer 5 — `UserDetailModal`**：**Instagram** **https** 外連按鈕（**`lib/utils/instagram.ts`**）。
- **Layer 5 — `ChatModal`**：**SWR** 同步 **`conversations`／`unreadChatConversations`**（送出、讀取後、Realtime）。

### 2026-03-26 — 首頁 tsParticles 背景（Among Us 配方）

- **依賴**：**`tsparticles@3.0.3`**（**`loadFull`** 全套，內含原 slim／emitters 等；**不再**直接依賴 **`@tsparticles/slim`**）、**`@tsparticles/react@3.0.0`**（npm 最新即 **3.0.0**，與 **engine 3.0.3** peer 相容）、**`@tsparticles/engine@3.0.3`**、**`@tsparticles/shape-image@3.0.3`**（Among Us **`images`** 形狀）。
- **設定**：執行時優先 **`GET /particles.json`**（**`public/particles.json`**，可替換配方不必重編譯）；程式仍強制 **`fullScreen.enable: false`**；失敗時退回 **`src/config/home-particles.json`**。含 **emitters** 圖片 **`particles.js.org`** 之 cyan Among Us。
- **Layer 5**：**`HomeParticlesBackground.tsx`** — **`initParticlesEngine`**：**`loadFull(engine)`** → **`loadImageShape(engine)`**；**`initParticlesEngine(...).then(() => setEngineReady(true))`**；**`id`**：**`tsparticles-home-${useId}`**；**`fetch` + `JSON.parse`** 與 **`tryNormalizeOptions`** 防禦，失敗／無效則 **`console.error`** 並退回內建 JSON，避免首頁白屏；**`normalizeParticleOptions`** 強制 **`background.color` → `transparent`**；**`Particles`**：**`fixed inset-0 z-[1]`**、**`width/height: 100%`**、**`pointer-events-none`**。

### 2026-03-26 — `conversations` 最後訊息欄位、`useUnreadChatCount`、底欄未讀合計語意

- **🗄️**：**`public.conversations.last_message_sender_id`**（最後一則發送者 uuid，列表 **你：／對方：**）；遷移 **`supabase/migrations/20260325230000_conversations_last_message_sender.sql`**（雲端若尚未執行請補）。
- **Layer 2 — `chat.repository.ts`**：**`sendMessage`** 更新對話列時寫入 **`last_message`**、**`last_message_at`**、**`last_message_sender_id`**（**`payload.sender_id`**）。
- **Layer 4 — `useChat.ts`**：新增 **`useUnreadChatCount`**，為 **`useUnreadChatConversationsCount`** 之**別名**（同一 **SWR key**：**`SWR_KEYS.unreadChatConversations`**；仍由 **`getUnreadChatConversationsCountAction`** → **`countConversationsWithUnreadFromOthers`**，**未**另建 **`getUnreadChatCountAction`** 以免重複邏輯）。
- **Layer 5 — `guild/page.tsx`**：**`/guild`** 頂部「聊天」tab 角標使用 **`useUnreadChatCount()`**（與先前 **`useUnreadChatConversationsCount`** 行為相同）。
- **Layer 5 — `Navbar.tsx`**：**冒險團**圖示紅點／發光條件為 **`(信件未讀 + 私訊未讀對話數)`**（在 **`/guild`** 對應子分頁時略過同類重複提示）**或** **待確認血盟**（在血盟分頁時略過 pending 角標）。

### 2026-03-26 — 管理員後台 Wave 1

路由結構：
- `/admin` → 儀表板（master + moderator）
- `/admin/users` → 用戶管理（master + moderator）
- `/admin/reports` → 檢舉管理（master + moderator）
- `/admin/roles` → 授權管理（master only）
- `/admin/settings` → 系統設定（master only，Wave 2 預留）

角色 SSOT：
- **master** = 最高領袖
- **moderator** = 版主
- **member** = 一般成員
- ⚠️ 不存在 **admin** 或 **leader** 角色；後台權限判斷一律用 **`master`**／**`moderator`**

新增 DB 欄位：
- **`users.reputation_score`**（integer, default 100）
- **`users.ban_reason`**（text, nullable）
- **`users.suspended_until`**（timestamptz, nullable）
- **`users.notes`**（text, nullable）
- **`users.role`** enum 改為：`member` / `moderator` / `master`
- **`users.status`** enum 改為：`pending` / `active` / `suspended` / `banned`

新增表：**`admin_actions`** / **`moderator_permissions`** / **`system_settings`** / **`advertisements`** / **`ad_clicks`**

廢棄：**`src/app/(app)/admin/ig-requests/page.tsx`**（IG 審核整合進 `/admin/users` 用戶詳情 Sheet）

- **Layer 2**：**`src/lib/repositories/server/admin.repository.ts`** — `getDashboardStats`、`findUsersForAdmin`、`findUserDetailById`（含 email via admin auth）、`updateUserStatus`、`insertAdminAction`、`adminAdjustExp`、`adjustReputation`、`findStaffUsers`、`updateUserRole`、`findModeratorPermissions`、`upsertModeratorPermissions`、`findAllSystemSettings`、`updateSystemSetting`
- **Layer 3**：**`src/services/admin.action.ts`** — `requireRole` 權限驗證 helper → 各 action（`getDashboardStatsAction`、`getUsersAction`、`getUserDetailAction`、`banUserAction`、`suspendUserAction`、`unbanUserAction`、`adjustExpAction`、`adjustReputationAction`、`getReportsAction`、`resolveReportAction`、`getStaffUsersAction`、`updateUserRoleAction`、`getModeratorPermissionsAction`、`updateModeratorPermissionsAction`、`getSystemSettingsAction`、`updateSystemSettingAction`、`getPendingIgRequestsForUserAction`、`reviewIgRequestFromAdminAction`）
- **Layer 4**：**`src/lib/constants/admin-permissions.ts`** — `PERMISSION_LABELS`、`DEFAULT_MODERATOR_PERMISSIONS`、`SYSTEM_SETTING_LABELS`、`ADMIN_ROLES`、`MASTER_ONLY_ROLES`
- **Layer 5**：獨立 `(admin)` route group layout（白底 sidebar、violet-600 品牌色、收合式側欄；**`layout.tsx`** 根層 **`text-gray-900`**、**`[color-scheme:light]`** 避免系統深色下表單反白）；**`src/middleware.ts`** 新增 `/admin/*` 路由守衛（master/moderator 放行，moderator 限 `/admin`、`/admin/users`、`/admin/reports`）
- **ig-request.action.ts**：`isStaffRole` 改為 `master` / `moderator`（原 `admin` / `leader` 已廢棄）

### 2026-03-26 — 邀請碼管理模組（`/admin/invitations`）

- **🗄️**：**`public.invitation_codes`**（`id` uuid PK、`code` text UNIQUE、`created_by` uuid FK→users、`used_by` uuid nullable FK→users、`used_at` timestamptz nullable、`expires_at` timestamptz nullable、`is_revoked` boolean default false、`note` text nullable、`created_at` timestamptz default now()）。
- **型別**：**`database.types.ts`** 新增 **`invitation_codes`** 之 **Row／Insert／Update／Relationships**；匯出 **`InvitationCodeRow`**、**`InvitationCodeDto`**（含 **`creator`**／**`user`** 關聯用戶簡介）。
- **Layer 2**：**`src/lib/repositories/server/invitation.repository.ts`** — **`findAllInvitationCodes`**（分開查 users 避免 FK embed）、**`findInvitationByCode`**、**`insertInvitationCode`**／**`insertInvitationCodes`**（批量）、**`revokeInvitationCode`**／**`revokeUnusedInvitationCodes`**、**`claimInvitationCode`**（註冊成功後標記使用）、**`findInvitationTree`**（查 `users` 的 `invited_by` 建樹）、**`findSystemSettingByKey`**（讀取 `system_settings` 單一設定值，供邀請碼有效天數預設讀取）。
- **Layer 3**：**`admin.action.ts`** 新增 — **`getInvitationCodesAction`**、**`generateInvitationCodeAction`**（8碼英數大寫隨機碼，loop 確保唯一最多 5 次；預設有效天數從 `system_settings.invitation_expire_days` 讀取；0 = 永不過期）、**`generateBatchInvitationCodesAction`**（最多 50 張）、**`revokeInvitationCodeAction`**（已使用不可撤銷）、**`getInvitationTreeAction`**（扁平陣列 → 樹狀 DTO）、**`validateInviteCodeAction`**（註冊用：code 在表中且有效才放行，不在表中也放行保持相容）、**`claimInviteCodeAfterRegisterAction`**（註冊後靜默標記使用）。產生／撤銷皆寫入 **`insertAdminAction`**。
- **Layer 5**：**`/admin/invitations`**（`'use client'`）三 Tab — ① **邀請碼列表**（篩選：全部／未使用／已使用／已撤銷／已過期；桌面 table＋手機 card；badge 色系 emerald/blue/red/gray；操作：複製＋撤銷；**產生 Dialog** 有效天數＋備註 → 大字 font-mono 結果碼＋一鍵複製；**批量 Dialog** 數量 1–50＋列表＋全部複製）② **邀請樹狀圖**（recursive 縮排、Avatar＋暱稱＋等級 badge＋加入時間、最多 5 層）③ **使用統計**（六張數字卡：總數／使用率／未使用／已撤銷／已過期／本週新產生）。
- **Sidebar**：**`(admin)/layout.tsx`** 新增 **📨 邀請碼管理** 於「用戶管理」與「檢舉管理」之間（master + moderator）。
- **註冊整合**：**`register-form.tsx`** 於 `signUp` 前呼叫 **`validateInviteCodeAction`** 驗證（code 在 `invitation_codes` 表且有效時放行；不在表中也放行保持相容舊碼）；`signUp` 成功後呼叫 **`claimInviteCodeAfterRegisterAction`** 標記使用（靜默失敗不影響註冊）。

### 2026-03-26 — 後台 EXP 管理（`/admin/exp`）與領袖前台快捷面板

- **Layer 2 — `admin.repository.ts`**：新增 **`batchGrantExp`**（對指定 userId 陣列 **`Promise.allSettled`** 並行發放，逐人寫 **`exp_logs`** + 更新 **`users.total_exp`**，unique_key **`admin_grant:{source}:{userId}`**）、**`grantExpToAll`**（查全 active 用戶 → `batchGrantExp`）、**`grantExpByLevel`**（查 level 範圍 active → `batchGrantExp`）、**`findExpLogsByUser`**（分頁）、**`findAdminExpGrantHistory`**（查 `exp_logs` unique_key LIKE `admin_grant:%` 依 source 分組摘要）。
- **Layer 3 — `admin.action.ts`**：**`batchGrantExpAction`**（master+moderator；上限 200 人、delta 1–1000、source 必填）、**`grantExpToAllAction`**（**master only**）、**`grantExpByLevelAction`**（master+moderator）、**`getExpLogsByUserAction`**、**`getAdminExpGrantHistoryAction`**。
- **Layer 5 — `/admin/exp`**（`'use client'`）三 Tab：① **批量發放**（名稱＋EXP 數量＋發放對象三選：勾選用戶搜尋列表 / 全體 active（master only 黃色警告） / 指定等級範圍；AlertDialog 確認摘要；執行結果成功 N / 失敗 N）② **發放紀錄**（依 source 分組展開）③ **用戶查詢**（搜尋暱稱 → 完整 exp_logs 分頁表：時間、來源、EXP 變動、unique_key）。
- **Sidebar**：新增 **🎁 EXP 管理** 於邀請碼管理之後（master + moderator）。
- **Middleware**：`moderatorAllowed` 新增 **`/admin/exp`**。
- **前台領袖快捷面板**：**`UserDetailModal.tsx`** 當 **`myProfile.role === 'master'`** 時 DialogFooter 底部顯示 **「⚡ 領袖工具」** 按鈕；點擊開啟 **`LeaderToolsSheet.tsx`**（固定右側滑出 **`w-80`**，**`z-[830]`／`z-[840]`**）；載入時 **`getMemberProfileByIdAction`** 取完整資料（含 IG）。
  - **📸 Instagram**：強制顯示 **`instagram_handle`**（不受 `ig_public` 限制）＋外連按鈕。
  - **⭐ 快速發放 EXP**：數量 1–1000 ＋理由（必填）→ **`adjustExpAction`** → toast。
  - **📨 發送邀請碼**：**`generateInvitationCodeAction`** → **`getOrCreateConversationAction`** → **`sendMessageAction`** 自動私訊邀請碼。
  - **🚫 黑名單**：active → **`banUserAction`**（AlertDialog＋理由必填）；banned → **`unbanUserAction`**；master 不能對自己操作。

### 2026-03-26 — 發布中心：公告管理＋廣告管理＋前台顯示

- **🗄️**：**`public.announcements`**（`id` uuid PK、`title` text、`content` text、`image_url` text nullable、`is_pinned` boolean default false、`is_active` boolean default true、`created_by` uuid FK→users、`created_at` timestamptz default now()、`updated_at` timestamptz default now()）。
- **型別**：**`database.types.ts`** 新增 **`announcements`** 之 **Row／Insert／Update／Relationships**；匯出 **`AnnouncementRow`**、**`AnnouncementDto`**（含 **`creator`** 關聯用戶簡介）。
- **Layer 2 — `announcement.repository.ts`**（新檔）：**`findAllAnnouncements`**（後台，含停用，分開查 users 取 creator）、**`findActiveAnnouncements`**（前台，`is_active = true`，最多 20 筆）、**`insertAnnouncement`**、**`updateAnnouncement`**、**`deleteAnnouncement`**。
- **Layer 2 — `admin.repository.ts`**（廣告）：**`findAllAdvertisements`**、**`findActiveHomeAds`**（`position='card'`、`is_active=true`、時間範圍內、最多 3 則）、**`insertAdvertisement`**、**`updateAdvertisement`**、**`deleteAdvertisement`**、**`recordAdClick`**（寫 `ad_clicks` + 更新 `click_count`）。
- **Layer 3 — `admin.action.ts`**（公告）：**`getAnnouncementsAction`**、**`createAnnouncementAction`**（標題 ≤100 字、內文 ≤2000 字）、**`updateAnnouncementAction`**、**`deleteAnnouncementAction`**、**`toggleAnnouncementPinAction`**、**`toggleAnnouncementActiveAction`**。所有 action 經 `requireRole(['master','moderator'])`。
- **Layer 3 — `admin.action.ts`**（廣告）：**`getAdvertisementsAction`**、**`createAdvertisementAction`**（權重 1–10）、**`updateAdvertisementAction`**、**`deleteAdvertisementAction`**、**`toggleAdvertisementAction`**。所有 action 經 `requireRole(['master','moderator'])`。
- **Layer 3 — `announcement.action.ts`**（前台）：**`getActiveAnnouncementsAction`**（`unstable_cache` 60s，tag `announcements`）。
- **Layer 3 — `advertisement.action.ts`**（前台）：**`getHomeAdsAction`**（`unstable_cache` 300s）、**`recordAdClickAction`**（靜默記錄點擊）。
- **Layer 5 — `/admin/publish`**（`'use client'`）兩 Tab：① **公告管理**（建立 Dialog 含標題 100 字限制＋內文 2000 字限制＋圖片預覽＋置頂 Switch；卡片式列表，置頂公告 📌 排最上；操作：置頂 toggle、啟用/停用 toggle、編輯、刪除 ConfirmDialog）② **廣告管理**（建立 Dialog 含標題＋說明＋圖片＋連結＋位置選擇＋權重 1–10＋上下架時間＋啟用 Switch；table（桌機）/card（手機）列表，位置 badge 色彩分明；操作同上）。
- **Sidebar**：新增 **📣 發布中心** 於 EXP 管理之後（master + moderator）。
- **Middleware**：`moderatorAllowed` 新增 **`/admin/publish`**。
- **前台公告區塊**（`guild-profile-home.tsx` 頁面最頂部）：置頂 **`w-full`**（**`rounded-2xl`**、**`px-4 py-3`**、**`bg-amber-950/40 border-amber-500/30`**）；一般公告 **`w-full`**（**`rounded-xl`**、**`px-4 py-3`**、**`bg-zinc-900/50 border-zinc-700/30`**），多則 **`space-y-2` 垂直堆疊**（**不**橫滑）；內文 **`line-clamp-2`**，截斷時 **「⋯ 展開」**；**點整卡**開 **Dialog**（完整內容＋圖片）；無公告時完全不顯示。
- **前台廣告區塊**（`guild-profile-home.tsx` 今日心情下方）：**`贊助`** 小標＋橫向滑動 card 廣告（**`min-w-[240px]`**，圖片 `h-32 object-cover`＋標題＋說明）；點擊開連結 + 靜默 **`recordAdClickAction`**；無廣告時完全不顯示。

### 2026-03-26 — Layer 5：過場 `fixed` 全視窗、探索 `dvh`、後台淺色語意、Sheet 瀏海、儀表板導航

- **`app-shell-motion.tsx`**：雙扇改 **`fixed top-0`／`fixed bottom-0`**、**`z-[9999]`**，與主內容同層級但疊於其上；內容包裝**移除 `overflow-hidden`**，避免裁切 fixed。首頁 **`/`** 不觸發過場。底部 **pb 預留區** **`bg-zinc-950`** 條，減輕切至 **`/explore`** 時透出外層 radial 的藍帶閃爍。外層／內容區 **`min-h-[100dvh]`**；**`ExploreClient`** 根節點 **`min-h-[100dvh]`** 與 shell 對齊。
- **`(admin)/layout.tsx`**：根節點 **`text-gray-900`** + **`[color-scheme:light]`**，系統深色模式下後台表單／checkbox 標籤不再繼承 **`body` 淺色 `foreground`** 而看不見。
- **`components/ui/sheet.tsx`**：**`SheetContent`** **`pt-[max(0.75rem,env(safe-area-inset-top,0px))]`**，全站 Sheet（含用戶詳情）避開瀏海／動態島。
- **`/admin/page.tsx`（儀表板）**：改 **`use client`**，**`useEffect`** 載入 **`getDashboardStatsAction`**；統計卡 **`cursor-pointer`**、**`hover:shadow-md hover:scale-[1.02] transition-all duration-150`**，點擊 **`router.push`**：**今日新增** → **`/admin/users?filter=today`**、**待審核** → **`?filter=pending`**、**待處理檢舉** → **`/admin/reports?filter=pending`**、**活躍** → **`?filter=active`**、**本週血盟** → **`/admin/users`**、**待處理 IG** → **`?filter=ig_pending`**。
- **`/admin/users`**：**`page.tsx`** 讀 **`searchParams.filter`**，**`pending`／`active`** 預先帶入 **`getUsersAction`** 之 **`status`**；**`UsersClient`** 接收 **`initialFilter`**：**`today`** 客戶端以台北日曆日 **`sv-SE` + `Asia/Taipei`** 比對 **`created_at` 字首**（先拉一頁較大 **`pageSize`** 再篩）；**`ig_pending`** 目前僅顯示篩選標籤與「清除篩選」，**完整「僅列有 pending `ig_change_requests` 用戶」**待 Layer 2 **`findUsersForAdmin`** 擴充。
- **`/admin/exp`**：等級範圍改 **`type="text"`** 數字過濾＋送出前 **1–10／min≤max** **`toast` 驗證**（見先前批次）。

*最後更新：2026-03-26 — **管理員後台 Wave 1**、**邀請碼／EXP／發布中心**、**過場 `fixed` 全視窗**、**後台淺色語意／Sheet safe-area**、**儀表板導航**；併 **首頁 tsParticles 背景**、**`last_message_sender_id`**、**`useUnreadChatCount`**、**Navbar 未讀**、2026-03-25 **冒險團私訊 UX** 等。*
