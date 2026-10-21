import assert from "node:assert/strict";
import test from "node:test";
import {
  createFinanceBackup,
  parseFinanceBackup,
  planFinanceRestore,
} from "./finance-backup.ts";
import { createRecurringOccurrence } from "./recurring-transactions.ts";
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
  recurringRules: [],
  recurringOccurrences: [],
  budgets: [],
};

function serializedBackup(financeData = data): string {
  return JSON.stringify(
    createFinanceBackup(financeData, "2026-10-14T10:00:00.000Z"),
  );
}

test("exports and validates a complete versioned backup in paise", () => {
  const parsed = parseFinanceBackup(serializedBackup());
  const expected = structuredClone(data);
  expected.transactions[1].categorySource = "manual";

  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.exportedAt, "2026-10-14T10:00:00.000Z");
  assert.deepEqual(parsed.data, expected);
  assert.equal(parsed.data.transactions[0].amountPaise, 12550);
  assert.equal(parsed.data.transactions[1].type, "income");
});

test("normalizes an omitted optional category source to the storage default", () => {
  const legacyData = structuredClone(data);
  delete legacyData.transactions[0].categorySource;

  const parsed = parseFinanceBackup(serializedBackup(legacyData));

  assert.equal(parsed.data.transactions[0].categorySource, "manual");
});

