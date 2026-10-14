create table public.finance_migrations (
  user_id uuid not null references auth.users (id) on delete cascade,
  migration_id text not null check (length(trim(migration_id)) > 0),
  entity_counts jsonb not null,
  imported_at timestamptz not null default now(),
  primary key (user_id, migration_id)
);

alter table public.finance_migrations enable row level security;

create policy "Users manage their own migration receipts"
  on public.finance_migrations for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.finance_migrations to authenticated;
revoke all on public.finance_migrations from anon;
