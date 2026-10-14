import assert from "node:assert/strict";
import test from "node:test";
import {
  createFinanceBackup,
  parseFinanceBackup,
  planFinanceRestore,
} from "./finance-backup.ts";
import type { FinanceData } from "../types/finance.ts";

const data: FinanceData = {
  categories: [
    {
      id: "expenses",
      name: "Expenses",
      color: "#214c3a",
      isDefault: true,
      type: "expense",
      isFallback: false,
    },
    {
      id: "income",
      name: "Income",
      color: "#70927d",
      isDefault: true,
      type: "income",
      isFallback: false,
    },
  ],
  rules: [
    {
      id: "rule-expenses",
      categoryId: "expenses",
      keywords: ["market"],
      priority: 10,
      isDefault: false,
    },
  ],
  transactions: [
    {
      id: "expense-1",
      type: "expense",
      description: "Weekly market",
      amountPaise: 12550,
      categoryId: "expenses",
      categorySource: "manual",
      date: "2026-10-10",
      paymentMethod: "UPI",
      notes: "Fresh produce",
      createdAt: "2026-10-10T10:00:00.000Z",
      updatedAt: "2026-10-10T10:00:00.000Z",
    },
    {
      id: "income-1",
      type: "income",
      description: "Salary",
      amountPaise: 5000000,
      categoryId: "income",
      date: "2026-10-01",
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
    },
  ],
};

function serializedBackup(financeData = data): string {
  return JSON.stringify(
    createFinanceBackup(financeData, "2026-10-14T10:00:00.000Z"),
  );
}

test("exports and validates a complete versioned backup in paise", () => {
  const parsed = parseFinanceBackup(serializedBackup());

  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.exportedAt, "2026-10-14T10:00:00.000Z");
  assert.deepEqual(parsed.data, data);
  assert.equal(parsed.data.transactions[0].amountPaise, 12550);
  assert.equal(parsed.data.transactions[1].type, "income");
});

test("rejects malformed JSON and unsupported backup versions", () => {
  assert.throws(() => parseFinanceBackup("{nope"), /not valid JSON/);
  assert.throws(
    () =>
      parseFinanceBackup(
        JSON.stringify({ ...createFinanceBackup(data), schemaVersion: 99 }),
      ),
    /Unsupported backup schema version/,
  );
});

test("rejects missing fields, invalid amounts, duplicate IDs, and broken references", () => {
  const invalidAmount = structuredClone(data);
  invalidAmount.transactions[0].amountPaise = 1.5;
  assert.throws(
    () => parseFinanceBackup(serializedBackup(invalidAmount)),
    /invalid fields or amount/,
  );

  const missingField = structuredClone(data);
  delete (missingField.categories[0] as Partial<(typeof data.categories)[0]>).color;
  assert.throws(
    () => parseFinanceBackup(serializedBackup(missingField)),
    /category with missing or invalid fields/,
  );

  const duplicate = structuredClone(data);
  duplicate.transactions[1].id = duplicate.transactions[0].id;
  assert.throws(
    () => parseFinanceBackup(serializedBackup(duplicate)),
    /duplicate transaction ID/,
  );

  const brokenReference = structuredClone(data);
  brokenReference.transactions[0].categoryId = "missing";
  assert.throws(
    () => parseFinanceBackup(serializedBackup(brokenReference)),
    /missing or incompatible category/,
  );
});

test("rejects transaction totals that exceed safe integer paise", () => {
  const excessiveTotal = structuredClone(data);
  excessiveTotal.transactions[0].amountPaise = Number.MAX_SAFE_INTEGER;
  assert.throws(
    () => parseFinanceBackup(serializedBackup(excessiveTotal)),
    /exceed the safe paise limit/,
  );
});

test("merge deduplicates identical existing records and preserves references", () => {
  const plan = planFinanceRestore(data, data, "merge");

  assert.deepEqual(plan.data, data);
  assert.deepEqual(plan.added, { categories: 0, rules: 0, transactions: 0 });
  assert.equal(
    plan.data.transactions[0].categoryId,
    plan.data.categories[0].id,
  );
});

test("merge adds new records without changing current data and rejects conflicts atomically", () => {
  const current: FinanceData = {
    ...data,
    transactions: [data.transactions[0]],
  };
  const incoming: FinanceData = {
    ...data,
    transactions: [
      data.transactions[1],
      { ...data.transactions[0], id: "expense-2", description: "Another market" },
    ],
  };
  const original = structuredClone(current);
  const plan = planFinanceRestore(current, incoming, "merge");

  assert.deepEqual(current, original);
  assert.equal(plan.data.transactions.length, 3);
  assert.deepEqual(plan.added, { categories: 0, rules: 0, transactions: 2 });

  const conflicting = {
    ...data,
    transactions: [{ ...data.transactions[0], amountPaise: 999 }],
  };
  assert.throws(
    () => planFinanceRestore(current, conflicting, "merge"),
    /already exists with different data/,
  );
  assert.deepEqual(current, original);
});

test("replace plans the backup records without changing current data", () => {
  const current: FinanceData = { categories: [], rules: [], transactions: [] };
  const original = structuredClone(current);
  const plan = planFinanceRestore(current, data, "replace");

  assert.deepEqual(plan.data, data);
  assert.deepEqual(plan.added, {
    categories: 2,
    rules: 1,
    transactions: 2,
  });
  assert.deepEqual(current, original);
});
