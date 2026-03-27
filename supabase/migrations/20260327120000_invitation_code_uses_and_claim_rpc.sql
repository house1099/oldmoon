-- 邀請碼多人使用、使用紀錄表、原子 claim（FOR UPDATE）
ALTER TABLE public.invitation_codes
  ADD COLUMN IF NOT EXISTS max_uses integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS use_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.invitation_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.invitation_codes (id) ON DELETE CASCADE,
  used_by uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  used_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invitation_code_uses_code_user_unique UNIQUE (code_id, used_by)
);

CREATE INDEX IF NOT EXISTS invitation_code_uses_code_id_idx
  ON public.invitation_code_uses (code_id);

CREATE INDEX IF NOT EXISTS invitation_code_uses_used_by_idx
  ON public.invitation_code_uses (used_by);

CREATE OR REPLACE FUNCTION public.claim_invitation_code(p_code text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.invitation_codes%ROWTYPE;
  new_count integer;
BEGIN
  SELECT * INTO r
  FROM public.invitation_codes
  WHERE code = upper(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF r.is_revoked THEN
    RETURN jsonb_build_object('success', false, 'error', 'revoked');
  END IF;

  IF r.expires_at IS NOT NULL AND r.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;

  IF r.use_count >= r.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'used_up');
  END IF;

  BEGIN
    INSERT INTO public.invitation_code_uses (code_id, used_by)
    VALUES (r.id, p_user_id);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'duplicate_use');
  END;

  new_count := r.use_count + 1;

  UPDATE public.invitation_codes
  SET
    use_count = new_count,
    is_revoked = CASE WHEN new_count >= max_uses THEN true ELSE is_revoked END,
    used_by = COALESCE(used_by, p_user_id),
    used_at = COALESCE(used_at, now())
  WHERE id = r.id;

  RETURN jsonb_build_object(
    'success', true,
    'invited_by', r.created_by::text
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_invitation_code(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_invitation_code(text, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
