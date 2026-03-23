# 月老事務所：傳奇公會 V2.0 — 交接文件

與 Vibe Coder 同步專案狀態用；**每次開啟新對話請先讀本檔**（見 `.cursorrules`）。

# 目前開發階段

**Phase 1：地基建設**（✅ **已完成**）

| 狀態 | 說明 |
|------|------|
| ✅ 已完成 | 專案骨架、五層目錄、Layer 1 連線、Schema 型別與常數、**守衛（`src/middleware.ts`）**、SSOT 等級門檻、`exp_logs` 防重複領獎（Layer 2） |
| ✅ 已完成 | **Auth 全流程**：`/login`、`/register`、`/register/profile`、首頁 `/(app)/`；Email／密碼經 Supabase Auth；補齊 profile 經 **`completeAdventurerProfile`**（admin `createProfile`）；**Vercel 部署可成功登入並進入公會** |

**Phase 2／Phase 3**：待產品規劃後於此文件更新。

---

# Phase 1 收尾紀錄（雲端對齊與除錯）

### `public.users` 與程式約定（務必與 Supabase 一致）

- **暱稱**：`nickname`（**非** `display_name`）。
- **問卷欄位**（獨立欄位，**無** `bio`）：`gender`、`region`、`orientation`、`offline_ok`（boolean）；表單選項 **value 為英文 slug**，**label 為繁中**，定義於 `src/lib/constants/adventurer-questionnaire.ts`。
- **累積經驗值**：欄位名必為 **`total_exp`**（**勿**使用不存在的 `exp` 欄位名；Trigger／函式亦須對齊 `total_exp`）。
- **等級**：`level`；新建 profile 時 insert 帶入 `total_exp: 0`、`level: 1` 初值（真實數值仍由雲端 Trigger／規則為準）。
- **狀態**：`status`（`active`／`banned`），Middleware 會處理放逐流程。

### 登入與補資料流程（簡述）

1. 未登入造訪受保護路由 → Middleware → `/login`（可帶 `next=`）。
2. `/register` 註冊後（視專案是否開信箱驗證）→ 導向 `/register/profile` 補 **nickname + 問卷**。
3. `completeAdventurerProfile`（`src/services/adventurer-profile.action.ts`）以 **admin client** 寫入 `users`；失敗時 **`console.error("❌ 伺服器寫入失敗詳細原因:", error)`** 便於 **Vercel Logs** 除錯。
4. Profile 就緒後 → 首頁 `src/app/(app)/page.tsx` 顯示「歡迎回到公會」並使用 **`profile.nickname`**。

### Admin／環境

- **`src/lib/supabase/admin.ts`** 使用 **`process.env.SUPABASE_SERVICE_ROLE_KEY`**（與 Vercel 後台變數名稱須**完全一致**、區分大小寫）。

---

# 五層架構進度（總表）

| 層級 | 路徑／約定 | 目前進度 |
|------|------------|----------|
| **Layer 1** 連線 | `src/lib/supabase/` | ✅ `client.ts`、`server.ts`、`admin.ts`；`Database` 型別已注入 client |
| **Layer 2** 資料 | `src/lib/repositories/server/` | ✅ `user.repository.ts`（`findProfileById`、`createProfile`）、`exp.repository.ts`（admin）；`client/` 尚空 |
| **Layer 3** 業務 | `src/services/` | ✅ `auth-status.ts`、`auth.service.ts`、**`adventurer-profile.action.ts`**；EXP／領獎等用例待建 |
| **Layer 4** 狀態 | `src/lib/hooks/`、`src/store/` | ⏳ 目錄已建，Zustand／hooks 尚未實作 |
| **Layer 5** UI | `src/components/*`、`src/app/*` | ✅ shadcn（含 **select**）、`Providers`+`Toaster`；**暗黑奇幻登入／註冊／補資料 UI**、`GuildAuthShell`、首頁歡迎 |

**規則重申**：UI 不得直連 Supabase／SQL；僅 Layer 1 建立 client；寫入 `exp_logs` 等應經 Layer 2 → Layer 3。

---

# 已完成模組（細項）

- [x] `.cursorrules`、`HANDOFF.md`、`.env.example`
- [x] Next.js 14（App Router、TS、Tailwind v3、ESLint、`src/`）
- [x] 套件：Supabase、`zustand`、`lucide-react`、shadcn（button、input、dialog、sonner、**select**）
- [x] `src/types/database.types.ts`（`users`：`nickname`、`gender`、`region`、`orientation`、`offline_ok`、`total_exp`、`level`、**`status`**；`exp_logs` 含 **`unique_key`** 等）
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

- **`src/lib/constants/levels.ts`**：`LEVEL_MIN_EXP_BY_LEVEL`／`LEVEL_TIERS`、`getLevelTierByExp`、`getLevelNumberFromExp` 僅供 **UI 文案、預覽、教學**；門檻已與 🗄️ **`calculate_level`** 對齊：**Lv1:0, Lv2:10, Lv3:30, Lv4:60, Lv5:100, Lv6:150, Lv7:210, Lv8:280, Lv9:360, Lv10:450**。
- **變更流程**：調整門檻時 **同一個小塊拼圖** 內同步（1）🗄️ Trigger／SQL 常數（2）`levels.ts`（3）必要時更新本段說明。
- **長期選項**：可改由後端回傳「當前階顯示用 DTO」單一來源，仍須與 DB 規則一致。

---

# Unique Key：防重複領獎與報錯處理

**機制**：`exp_logs.unique_key` 欄位在 DB 為 **UNIQUE**；同一業務鍵（例如 `daily_checkin:2025-03-22:userId`）第二次插入會失敗。

**應用層約定**（實作 EXP 領獎／任務時遵守）：

1. **Layer 2**：`insertExpLog` 已將 **`23505`** 轉成 **`DuplicateExpRewardError`**（預設訊息：**「你已經領取過這份獎勵了喵！」**）；其餘錯誤原樣拋出。
2. **Layer 3**：可再攔截 `DuplicateExpRewardError` 做冪等成功／toast；若自行呼叫 repository，亦可補攔 **`23505`**。
3. **Layer 5**：只顯示友善文案（toast／dialog），**不**把原始 SQL 或內部 key 暴露給使用者。
4. 產生 `unique_key` 的規則（前綴、日期、user id）建議集中在 **Layer 3 常數或純函式**，避免各處字串拼裝不一致。

---

# 進行中任務

- （無 — Phase 1 已封板）

# 下一步（Phase 2 建議方向）

- 依產品規劃擴充 Layer 3／4／5（EXP 領獎、社交、公會 UI 等）；雲端 Schema 變更時同步 `database.types.ts`。

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

*最後更新：Phase 1 封板 — Auth／profile 與雲端 `users` 對齊（`nickname`、`total_exp`、問卷欄位）、Vercel 可成功登入*
