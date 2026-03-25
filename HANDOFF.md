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
- **Layer 2（資料）**：`user.repository.ts`（含 **`updateLastCheckinAt`**）、`exp.repository.ts` 支援 **`total_exp`**（SSOT）。
- **Layer 3（業務）**：`daily-checkin.action.ts` 之 **`claimDailyCheckin`** 以 **`users.last_checkin_at`** 為簽到 **24h 滾動冷卻** SSOT；**`exp_logs.unique_key`** 為 **`daily_checkin:{userId}:{timestamp}`**。
- **Layer 4（狀態／常數）**：`levels.ts`（門檻 0〜1350）、Zod 驗證已就緒；**`date.ts`** 之 **`taipeiCalendarDateKey()`** 仍為全系統**日曆日** SSOT（簽到冷卻**不再**依此判斷）。
- **Layer 5（UI）**：**`Navbar.tsx`**（五項 **lucide** 圖示底欄：**Home／Compass／Swords／Heart／ShoppingBag**）、**`LevelFrame.tsx`**、**`UserCard`**、**`UserCardSkeleton`**（市集列表首次載入）、**`/explore`**（**Server Component** 預載村莊；**`ExploreClient`** 頂部 **safe-area**、村莊＋市集 **tab**、**市集 `useSWR`（query key + `keepPreviousData`）**＋**`hidden`／`block` 切 tab 不 unmount**）、**`/guild`**（**`hidden` 切 tab**、**pending 角標 `useSWR`**）、**`/matchmaking`**／**`/shop`**（預留）。

### 📈 開發進度

- [x] **Phase 1.5**：帳號體系、Google 登入預留、暗黑視覺升級、時區校正（日鍵集中於 **`date.ts`**）。
- [x] **Phase 2.1（核心已交付）**：探索 **Tab「興趣村莊」** 同縣市＋**性向雙向篩選**＋**興趣分數**排序、列表卡僅興趣（最多 3 +N）；**Tab「技能市集」** 全台＋**互補／同好分數**、**Perfect Match** 仍優先、**`getMarketUsersAction`** 搜尋；入口 **`/explore`**（**Server** 預載村莊；**`ExploreClient`** 以 **`useSWR`** 綁村莊／市集 **Server Action**；**tab 以 `hidden` 切換不重打列表**）；**`village.service`** **`unstable_cache` 30s**、**`market.service`** 基礎列表 **60s**、**`getCachedMySkills`（60s，`profileCacheTag`）** 避免每次搜尋重查自己技能、**關鍵字篩選在列表快取回傳後**；舊 **`/village`**／**`/market`** → **`redirect('/explore')`**；Layer 2 **`findVillageUsers`**／**`findMarketUsers`**；Layer 4 **`matching.ts`**。可持續打磨 UX／RLS。
- [ ] **Phase 2.2（進行中）**：**Likes** 已接線；**雙人血盟**（**`public.alliances`**：`user_a`／`user_b`／`initiated_by`）UI 與 Layer 2／3 已接線；詳情 Modal 血盟四態＋IG 解鎖；**`/guild`** 血盟列表與 tab 徽章；**RLS** 可後補。

## Phase 2.1 首頁個人卡重構（完成）

