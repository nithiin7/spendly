import assert from "node:assert/strict";
import test from "node:test";
import { defaultCategories } from "./categories.ts";
import {
  createTransactionsCsv,
  filterAndSortTransactions,
  getMonthlyFinancialSummary,
  getPreviousMonthKey,
  getSpendingMonths,
  parseRupeesToPaise,
  removeTransaction,
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

test("deleted transactions no longer affect monthly totals or category totals", () => {
  const transactions = [
    transaction("salary", "income", "2026-10-03", 300000),
    transaction("deleted rent", "expense", "2026-10-04", 120000),
    transaction("groceries", "expense", "2026-10-05", 25000, "category-3"),
  ];
  const remaining = removeTransaction(transactions, "deleted rent");
  const summary = getMonthlyFinancialSummary(
    remaining,
    defaultCategories,
    "2026-10",
  );

  assert.deepEqual(
    remaining.map(({ id }) => id),
    ["salary", "groceries"],
  );
  assert.equal(summary.incomePaise, 300000);
  assert.equal(summary.expensePaise, 25000);
  assert.equal(summary.balancePaise, 275000);
  assert.equal(summary.transactionCount, 2);
  assert.deepEqual(
    summary.categoryTotals.map(({ id, amountPaise }) => [id, amountPaise]),
    [["category-3", 25000]],
  );
});

test("generates a six-month trend ending at the selected month across year boundaries", () => {
  const months = getSpendingMonths([], 6, "2026-02");

  assert.deepEqual(
    months.map(({ monthKey }) => monthKey),
    ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"],
  );
  assert.equal(getPreviousMonthKey("2026-01"), "2025-12");
});

test("search, month, type, category, and sorting filters compose correctly across years", () => {
  const transactions = [
    transaction("October rent", "expense", "2025-10-01", 5000),
    transaction("October income", "income", "2026-10-01", 20000),
    transaction("October groceries", "expense", "2026-10-15", 8000, "category-3"),
  ];
  const filtered = filterAndSortTransactions(transactions, {
    query: "october",
    month: "2026-10",
    type: "expense",
    categoryId: "category-3",
    sort: "amount-desc",
  });

  assert.deepEqual(
    filtered.map(({ id }) => id),
    ["October groceries"],
  );
  assert.equal(
    filterAndSortTransactions(transactions, {
      query: "",
      month: "2025-10",
      type: "all",
      categoryId: "",
      sort: "date-desc",
    }).length,
    1,
  );
});

test("CSV export has labeled ISO dates, exact INR amounts, quoted fields, and safe formulas", () => {
  const csv = createTransactionsCsv(
    [
      {
        ...transaction("csv", "expense", "2026-10-14", 12345),
        description: 'Market, "fresh"',
        paymentMethod: "UPI",
        notes: "=HYPERLINK(\"https://example.com\")",
        categorySource: "manual",
      },
    ],
    defaultCategories,
  );
  const rows = csv.split("\r\n");

  assert.equal(
    rows[0],
    '"Date (YYYY-MM-DD)","Type","Description","Category","Amount (INR)","Original Amount","Original Currency","Exchange Rate Date","Payment Method","Notes","Category Source","Created At","Updated At"',
  );
  assert.equal(
    rows[1],
    '"2026-10-14","expense","Market, ""fresh""","Rent","123.45","","","","UPI","\'=HYPERLINK(""https://example.com"")","Confirmed","2026-10-14T12:00:00.000Z","2026-10-14T12:00:00.000Z"',
  );
});

test("amount parsing rejects zero, negatives, malformed decimals, and unsafe values", () => {
  assert.equal(parseRupeesToPaise("123.45"), 12345);
  assert.equal(parseRupeesToPaise("0"), null);
  assert.equal(parseRupeesToPaise("-1.00"), null);
  assert.equal(parseRupeesToPaise("12.345"), null);
  assert.equal(parseRupeesToPaise("90071992547410"), null);
});
