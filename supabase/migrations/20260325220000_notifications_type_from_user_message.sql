-- 通知表：與應用層對齊 type / from_user_id / message / is_read（由舊 kind/title/body/metadata/read_at 遷移）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'kind'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN kind TO type;
  END IF;
END $$;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS from_user_id uuid REFERENCES public.users (id) ON DELETE SET NULL;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS message text;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS is_read boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'title'
  ) THEN
    UPDATE public.notifications n
    SET
      message = COALESCE(
        NULLIF(
          trim(
            COALESCE(n.title, '')
            || CASE
              WHEN n.body IS NOT NULL AND trim(n.body) <> '' THEN ' ' || n.body
              ELSE ''
            END
          ),
          ''
        ),
        n.title,
        '通知'
      ),
      from_user_id = CASE
        WHEN n.metadata IS NOT NULL
          AND n.metadata ? 'from_user'
          AND (n.metadata ->> 'from_user')
            ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (n.metadata ->> 'from_user')::uuid
        ELSE n.from_user_id
      END,
      is_read = (n.read_at IS NOT NULL);
  END IF;
END $$;

ALTER TABLE public.notifications DROP COLUMN IF EXISTS title;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS body;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS metadata;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS read_at;

UPDATE public.notifications SET message = '通知' WHERE message IS NULL;

ALTER TABLE public.notifications ALTER COLUMN message SET NOT NULL;

DROP INDEX IF EXISTS notifications_user_unread_idx;
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id)
  WHERE is_read = false;

NOTIFY pgrst, 'reload schema';
