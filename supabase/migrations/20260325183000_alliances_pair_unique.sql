-- 雙人血盟：同一對 (user_a, user_b) 僅允許一筆（與應用層字典序 insert 對齊）
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where c.conname = 'alliances_pair_unique'
      and n.nspname = 'public'
  ) then
    alter table public.alliances
      add constraint alliances_pair_unique unique (user_a, user_b);
  end if;
end $$;
