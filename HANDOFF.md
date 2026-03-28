# 月老事務所：傳奇公會 V2.0 — HANDOFF（主檔）

與 Vibe Coder／架構師同步用。**新對話請先讀本檔與根目錄 `.cursorrules`。** 細節見子檔，避免一次載入過長上下文。

## 子檔讀取說明

| 檔案 | 何時讀 |
|------|--------|
| **`HANDOFF.md`**（本檔） | **每次任務必讀** — 階段、禁則、SSOT 摘要、檔案索引、最近完成、下一步 |
| **`HANDOFF_DB.md`** | 查表結構、欄位 SSOT、遷移、RLS、DDL 補丁 |
| **`HANDOFF_FEATURES.md`** | 查功能 ✅/🔲、已知 bug、視覺待辦、Wave 摘要 |
| **`HANDOFF_HISTORY.md`** | **通常不讀** — 逐日任務長文與舊版完整敘事 |

**任務完成後**：僅更新本檔 **「最近完成」** 與 **「下一步待辦」**；若涉 DB／功能里程碑，將**詳細紀錄**寫入對應子檔。

---

## 目前開發階段（一句）

**Phase 2 — 社交核心進行中**：Phase 2.1 村莊＋市集已接線；**優先 Phase 2.2 收尾** — 雲端 **RLS**、型別對齊、私訊／血盟壓測與 UX 打磨；註冊 **名冊兩步＋`/register/interests`→`/register/skills`**、五步指示器、**`/profile/edit-tags`** 已接線。

---

## 五層架構 — 核心禁則

**禁止跨層**：UI（Layer 5）不得直連 DB／`createClient()` 查寫；僅 Layer 2 Repository 使用資料庫 client；業務在 Layer 3；快取／SWR／常數在 Layer 4。

| 層 | 職責摘要 |
|--|----------|
| L1 | `src/lib/supabase/` — client／server／admin |
| L2 | `src/lib/repositories/server/*.repository.ts` |
| L3 | `src/services/*.action.ts`、`*service.ts` |
| L4 | `src/hooks/`、`src/lib/swr/`、`src/lib/utils/date.ts`、`matching.ts`、常數／Zod |
| L5 | `src/components/`、`src/app/` |

**日曆與時間**：全系統台灣日界 **`src/lib/utils/date.ts`** 之 **`taipeiCalendarDateKey()`**（`Asia/Taipei` → `YYYY-MM-DD`）。**嚴禁**在 Action／Repository 用 `toISOString().slice(0,10)` 當台灣日界。**簽到可否**以 **`users.last_checkin_at`**（24h 滾動）為 SSOT，**不是**曆日鍵。

**頭像**：僅 **Cloudinary** 管線（見 `.cursorrules`），禁止 `supabase.storage` 上傳頭像。

---

## DB SSOT 關鍵欄位（完整表見 `HANDOFF_DB.md`）

- **經驗**：`total_exp`（勿用 `exp`）
- **IG**：`instagram_handle`（勿用 `ig_handle`）
- **自白**：`bio_village`／`bio_market`；註冊 insert 不帶 `bio`
- **簽到冷卻**：`last_checkin_at`；`exp_logs.unique_key` = `daily_checkin:{userId}:{timestamp}`
- **按讚**：`likes.from_user`／`to_user`（**無 `id`**，`insertLike` 不 `.select()`）
- **血盟**：`alliances`（`user_a`／`user_b`／`initiated_by`）；勿建 `user_alliances`
- **通知**：`type`、`from_user_id`、`message`、`is_read`（boolean）

---

## 關鍵檔案索引（查程式）

