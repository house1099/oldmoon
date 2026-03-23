# 月老事務所：傳奇公會 V2.0 — 交接文件

與 Vibe Coder／架構師同步專案狀態用。**每次在新視窗、新對話或調整架構前，請先讀本檔與根目錄 `.cursorrules`。**

## 🌕 目前開發階段：Phase 2 — 社交核心（進行中）

### 🛠️ 核心工具基準（Layer 4）

- **`src/lib/utils/date.ts`**：全系統唯一「公會日曆／時間基準點」。
  - **`taipeiCalendarDateKey()`**：強制使用 **`Asia/Taipei`** 產出 **`YYYY-MM-DD`**。
  - **規範**：嚴禁在 Action 或 Repository 中直接使用 `toISOString().slice(0, 10)`；必須引用此工具以確保台灣日界一致。

### 🏛️ 五層架構狀態（速覽）

- **Layer 1（連線）**：Supabase Client／Server／Admin 已完備。
- **Layer 2（資料）**：`user.repository.ts`、`exp.repository.ts` 支援 **`total_exp`**（SSOT）。
- **Layer 3（業務）**：`daily-checkin.action.ts` 已校準時區（日鍵來自 **`date.ts`**）。
- **Layer 4（狀態／常數）**：`levels.ts`（門檻 0〜1350）、Zod 驗證已就緒；**`date.ts`** 為日界 SSOT。
- **Layer 5（UI）**：**`Navbar.tsx`**（底部霓虹發光導航）、**`LevelFrame.tsx`**（Lv5〜10 與預留 **Master／Lv11+** 等級框特效）、村莊 **`UserCard`** 等。

### 📈 開發進度

- [x] **Phase 1.5**：帳號體系、Google 登入預留、暗黑視覺升級、時區校正（日鍵集中於 **`date.ts`**）。
- [ ] **Phase 2.1**：Village 興趣村莊列表（已接線，可持續打磨）、**Market** 技能市集（**Perfect Match** 演算法與頁面接線）。
- [ ] **Phase 2.2**：互讚系統（**Likes**）與血盟（**Alliances**）解鎖流程。

### 🗄️ 資料庫異動紀錄（交接必備）

- **`users`** 已補齊（與程式約定一致時）：**`instagram_handle`**、**`ig_public`**、**`mood`**、**`mood_at`**、**`interests`**、**`last_seen_at`**。
- **`likes`**、**`alliances`**：雲端建表後，請維持 **`src/types/database.types.ts`** 與 **RLS** 同步；Phase 2.2 於 Layer 2／3 接線。

---

## 新視窗／新架構 — 30 秒啟動

| 步驟 | 動作 |
|------|------|
| 1 | 讀 **`.cursorrules`**（五層禁則、回報格式、`total_exp` 等） |
| 2 | 讀本檔 **「目前開發階段」→「關鍵檔案索引」→「雲端 DDL」** |
| 3 | 實作時遵守：**UI 不直連 DB**；寫入經 **Layer 3 → Layer 2**；經驗值欄位僅 **`total_exp`** |
| 4 | **Phase 2 預設戰場**：**`/village`**（已接線）+ **`/market`**（頁面占位，待產品／接線） |

**Git**：`main` 已含 Phase 1.5（OAuth IG 補填、簽到 **Asia/Taipei** 日鍵、個人頁 Tabs／簽到／profile 更新等）。新架構若搬遷目錄，請同步更新本檔與 `.cursorrules` 路徑描述。

---

## 關鍵檔案索引（查程式用）