- **iOS／PWA**：首頁三處 **textarea**（今日心情、興趣自白、技能自白）使用 **`text-base`（16px）** 避免 Safari 聚焦自動縮放；**`onFocus` → `scrollIntoView({ block: 'center' })`**（延遲 300ms）減輕鍵盤頂動；根 **`layout.tsx`** **`viewport.maximumScale: 1`** + **`viewport-fit=cover`**（**不**使用 **`user-scalable=no`**）
- **帳號設定 Dialog**：**無 IG** 時可直接 **`updateMyProfile({ instagram_handle })`** 綁定；**已有 IG** 時畫面鎖定顯示，改帳須 **`requestIgChangeAction`** 寫入 **`ig_change_requests`**，由 **admin／leader** 於 **`/admin/ig-requests`** 審核（**`reviewIgRequestAction`**）。**`ig_public`** 開關仍即時寫入
- **今日心情**：與頭像卡同級之**獨立區塊**；**微光紫邊**（**`border-violet-500/30`**、**`box-shadow: 0 0 20px rgba(139,92,246,0.15)`**）、**`bg-violet-950/40`**、**`backdrop-blur-xl`**、**`rounded-3xl`**；標題列 **✨ 今日心情** 左對齊、**`getMoodCountdown`** 或「已過期」右對齊（**`text-violet-300/70`**）；**窄版** **`textarea`**（**`rows={2}`**、**`py-2.5`**、**`border-violet-500/20`** **`focus:border-violet-400/50`**）；確認為**小膠囊**（**`px-5 py-1.5 text-xs`**、**`bg-violet-600/80`**），儲存中 **「更新中…」**
- **我的狀態**：同一 `glass-panel` 內僅含三區，皆為**手風琴**（`openSection` 單開），**預設收折**，點標題展開
  - **自白**：**`bio_village`**（興趣自白）+ **`bio_market`**（技能自白），各自獨立確認按鈕
  - **信譽與紀錄**：**`created_at`**、**`invite_code`**、**`invited_by`**、**`exp_logs`** 近三個月橫向滑動（Layer 3 **`getMyRecentExpLogsAction`** → Layer 2 **`findRecentExpLogsForUser`**）
  - **興趣與技能標籤**：**雙區抬頭**——**興趣村莊**（紫）+ **技能市集**（琥珀抬頭；**`skills_offer`** 琥珀標籤、**`skills_want`** 天藍標籤，兩者合併於同一區，有任一即顯示）；全空時占位文案；手風琴**標題列**上 **✏️ 編輯** 為 **`Link` → `/profile/edit-tags`**，緊貼標題文字**後方**（**`onClick` → `stopPropagation`**，點編輯不觸發折疊）

## DB 欄位 SSOT 確認

- **經驗值**：**`total_exp`**（SSOT），**`exp`** 欄位廢棄勿用
- **IG**：**`instagram_handle`**（SSOT），**`ig_handle`** 欄位廢棄勿用
- **自白**：**`bio_village`** = 興趣自白，**`bio_market`** = 技能自白，**`bio`** 欄位暫保留（通用自白／Modal）

### 🗄️ 資料庫異動紀錄（交接必備）

