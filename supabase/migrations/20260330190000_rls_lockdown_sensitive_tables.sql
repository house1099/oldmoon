-- 封測：為先前未啟用 RLS 的 public 表啟用 RLS（預設拒絕 anon/authenticated 直接 DML／SELECT）。
-- 應用層後台／交易寫入應使用 service_role（createAdminClient），不受 RLS 限制。
-- 邀請碼：移除「全表 SELECT」政策，驗證與核銷維持後端 admin client。

DROP POLICY IF EXISTS "invitation_codes_read_for_validate" ON public.invitation_codes;

ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_code_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loot_box_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loot_box_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_daily_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_reward_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topup_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