test("round-trips recurring schedules and occurrence history in JSON backups", () => {
  const now = "2026-10-14T10:00:00.000Z";
  const recurringRule = {
    id: "rent-monthly",
    description: "Monthly rent",
    type: "expense" as const,
    amountPaise: 125000,
    categoryId: "expenses",
    frequency: "monthly" as const,
    startDate: "2026-10-14",
    nextDueDate: "2026-10-14",
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  const recurringData: FinanceData = {
    ...data,
    recurringRules: [recurringRule],
    recurringOccurrences: [
      createRecurringOccurrence(recurringRule, recurringRule.nextDueDate, now),
    ],
  };

  const parsed = parseFinanceBackup(serializedBackup(recurringData));
  assert.deepEqual(parsed.data.recurringRules, [recurringRule]);
  assert.deepEqual(
    parsed.data.recurringOccurrences,
    recurringData.recurringOccurrences,
  );
});

test("accepts older JSON backups without recurring arrays", () => {
  const backup = createFinanceBackup(data);
  const oldData = {
    categories: backup.data.categories,
    rules: backup.data.rules,
    transactions: backup.data.transactions,
  };
  const oldBackup = JSON.stringify({ ...backup, data: oldData });

  const parsed = parseFinanceBackup(oldBackup);
  assert.deepEqual(parsed.data.recurringRules, []);
  assert.deepEqual(parsed.data.recurringOccurrences, []);
  assert.deepEqual(parsed.data.budgets, []);
});

test("round-trips monthly budgets and accepts pre-budget backups", () => {
  const budgetData: FinanceData = {
    ...data,
    budgets: [
      {
        id: "budget-october",
        year: 2026,
        month: 10,
        overallLimitPaise: 250000,
        allocations: [{ categoryId: "expenses", amountPaise: 100000 }],
        createdAt: "2026-10-01T10:00:00.000Z",
        updatedAt: "2026-10-02T10:00:00.000Z",
      },
    ],
  };
  const parsed = parseFinanceBackup(serializedBackup(budgetData));
  assert.deepEqual(parsed.data.budgets, budgetData.budgets);

  const oldBackup = JSON.parse(serializedBackup(data)) as {
    data: Record<string, unknown>;
  };
  delete oldBackup.data.budgets;
  assert.deepEqual(
    parseFinanceBackup(JSON.stringify(oldBackup)).data.budgets,
    [],
  );
});

test("rejects invalid budget amounts, duplicate monthly budgets, and duplicate allocations", () => {
  const validBudget = {
    id: "budget-october",
    year: 2026,
    month: 10,
    overallLimitPaise: 250000,
    allocations: [{ categoryId: "expenses", amountPaise: 100000 }],
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-02T10:00:00.000Z",
  };
  const invalidAmount: FinanceData = {
    ...data,
    budgets: [{ ...validBudget, overallLimitPaise: 0 }],
  };
  assert.throws(
    () => parseFinanceBackup(serializedBackup(invalidAmount)),
    /monthly budget with invalid fields/,
  );

  const duplicateMonth: FinanceData = {
    ...data,
    budgets: [validBudget, { ...validBudget, id: "budget-october-duplicate" }],
  };
  assert.throws(
    () => parseFinanceBackup(serializedBackup(duplicateMonth)),
    /monthly budget with invalid fields/,
  );

  const duplicateAllocation: FinanceData = {
    ...data,
    budgets: [
      {
        ...validBudget,
        allocations: [
          ...validBudget.allocations,
          { categoryId: "expenses", amountPaise: 20000 },
        ],
      },
    ],
  };
  assert.throws(
    () => parseFinanceBackup(serializedBackup(duplicateAllocation)),
    /monthly budget with invalid fields/,
  );
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
  delete (missingField.categories[0] as Partial<(typeof data.categories)[0]>)
    .color;
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

test("rejects duplicate IDs in category and rule collections", () => {
  const duplicateCategory = structuredClone(data);
  duplicateCategory.categories[1].id = duplicateCategory.categories[0].id;
  assert.throws(
    () => parseFinanceBackup(serializedBackup(duplicateCategory)),
    /duplicate category ID/,
  );

  const duplicateRule = structuredClone(data);
  duplicateRule.rules.push({ ...duplicateRule.rules[0] });
  assert.throws(
    () => parseFinanceBackup(serializedBackup(duplicateRule)),
    /duplicate rule ID/,
  );
});

test("rejects transaction totals that exceed safe integer paise", () => {
  const excessiveTotal = structuredClone(data);
  excessiveTotal.transactions[0].amountPaise = Number.MAX_SAFE_INTEGER;
  excessiveTotal.transactions.push({
    ...excessiveTotal.transactions[0],
    id: "expense-overflow",
    amountPaise: 1,
  });
  assert.throws(
    () => parseFinanceBackup(serializedBackup(excessiveTotal)),
    /exceed the safe paise limit/,
  );
});

test("merge deduplicates identical existing records and preserves references", () => {
  const plan = planFinanceRestore(data, data, "merge");
  const expected = structuredClone(data);
  expected.transactions[1].categorySource = "manual";

  assert.deepEqual(plan.data, expected);
  assert.deepEqual(plan.added, {
    categories: 0,
    rules: 0,
    transactions: 0,
    recurringRules: 0,
    recurringOccurrences: 0,
    budgets: 0,
  });
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
      {
        ...data.transactions[0],
        id: "expense-2",
        description: "Another market",
      },
    ],
  };
  const original = structuredClone(current);
  const plan = planFinanceRestore(current, incoming, "merge");

  assert.deepEqual(current, original);
  assert.equal(plan.data.transactions.length, 3);
  assert.deepEqual(plan.added, {
    categories: 0,
    rules: 0,
    transactions: 2,
    recurringRules: 0,
    recurringOccurrences: 0,
    budgets: 0,
  });

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

test("merge adds monthly budgets and rejects a second budget for the same month atomically", () => {
  const current: FinanceData = { ...data, budgets: [] };
  const budget = {
    id: "budget-october",
    year: 2026,
    month: 10,
    allocations: [{ categoryId: "expenses", amountPaise: 25000 }],
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-02T10:00:00.000Z",
  };
  const incoming: FinanceData = { ...data, budgets: [budget] };
  const plan = planFinanceRestore(current, incoming, "merge");

  assert.deepEqual(plan.data.budgets, [budget]);
  assert.equal(plan.added.budgets, 1);

  const conflictingCurrent = {
    ...current,
    budgets: [{ ...budget, id: "current-budget" }],
  };
  const original = structuredClone(conflictingCurrent);
  assert.throws(
    () => planFinanceRestore(conflictingCurrent, incoming, "merge"),
    /monthly budget with invalid fields/,
  );
  assert.deepEqual(conflictingCurrent, original);
});

test("failed imports leave current data unchanged when merged totals overflow", () => {
  const current: FinanceData = {
    ...data,
    transactions: [
      { ...data.transactions[0], amountPaise: Number.MAX_SAFE_INTEGER - 10 },
    ],
  };
  const original = structuredClone(current);
  const incoming: FinanceData = {
    ...data,
    transactions: [
      { ...data.transactions[0], id: "new-transaction", amountPaise: 20 },
    ],
  };

  assert.throws(
    () => planFinanceRestore(current, incoming, "merge"),
    /exceed the safe paise limit/,
  );
  assert.deepEqual(current, original);
});

test("replace plans the backup records without changing current data", () => {
  const current: FinanceData = {
    categories: [],
    rules: [],
    transactions: [],
    recurringRules: [],
    recurringOccurrences: [],
    budgets: [],
  };
  const original = structuredClone(current);
  const plan = planFinanceRestore(current, data, "replace");
  const expected = structuredClone(data);
  expected.transactions[1].categorySource = "manual";

  assert.deepEqual(plan.data, expected);
  assert.deepEqual(plan.added, {
    categories: 2,
    rules: 1,
    transactions: 2,
    recurringRules: 0,
    recurringOccurrences: 0,
    budgets: 0,
  });
  assert.deepEqual(current, original);
});
