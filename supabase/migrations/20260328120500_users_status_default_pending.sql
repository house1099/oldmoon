-- IG 註冊審核：新列預設為 pending（應用層 completeAdventurerProfile 亦明確傳入 pending）
ALTER TABLE public.users
  ALTER COLUMN status SET DEFAULT 'pending'::user_status;
