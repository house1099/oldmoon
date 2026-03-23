# 月老事務所：傳奇公會 V2.0 — 交接文件

與 Vibe Coder 同步專案狀態用；**每次開啟新對話請先讀本檔**（見 `.cursorrules`）。

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
| ✅ 已接線 | Layer 5 **`UserCard`**（`src/components/cards/UserCard.tsx`）：暗黑 RPG、**`tag-gold`** 興趣標籤、**`guild-breathe-ring`** 呼吸燈邊框；shadcn **aspect-ratio**／**separator**／**hover-card** |
| ⏳ 雲端待對齊 | `users` 需具備 **`last_seen_at`**（`timestamptz`，可 null）、**`interests`**（建議 `text[]` 或與程式一致之 jsonb 陣列）；見下方 🗄️ **Phase 2 欄位補齊** |

**Phase 3**：待產品規劃後於此文件更新。

---

# Phase 1 收尾紀錄（雲端對齊與除錯）

### `public.users` 與程式約定（務必與 Supabase 一致）

- **暱稱**：`nickname`（**非** `display_name`）。
- **問卷欄位**（獨立欄位，**無** `bio`）：`gender`、`region`、`orientation`、`offline_ok`（boolean）；表單選項 **value 為英文 slug**，**label 為繁中**，定義於 `src/lib/constants/adventurer-questionnaire.ts`。
- **累積經驗值**：欄位名必為 **`total_exp`**（**勿**使用不存在的 `exp` 欄位名；Trigger／函式亦須對齊 `total_exp`）。
- **等級**：`level`；新建 profile 時 insert 帶入 `total_exp: 0`、`level: 1` 初值（真實數值仍由雲端 Trigger／規則為準）。
- **狀態**：`status`（`active`／`banned`），Middleware 會處理放逐流程。
- **Phase 2 社交**：**`last_seen_at`**（最後活躍，村莊排序）；**`interests`**（興趣 slug／標籤列表，與自己交集越多排序越前）。型別見 **`src/types/database.types.ts`**。

### 登入與補資料流程（簡述）

1. 未登入造訪受保護路由 → Middleware → `/login`（可帶 `next=`）。
2. `/register` 註冊後（視專案是否開信箱驗證）→ 導向 `/register/profile` 補 **nickname + 問卷**（OAuth 若無 IG metadata，同頁 **動態補填 IG**）。
3. `completeAdventurerProfile`（`src/services/adventurer-profile.action.ts`）以 **admin client** 寫入 `users`（含 **`instagram_handle`**：metadata 優先，否則表單補填）；失敗時 **`console.error("❌ 伺服器寫入失敗詳細原因:", error)`** 便於 **Vercel Logs** 除錯。
4. Profile 就緒後 → 首頁 `src/app/(app)/page.tsx` 顯示「歡迎回到公會」並使用 **`profile.nickname`**。

### Admin／環境

- **`src/lib/supabase/admin.ts`** 使用 **`process.env.SUPABASE_SERVICE_ROLE_KEY`**（與 Vercel 後台變數名稱須**完全一致**、區分大小寫）。

---

# 五層架構進度（總表）

| 層級 | 路徑／約定 | 目前進度 |
|------|------------|----------|
| **Layer 1** 連線 | `src/lib/supabase/` | ✅ `client.ts`、`server.ts`、`admin.ts`；`Database` 型別已注入 client |
| **Layer 2** 資料 | `src/lib/repositories/server/` | ✅ `user.repository.ts`（`findProfileById`、`createProfile`、**`findActiveUsers(currentUserId)`**）、`exp.repository.ts`（admin）；`client/` 尚空 |
| **Layer 3** 業務 | `src/services/` | ✅ `auth-status.ts`、`auth.service.ts`、**`adventurer-profile.action.ts`**（含 OAuth IG 補填）、**`daily-checkin.action.ts`**（簽到時區 **Asia/Taipei**）、**`profile-update.action.ts`**、**`village.service.ts`（`getVillageUsers`）** |
| **Layer 4** 狀態 | `src/lib/hooks/`、`src/store/` | ⏳ 目錄已建，Zustand／hooks 尚未實作 |
| **Layer 5** UI | `src/components/*`、`src/app/*` | ✅ shadcn（含 **select**、**aspect-ratio**、**separator**、**hover-card**）、`Providers`+`Toaster`；**暗黑奇幻登入／註冊／補資料 UI**、`GuildAuthShell`、首頁歡迎、**`/village` + `UserCard`** |

**規則重申**：UI 不得直連 Supabase／SQL；僅 Layer 1 建立 client；寫入 `exp_logs` 等應經 Layer 2 → Layer 3。

---

# 已完成模組（細項）

- [x] `.cursorrules`、`HANDOFF.md`、`.env.example`
- [x] Next.js 14（App Router、TS、Tailwind v3、ESLint、`src/`）
- [x] 套件：Supabase、`zustand`、`lucide-react`、shadcn（button、input、dialog、sonner、**select**）
- [x] `src/types/database.types.ts`（`users`：`nickname`、`gender`、`region`、`orientation`、`offline_ok`、`total_exp`、`level`、**`status`**、**`last_seen_at`**、**`interests`**；`exp_logs` 含 **`unique_key`** 等）
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
4. 產生 `unique_key` 的規則（前綴、**日曆日（含時區）**、user id）建議集中在 **Layer 3 常數或純函式**（例如 **`daily-checkin.action.ts` 之 `taipeiCalendarDateKey`**），避免各處字串拼裝不一致。

---

# 進行中任務

- **Phase 2（村莊 + 市集）**：深化 **`/village`**（列表、卡片、興趣排序、體驗打磨）；並啟動 **`/market`** 產品與接線節奏。雲端補上 **`last_seen_at`／`interests`** 後村莊排序與標籤可完整發揮。

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

*最後更新：Phase 1.5 收尾 — **OAuth IG 補填**、**簽到 `Asia/Taipei` 日鍵**；**準備進入 Phase 2（村莊 `/village` + 市集 `/market`）**；`total_exp` 與等級門檻以 `levels.ts`／雲端 Trigger 為準；雲端待補 `last_seen_at`／`interests`*
