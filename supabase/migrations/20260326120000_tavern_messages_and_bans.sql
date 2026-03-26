-- 酒館廣場：公開聊天訊息與禁言表
CREATE TABLE IF NOT EXISTS public.tavern_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  content text NOT NULL,
  type text NOT NULL CHECK (type IN ('text', 'emoji')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tavern_messages_created_at_desc_idx
  ON public.tavern_messages (created_at DESC);

CREATE TABLE IF NOT EXISTS public.tavern_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users (id) ON DELETE CASCADE,
  banned_by uuid NOT NULL REFERENCES public.users (id),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tavern_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tavern_messages_select_authenticated"
  ON public.tavern_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- 寫入僅經 service role／admin client；一般使用者不透過 RLS INSERT

ALTER TABLE public.tavern_bans ENABLE ROW LEVEL SECURITY;

-- 後台／admin client 繞過 RLS；不開放給 authenticated DML

-- Realtime：供前台訂閱新訊息（若表已加入 publication 可略過錯誤）
ALTER PUBLICATION supabase_realtime ADD TABLE public.tavern_messages;
