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

## RLS 與 Realtime（摘要）

- **`tavern_messages`**：常見做法為 `authenticated` **SELECT**（利於 Realtime 訂閱），寫入以 **service role**／後端為主；實際政策以雲端為準。
- **`ig_change_requests`**：已 ENABLE RLS；細節可後補。
- **`chat_*`**：雲端若尚無表，補 DDL 後 **Reload schema**。
- **`supabase_realtime` publication**：需含 `tavern_messages`（及專案已啟用之表）。

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
