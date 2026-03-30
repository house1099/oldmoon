# HANDOFF_DB — 資料庫專用

與 Schema、遷移、RLS、雲端 DDL 對齊時讀此檔。欄位與表名以 **`src/types/database.types.ts`** 與 Supabase 實表為準。

## SSOT 欄位（應用層必守）

| 語意 | SSOT 欄位 | 勿用 |
|------|-----------|------|
| 累積經驗 | `users.total_exp` | `exp`（廢棄） |
| IG 帳號 | `users.instagram_handle` | `ig_handle`（廢棄） |
| 興趣自白／技能自白 | `bio_village`／`bio_market` | 單一 `bio` 僅通用／Modal；註冊 insert 不帶 `bio` |
| 簽到 24h 滾動冷卻 | `users.last_checkin_at` | 勿再以曆日 `unique_key` 單獨當「可否簽到」唯一依據 |
| 簽到 EXP 日誌鍵 | `exp_logs.unique_key` = `daily_checkin:{userId}:{timestamp}` | 舊曆日式 `daily_checkin:{YYYY-MM-DD}:{userId}` 可能僅見於歷史列 |
| 連簽狀態 | `login_streaks`（`last_claim_at` 等） | 與冷卻分離；冷卻只認 `last_checkin_at` |
| 私訊對話成對 | `conversations` `user_a`／`user_b` 字典序 | — |
| 按讚 | `likes.from_user`／`likes.to_user`（**無 `id`**） | 勿 select 不存在欄位 |
| 雙人血盟 | `alliances`：`user_a`／`user_b`／`initiated_by`／`status` | `user_alliances` **已廢棄，勿建** |
| 通知 | `notifications.type`、`from_user_id`、`message`、`is_read`（boolean） | 舊 `kind`／`read_at` 等需遷移 |
| 使用者狀態 | `users.status`（預設雲端宜 `pending` 起）等 | 與 IG 審核、middleware 一致 |

## `users` 重點欄位（速查）

`role`、`bio`、`bio_village`／`bio_market`、`invite_code`、`invited_by`、`interests`（`text[]`）、`skills_offer`／`skills_want`、`core_values`（jsonb）、`instagram_handle`、`ig_public`、`mood`、`mood_at`、`last_checkin_at`、`last_seen_at`、`activity_status`（`active`／`resting`／`hidden`）、`total_exp`、`level`、`status`、`reputation_score`、幣種欄位等 — 詳見 **`database.types.ts`**。

**活躍度規則（雲端 Job 為準）**：久未簽到 → `resting`／`hidden` 與信譽調整；探索列表排除 `hidden`；簽到成功可 `restoreActivityOnCheckin`（+1 信譽上限 100，失敗僅 log）。

## 主要業務表（名稱速查）

`likes`、`alliances`、`conversations`、`chat_messages`、`blocks`、`reports`、`notifications`、`tavern_messages`、`tavern_bans`、`exp_logs`、`coin_transactions`、`admin_actions`、`moderator_permissions`、`system_settings`、`announcements`、`advertisements`、`ad_clicks`、`invitation_codes`、`invitation_code_uses`、`ig_change_requests`、`prize_pools`、`prize_items`、`prize_logs`、`user_rewards`、`broadcasts`、`login_streaks`、`streak_reward_settings`、`shop_items`、`shop_orders`、`shop_daily_limits` 等。

## 遷移檔案清單（`supabase/migrations/`）

| 檔名 | 主題 |
|------|------|
| `20260323120000_fix_users_exp_to_total_exp.sql` | total_exp |
| `20260323130000_users_mood_mood_at.sql` | mood／mood_at |
| `20260323140000_users_bio_split_invite.sql` | bio_village／bio_market／invite |
| `20260324100000_ig_change_requests_and_user_role.sql` | IG 變更申請、role |
| `20260324120000_users_last_checkin_at.sql` | last_checkin_at |
| `20260324150000_migrate_legacy_region_orientation.sql` | 舊問卷資料（手動確認後執行） |
| `20260325120000_user_alliances_pair.sql` | **DEPRECATED 勿執行** |
| `20260325180000_notifications.sql` | notifications |
| `20260325183000_alliances_pair_unique.sql` | alliances UNIQUE |
| `20260325220000_notifications_type_from_user_message.sql` | 通知欄位重構 |
| `20260325230000_conversations_last_message_sender.sql` | last_message_sender_id |
| `20260326120000_tavern_messages_and_bans.sql` | 酒館訊息／禁言 |
| `20260327120000_invitation_code_uses_and_claim_rpc.sql` | 邀請碼多人／RPC |
| `20260327143000_tavern_bans_expires_at.sql` | 禁言到期 |
| `20260328120000_prize_engine_login_streaks.sql` | 獎池／連簽相關表 |
| `20260328120500_users_status_default_pending.sql` | status default pending |
| `20260328180000_users_fk_on_delete_cascade.sql` | FK cascade |
| `20260328180000_broadcasts.sql` | broadcasts |
| `20260328190000_prize_items_effect_key.sql` | effect_key |
| `20260328203000_user_rewards_item_ref_prize_items.sql` | user_rewards → prize_items |
| `20260329130000_shop_image_marquee_loot_box.sql` | 商城圖／跑馬燈／loot_box 等 |
| `20260330190000_rls_lockdown_sensitive_tables.sql` | 封測：多表 **ENABLE RLS**；移除 `invitation_codes` 過寬 SELECT 政策 |

