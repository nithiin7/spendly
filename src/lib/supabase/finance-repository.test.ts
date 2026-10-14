import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseFinanceRepository } from "./finance-repository.ts";
import type { Database } from "../../types/supabase.ts";
import type { FinanceData } from "../../types/finance.ts";

test("loads mapped finance records and scopes every query to the signed-in owner", async () => {
  const ownerId = "10000000-0000-4000-8000-000000000001";
  const categories = [
    {
      id: "food",
      user_id: ownerId,
      name: "Food",
      color: "#214c3a",
      is_default: false,
      type: "expense",
      is_fallback: false,
      created_at: "2026-10-01T00:00:00.000Z",
      updated_at: "2026-10-02T00:00:00.000Z",
    },
  ];
  const transactions = [
    {
      id: "transaction-1",
      user_id: ownerId,
      type: "expense",
      description: "Groceries",
      amount_paise: 12_550,
      category_id: "food",
      category_source: "manual",
      date: "2026-10-01",
      payment_method: null,
      notes: null,
      created_at: "2026-10-01T00:00:00.000Z",
      updated_at: "2026-10-02T00:00:00.000Z",
    },
  ];
  const rows: Record<string, object[]> = {
    categories,
    transactions,
    category_rules: [],
    recurring_rules: [],
    recurring_occurrences: [],
    monthly_budgets: [],
    budget_allocations: [],
    user_preferences: [],
  };
  const filters: { table: string; column: string; value: string }[] = [];
  const client = {
    from(table: string) {
      const query = {} as {
        select: () => typeof query;
        eq: (column: string, value: string) => typeof query;
        maybeSingle: () => Promise<{ data: object | null; error: null }>;
        then: (
          resolve: (value: { data: object[]; error: null }) => unknown,
        ) => Promise<unknown>;
      };
      query.select = () => query;
      query.eq = (column, value) => {
        filters.push({ table, column, value });
        return query;
      };
      query.maybeSingle = () =>
        Promise.resolve({ data: rows[table]?.[0] ?? null, error: null });
      query.then = (resolve) =>
        Promise.resolve({ data: rows[table] ?? [], error: null }).then(resolve);
      return query;
    },
  } as unknown as SupabaseClient<Database>;
  const repository = new SupabaseFinanceRepository(client, ownerId);

  const data = await repository.loadFinanceData();

  assert.deepEqual(data.categories, [
    {
      id: "food",
      name: "Food",
      color: "#214c3a",
      isDefault: false,
      type: "expense",
      isFallback: false,
    },
  ]);
  assert.deepEqual(data.transactions, [
    {
      id: "transaction-1",
      type: "expense",
      description: "Groceries",
      amountPaise: 12_550,
      categoryId: "food",
      categorySource: "manual",
      date: "2026-10-01",
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-02T00:00:00.000Z",
    },
  ]);
  assert.equal(filters.length, 8);
  assert.ok(
    filters.every(
      (filter) => filter.column === "user_id" && filter.value === ownerId,
    ),
  );
});

test("writes newly created records with the authenticated owner", async () => {
  const ownerId = "10000000-0000-4000-8000-000000000001";
  let inserted: { table: string; value: Record<string, unknown> } | null = null;
  const client = {
    from(table: string) {
      const query = {
        insert(value: Record<string, unknown>) {
          inserted = { table, value };
          return query;
        },
        select() {
          return query;
        },
        single() {
          return Promise.resolve({
            data: { updated_at: "2026-10-02T00:00:00.000Z" },
            error: null,
          });
        },
      };
      return query;
    },
  } as unknown as SupabaseClient<Database>;
  const repository = new SupabaseFinanceRepository(client, ownerId);
  const previous: FinanceData = {
    categories: [],
    rules: [],
    transactions: [],
    recurringRules: [],
    recurringOccurrences: [],
    budgets: [],
  };
  const next: FinanceData = {
    ...previous,
    categories: [
      {
        id: "food",
        name: "Food",
        color: "#214c3a",
        isDefault: false,
        type: "expense",
        isFallback: false,
      },
    ],
  };

  await repository.persistChanges(previous, next);

  assert.deepEqual(inserted, {
    table: "categories",
    value: {
      id: "food",
      user_id: ownerId,
      name: "Food",
      color: "#214c3a",
      is_default: false,
      type: "expense",
      is_fallback: false,
    },
  });
});
