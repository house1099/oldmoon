-- 釣魚／月老魚日誌（歷史列表用快照欄位，避免對方改資料後列表失真）

CREATE TABLE IF NOT EXISTS public.fishing_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),

  fish_type        text NOT NULL
    CHECK (fish_type IN ('common', 'rare', 'legendary', 'matchmaker')),
  fish_user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  no_match_found   boolean,
  fish_coins       integer,
  fish_exp         integer,
  fish_item        jsonb,

  peer_nickname    text,
  peer_avatar_url  text,
  peer_region      text,
  peer_interests   text[],
  peer_bio         text
);

CREATE INDEX IF NOT EXISTS fishing_logs_user_created_idx
  ON public.fishing_logs (user_id, created_at DESC);

COMMENT ON TABLE public.fishing_logs IS '釣魚結果日誌；月老魚列 peer_* 為寫入當下快照';

ALTER TABLE public.fishing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fishing_logs_select_own"
  ON public.fishing_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "fishing_logs_insert_own"
  ON public.fishing_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
