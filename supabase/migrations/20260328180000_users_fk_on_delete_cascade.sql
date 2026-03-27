-- 將所有 public.* → public.users(id) 的外鍵改為 ON DELETE CASCADE，便於後台／SQL 刪除使用者。
-- 若某環境有孤兒列（user_id 指向不存在的 users.id），請先執行下方「孤兒清理」再跑本檔 ALTER。
--
-- 掃描方式（參考）：
-- SELECT c.conrelid::regclass, c.conname, pg_get_constraintdef(c.oid)
-- FROM pg_constraint c WHERE c.contype = 'f' AND c.confrelid = 'public.users'::regclass;

-- ---------------------------------------------------------------------------
-- 孤兒清理（僅在 ADD CONSTRAINT 失敗或已知有髒資料時執行；欄位可為 NULL 的已加 IS NOT NULL 條件）
-- ---------------------------------------------------------------------------
-- DELETE FROM public.ad_clicks a WHERE a.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.user_id);
-- DELETE FROM public.admin_actions t WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.admin_id);
-- DELETE FROM public.admin_actions t WHERE t.target_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.target_user_id);
-- DELETE FROM public.advertisements t WHERE t.created_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.created_by);
-- DELETE FROM public.announcements t WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.created_by);
-- DELETE FROM public.blocks t WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.blocker_id) OR NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.blocked_id);
-- DELETE FROM public.chat_messages t WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.sender_id);
-- DELETE FROM public.coin_transactions t WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.user_id);
-- DELETE FROM public.coin_transactions t WHERE t.operator_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.operator_id);
-- DELETE FROM public.conversations t WHERE t.user_a IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.user_a);
-- DELETE FROM public.conversations t WHERE t.user_b IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.user_b);
-- DELETE FROM public.conversations t WHERE t.last_message_sender_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.last_message_sender_id);
-- DELETE FROM public.ig_change_requests t WHERE t.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.user_id);
-- DELETE FROM public.ig_change_requests t WHERE t.reviewed_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.reviewed_by);
-- DELETE FROM public.invitation_code_uses t WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.used_by);
-- DELETE FROM public.invitation_codes t WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.created_by);
-- DELETE FROM public.invitation_codes t WHERE t.used_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.used_by);
-- DELETE FROM public.login_streaks t WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.user_id);
-- DELETE FROM public.loot_box_logs t WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.user_id);
-- DELETE FROM public.moderator_permissions t WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.user_id);
-- DELETE FROM public.moderator_permissions t WHERE t.updated_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.updated_by);
-- DELETE FROM public.notifications t WHERE t.user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.user_id);
-- DELETE FROM public.notifications t WHERE t.from_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.from_user_id);
-- DELETE FROM public.prize_logs t WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.user_id);
-- DELETE FROM public.reports t WHERE t.reported_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.reported_user_id);
-- DELETE FROM public.reports t WHERE t.reporter_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.reporter_id);
-- DELETE FROM public.system_settings t WHERE t.updated_by IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.updated_by);
-- DELETE FROM public.tavern_bans t WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.user_id);
-- DELETE FROM public.tavern_bans t WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.banned_by);
-- DELETE FROM public.tavern_messages t WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.user_id);
-- DELETE FROM public.topup_orders t WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.user_id);
-- DELETE FROM public.user_rewards t WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = t.user_id);

-- ---------------------------------------------------------------------------
-- 外鍵：一律 ON DELETE CASCADE（已為 CASCADE 的 DROP+ADD 同義重築，可重跑）
-- ---------------------------------------------------------------------------
BEGIN;

