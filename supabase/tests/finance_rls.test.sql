begin;

create extension if not exists pgtap with schema extensions;

insert into auth.users (id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rls-a@example.invalid', '', now(), now()),
  ('20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'rls-b@example.invalid', '', now(), now());

insert into public.categories (id, user_id, name, color, type)
values
  ('expense-a', '10000000-0000-4000-8000-000000000001', 'Food', '#ffffff', 'expense'),
  ('expense-b', '20000000-0000-4000-8000-000000000002', 'Food', '#ffffff', 'expense');

insert into public.user_preferences (user_id, default_currency)
values ('20000000-0000-4000-8000-000000000002', 'USD');

select plan(8);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);

select is(
  (select count(*)::integer from public.categories),
  1,
  'users can read only their own categories'
);

select is(
  (select count(*)::integer from public.user_preferences),
  0,
  'users cannot read another account preferences'
);

insert into public.user_preferences (user_id, default_currency)
values ('10000000-0000-4000-8000-000000000001', 'EUR');

select is(
  (select default_currency from public.user_preferences),
  'EUR',
  'users can save their own currency preferences'
);

insert into public.transactions (
  id, user_id, type, description, amount_paise, category_id, date, created_at
)
values (
  'transaction-a',
  '10000000-0000-4000-8000-000000000001',
  'expense',
  'Test transaction',
  100,
  'expense-a',
  date '2026-10-14',
  now()
);

select throws_ok(
  $$insert into public.transactions
    (id, user_id, type, description, amount_paise, category_id, date, created_at)
    values ('cross-user', '20000000-0000-4000-8000-000000000002',
      'expense', 'Test transaction', 100, 'expense-b', date '2026-10-14', now())$$,
  '42501',
  null,
  'users cannot insert rows owned by another account'
);

select throws_ok(
  $$insert into public.transactions
    (id, user_id, type, description, amount_paise, category_id, date, created_at)
    values ('cross-category', '10000000-0000-4000-8000-000000000001',
      'expense', 'Test transaction', 100, 'expense-b', date '2026-10-14', now())$$,
  '23503',
  null,
  'a transaction cannot reference another user category'
);

update public.categories
set name = 'Private rename'
where id = 'expense-b';
select is(
  (select name from public.categories where id = 'expense-b'),
  null,
  'users cannot update another account category'
);

delete from public.categories where id = 'expense-b';
select is(
  (select count(*)::integer from public.categories where id = 'expense-b'),
  0,
  'users cannot delete another account category'
);

set local role anon;
select throws_ok(
  $$select * from public.transactions$$,
  '42501',
  null,
  'anonymous users cannot read private financial data'
);

select * from finish();
rollback;
