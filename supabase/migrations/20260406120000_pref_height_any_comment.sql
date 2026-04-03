COMMENT ON COLUMN public.users.pref_height
  IS '身高偏好：taller/similar/shorter/tall_threshold/short_threshold/height_any，月老魚配對用';

NOTIFY pgrst, 'reload schema';
