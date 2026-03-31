-- 拍賣場總開關（前台 create/buy 會讀取）
INSERT INTO public.system_settings (key, value) VALUES
  ('market_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