## RLS 政策與維運規範（必讀）

與 Supabase **Row Level Security**、政策設計、除錯原則有關時，以本節為準；實際 `CREATE POLICY` 以**雲端**與 `supabase/migrations/` 為準，新增表後應補遷移並 **Reload schema**。

### 1. 核心原則

| 原則 | 說明 |
|------|------|
| **`public` 業務表預設開 RLS** | 新表上線：`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`，再依分類補政策。未開 RLS 的表若暴露給 PostgREST，風險由 **GRANT + 無 RLS** 決定，封測／上線皆不建議。 |
| **Service role 繞過 RLS** | `createAdminClient()`（`SUPABASE_SERVICE_ROLE_KEY`）發出的請求**不套用 RLS**。商城扣款、派獎、`exp_logs`、`coin_transactions`、`user_rewards`、邀請碼核銷等**應走 L2 admin**，與「表上有無 RLS」無衝突。 |
| **使用者 JWT 受 RLS 約束** | `createClient()`（browser／`src/lib/supabase/server.ts` 帶 cookie）為 **`authenticated`** 或 **`anon`**。對該表若**無任何允許的政策**，讀寫會失敗——這是預期防護，不是壞掉。 |
| **禁止用「關閉 RLS」當修 bug 手段** | 讀寫失敗時，應檢查：是否誤用使用者 client 直連應由 service 寫的表、或缺政策／`WITH CHECK` 過嚴。先補**最小政策**或改回 **admin client**，而非 `DISABLE ROW LEVEL SECURITY`。 |
| **拒絕過寬的 `USING (true)`** | 除非該表內容確定可對**所有登入者**全表可見（例如公開聊天流），否則不要用全表 SELECT。邀請碼全表曾因此外洩風險，已於 `20260330190000_...` 移除 `invitation_codes_read_for_validate`。 |

### 2. 與五層架構的對應

- **L2 `*repository.ts`**：敏感寫入與多數查詢應使用 **`createAdminClient()`**（見 `src/lib/supabase/admin.ts`）。
- **L3 `*.action.ts`**：可用 `createClient()` 只做 **`auth.getUser()`**、讀取已有政策允許的表；**批量改寫、金流、派發**應委派給 L2 admin。
- **L5／瀏覽器**：不直連 Supabase 寫敏感表（見 `HANDOFF.md`）；若未來 Realtime／客戶端直讀，再為該表加**精準 SELECT 政策**。

### 3. 表分類與政策方向

以下為**設計規則**；雲端已有之政策名稱可能略有差異，新增／調整時盡量對齊命名慣例（見下節）。

**A. 僅後台／服務端（RLS 開、不給 `anon`／`authenticated` 政策）**

金流、稽核、設定、多數派發與日誌：**只靠 service role**，一般使用者 JWT **無法** `SELECT`／`INSERT`／`UPDATE`／`DELETE`。

包含（與本專案 L2 慣例一致）：`admin_actions`、`moderator_permissions`、`system_settings`、`coin_transactions`、`topup_orders`、`exp_logs`（寫入與列表皆走 admin）、`prize_logs`、`prize_pools`、`prize_items`、`user_rewards`、`shop_items`、`shop_orders`、`shop_daily_limits`、`login_streaks`、`streak_reward_settings`、`broadcasts`、`announcements`、`advertisements`、`ad_clicks`、`loot_box_logs`、`loot_box_rewards`、`invitation_code_uses`、`ig_change_requests` 等。

**B. 使用者 JWT 需讀寫時：僅自己的列**

`auth.uid()` 與列上 **`user_id`／`used_by`／參與者欄位** 對齊；`INSERT`／`UPDATE` 必須加 **`WITH CHECK`**，避免竄改 `user_id` 冒充他人。

範本（依實際欄位改名）：

