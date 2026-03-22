# 月老事務所：傳奇公會 V2.0 — 交接文件

與 Vibe Coder 同步專案狀態用；**每次開啟新對話請先讀本檔**（見 `.cursorrules`）。

# 目前開發階段

**Phase 1：地基建設**（進行中）

| 狀態 | 說明 |
|------|------|
| ✅ 已完成 | 專案骨架、五層目錄、Layer 1 連線、Schema 型別與常數、**守衛（`src/middleware.ts`）**、SSOT 等級門檻、`exp_logs` 防重複領獎（Layer 2） |
| 🔜 **最終章** | **登入與註冊頁面實作**（`/login`、`/register`、`/register/profile` UI + Supabase Auth 與 Middleware 銜接） |

**Phase 2／Phase 3**：待 Phase 1 收尾後於此文件更新。

---

# 五層架構進度（總表）

| 層級 | 路徑／約定 | 目前進度 |
|------|------------|----------|
| **Layer 1** 連線 | `src/lib/supabase/` | ✅ `client.ts`、`server.ts`、`admin.ts`；`Database` 型別已注入 client |
| **Layer 2** 資料 | `src/lib/repositories/server/` | ✅ `user.repository.ts`、`exp.repository.ts`（admin）；`client/` 尚空 |
| **Layer 3** 業務 | `src/services/` | ✅ `auth-status.ts`、`auth.service.ts`；EXP／領獎等用例待建 |
| **Layer 4** 狀態 | `src/lib/hooks/`、`src/store/` | ⏳ 目錄已建，Zustand／hooks 尚未實作 |
| **Layer 5** UI | `src/components/*`、`src/app/*` | ✅ shadcn、`Providers`+`Toaster`；**Auth 表單頁面待做** |

**規則重申**：UI 不得直連 Supabase／SQL；僅 Layer 1 建立 client；寫入 `exp_logs` 等應經 Layer 2 → Layer 3。

---

# 已完成模組（細項）

- [x] `.cursorrules`、`HANDOFF.md`、`.env.example`
- [x] Next.js 14（App Router、TS、Tailwind v3、ESLint、`src/`）
- [x] 套件：Supabase、`zustand`、`lucide-react`、shadcn（button、input、dialog、sonner）
- [x] `src/types/database.types.ts`（`users` 含 **`status`**、`exp_logs` 含 **`unique_key`** 等）
- [x] `src/lib/constants/levels.ts`（稱號與 EXP 門檻 — 見下方 **SSOT**）
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
| `components/ui/`、`cards/`、`modals/`、`layout/`、`shared/` | Layer 5 |

---

# SSOT：等級與門檻對齊（Single Source of Truth）

**約定**：玩家「真實等級」以 **資料庫** 為準 — `users.level`（與 `total_exp`）由雲端 **Trigger／函式**依門檻計算。

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

- （無 — 等待 Phase 1 最終章開工）

# 下一步（Phase 1 最終章）

- **登入與註冊頁面**：`/login`、`/register`、`/register/profile` + Supabase Auth（email／OAuth 依產品選型）

# 待解決問題 (Known Issues)

- `database.types.ts` 手動維護；雲端 Schema 變更後請同步型別
- 若雲端尚未有 **`users.status`**，需補 🗄️ migration
- 部署環境須具備 **`SUPABASE_SERVICE_ROLE_KEY`**（Middleware／admin）

# 環境變數檢查清單

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`（僅伺服端／Edge／CI，勿進前端 bundle）
- [ ] `NEXT_PUBLIC_APP_URL`（PWA／OAuth redirect 等）

---

*最後更新：Step 4 — 守衛就位、SSOT 十階門檻、`exp_logs` 防重複領獎、Vercel 部署設定*
