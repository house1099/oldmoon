-- 釣竿 tier（basic/mid/high）預設拋竿冷卻分鐘；metadata 未填 rod_cooldown_minutes 時由 parseRodFishingRules 套用。
INSERT INTO public.system_settings (key, value)
VALUES
  ('fishing_rod_cooldown_basic_minutes', '1440'),
  ('fishing_rod_cooldown_mid_minutes', '720'),
  ('fishing_rod_cooldown_high_minutes', '480')
ON CONFLICT (key) DO NOTHING;
