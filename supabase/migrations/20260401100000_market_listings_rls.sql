-- 玩家自由市場：market_listings RLS（SELECT only；寫入走 service_role / RPC）

ALTER TABLE public.market_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can view active listings"
  ON public.market_listings
  FOR SELECT
  TO authenticated
  USING (status = 'active' AND expires_at > now());

CREATE POLICY "seller can view own listings"
  ON public.market_listings
  FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

NOTIFY pgrst, 'reload schema';
