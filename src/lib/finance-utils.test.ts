import assert from "node:assert/strict";
import test from "node:test";
import { defaultCategories } from "./categories.ts";
import {
  getMonthlyFinancialSummary,
  getPreviousMonthKey,
  getSpendingMonths,
} from "./finance-utils.ts";
import type { Transaction } from "../types/finance.ts";

function transaction(
  id: string,
  type: Transaction["type"],
  date: string,
  amountPaise: number,
  categoryId = type === "income" ? "category-15" : "category-1",
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

test("calculates selected month totals, category totals, count, largest expense, and comparison", () => {
  const transactions = [
    transaction("salary", "income", "2026-10-01", 5000000),
    transaction("bonus", "income", "2026-10-12", 250000),
    transaction("rent", "expense", "2026-10-02", 1800000, "category-1"),
    transaction("groceries", "expense", "2026-10-13", 325500, "category-3"),
    transaction("previous salary", "income", "2026-09-01", 4800000),
    transaction("previous rent", "expense", "2026-09-02", 1700000),
    transaction("other year", "expense", "2025-10-02", 900000),
  ];

  const summary = getMonthlyFinancialSummary(
    transactions,
    defaultCategories,
    "2026-10",
  );

  assert.equal(summary.incomePaise, 5250000);
  assert.equal(summary.expensePaise, 2125500);
  assert.equal(summary.balancePaise, 3124500);
  assert.equal(summary.savingsRate, (3124500 / 5250000) * 100);
  assert.equal(summary.transactionCount, 4);
  assert.equal(summary.largestExpense?.id, "rent");
  assert.deepEqual(
    summary.categoryTotals.map(({ id, amountPaise }) => [id, amountPaise]),
    [
      ["category-1", 1800000],
      ["category-3", 325500],
    ],
  );
  assert.equal(summary.previousMonth.incomePaise, 4800000);
  assert.equal(summary.previousMonth.expensePaise, 1700000);
  assert.equal(summary.expenseChangePaise, 425500);
  assert.equal(
    summary.expenseChangePercent,
    (425500 / 1700000) * 100,
  );
});

test("does not include adjacent dates and separates income from expenses", () => {
  const summary = getMonthlyFinancialSummary(
    [
      transaction("end of month", "expense", "2026-10-31", 10000),
      transaction("start next month", "income", "2026-11-01", 20000),
      transaction("prior year", "income", "2025-10-31", 30000),
    ],
    defaultCategories,
    "2026-10",
  );

  assert.equal(summary.incomePaise, 0);
  assert.equal(summary.expensePaise, 10000);
  assert.equal(summary.balancePaise, -10000);
  assert.equal(summary.savingsRate, null);
  assert.equal(summary.transactionCount, 1);
});

test("handles months with no transactions or no previous-month expenses", () => {
  const summary = getMonthlyFinancialSummary(
    [transaction("income", "income", "2026-10-03", 100000)],
    defaultCategories,
    "2026-10",
  );

  assert.equal(summary.savingsRate, 100);
  assert.equal(summary.largestExpense, null);
  assert.equal(summary.expenseChangePaise, 0);
  assert.equal(summary.expenseChangePercent, null);
  assert.deepEqual(summary.categoryTotals, []);
});

test("generates a six-month trend ending at the selected month across year boundaries", () => {
  const months = getSpendingMonths([], 6, "2026-02");

  assert.deepEqual(
    months.map(({ monthKey }) => monthKey),
    ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"],
  );
  assert.equal(getPreviousMonthKey("2026-01"), "2025-12");
});
