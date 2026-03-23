# 月老事務所：傳奇公會 V2.0 — 交接文件

與 Vibe Coder／架構師同步專案狀態用。**每次在新視窗、新對話或調整架構前，請先讀本檔與根目錄 `.cursorrules`。**

## 🌕 目前開發階段：Phase 2 — 社交核心（進行中）

**下一視窗／下一階段預設焦點**：**Phase 2.2** — **Likes（有緣分）**、**Alliances（血盟）**、使用者詳情 Modal、註冊／個人頁是否補 **技能供需（`skills_offer`／`skills_want`）** 表單與 RLS。Phase 2.1 村莊＋市集已接線，見下表與「關鍵檔案索引」。

### 🛠️ 核心工具基準（Layer 4）

- **`src/lib/utils/date.ts`**：全系統唯一「公會日曆／時間基準點」。
  - **`taipeiCalendarDateKey()`**：強制使用 **`Asia/Taipei`** 產出 **`YYYY-MM-DD`**。
  - **規範**：嚴禁在 Action 或 Repository 中直接使用 `toISOString().slice(0, 10)`；必須引用此工具以確保台灣日界一致。

### 🏛️ 五層架構狀態（速覽）

- **Layer 1（連線）**：Supabase Client／Server／Admin 已完備。
- **Layer 2（資料）**：`user.repository.ts`、`exp.repository.ts` 支援 **`total_exp`**（SSOT）。
- **Layer 3（業務）**：`daily-checkin.action.ts` 已校準時區（日鍵來自 **`date.ts`**）。
- **Layer 4（狀態／常數）**：`levels.ts`（門檻 0〜1350）、Zod 驗證已就緒；**`date.ts`** 為日界 SSOT。
- **Layer 5（UI）**：**`Navbar.tsx`**、**`LevelFrame.tsx`**、**`UserCard`**（支援 **`perfectMatch`** 市集白金外環 **`perfect-match-market-shell`**）、**`/village`**、**`/market`**。

### 📈 開發進度

- [x] **Phase 1.5**：帳號體系、Google 登入預留、暗黑視覺升級、時區校正（日鍵集中於 **`date.ts`**）。
- [x] **Phase 2.1（核心已交付）**：**`/village`** 興趣村莊（重疊排序＋`UserCard`）；**`/market`** 技能市集 **`getMarketUsers`**、**`evaluatePerfectMatch`**、**Perfect Match** 卡片高光；Layer 2 **`findMarketUsers`**。可持續打磨 UX／篩選／RLS。
- [ ] **Phase 2.2（進行中／下一波）**：**Likes**、**Alliances** 業務與 UI、詳情 Modal、互動解鎖規則；雲端 **RLS** 與型別對齊。

### 🗄️ 資料庫異動紀錄（交接必備）

- **`users`**：**`bio`**（text，可 null）、**`interests`**（**須為 `text[]`**，勿用單一 text）、**`skills_offer`**／**`skills_want`**（`text[]`，建議 **`default '{}'`**）、以及 **`instagram_handle`**、**`ig_public`**、**`mood`**、**`mood_at`**、**`last_seen_at`** 等與 **`database.types.ts`** 一致。
- **註冊建檔**：**`completeAdventurerProfile`** 為避免 PostgREST／欄位快取問題，**insert 不帶 `bio`**（自介於個人頁 **`profile-update`** 填寫）。
- DDL 變更後若仍報「找不到欄位」，至 Supabase **Settings → API** 嘗試 **重新載入 Schema**。
- **`likes`**、**`alliances`**：雲端建表後維持型別與 **RLS**；Phase 2.2 於 Layer 2／3 接線。

---

## 新視窗／新架構 — 30 秒啟動

| 步驟 | 動作 |
|------|------|
| 1 | 讀 **`.cursorrules`**（五層禁則、回報格式、`total_exp` 等） |
| 2 | 讀本檔 **「目前開發階段」→「關鍵檔案索引」→「雲端 DDL」** |
| 3 | 實作時遵守：**UI 不直連 DB**；寫入經 **Layer 3 → Layer 2**；經驗值欄位僅 **`total_exp`** |
| 4 | **Phase 2 戰場**：**`/village`** + **`/market`**（Perfect Match 已接線）；**下一波** **Phase 2.2**（Likes／Alliances／Modal） |

