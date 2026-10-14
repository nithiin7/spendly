import assert from "node:assert/strict";
import test from "node:test";
import { convertFinanceDataCurrency } from "./finance-currency.ts";
import type { FinanceData } from "../types/finance.ts";

function sampleData(): FinanceData {
  const now = "2026-10-14T10:00:00.000Z";
  return {
    preferences: {
      defaultCurrency: "INR",
      dateFormat: "DD/MM/YYYY",
      hideBalances: false,
    },
    categories: [],
    rules: [],
    transactions: [
      {
        id: "transaction",
        type: "expense",
        description: "Test purchase",
        amountPaise: 10000,
        categoryId: "food",
        date: "2026-10-14",
        createdAt: now,
        updatedAt: now,
      },
    ],
    recurringRules: [
      {
        id: "rule",
        description: "Monthly payment",
        type: "expense",
        amountPaise: 20000,
        categoryId: "food",
        frequency: "monthly",
        startDate: "2026-10-14",
        nextDueDate: "2026-11-14",
        active: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    recurringOccurrences: [
      {
        id: "occurrence",
        ruleId: "rule",
        scheduledDate: "2026-10-14",
        date: "2026-10-14",
        description: "Monthly payment",
        type: "expense",
        amountPaise: 20000,
        categoryId: "food",
        status: "pending",
        createdAt: now,
        updatedAt: now,
      },
    ],
    budgets: [
      {
        id: "budget",
        year: 2026,
        month: 10,
        overallLimitPaise: 50000,
        allocations: [{ categoryId: "food", amountPaise: 30000 }],
        createdAt: now,
        updatedAt: now,
      },
    ],
  };
}

test("converts every monetary record using historical rates and keeps original amounts when requested", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify([
        { date: "2026-10-01", rate: 0.5 },
        { date: "2026-10-14", rate: 0.5 },
      ]),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  try {
    const progress: [number, number][] = [];
    const result = await convertFinanceDataCurrency(sampleData(), {
      fromCurrency: "INR",
      toCurrency: "USD",
      preserveOriginalAmounts: true,
      onProgress: (completed, total) => progress.push([completed, total]),
    });

    assert.equal(result.transactions[0].amountPaise, 5000);
    assert.equal(result.transactions[0].originalAmountPaise, 10000);
    assert.equal(result.transactions[0].originalCurrency, "INR");
    assert.equal(result.recurringRules[0].amountPaise, 10000);
    assert.equal(result.recurringOccurrences[0].amountPaise, 10000);
    assert.equal(result.budgets[0].overallLimitPaise, 25000);
    assert.equal(result.budgets[0].allocations[0].amountPaise, 15000);
    assert.deepEqual(progress.at(-1), [5, 5]);
    assert.equal(result.preferences?.defaultCurrency, "USD");
    assert.equal(sampleData().transactions[0].amountPaise, 10000);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("removes original-currency metadata for a permanent conversion", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify([
        { date: "2026-10-01", rate: 0.5 },
        { date: "2026-10-14", rate: 0.5 },
      ]),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  try {
    const result = await convertFinanceDataCurrency(sampleData(), {
      fromCurrency: "INR",
      toCurrency: "USD",
      preserveOriginalAmounts: false,
      onProgress: () => {},
    });
    assert.equal(result.transactions[0].amountPaise, 5000);
    assert.equal(result.transactions[0].originalAmountPaise, undefined);
    assert.equal(result.budgets[0].originalOverallLimitPaise, undefined);
    assert.equal(
      result.budgets[0].allocations[0].originalCurrency,
      undefined,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