- **`users`**：**`role`**（**`text`**，預設 **`member`**；**`admin`**／**`leader`** 可審核 IG 申請）、**`bio`**（text，可 null）、**`bio_village`**／**`bio_market`**、**`invite_code`**、**`invited_by`**、**`interests`**（**`text[]`**）、**`skills_offer`**／**`skills_want`**、**`core_values`**（**`jsonb`**，註冊 Step2 三題核心價值 slug 陣列；應用層／型別見 **`database.types.ts`** **`string[]`**）、**`instagram_handle`**、**`ig_public`**、**`mood`**、**`mood_at`**、**`last_checkin_at`**（簽到 24h 冷卻 SSOT）、**`last_seen_at`** 等與 **`database.types.ts`** 一致。遷移見 **`supabase/migrations/20260324120000_users_last_checkin_at.sql`**（**`core_values`** 若雲端尚未建立，請於 SQL Editor 補 **`jsonb`** 欄並 **Reload schema**）。
- **`ig_change_requests`**：**`user_id`**、**`old_handle`**、**`new_handle`**、**`status`**（**`pending`**／**`approved`**／**`rejected`**）、**`reviewed_by`**、**`reviewed_at`**、**`created_at`**；已 **ENABLE RLS**（政策可後補）；遷移見 **`supabase/migrations/20260324100000_ig_change_requests_and_user_role.sql`**。
- **註冊建檔**：**`completeAdventurerProfile`** 為避免 PostgREST／欄位快取問題，**insert 不帶 `bio`**（自介於個人頁 **`profile-update`** 填寫）。
- DDL 變更後若仍報「找不到欄位」，至 Supabase **Settings → API** 嘗試 **重新載入 Schema**。
- **`likes`**：已接線（**`from_user`**／**`to_user`**）。**雲端表無 `id` 欄位**（僅複合語意上的雙 uuid）；**`insertLike`** 只做 **insert**、**`Promise<void>`**，**不** `.select()` 讀回列；**`findLike`**／**`checkMutualLike`** 之 **`.select`** 僅 **`from_user, to_user`**，避免讀取不存在的欄位。型別見 **`database.types.ts`** **`likes.Row`**。
- **`alliances`**：**雙人血盟 SSOT**（**`user_a`**、**`user_b`**、**`initiated_by`**、**`status`**：`pending`／`accepted`／`dissolved`、`created_at`）；**`database.types.ts`** 與 Layer 2 **`alliance.repository.ts`**、Layer 3 **`alliance.action.ts`** 僅使用此表。
- **`user_alliances`**：**已廢棄**（曾規劃之分表，勿建）；**`supabase/migrations/20260325120000_user_alliances_pair.sql`** 檔首已標 **DEPRECATED**，**請勿在 Supabase 執行**。

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
| 每日簽到 +1 EXP | `src/services/daily-checkin.action.ts`（**`claimDailyCheckin`**；冷卻 **`users.last_checkin_at`**）；**`updateLastCheckinAt`** 見 `user.repository.ts`；**`insertExpLog`（`delta`+`delta_exp`）** 見 `exp.repository.ts`；機讀錯誤 **`DAILY_CHECKIN_ALREADY_CLAIMED`**（**`already_claimed`**）見 `daily-checkin.ts`；**`taipeiCalendarDateKey()`** 仍供其他日曆日用途，**簽到判斷已不採用** |
| 編輯自介／分域自白／**`instagram_handle`**／IG 公開／心情 | `src/services/profile-update.action.ts`（**支援部分欄位 patch**；**`mood`** 時更新 **`mood_at`**；**`bio_village`**／**`bio_market`**；**`instagram_handle`** 經 **`instagramHandleSchema`**；空字串寫入 **null**） |
| IG 變更申請／審核 | `src/services/ig-request.action.ts`（**`requestIgChangeAction`**、**`reviewIgRequestAction`**、**`getPendingIgRequestsAction`**）→ **`src/lib/repositories/server/ig-request.repository.ts`**（**admin client** 寫入 **`ig_change_requests`**、核准時更新 **`users.instagram_handle`**） |
| 管理：IG 待審 | `src/app/(app)/admin/ig-requests/page.tsx`（**role** 為 **admin／leader** 可進；其餘 **`redirect('/')`**） |
| 個人頁 EXP 紀錄 | `src/services/exp-logs.action.ts`（**`getMyRecentExpLogsAction`**）→ **`exp.repository`** **`findRecentExpLogsForUser`** |
| 首頁個人頁 UI | `src/app/(app)/page.tsx`（**`'use client'`**、**`useMyProfile`** SWR + **`HomePageSkeleton`**） → `src/components/profile/guild-profile-home.tsx` |
| 頭像裁切＋Cloudinary | **`react-easy-crop`** 全螢幕裁切；**`src/lib/utils/cropImage.ts`**（**`getCroppedImg`**）；**`src/lib/utils/cloudinary.ts`**（**`uploadAvatarToCloudinary`**）→ **`updateMyProfile({ avatar_url })`**（**禁止** **`supabase.storage`** 上傳頭像）；**顯示** **`src/components/ui/Avatar.tsx`**（**`next/image`** + Cloudinary **`/upload/w_{2×size},h_{2×size},c_fill,q_auto,f_auto/`**；**`next.config.mjs`** **`images.remotePatterns`**：**`res.cloudinary.com`**） |
| 底部導航 | `src/components/layout/Navbar.tsx`（**五項 lucide**：**Home／Compass／Swords／Heart／ShoppingBag**；選中 **`text-violet-400`**、未選 **`text-zinc-500`**、**`text-[10px]`** 標籤；首頁 **`/`** 僅 **`pathname === '/'`** 為 active） |
| 探索（村莊＋市集） | **`explore/page.tsx`**（**Server**：**`getVillageUsersAction`** 預載村莊）；**`ExploreClient.tsx`**（**`useSWR`** **`SWR_KEYS.villageUsers`** ＋ **`fallbackData`／`revalidateOnMount: false`**；市集 **`SWR_KEYS.marketUsers(query)`**、**`keepPreviousData`**；**`hidden`／`block`** 切 tab）；市集初次 **`isLoading`** 時 **6×`UserCardSkeleton`** |
| 列表骨架屏 | **`src/components/ui/UserCardSkeleton.tsx`**（**`animate-pulse`**） |
| 冒險團 | `src/app/(app)/guild/page.tsx`（**血盟** tab：**`useSWR`** **`SWR_KEYS.myAlliances`／`pendingAlliances`** 綁 **Server Action**；角標與列表；操作後 **`mutate`**；聊天／信件預留） |
| 雙人血盟（Layer 3） | **`src/services/alliance.action.ts`**（**`getAllianceStatusAction`**、**`requestAllianceAction`**、**`respondAllianceAction`**、**`dissolveAllianceAction`**、**`getMyAlliancesAction`**、**`getPendingRequestsAction`**） |
| 雙人血盟（Layer 2） | **`src/lib/repositories/server/alliance.repository.ts`** |
| 月老／商店預留 | `src/app/(app)/matchmaking/page.tsx`、`src/app/(app)/shop/page.tsx`（**即將開放**） |
| 舊路由轉址 | **`/village`**、**`/market`** → **`/explore`**；**`/alliances`**、**`/inbox`** → **`/guild`** |
| 使用者詳情 Modal | `src/components/modals/UserDetailModal.tsx`（開啟時 **`getModalSocialStatusAction`** 合併載入緣分／血盟；今日心情、雙欄自白、雙區標籤、**`toggleLikeAction`**＋**AlertDialog**；血盟操作後再拉合併狀態；**IG** 列：**`ig_public`** 或已血盟才顯示 **@handle**） |
| 有緣分＋互讚／Modal 合併載入 | **`src/services/social.action.ts`**（**`getModalSocialStatusAction`**：一次 **`auth.getUser()`** + **`Promise.all`**：**`findLike`** 雙向 + **`findAllianceBetween`**；仍含 **`getLikeStatusForTargetAction`**／**`checkMutualLikeWithTargetAction`**／**`toggleLikeAction`**） |
| 技能市集（邏輯） | `src/services/market.service.ts`（**`getMarketUsersAction`**、**`getCachedMySkills`** **`unstable_cache` 60s** **`tags: profileCacheTag`**、**`unstable_cache` 60s** 快取 **`findMarketUsers`**、**搜尋篩選在列表快取回傳後**、檔內 **Perfect Match**）；UI 見 **`MarketContent`** |
| 配對工具 | **`src/lib/utils/matching.ts`**（**`isOrientationMatch`**、**`calcInterestScore`**、**`calcSkillScore`**） |
| Users Repository | `src/lib/repositories/server/user.repository.ts`（**`findActiveUsers`**、**`findVillageUsers`**、**`findMarketUsers`**、**`updateLastCheckinAt`**） |
| EXP 寫入 | `src/lib/repositories/server/exp.repository.ts` |
| 等級 SSOT | `src/lib/constants/levels.ts` |
| 問卷選項 | `src/lib/constants/adventurer-questionnaire.ts` |
| 註冊條款內文 | **`src/lib/constants/terms.ts`**（**`TERMS_OF_SERVICE`**）；**`src/components/auth/TermsModal.tsx`** |
| 興趣／技能標籤選項（分類＋內建標籤） | SSOT **`src/lib/constants/tags.ts`**（**`ALL_INTEREST_TAGS`／`ALL_SKILL_TAGS`**）；**`interests.ts`／`skills.ts`** 僅 re-export |
| 註冊標籤 Step4／Step5 | **`src/components/register/TagSelector.tsx`**；**`/register/interests`**（興趣必選，**`sessionStorage.reg_interests`**）完成後 **`router.push('/register/skills')`**；**`/register/skills`** 為完整頁面：**我能教**（上）／**我想學**（下）、**`completeRegistration`** 一次寫入，**可跳過**（技能空陣列）；**歡迎 Modal** 僅於 Step5；舊路徑 **`skills-offer`／`skills-want`** 仍 **`redirect('/register/interests')`**（建議先補興趣） |
| 登入後編輯標籤 | **`/profile/edit-tags`**（**`edit-tags-client.tsx`**）；與註冊共用 **`register/TagSelector.tsx`** + **`tags.ts`**；三 **`TagSelector`** 皆 **`defaultOpenCategory={null}`**（預設收折）；三 Tab（興趣／能教／想學），**`updateMyProfile`** 分開儲存 |
| Zod／不雅字／IG 格式 | `src/lib/validation/*.ts`、`src/lib/utils/forbidden-words.ts` |
| DB 型別 | `src/types/database.types.ts`（含 **`ig_change_requests`**、**`users.role`**、**`skills_offer`**／**`skills_want`**） |
| 市集 Perfect Match 高光 | `src/app/globals.css`（**`.perfect-match-market-shell`**） |
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
| ✅ 已接線 | Layer 5 **`/explore`**：**Server** 預載村莊 → **`ExploreClient`**；頂部 **Switch** 村莊／市集（**市集 `useSWR`**＋**`hidden` 切 tab**）；**`UserCard`** 分 **`variant`**；**`UserDetailModal`** 仍展示完整興趣／技能 |
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
| **Layer 4** 狀態 | `src/hooks/`、`src/lib/swr/`、`src/store/`、`src/lib/constants/`、`src/lib/validation/`、`src/lib/utils/` | ✅ **`useMyProfile`**（**SWR** **`profile`** key）；✅ **`SWR_KEYS`**、**`SWRProvider`**；⏳ **Zustand** 尚未實作；✅ **常數、Zod schema、forbidden-words**；✅ **`date.ts`**（台灣日界 SSOT）；✅ **`matching.ts`**（性向／興趣／技能分數） |
| **Layer 5** UI | `src/components/*`、`src/app/*` | ✅ shadcn；**`Navbar`**（五欄底欄）、**`/explore`**（**`ExploreClient`**）、**`/guild`**、**`/matchmaking`**、**`/shop`**、**`UserCard`**、**`LevelFrame`**、個人頁與認證殼 |

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
- **Layer 2**：**`alliance.repository.ts`** — **`.from('alliances')`**、成對查詢（**`and(user_a…,user_b…)` OR 反向**）、待確認／已接受與 **users** embed（**`alliances_user_a_fkey`** 等）。
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
- **Layer 4**：新增 **`src/lib/swr/keys.ts`** — 匯出 **`SWR_KEYS`** 常數（**`profile`／`villageUsers`／`marketUsers(query)`／`myAlliances`／`pendingAlliances`**）。
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

