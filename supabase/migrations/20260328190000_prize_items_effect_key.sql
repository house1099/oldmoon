-- prize_items：頭像框／卡片外框 CSS 特效識別碼（與前端 globals.css .effect-{key} 對應）
ALTER TABLE public.prize_items
  ADD COLUMN IF NOT EXISTS effect_key text NULL;

COMMENT ON COLUMN public.prize_items.effect_key IS
  '對應前端 CSS 特效的識別代碼，僅 avatar_frame/card_frame 類型使用。
   例如：star_frame, rainbow_frame, fire_frame。
   特效 CSS 需由開發者手動新增至 globals.css 後才生效。';

NOTIFY pgrst, 'reload schema';
