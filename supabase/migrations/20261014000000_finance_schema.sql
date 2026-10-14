create table public.categories (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  color text not null check (length(trim(color)) > 0),
  is_default boolean not null default false,
  type text not null check (type in ('income', 'expense')),
  is_fallback boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, id, type)
);

create unique index categories_user_type_name_idx
  on public.categories (user_id, type, lower(name));

create table public.category_rules (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id text not null,
  keywords text[] not null check (cardinality(keywords) > 0),
  priority integer not null check (priority between 0 and 1000),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, category_id)
    references public.categories (user_id, id) on delete restrict
);

create table public.transactions (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  description text not null check (length(trim(description)) > 0),
  amount_paise bigint not null check (amount_paise > 0),
  category_id text not null,
  category_source text not null default 'manual'
    check (category_source in ('suggested', 'manual')),
  date date not null,
  payment_method text,
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, category_id, type)
    references public.categories (user_id, id, type) on delete restrict
);

create index transactions_user_date_idx
  on public.transactions (user_id, date desc);
create index transactions_user_category_idx
  on public.transactions (user_id, category_id);

create table public.recurring_rules (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  description text not null check (length(trim(description)) > 0),
  type text not null check (type in ('income', 'expense')),
  amount_paise bigint not null check (amount_paise > 0),
  category_id text not null,
  frequency text not null
    check (frequency in ('weekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  interval integer check (interval is null or interval > 0),
  start_date date not null,
  next_due_date date not null,
  end_date date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, category_id, type)
    references public.categories (user_id, id, type) on delete restrict,
  check (end_date is null or end_date >= start_date)
);

create table public.recurring_occurrences (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  rule_id text,
  scheduled_date date not null,
  date date not null,
  description text not null check (length(trim(description)) > 0),
  type text not null check (type in ('income', 'expense')),
  amount_paise bigint not null check (amount_paise > 0),
  category_id text not null,
  status text not null check (status in ('pending', 'confirmed', 'skipped')),
  transaction_id text,
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  foreign key (user_id, rule_id)
    references public.recurring_rules (user_id, id)
    on delete set null (rule_id),
  foreign key (user_id, category_id, type)
    references public.categories (user_id, id, type) on delete restrict,
  foreign key (user_id, transaction_id)
    references public.transactions (user_id, id)
    on delete set null (transaction_id)
);

create unique index recurring_occurrences_user_transaction_idx
  on public.recurring_occurrences (user_id, transaction_id)
  where transaction_id is not null;
create index recurring_occurrences_user_schedule_idx
  on public.recurring_occurrences (user_id, scheduled_date);

create table public.monthly_budgets (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  year integer not null check (year between 1 and 9999),
  month integer not null check (month between 1 and 12),
  overall_limit_paise bigint check (overall_limit_paise is null or overall_limit_paise > 0),
  created_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, year, month)
);

create table public.budget_allocations (
  user_id uuid not null references auth.users (id) on delete cascade,
  budget_id text not null,
  category_id text not null,
  category_type text not null default 'expense' check (category_type = 'expense'),
  amount_paise bigint not null check (amount_paise > 0),
  primary key (user_id, budget_id, category_id),
  foreign key (user_id, budget_id)
    references public.monthly_budgets (user_id, id) on delete cascade,
  foreign key (user_id, category_id, category_type)
    references public.categories (user_id, id, type) on delete restrict
);

create index budget_allocations_user_category_idx
  on public.budget_allocations (user_id, category_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();
create trigger category_rules_set_updated_at
  before update on public.category_rules
  for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();
create trigger recurring_rules_set_updated_at
  before update on public.recurring_rules
  for each row execute function public.set_updated_at();
create trigger recurring_occurrences_set_updated_at
  before update on public.recurring_occurrences
  for each row execute function public.set_updated_at();
create trigger monthly_budgets_set_updated_at
  before update on public.monthly_budgets
  for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.category_rules enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.recurring_occurrences enable row level security;
alter table public.monthly_budgets enable row level security;
alter table public.budget_allocations enable row level security;

create policy "Users manage their own categories"
  on public.categories for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage their own category rules"
  on public.category_rules for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage their own transactions"
  on public.transactions for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage their own recurring rules"
  on public.recurring_rules for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage their own recurring occurrences"
  on public.recurring_occurrences for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage their own monthly budgets"
  on public.monthly_budgets for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users manage their own budget allocations"
  on public.budget_allocations for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on
  public.categories,
  public.category_rules,
  public.transactions,
  public.recurring_rules,
  public.recurring_occurrences,
  public.monthly_budgets,
  public.budget_allocations
to authenticated;
revoke all on
  public.categories,
  public.category_rules,
  public.transactions,
  public.recurring_rules,
  public.recurring_occurrences,
  public.monthly_budgets,
  public.budget_allocations
from anon;