**Git**：`main` 含 Phase 1.5、**`date.ts`**、**LevelFrame**、**市集／村莊**、註冊 **`bio` insert 省略** 與 **`skills_*`** 型別對齊等。新架構若搬遷目錄，請同步更新本檔與 `.cursorrules`。

---

## 關鍵檔案索引（查程式用）

| 主題 | 路徑 |
|------|------|
| 守衛／Session | `src/middleware.ts` |
| Auth UI | `src/app/(auth)/login/*`、`register/*`、`register/profile/*` |
| OAuth callback | `src/app/auth/callback/route.ts` |
| 補名冊（含 IG） | `src/services/adventurer-profile.action.ts`（註冊 insert **不帶 `bio`**） |
| 每日簽到 +1 EXP | `src/services/daily-checkin.action.ts`；重複簽到字串常數 `src/lib/constants/daily-checkin.ts`；日鍵 SSOT：`src/lib/utils/date.ts`（`taipeiCalendarDateKey`） |
| 編輯自介／IG 公開／心情 | `src/services/profile-update.action.ts`（**支援部分欄位 patch**，僅在傳入 `mood` 時更新 `mood_at`） |
| 首頁個人頁 UI | `src/app/(app)/page.tsx` → `src/components/profile/guild-profile-home.tsx` |
| 底部導航 | `src/components/layout/Navbar.tsx` |
| 村莊列表 | `src/app/(app)/village/*`、`src/services/village.service.ts`、`src/components/cards/UserCard.tsx`、`src/components/cards/LevelFrame.tsx` |
| 技能市集 | `src/app/(app)/market/page.tsx`、`src/services/market.service.ts`（**`evaluatePerfectMatch`**、**`getMarketUsers`**） |
| Users Repository | `src/lib/repositories/server/user.repository.ts`（**`findActiveUsers`**、**`findMarketUsers`**） |
| EXP 寫入 | `src/lib/repositories/server/exp.repository.ts` |
| 等級 SSOT | `src/lib/constants/levels.ts` |
| 問卷選項 | `src/lib/constants/adventurer-questionnaire.ts` |
| Zod／不雅字／IG 格式 | `src/lib/validation/*.ts`、`src/lib/utils/forbidden-words.ts` |
| DB 型別 | `src/types/database.types.ts`（含 **`skills_offer`**／**`skills_want`**） |
| 市集 Perfect Match 高光 | `src/app/globals.css`（**`.perfect-match-market-shell`**） |

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
| ✅ 已完成 | **每日簽到時區**：**`claimDailyCheckin`**（`daily-checkin.action.ts`）產生 `unique_key` 之日期 **不可**使用 `toISOString()`（UTC）；已改為 **`Intl.DateTimeFormat` + `timeZone: 'Asia/Taipei'`** 取得 **`YYYY-MM-DD`**，與台灣日界一致。 |

**Phase 2：社交核心**（🚧 **進行中** — **2.1 村莊＋市集已接線**；**2.2 互動／血盟為下一波**）

| 狀態 | 說明 |
|------|------|
| ✅ 已接線 | Layer 2 **`findActiveUsers`**、**`findMarketUsers`**（語意分域，內容同活躍列表） |
| ✅ 已接線 | Layer 3 **`getVillageUsers`**：依與自己的 **`interests` 重疊數**排序，同分 **`last_seen_at`** |
| ✅ 已接線 | Layer 3 **`getMarketUsers`**、**`evaluatePerfectMatch`**：**我想要的∩他提供的** 與 **他想要的∩我提供的** 皆非空 → **`isPerfectMatch`**；市集僅以 **`skills_want`／`skills_offer`** 計算（**不**退回 `interests`） |
| ✅ 已接線 | Layer 5 **`/village`**、**`/market`**；**`UserCard`**（**`tag-gold`**、**`LevelFrame`**、**`hover-card`**；市集 **Perfect Match** 時 **白金外環**） |
| ✅ 交接確認 | **`users`** 須 **`interests` 為 `text[]`**，並建議具 **`bio`**、**`skills_offer`**、**`skills_want`**（見 🗄️）；DDL 後必要時 **重載 API Schema** |

**Phase 3**：待產品規劃後於此文件更新。

---

# Phase 1 收尾紀錄（雲端對齊與除錯）

### `public.users` 與程式約定（務必與 Supabase 一致）

