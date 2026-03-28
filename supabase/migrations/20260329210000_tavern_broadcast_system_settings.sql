-- 🗄️ 酒館跑馬燈／廣播橫幅獨立設定（與舊 marquee_speed_seconds 並存，前台讀新 key）
INSERT INTO public.system_settings (key, value) VALUES
  ('tavern_marquee_mode', 'scroll'),
  ('tavern_marquee_speed', '20'),
  ('broadcast_style', 'glow'),
  ('broadcast_speed', '10')
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
