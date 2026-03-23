-- 🗄️ 42703：column "exp" of relation "users" does not exist
-- 用途：改為只更新 public.users.total_exp（不使用不存在的 exp 欄位）。
-- 在 Supabase → SQL Editor 整段貼上執行即可。
--
-- 若你的 exp_logs 沒有 delta 欄位，請把函式內 add_amount 那一行改成：
--   add_amount := COALESCE(NEW.delta_exp, 0);

-- ---------------------------------------------------------------------------
-- 1) 定義／覆寫觸發函式（只寫 total_exp）
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_exp_log_apply_total_exp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  add_amount integer;
BEGIN
  add_amount := COALESCE(NEW.delta_exp, NEW.delta, 0);

  IF add_amount = 0 THEN
    RETURN NEW;
  END IF;

  UPDATE public.users u
  SET total_exp = COALESCE(u.total_exp, 0) + add_amount
  WHERE u.id = NEW.user_id;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) 移除可能綁在 exp_logs 上的舊觸發（名稱依常見命名列舉；不存在則略過）
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_exp_logs_apply_user_exp ON public.exp_logs;
DROP TRIGGER IF EXISTS trg_exp_logs_after_insert ON public.exp_logs;
DROP TRIGGER IF EXISTS on_exp_log_insert ON public.exp_logs;
DROP TRIGGER IF EXISTS exp_logs_after_insert ON public.exp_logs;
DROP TRIGGER IF EXISTS apply_exp_from_exp_logs ON public.exp_logs;

-- ---------------------------------------------------------------------------
-- 3) 掛上正確觸發：寫入 exp_logs 後累加 users.total_exp
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_exp_logs_apply_total_exp ON public.exp_logs;

CREATE TRIGGER trg_exp_logs_apply_total_exp
  AFTER INSERT ON public.exp_logs
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_exp_log_apply_total_exp();

-- ---------------------------------------------------------------------------
-- 4)（選用）若你還留有「只引用 exp」的舊函式，可在 SQL Editor 查名稱後手動 DROP：
-- SELECT proname, prosrc FROM pg_proc WHERE prosrc ILIKE '%users%exp%' AND prosrc NOT ILIKE '%total_exp%';
-- ---------------------------------------------------------------------------
