-- 對話列表預覽「你：／對方：」：記錄最後一則訊息發送者
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_message_sender_id uuid REFERENCES public.users (id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