- **暱稱**：`nickname`（**非** `display_name`）。
- **問卷欄位**（與「自介」分開）：`gender`、`region`、`orientation`、`offline_ok`（boolean）；**自介**為獨立欄位 **`users.bio`**（text，可 null）。表單選項 **value 為英文 slug**，**label 為繁中**，定義於 `src/lib/constants/adventurer-questionnaire.ts`。
- **Phase 1.5 擴充欄位**：**`instagram_handle`**、**`ig_public`**、**`mood`**、**`mood_at`**（見下方 🗄️）；**`orientation`** 為隱私，公會公開 UI 不應展示。
- **累積經驗值**：欄位名必為 **`total_exp`**（**勿**使用不存在的 `exp` 欄位名；Trigger／函式亦須對齊 `total_exp`）。
- **等級**：`level`；新建 profile 時 insert 帶入 `total_exp: 0`、`level: 1` 初值（真實數值仍由雲端 Trigger／規則為準）。
- **狀態**：`status`（`active`／`banned`），Middleware 會處理放逐流程。
- **Phase 2 社交**：**`last_seen_at`**；**`interests`**（**`text[]`**，村莊排序用）；**`skills_offer`**／**`skills_want`**（市集 Perfect Match **僅**依此兩欄，**不**退回興趣）。型別見 **`src/types/database.types.ts`**。

### 登入與補資料流程（簡述）

1. 未登入造訪受保護路由 → Middleware → `/login`（可帶 `next=`）。
2. `/register` 註冊後（視專案是否開信箱驗證）→ 導向 `/register/profile` 補 **nickname + 問卷**（OAuth 若無 IG metadata，同頁 **動態補填 IG**）。
3. `completeAdventurerProfile` 以 **admin client** 寫入 `users`（**不帶 `bio`**；**`instagram_handle`** metadata 優先）；**`bio`** 於個人頁 **`profile-update`** 填寫。失敗時 **`console.error("❌ 伺服器寫入失敗詳細原因:", error)`**。
4. Profile 就緒後 → 首頁 `src/app/(app)/page.tsx` 載入 **`GuildProfileHome`**（精簡頭像卡＋等級進度；**Accordion** 收合「今日心情／自白／信譽與紀錄／興趣與價值觀」；**「修改資料」** 改為 **Dialog Modal** 編輯自介／IG 公開／心情；簽到、登出；頁面容器 **`pb-32` + `safe-area-inset-bottom`** 防 Navbar 遮擋）。

### Admin／環境

- **`src/lib/supabase/admin.ts`** 使用 **`process.env.SUPABASE_SERVICE_ROLE_KEY`**（與 Vercel 後台變數名稱須**完全一致**、區分大小寫）。

---

# 五層架構進度（總表）

| 層級 | 路徑／約定 | 目前進度 |
|------|------------|----------|
| **Layer 1** 連線 | `src/lib/supabase/` | ✅ `client.ts`、`server.ts`、`admin.ts`；`Database` 型別已注入 client |
| **Layer 2** 資料 | `src/lib/repositories/server/` | ✅ `user.repository.ts`（`findProfileById`、`createProfile`、**`findActiveUsers`**、**`findMarketUsers`**）、`exp.repository.ts`（admin）；`client/` 尚空 |
| **Layer 3** 業務 | `src/services/` | ✅ 同上列 + **`market.service.ts`**（**`getMarketUsers`**、Perfect Match）、**`village.service.ts`** |
| **Layer 4** 狀態 | `src/lib/hooks/`、`src/store/`、`src/lib/constants/`、`src/lib/validation/`、`src/lib/utils/` | ⏳ **hooks／Zustand** 尚未實作；✅ **常數、Zod schema、forbidden-words**；✅ **`src/lib/utils/date.ts`**（台灣日界 SSOT） |
| **Layer 5** UI | `src/components/*`、`src/app/*` | ✅ shadcn；**`Navbar`**、**`/village`**、**`/market`**、**`UserCard`**（**`perfectMatch`**）、**`LevelFrame`**、個人頁與認證殼 |

**規則重申**：UI 不得直連 Supabase／SQL；僅 Layer 1 建立 client；寫入 `exp_logs` 等應經 Layer 2 → Layer 3。

---

# 已完成模組（細項）