| 主題 | 路徑 |
|------|------|
| 守衛／Session | `src/middleware.ts` |
| Auth UI | `src/app/(auth)/login/*`、`register/*`、`register/profile/*` |
| OAuth callback | `src/app/auth/callback/route.ts` |
| 補名冊（含 IG） | `src/services/adventurer-profile.action.ts` |
| 每日簽到 +1 EXP | `src/services/daily-checkin.action.ts`；日鍵 SSOT：`src/lib/utils/date.ts`（`taipeiCalendarDateKey`） |
| 編輯自介／IG 公開／心情 | `src/services/profile-update.action.ts` |
| 首頁個人頁 UI | `src/app/(app)/page.tsx` → `src/components/profile/guild-profile-home.tsx` |
| 底部導航 | `src/components/layout/Navbar.tsx` |
| 村莊列表 | `src/app/(app)/village/*`、`src/services/village.service.ts`、`src/components/cards/UserCard.tsx`、`src/components/cards/LevelFrame.tsx` |
| Users Repository | `src/lib/repositories/server/user.repository.ts` |
| EXP 寫入 | `src/lib/repositories/server/exp.repository.ts` |
| 等級 SSOT | `src/lib/constants/levels.ts` |
| 問卷選項 | `src/lib/constants/adventurer-questionnaire.ts` |
| Zod／不雅字／IG 格式 | `src/lib/validation/*.ts`、`src/lib/utils/forbidden-words.ts` |
| DB 型別 | `src/types/database.types.ts` |

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

**Phase 2：社交核心**（🚧 **進行中** — **正式聚焦：興趣村莊 `/village` 與市集 `/market`**；村莊列表已接線）

| 狀態 | 說明 |
|------|------|
| ✅ 已接線 | Layer 2 **`findActiveUsers(currentUserId)`**：`status = active`、排除自己、依 **`last_seen_at`** 降序（最活躍在前） |
| ✅ 已接線 | Layer 3 **`getVillageUsers(currentUserId)`**：呼叫 Repository，並依**與自己的 `interests` 重疊數**優先排序（進階），同分再依 **`last_seen_at`** |
| ✅ 已接線 | Layer 5 **`UserCard`**（`src/components/cards/UserCard.tsx`）：暗黑 RPG、**`tag-gold`** 興趣標籤、**`LevelFrame`** 依等級外框（低階沿用 **`guild-breathe-ring`**）；shadcn **aspect-ratio**／**separator**／**hover-card** |
| ✅ 交接確認 | **`users`** 已補齊 **`last_seen_at`**、**`interests`** 等 Phase 2 欄位時，村莊排序與標籤可完整發揮；若環境尚未執行 DDL，見下方 🗄️ **Phase 2 欄位補齊** |

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
- **Phase 2 社交**：**`last_seen_at`**（最後活躍，村莊排序）；**`interests`**（興趣 slug／標籤列表，與自己交集越多排序越前）。型別見 **`src/types/database.types.ts`**。

### 登入與補資料流程（簡述）

1. 未登入造訪受保護路由 → Middleware → `/login`（可帶 `next=`）。
2. `/register` 註冊後（視專案是否開信箱驗證）→ 導向 `/register/profile` 補 **nickname + 問卷**（OAuth 若無 IG metadata，同頁 **動態補填 IG**）。
3. `completeAdventurerProfile`（`src/services/adventurer-profile.action.ts`）以 **admin client** 寫入 `users`（含 **`instagram_handle`**：metadata 優先，否則表單補填）；失敗時 **`console.error("❌ 伺服器寫入失敗詳細原因:", error)`** 便於 **Vercel Logs** 除錯。
4. Profile 就緒後 → 首頁 `src/app/(app)/page.tsx` 載入 **`GuildProfileHome`**（頭像首字、等級、`total_exp` 進度條、信譽、心情、Tabs「我的狀態／修改資料」、簽到、登出）。

### Admin／環境

- **`src/lib/supabase/admin.ts`** 使用 **`process.env.SUPABASE_SERVICE_ROLE_KEY`**（與 Vercel 後台變數名稱須**完全一致**、區分大小寫）。

---

# 五層架構進度（總表）

