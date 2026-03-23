-- IG 變更申請 + 使用者角色（admin／leader 審核用）
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

CREATE TABLE IF NOT EXISTS public.ig_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users (id) ON DELETE CASCADE,
  old_handle text,
  new_handle text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES public.users (id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ig_change_requests ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
