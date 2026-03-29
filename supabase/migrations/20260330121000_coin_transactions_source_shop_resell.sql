-- 與 src/types/database.types.ts 之 coin_transactions.source 對齊；含商城回收入帳
ALTER TABLE public.coin_transactions DROP CONSTRAINT IF EXISTS coin_transactions_source_check;

ALTER TABLE public.coin_transactions
  ADD CONSTRAINT coin_transactions_source_check
  CHECK (
    source = ANY (
      ARRAY[
        'checkin'::text,
        'loot_box'::text,
        'admin_grant'::text,
        'admin_deduct'::text,
        'admin_adjust'::text,
        'shop_purchase'::text,
        'shop_resell'::text,
        'refund'::text,
        'convert_in'::text,
        'convert_out'::text,
        'topup'::text
      ]
    )
  );

NOTIFY pgrst, 'reload schema';