- **Layer 5 — `src/components/layout/app-shell-motion.tsx`**：**`AnimatePresence`** 改 **`mode="sync"`**（新舊頁同時切換，不等舊頁 exit 完）；**`motion.div`** 仍僅 **opacity** 淡入淡出；**`transition.duration`** 改 **0.08s**（較原 0.2s 更短、幾乎無感）。

### 2026-03-25 — 首頁「今日心情」框深紫微光（規格對齊）

- **Layer 5 — `guild-profile-home.tsx`**：今日心情區最外層 **`section`** 使用 **`rounded-3xl border border-violet-500/30 bg-violet-950/40 backdrop-blur-xl p-4 space-y-3`** 與 **`boxShadow: '0 0 20px rgba(139,92,246,0.15)'`**；標題列 **✨ 今日心情** 與 **還有 {countdown}**（**`countdown &&`**）；確認鈕為紫膠囊（**`px-5 py-1.5 rounded-full text-xs`** 等）。

### 2026-03-25 — `/profile/edit-tags` 標籤分類預設全收折

- **Layer 5 — `edit-tags-client.tsx`**：興趣／能教／想學三個 **`TagSelector`** 皆加上 **`defaultOpenCategory={null}`**，與註冊 **`/register/interests`**、**`/register/skills`** 一致，進頁時分類手風琴**預設全部收折**。

### 2026-03-25 — **`likes`** 雲端無 **`id`**／Layer 2 查詢對齊

- **🗄️**：**`public.likes`** 僅 **`from_user`**、**`to_user`**（無 **`id`**）；**`database.types.ts`** 之 **`likes.Row`／`Insert`／`Update`** 已移除 **`id`**（及多餘 **`created_at`** 型別），與實表一致。
- **Layer 2 — `like.repository.ts`**：**`insertLike`** 改為 **`Promise<void>`**，insert 後**不** `.select()`；**`findLike`**、**`checkMutualLike`** 之 **`.select('from_user, to_user')`**，避免 PostgREST 讀取不存在欄位。

*最後更新：2026-03-25 — **`likes` 無 `id`／`insertLike` void／查詢僅 `from_user,to_user`**；**edit-tags `TagSelector` 全收折**；**今日心情框深紫微光**；**`AppShellMotion`**；**首頁／explore／guild SWR**；**Middleware Edge**、**`GET /api/ping`**、**雙人血盟**、**效能 Phase 1—4**。*
