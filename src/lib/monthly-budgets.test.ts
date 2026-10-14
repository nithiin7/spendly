import assert from "node:assert/strict";
import test from "node:test";
import { defaultCategories } from "./categories.ts";
import {
  calculateMonthlyBudgetAnalytics,
  copyPreviousMonthAllocations,
  validateMonthlyBudgets,
} from "./monthly-budgets.ts";
import { getMonthlyFinancialSummary } from "./finance-utils.ts";
import type {
  MonthlyBudget,
  Transaction,
} from "../types/finance.ts";

function transaction(
  id: string,
  type: Transaction["type"],
  date: string,
  amountPaise: number,
  categoryId = "category-1",
): Transaction {
  return {
    id,
    type,
    description: id,
    amountPaise,
    categoryId,
    date,
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

function monthlyBudget(
  overrides: Partial<MonthlyBudget> = {},
): MonthlyBudget {
  return {
    id: "budget-2026-10",
    year: 2026,
    month: 10,
    overallLimitPaise: 10000,
    allocations: [{ categoryId: "category-1", amountPaise: 8000 }],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...overrides,
  };
}

test("calculates overall and category budgets from selected-month expenses only", () => {
  const transactions = [
    transaction("rent", "expense", "2026-10-02", 10000, "category-1"),
    transaction("groceries", "expense", "2026-10-15", 3000, "category-3"),
    transaction("rent", "expense", "2026-10-02", 99999, "category-1"),
    transaction("salary", "income", "2026-10-01", 500000, "category-15"),
    transaction("prior-year", "expense", "2025-10-31", 70000),
    transaction("next-month", "expense", "2026-11-01", 80000),
  ];
  const original = structuredClone(transactions);
  const analytics = calculateMonthlyBudgetAnalytics(
    transactions,
    defaultCategories,
    monthlyBudget(),
    "2026-10",
  );

  assert.equal(analytics.expensePaise, 13000);
  assert.equal(analytics.overall?.remainingPaise, -3000);
  assert.equal(analytics.overall?.utilizationPercent, 130);
  assert.equal(analytics.overall?.status, "over");
  assert.equal(analytics.categories.find((item) => item.categoryId === "category-1")?.remainingPaise, -2000);
  assert.equal(analytics.categories.find((item) => item.categoryId === "category-1")?.status, "over");
  assert.equal(analytics.unbudgetedExpensePaise, 3000);
  assert.deepEqual(
    analytics.unbudgetedCategories.map((item) => [item.categoryId, item.spentPaise]),
    [["category-3", 3000]],
  );
  assert.deepEqual(transactions, original);
});

test("marks a category approaching at the shared 80 percent threshold", () => {
  const analytics = calculateMonthlyBudgetAnalytics(
    [transaction("rent", "expense", "2026-10-02", 8000)],
    defaultCategories,
    monthlyBudget({ overallLimitPaise: 10000 }),
    "2026-10",
  );

  assert.equal(analytics.overall?.status, "approaching");
  assert.equal(analytics.approachingCategories.length, 1);
});

test("handles zero and missing limits without fabricating a zero budget", () => {
  const noBudget = calculateMonthlyBudgetAnalytics(
    [transaction("rent", "expense", "2026-10-02", 1000)],
    defaultCategories,
    null,
    "2026-10",
  );
  assert.equal(noBudget.overall, null);
  assert.equal(noBudget.categories[0].budgetPaise, null);
  assert.equal(noBudget.unbudgetedExpensePaise, 1000);

  const zeroLimit = calculateMonthlyBudgetAnalytics(
    [transaction("rent", "expense", "2026-10-02", 1000)],
    defaultCategories,
    monthlyBudget({
      overallLimitPaise: 0,
      allocations: [{ categoryId: "category-1", amountPaise: 0 }],
    }),
    "2026-10",
  );
  assert.equal(zeroLimit.overall, null);
  assert.equal(zeroLimit.categories[0].budgetPaise, null);
  assert.equal(zeroLimit.categories[0].status, null);
});

test("calculates all actual expenses while excluding income and adjacent calendar months", () => {
  const analytics = calculateMonthlyBudgetAnalytics(
    [
      transaction("last-day", "expense", "2026-10-31", 2500),
      transaction("income", "income", "2026-10-31", 80000, "category-15"),
      transaction("first-next-month", "expense", "2026-11-01", 5000),
      transaction("prior-year-same-month", "expense", "2025-10-01", 7000),
    ],
    defaultCategories,
    monthlyBudget({ allocations: [] }),
    "2026-10",
  );

  assert.equal(analytics.expensePaise, 2500);
  assert.equal(analytics.unbudgetedExpensePaise, 2500);
});

test("copies only the previous calendar month's category allocations across years", () => {
  const december = monthlyBudget({
    id: "budget-2026-12",
    year: 2026,
    month: 12,
    allocations: [
      { categoryId: "category-1", amountPaise: 5000 },
      { categoryId: "category-3", amountPaise: 9000 },
    ],
  });
  const allocations = copyPreviousMonthAllocations([december], 2027, 1);

  assert.deepEqual(allocations, december.allocations);
  assert.notEqual(allocations, december.allocations);
  assert.deepEqual(copyPreviousMonthAllocations([december], 2026, 1), null);
});

test("rejects duplicate category allocations, duplicate months, and invalid categories", () => {
  const base = monthlyBudget();
  const duplicateAllocation = {
    ...base,
    allocations: [
      ...base.allocations,
      { categoryId: "category-1", amountPaise: 1000 },
    ],
  };
  assert.equal(
    validateMonthlyBudgets([duplicateAllocation], defaultCategories),
    false,
  );
  assert.equal(
    validateMonthlyBudgets(
      [base, { ...base, id: "another-id" }],
      defaultCategories,
    ),
    false,
  );
  assert.equal(
    validateMonthlyBudgets(
      [
        {
          ...base,
          allocations: [{ categoryId: "category-15", amountPaise: 1000 }],
        },
      ],
      defaultCategories,
    ),
    false,
  );
});

test("budget and overview expense totals update from the same transaction source", () => {
  const budget = monthlyBudget();
  const beforeTransactions = [
    transaction("market", "expense", "2026-10-02", 4000, "category-1"),
  ];
  const afterTransactions = [
    transaction("market", "expense", "2026-10-02", 9000, "category-1"),
  ];

  const before = calculateMonthlyBudgetAnalytics(
    beforeTransactions,
    defaultCategories,
    budget,
    "2026-10",
  );
  const after = calculateMonthlyBudgetAnalytics(
    afterTransactions,
    defaultCategories,
    budget,
    "2026-10",
  );
  const insightSummary = getMonthlyFinancialSummary(
    afterTransactions,
    defaultCategories,
    "2026-10",
  );

  assert.equal(before.expensePaise, 4000);
  assert.equal(after.expensePaise, 9000);
  assert.equal(after.overall?.spentPaise, insightSummary.expensePaise);
  assert.equal(after.categories[0].spentPaise, 9000);
  assert.equal(after.overBudgetCategories[0].categoryId, "category-1");
});