```sql
-- 範例：僅能讀自己的列
CREATE POLICY "example_select_own"
  ON public.example_table
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 範例：僅能更新自己的列，且不可把列改判給別人
CREATE POLICY "example_update_own"
  ON public.example_table
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

本專案類似語意已有：`notifications`（自讀／自更新）、`tavern_bans`（讀自身禁言）等；**雲端實際政策名**以 Dashboard 為準。

**C. 成員關係型（私訊／對話／訊息）**

- 僅 **`conversations`** 之參與者可見 **`chat_messages`**（以 `user_a`／`user_b` 或 membership 表表達）。
- **INSERT**：通常仍建議 **service role** 於後端寫入，避免客戶端偽造 `conversation_id`；若開放 client INSERT，需 `WITH CHECK` 與對話成員邏輯一致。

**D. 公開或半公開讀取（常搭配 Realtime）**

- **`tavern_messages`**：`authenticated` **SELECT**（全表或僅未刪除列），**INSERT** 以後端／service 為主（本專案寫入路徑見 `tavern.repository`）。
- 訂閱 Realtime 的表須：**已加入 `supabase_realtime` publication**、且該角色對表有 **SELECT 政策允許**。

**E. 後台用「管理員 JWT」而非 service role 的表**

若管理後台用 **`createClient()` + 使用者為 master／moderator** 操作（例如 `invitation_codes`），政策應以 **`users.role`**（或專用權限表）限制 **ALL 或 SELECT**，**不可**對一般會員 `USING (true)` 全表讀取機密欄位。

### 4. 政策命名慣例

建議：`{表名簡寫}_{動詞}_{範圍}`，全小寫蛇形，例如：

- `tavern_messages_select_authenticated`
- `notifications_select_own`
- `invitation_codes_staff_all`（若拆 staff 與 public）

避免無語意的 `policy1`；同一表多政策時，從名稱可看出 **FOR SELECT／INSERT** 與 **own／staff／public**。

### 5. 新表上線檢查清單

1. 表建在 `public` 後立刻 **`ENABLE ROW LEVEL SECURITY`**。
2. 確認應用路徑：僅 admin → 可不建 `authenticated` 政策（預設全擋）。
3. 若瀏覽器或 Realtime 要讀 → 補 **最小 SELECT 政策**。
4. 若使用者 client 要寫 → 補 **USING + WITH CHECK**，並在 staging 用**一般帳號**測試。
5. 將 SQL 寫入 **`supabase/migrations/`**，並對雲端執行／MCP `apply_migration`；完成後 **`NOTIFY pgrst, 'reload schema'`** 或 Dashboard **Reload schema**。
6. 同步 **`src/types/database.types.ts`**（若專案仍手動維護）。

### 6. 除錯：先想 RLS，不要關 RLS

常見錯誤線索：`permission denied for table`、`new row violates row-level security policy`。

| 步驟 | 動作 |
|------|------|
| 1 | 確認請求是 **admin client** 還是 **使用者 session**。前者不受 RLS；若仍失敗，查 FK／CHECK／觸發器。 |
| 2 | 若是使用者 client：Dashboard → **Policies** 檢查該表是否有對應 **cmd**（SELECT／INSERT／…）與 **role**。 |
| 3 | `INSERT` 成功但邏輯錯：檢查 **`WITH CHECK`** 是否與 `USING` 一致。 |
| 4 | Realtime 收不到： publication + **SELECT 政策** 兩邊都要具備。 |

### 7. Realtime（摘要）

- **`tavern_messages`**：`authenticated` **SELECT** 利於訂閱；寫入以 **service role**／後端為主；實際政策以雲端為準。
- **`chat_*`**：表建立後記得 **Reload schema**；政策須與「僅成員可讀」一致。
- **`supabase_realtime` publication**：須包含已訂閱的表（如 `tavern_messages`）。

## 雲端 DDL 變更紀錄（手動／MCP）

以下若已在 SQL Editor 或 Supabase MCP 執行，請與遷移檔與型別檔交叉比對：

- `users.status` **DEFAULT** 改為 `'pending'`（見 `20260328120500_...`）。
- `streak_reward_settings`、`inventory_slots`、獎池／商城相關表與種子。
- `get_coin_stats()` RPC（金幣統計）。
- `admin_actions.action_label`（稽核人類可讀描述）。
- 跑馬燈／特效：`system_settings` keys 如 `marquee_speed_seconds`、`marquee_broadcast_effect`。

## 🗄️ 常用補欄 SQL（僅在雲端缺欄時）

Phase 2 社交欄位：

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

Phase 1.5 個人頁：

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

分域自白與邀請（或套用 `20260323140000_...`）：

```sql
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bio_village text,
  ADD COLUMN IF NOT EXISTS bio_market text,
  ADD COLUMN IF NOT EXISTS invite_code text,
  ADD COLUMN IF NOT EXISTS invited_by uuid;
NOTIFY pgrst, 'reload schema';
```

DDL 後若 PostgREST 報錯：**Dashboard → API → Reload schema**。

## 等級門檻（與 `levels.ts`／🗄️ 對齊）

Lv1:0, Lv2:10, Lv3:40, Lv4:80, Lv5:150, Lv6:250, Lv7:400, Lv8:600, Lv9:900, Lv10:1350 — 變更時需同步 SQL／Trigger 與 **`src/lib/constants/levels.ts`**。
