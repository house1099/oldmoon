ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pref_height text;

COMMENT ON COLUMN public.users.pref_height
  IS '身高偏好：taller/similar/shorter/tall_threshold/short_threshold，月老魚配對用';

INSERT INTO public.system_settings (key, value) VALUES
  ('matchmaker_height_tall_threshold',  '175'),
  ('matchmaker_height_short_threshold', '163')
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';
