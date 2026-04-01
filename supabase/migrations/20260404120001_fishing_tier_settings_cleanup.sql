-- 月老／巨獸不適用小／中／大 tier 後台列（避免誤解）；若表不存在則略過。

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fishing_tier_settings'
  ) THEN
    DELETE FROM public.fishing_tier_settings
    WHERE fish_type IN ('matchmaker', 'leviathan');
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