- [x] `.cursorrules`、`HANDOFF.md`、`.env.example`
- [x] Next.js 14（App Router、TS、Tailwind v3、ESLint、`src/`）
- [x] 套件：Supabase、`zustand`、`zod`、`lucide-react`、shadcn（button、input、dialog、sonner、**select**、**tabs**、**textarea**、**accordion**、**alert-dialog**、**switch**）
- [x] **PWA（standalone）**：根目錄 **`public/manifest.json`**（**`display": "standalone"`**、`start_url` **`/`**、`theme_color` **`#000000`**；圖示暫用 **`/favicon.ico`**，可另補 192／512 PNG）；**`src/app/layout.tsx`** 設 **`metadata.manifest: "/manifest.json"`**、**`appleWebApp`**（**`capable: true`**、**`statusBarStyle: "black-translucent"`**）、**`viewport.themeColor`** 與 manifest 對齊；**`middleware`** 放行 **`/manifest.json`** 免被 Session 擋下。
- [x] **Auth UI（單一面板）**：**`GuildAuthShell`** 將標題與表單收進**同一 `.glass-panel`**；登入／註冊表單 **Label／Input／Button** 統一 **高對比 `text-zinc-100`**，動線集中、減少上下留白分離。
- [x] **個人頁 V1 風格**：**`guild-profile-home.tsx`** 改 **Accordion + Dialog**（移除 Tabs）；首頁容器 **`pb-[max(8rem,calc(8rem+env(safe-area-inset-bottom,0px)))]`**。
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

**機制**：`exp_logs.unique_key` 欄位在 DB 為 **UNIQUE**；同一業務鍵（例如 `daily_checkin:2025-03-22:userId`）第二次插入會失敗。**每日簽到**之日期段為 **台灣日界**（`Asia/Taipei` 之 `YYYY-MM-DD`），**勿**用 UTC `toISOString().slice(0,10)` 當「當日」鍵。

**應用層約定**（實作 EXP 領獎／任務時遵守）：

1. **Layer 2**：`insertExpLog` 已將 **`23505`** 轉成 **`DuplicateExpRewardError`**（預設訊息：**「你已經領取過這份獎勵了喵！」**）；其餘錯誤原樣拋出。
2. **Layer 3**：可再攔截 `DuplicateExpRewardError` 做冪等成功／toast；若自行呼叫 repository，亦可補攔 **`23505`**。
3. **Layer 5**：只顯示友善文案（toast／dialog），**不**把原始 SQL 或內部 key 暴露給使用者。
4. 產生 `unique_key` 的規則（前綴、**日曆日（含時區）**、user id）必須使用 **`src/lib/utils/date.ts` 之 `taipeiCalendarDateKey()`**（全系統唯一日界基準），避免各處字串拼裝不一致。

---

# 進行中任務

- **Phase 2.2（優先）**：**`like.repository`**／**`social.action`**（互讚、互讚檢查）、**UserDetailModal**（Bio／心情／標籤，**不展示 `orientation`**）、血盟申請解鎖規則；**RLS** 與 **`messages`** 若需一併規劃則列入手冊。
- **打磨（可並行）**：**`/village`**／**`/market`** 篩選、編輯 **技能供需** 表單（Layer 5 → Layer 3 → Layer 2）、登入心跳更新 **`last_seen_at`**。

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

- **Layer 5 — `guild-profile-home.tsx`**：**IG `Switch`** 改為 **`onCheckedChange` 直接呼叫 `updateMyProfile({ ig_public })`**，**移除** IG 區塊 **[確認修改]**；成功 **`toast.success("IG 公開狀態已更新")`**，失敗還原開關並 **toast.error**。大頭貼區 **相機鈕**＋隱藏 **`input type="file"`**，以 **`createClient()`（`@supabase/ssr` browser）** 上傳至 Storage **`avatars`** 路徑 **`{userId}/{timestamp}.{ext}`**，**`getPublicUrl`** 後經 **`updateMyProfile({ avatar_url })`** 寫入 **`users.avatar_url`**（**HTTPS** 驗證）。雲端須已建 **`avatars`** bucket（建議 **Public**）並設定 **authenticated** 可 **upload** 之 **RLS／Policy**。
- **Layer 5 — 極簡導覽**：**`/village`**、**`/market`** 移除左上角 **「返回公會大廳」**。**`UserCard`** 移除 **`HoverCard`**，整卡 **`role="button"`** 點擊開 **UserDetailModal**。
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

*最後更新：2025-03-23 — **任務 12**：簽到錯誤透明化、曆日預檢、冷卻 UI 與 UTF-8 友善字串（Server Action 純 JSON 可序列化物件）。*