| 主題 | 路徑 |
|------|------|
| 守衛／Session | `src/middleware.ts`；`deriveAuthStatus` 僅 `findProfileById`（Edge 不可用 `unstable_cache`）；`getCachedProfile` 供 RSC |
| Auth UI／註冊 | `(auth)/login|register|register/profile`；`registration-step-indicator.tsx`；`TermsModal`／`terms.ts` |
| OAuth／健康檢查 | `src/app/auth/callback/route.ts`；`src/app/api/ping/route.ts` |
| 個人／他人 profile | `profile.action.ts`；`profile-update.action.ts`；`adventurer-profile.action.ts` |
| IG 申請審核 | `ig-request.action.ts`；`ig-request.repository.ts`；`/register/pending` |
| 簽到／連簽／盲盒 | `daily-checkin.action.ts`；`streak.repository.ts`；`prize-engine.ts`；`user.repository` `updateLastCheckinAt`／`restoreActivityOnCheckin` |
| 獎勵／廣播／改名卡 | `rewards.action.ts`；`rewards.repository.ts`；`system-settings` 跑馬燈 |
| 商城 | `shop.action.ts`；`shop.repository.ts`；`(app)/shop`；`(admin)/admin/shop` |
| 財務（master） | `/admin/coins`；`coins-admin-client.tsx`；`getAdminCoinStatsAction` 等 |
| 探索 | `explore/page.tsx`；`ExploreClient.tsx`；`village.service.ts`；`market.service.ts` |
| 配對分數 | `matching.ts`；`role-display.ts` |
| 血盟／社交 | `alliance.action.ts`；`alliance.repository.ts`；`social.action.ts`（含 `getModalSocialStatusAction`） |
| 私訊／檢舉 | `chat.action.ts`；`chat.repository.ts`；`ChatModal.tsx`；`useChat.ts` |
| 通知／信件 | `notification.action.ts`；`notification.repository.ts`；`guild/page.tsx` `MailBox` |
| 酒館 | `tavern.action.ts`；`tavern.repository.ts`；`TavernMarquee.tsx`；`useTavern.ts` |
| 後台 | `(admin)/layout.tsx`；`admin-shell.tsx`；`admin.action.ts`；`admin.repository.ts`；`admin-permissions.ts` |
| 邀請碼 | `invitation.repository.ts`；`invitation.action.ts`；`admin.action` 邀請相關 |
| 公告／廣告 | `announcement.*`；`advertisement.*`；`admin` 發布 |
| 首頁 UI | `page.tsx`／`home-page-client.tsx`；`guild-profile-home.tsx`；`FloatingToolbar.tsx` |
| 版面／導航 | `Navbar.tsx`；`app-shell-motion.tsx`；`(app)/layout.tsx` |
| 列表卡／Modal | `UserCard.tsx`；`UserCardSkeleton.tsx`；`UserDetailModal.tsx`；`LevelBadge`／`LevelCardEffect` |
| 頭像 | `Avatar.tsx`；`cloudinary.ts`；`cropImage.ts` |
| 型別 | `src/types/database.types.ts` |
| SWR Keys | `src/lib/swr/keys.ts` |
| 等級門檻 | `src/lib/constants/levels.ts` |
| 標籤 SSOT | `src/lib/constants/tags.ts` |

**舊路由**：`/village`、`/market` → `/explore`；`/alliances`、`/inbox` → `/guild`。

---

## 最近完成（最後 3 次任務摘要）

1. **2026-03-29 — 商城 Bug 修復與補強**：`/admin/coins` 財務頁恢復（與商城分離）；改名卡剩餘張數、`consumeRenameCardAction`；廣播券消耗與失敗還原；盲盒 `findPoolByType` 修復、購買失敗自動退款；特賣／劃線價顯示規則；`shop_items.image_url` 與 Cloudinary；購買數量 Dialog；跑馬燈／輪播特效與 `system_settings`；裝備 Sheet safe-area。
2. **2026-03-28 — 商城 Wave 1**：`shop_items`／`shop_orders`／`shop_daily_limits`；`purchaseItemAction` 全流程；`/admin/shop` master CRUD；前台 Tab 雙幣別；SKU 唯一。
3. **2026-03-28 — Wave 3 七日獎勵／工具列／裝備**：`streak_reward_settings`；`FloatingToolbar`；首頁七格 UI；裝備背包；`claimDailyCheckin` 讀 DB 獎勵；另含系統資訊載入 Bug 修復包（`user_rewards`／`prize_items` 批次合併）、後台 Sidebar／moderator 權限與 middleware 對齊。

（更長敘事見 **`HANDOFF_HISTORY.md`**。）

---

## 下一步待辦（優先順序）

1. **Phase 2.2／雲端**：`alliances`、私訊、`likes` 等 **RLS** 與 production 測試；Schema 與 **`database.types.ts`** 對齊。
2. **產品／UX**：`/explore` 篩選與技能供需編輯；登入心跳 **`last_seen_at`**。
3. **維運**：雲端缺 **`loot_box` 獎池** 時補種子；重大 DDL 後 **Reload schema**。

---

## 新視窗 30 秒啟動

1. 讀 **`.cursorrules`**（禁則、回報格式、Git、頭像）。
2. 讀本檔 **階段 → SSOT → 檔案索引 → 下一步**。
3. 實作：**寫入只經 L3→L2**；EXP 僅 **`total_exp`**。
4. 戰場：**`/explore`**、**`/guild`**、**`/shop`**、後台 **`/admin/*`**。

**Git**：`main` 持續整合上述模組；目錄搬遷時同步更新 HANDOFF 與 `.cursorrules`。