| 層級 | 路徑／約定 | 目前進度 |
|------|------------|----------|
| **Layer 1** 連線 | `src/lib/supabase/` | ✅ `client.ts`、`server.ts`、`admin.ts`；`Database` 型別已注入 client |
| **Layer 2** 資料 | `src/lib/repositories/server/` | ✅ `user.repository.ts`（`findProfileById`、`createProfile`、**`findActiveUsers(currentUserId)`**）、`exp.repository.ts`（admin）；`client/` 尚空 |
| **Layer 3** 業務 | `src/services/` | ✅ `auth-status.ts`、`auth.service.ts`、**`adventurer-profile.action.ts`**（含 OAuth IG 補填）、**`daily-checkin.action.ts`**（簽到時區 **Asia/Taipei**）、**`profile-update.action.ts`**、**`village.service.ts`（`getVillageUsers`）** |
| **Layer 4** 狀態 | `src/lib/hooks/`、`src/store/`、`src/lib/constants/`、`src/lib/validation/`、`src/lib/utils/` | ⏳ **hooks／Zustand** 尚未實作；✅ **常數、Zod schema、forbidden-words**；✅ **`src/lib/utils/date.ts`**（台灣日界 SSOT） |
| **Layer 5** UI | `src/components/*`、`src/app/*` | ✅ shadcn（含 **tabs**、**textarea**、**select**、**aspect-ratio**、**separator**、**hover-card**）；**暗黑奇幻**登入／註冊／補資料、`GuildAuthShell`、**個人頁**、**`Navbar`**、**`/village` + `UserCard` + `LevelFrame`**；`/market` 占位 |

**規則重申**：UI 不得直連 Supabase／SQL；僅 Layer 1 建立 client；寫入 `exp_logs` 等應經 Layer 2 → Layer 3。

---

# 已完成模組（細項）

- [x] `.cursorrules`、`HANDOFF.md`、`.env.example`
- [x] Next.js 14（App Router、TS、Tailwind v3、ESLint、`src/`）
- [x] 套件：Supabase、`zustand`、`zod`、`lucide-react`、shadcn（button、input、dialog、sonner、**select**、**tabs**、**textarea**）
- [x] `src/types/database.types.ts`（`users`：上列問卷欄位 + **`bio`**、**`core_values`**、**`instagram_handle`**、**`ig_public`**、**`mood`**、**`mood_at`**、**`total_exp`**、**`level`**、**`status`**、**`last_seen_at`**、**`interests`**；`exp_logs` 含 **`unique_key`** 等）
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

- **Phase 2.1（村莊 + 市集）**：深化 **`/village`**；實作 **`/market`** 與 **Perfect Match** 演算法（Layer 2／3／5）。
- **Phase 2.2（社交互動）**：**Likes**、**Alliances** 業務與 UI（雲端表已建時對齊 RLS 與型別）。

# 下一步（Phase 2 建議方向）

- **村莊**：雲端執行 🗄️ **Phase 2 欄位補齊**；登入心跳或 Edge Function 更新 **`last_seen_at`**；補「編輯興趣」表單（Layer 5）與寫入用例（Layer 3 → Layer 2）。
- **市集**：定義 `/market` 核心用例（瀏覽／篩選／互動邊界），再對齊五層實作與 RLS。
- 依產品規劃擴充 EXP 領獎、私訊／按讚等；Schema 變更時同步 `database.types.ts`。

---

## 🗄️ Phase 2 欄位補齊（`public.users`）

若 Supabase 尚無下列欄位，可於 SQL Editor 執行（**與 `database.types.ts` 對齊後再跑**）：

🗄️
```sql
alter table public.users
  add column if not exists last_seen_at timestamptz null;

alter table public.users
  add column if not exists interests text[] not null default '{}';
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

# 環境變數檢查清單

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`（僅伺服端／Edge／CI，勿進前端 bundle）
- [ ] `NEXT_PUBLIC_APP_URL`（PWA／OAuth redirect 等）

---

*最後更新：2025-03-23 — 新增頂部 **Phase 2 交接摘要**（**`date.ts`** 規範、五層速覽、進度勾選、DB 紀錄）；**關鍵檔案索引**與 **Unique Key** 改指向 **`taipeiCalendarDateKey`** SSOT；**UserCard**／**LevelFrame**、**Navbar** 納入 Layer 5 說明；**Phase 2** 區分 2.1（村莊／市集）與 2.2（Likes／Alliances）*
