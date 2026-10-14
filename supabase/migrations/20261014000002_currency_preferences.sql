alter table public.transactions
  add column original_amount_paise bigint,
  add column original_currency text check (
    original_currency is null or original_currency ~ '^[A-Z]{3}$'
  ),
  add column exchange_rate_date date;

alter table public.recurring_rules
  add column original_amount_paise bigint,
  add column original_currency text check (
    original_currency is null or original_currency ~ '^[A-Z]{3}$'
  ),
  add column exchange_rate_date date;

alter table public.recurring_occurrences
  add column original_amount_paise bigint,
  add column original_currency text check (
    original_currency is null or original_currency ~ '^[A-Z]{3}$'
  ),
  add column exchange_rate_date date;

alter table public.monthly_budgets
  add column original_overall_limit_paise bigint,
  add column original_currency text check (
    original_currency is null or original_currency ~ '^[A-Z]{3}$'
  ),
  add column exchange_rate_date date;

alter table public.budget_allocations
  add column original_amount_paise bigint,
  add column original_currency text check (
    original_currency is null or original_currency ~ '^[A-Z]{3}$'
  ),
  add column exchange_rate_date date;

create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  default_currency text not null default 'INR'
    check (default_currency ~ '^[A-Z]{3}$'),
  date_format text not null default 'DD/MM/YYYY'
    check (date_format in ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD')),
  hide_balances boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

create policy "Users manage their own preferences"
  on public.user_preferences for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.apply_currency_conversion(p_changes jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  changed_count integer;
  expected_count integer;
begin
  update public.transactions as current
  set amount_paise = change.amount_paise,
      original_amount_paise = change.original_amount_paise,
      original_currency = change.original_currency,
      exchange_rate_date = change.exchange_rate_date
  from jsonb_to_recordset(p_changes->'transactions') as change(
    id text,
    expected_updated_at timestamptz,
    amount_paise bigint,
    original_amount_paise bigint,
    original_currency text,
    exchange_rate_date date
  )
  where current.user_id = (select auth.uid())
    and current.id = change.id
    and current.updated_at = change.expected_updated_at;
  get diagnostics changed_count = row_count;
  expected_count := jsonb_array_length(p_changes->'transactions');
  if changed_count <> expected_count then
    raise exception 'Transactions changed in another session. Reload and retry.';
  end if;

  update public.recurring_rules as current
  set amount_paise = change.amount_paise,
      original_amount_paise = change.original_amount_paise,
      original_currency = change.original_currency,
      exchange_rate_date = change.exchange_rate_date
  from jsonb_to_recordset(p_changes->'recurring_rules') as change(
    id text,
    expected_updated_at timestamptz,
    amount_paise bigint,
    original_amount_paise bigint,
    original_currency text,
    exchange_rate_date date
  )
  where current.user_id = (select auth.uid())
    and current.id = change.id
    and current.updated_at = change.expected_updated_at;
  get diagnostics changed_count = row_count;
  expected_count := jsonb_array_length(p_changes->'recurring_rules');
  if changed_count <> expected_count then
    raise exception 'Recurring schedules changed in another session. Reload and retry.';
  end if;

  update public.recurring_occurrences as current
  set amount_paise = change.amount_paise,
      original_amount_paise = change.original_amount_paise,
      original_currency = change.original_currency,
      exchange_rate_date = change.exchange_rate_date
  from jsonb_to_recordset(p_changes->'recurring_occurrences') as change(
    id text,
    expected_updated_at timestamptz,
    amount_paise bigint,
    original_amount_paise bigint,
    original_currency text,
    exchange_rate_date date
  )
  where current.user_id = (select auth.uid())
    and current.id = change.id
    and current.updated_at = change.expected_updated_at;
  get diagnostics changed_count = row_count;
  expected_count := jsonb_array_length(p_changes->'recurring_occurrences');
  if changed_count <> expected_count then
    raise exception 'Recurring history changed in another session. Reload and retry.';
  end if;

  update public.monthly_budgets as current
  set overall_limit_paise = change.overall_limit_paise,
      original_overall_limit_paise = change.original_overall_limit_paise,
      original_currency = change.original_currency,
      exchange_rate_date = change.exchange_rate_date
  from jsonb_to_recordset(p_changes->'monthly_budgets') as change(
    id text,
    expected_updated_at timestamptz,
    overall_limit_paise bigint,
    original_overall_limit_paise bigint,
    original_currency text,
    exchange_rate_date date
  )
  where current.user_id = (select auth.uid())
    and current.id = change.id
    and current.updated_at = change.expected_updated_at;
  get diagnostics changed_count = row_count;
  expected_count := jsonb_array_length(p_changes->'monthly_budgets');
  if changed_count <> expected_count then
    raise exception 'Monthly budgets changed in another session. Reload and retry.';
  end if;

  update public.budget_allocations as current
  set amount_paise = change.amount_paise,
      original_amount_paise = change.original_amount_paise,
      original_currency = change.original_currency,
      exchange_rate_date = change.exchange_rate_date
  from jsonb_to_recordset(p_changes->'budget_allocations') as change(
    budget_id text,
    category_id text,
    expected_amount_paise bigint,
    amount_paise bigint,
    original_amount_paise bigint,
    original_currency text,
    exchange_rate_date date
  )
  where current.user_id = (select auth.uid())
    and current.budget_id = change.budget_id
    and current.category_id = change.category_id
    and current.amount_paise = change.expected_amount_paise;
  get diagnostics changed_count = row_count;
  expected_count := jsonb_array_length(p_changes->'budget_allocations');
  if changed_count <> expected_count then
    raise exception 'Category budgets changed in another session. Reload and retry.';
  end if;

  insert into public.user_preferences (
    user_id,
    default_currency,
    date_format,
    hide_balances
  )
  values (
    (select auth.uid()),
    p_changes->'preferences'->>'default_currency',
    p_changes->'preferences'->>'date_format',
    (p_changes->'preferences'->>'hide_balances')::boolean
  )
  on conflict (user_id) do update
  set default_currency = excluded.default_currency,
      date_format = excluded.date_format,
      hide_balances = excluded.hide_balances;
end;
$$;

grant execute on function public.apply_currency_conversion(jsonb) to authenticated;
revoke all on function public.apply_currency_conversion(jsonb) from public;
