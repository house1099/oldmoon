-- 雙人血盟（與 public.alliances 公會表分離）
create table if not exists public.user_alliances (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references public.users (id) on delete cascade,
  user_high uuid not null references public.users (id) on delete cascade,
  initiated_by uuid not null references public.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'dissolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_alliances_distinct_users check (user_low <> user_high),
  constraint user_alliances_ordered check (user_low::text < user_high::text)
);

create unique index if not exists user_alliances_pair_unique
  on public.user_alliances (user_low, user_high);

create index if not exists user_alliances_status_idx
  on public.user_alliances (status);

alter table public.user_alliances enable row level security;

notify pgrst, 'reload schema';