ALTER TABLE public.ad_clicks DROP CONSTRAINT IF EXISTS ad_clicks_user_id_fkey;
ALTER TABLE public.ad_clicks ADD CONSTRAINT ad_clicks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.admin_actions DROP CONSTRAINT IF EXISTS admin_actions_admin_id_fkey;
ALTER TABLE public.admin_actions ADD CONSTRAINT admin_actions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.admin_actions DROP CONSTRAINT IF EXISTS admin_actions_target_user_id_fkey;
ALTER TABLE public.admin_actions ADD CONSTRAINT admin_actions_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.advertisements DROP CONSTRAINT IF EXISTS advertisements_created_by_fkey;
ALTER TABLE public.advertisements ADD CONSTRAINT advertisements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_created_by_fkey;
ALTER TABLE public.announcements ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.blocks DROP CONSTRAINT IF EXISTS blocks_blocked_id_fkey;
ALTER TABLE public.blocks ADD CONSTRAINT blocks_blocked_id_fkey FOREIGN KEY (blocked_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.blocks DROP CONSTRAINT IF EXISTS blocks_blocker_id_fkey;
ALTER TABLE public.blocks ADD CONSTRAINT blocks_blocker_id_fkey FOREIGN KEY (blocker_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.coin_transactions DROP CONSTRAINT IF EXISTS coin_transactions_operator_id_fkey;
ALTER TABLE public.coin_transactions ADD CONSTRAINT coin_transactions_operator_id_fkey FOREIGN KEY (operator_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.coin_transactions DROP CONSTRAINT IF EXISTS coin_transactions_user_id_fkey;
ALTER TABLE public.coin_transactions ADD CONSTRAINT coin_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_last_message_sender_id_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_last_message_sender_id_fkey FOREIGN KEY (last_message_sender_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_user_a_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_user_a_fkey FOREIGN KEY (user_a) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_user_b_fkey;
ALTER TABLE public.conversations ADD CONSTRAINT conversations_user_b_fkey FOREIGN KEY (user_b) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.ig_change_requests DROP CONSTRAINT IF EXISTS ig_change_requests_reviewed_by_fkey;
ALTER TABLE public.ig_change_requests ADD CONSTRAINT ig_change_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.ig_change_requests DROP CONSTRAINT IF EXISTS ig_change_requests_user_id_fkey;
ALTER TABLE public.ig_change_requests ADD CONSTRAINT ig_change_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.invitation_code_uses DROP CONSTRAINT IF EXISTS invitation_code_uses_used_by_fkey;
ALTER TABLE public.invitation_code_uses ADD CONSTRAINT invitation_code_uses_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.invitation_codes DROP CONSTRAINT IF EXISTS invitation_codes_created_by_fkey;
ALTER TABLE public.invitation_codes ADD CONSTRAINT invitation_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.invitation_codes DROP CONSTRAINT IF EXISTS invitation_codes_used_by_fkey;
ALTER TABLE public.invitation_codes ADD CONSTRAINT invitation_codes_used_by_fkey FOREIGN KEY (used_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.login_streaks DROP CONSTRAINT IF EXISTS login_streaks_user_id_fkey;
ALTER TABLE public.login_streaks ADD CONSTRAINT login_streaks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.loot_box_logs DROP CONSTRAINT IF EXISTS loot_box_logs_user_id_fkey;
ALTER TABLE public.loot_box_logs ADD CONSTRAINT loot_box_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.moderator_permissions DROP CONSTRAINT IF EXISTS moderator_permissions_updated_by_fkey;
ALTER TABLE public.moderator_permissions ADD CONSTRAINT moderator_permissions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.moderator_permissions DROP CONSTRAINT IF EXISTS moderator_permissions_user_id_fkey;
ALTER TABLE public.moderator_permissions ADD CONSTRAINT moderator_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_from_user_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.prize_logs DROP CONSTRAINT IF EXISTS prize_logs_user_id_fkey;
ALTER TABLE public.prize_logs ADD CONSTRAINT prize_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reported_user_id_fkey;
ALTER TABLE public.reports ADD CONSTRAINT reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE public.reports ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_updated_by_fkey;
ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.tavern_bans DROP CONSTRAINT IF EXISTS tavern_bans_banned_by_fkey;
ALTER TABLE public.tavern_bans ADD CONSTRAINT tavern_bans_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.tavern_bans DROP CONSTRAINT IF EXISTS tavern_bans_user_id_fkey;
ALTER TABLE public.tavern_bans ADD CONSTRAINT tavern_bans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.tavern_messages DROP CONSTRAINT IF EXISTS tavern_messages_user_id_fkey;
ALTER TABLE public.tavern_messages ADD CONSTRAINT tavern_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.topup_orders DROP CONSTRAINT IF EXISTS topup_orders_user_id_fkey;
ALTER TABLE public.topup_orders ADD CONSTRAINT topup_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_rewards DROP CONSTRAINT IF EXISTS user_rewards_user_id_fkey;
ALTER TABLE public.user_rewards ADD CONSTRAINT user_rewards_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

COMMIT;

NOTIFY pgrst, 'reload schema';
