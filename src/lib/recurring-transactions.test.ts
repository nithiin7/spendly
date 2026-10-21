import assert from "node:assert/strict";
import test from "node:test";
import { getMonthlyFinancialSummary } from "./finance-utils.ts";
import {
  createRecurringOccurrence,
  getNextRecurringDate,
  settleRecurringOccurrence,
  updatePendingOccurrence,
  validateRecurringRuleInput,
} from "./recurring-transactions.ts";
import type {
  FinanceData,
  RecurringRule,
  RecurringRuleInput,
} from "../types/finance.ts";

const categories = [
  {
    id: "expense",
    name: "Household",
    color: "#214c3a",
    isDefault: true,
    isFallback: false,
    type: "expense" as const,
  },
  {
    id: "income",
    name: "Salary",
    color: "#70927d",
    isDefault: true,
    isFallback: false,
    type: "income" as const,
  },
];

function makeRule(overrides: Partial<RecurringRule> = {}): RecurringRule {
  return {
    id: "rule-1",
    description: "Monthly rent",
    type: "expense",
    amountPaise: 125000,
    categoryId: "expense",
    frequency: "monthly",
    startDate: "2026-01-31",
    nextDueDate: "2026-01-31",
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeData(rule = makeRule()): FinanceData {
  return {
    categories,
    rules: [],
    transactions: [],
    recurringRules: [rule],
    recurringOccurrences: [createRecurringOccurrence(rule, rule.nextDueDate)],
    budgets: [],
  };
}

test("monthly dates clamp in short months and recover the anchor day in leap years", () => {
  const rule = makeRule({ startDate: "2024-01-31" });
  assert.equal(getNextRecurringDate(rule, "2024-01-31"), "2024-02-29");
  assert.equal(getNextRecurringDate(rule, "2024-02-29"), "2024-03-31");
  assert.equal(getNextRecurringDate(rule, "2024-03-31"), "2024-04-30");
  assert.equal(
    getNextRecurringDate({ ...rule, startDate: "2023-01-31" }, "2023-01-31"),
    "2023-02-28",
  );
});

test("weekly, quarterly, and yearly schedules advance by their calendar intervals", () => {
  const rule = makeRule({ startDate: "2026-01-31" });
  assert.equal(
    getNextRecurringDate({ ...rule, frequency: "weekly" }, "2026-01-31"),
    "2026-02-07",
  );
  assert.equal(
    getNextRecurringDate({ ...rule, frequency: "quarterly" }, "2026-01-31"),
    "2026-04-30",
  );
  assert.equal(
    getNextRecurringDate({ ...rule, frequency: "yearly" }, "2026-01-31"),
    "2027-01-31",
  );
  assert.equal(
    getNextRecurringDate(
      { ...rule, frequency: "custom", interval: 10 },
      "2026-01-31",
    ),
    "2026-02-10",
  );
});

test("rule validation enforces start and end date boundaries", () => {
  const input: RecurringRuleInput = {
    description: "Salary",
    type: "income",
    amountPaise: 5000000,
    categoryId: "income",
    frequency: "monthly",
    startDate: "2026-01-01",
    nextDueDate: "2026-01-01",
    endDate: "2026-02-01",
    active: true,
  };
  assert.equal(validateRecurringRuleInput(input, categories), null);
  assert.match(
    validateRecurringRuleInput(
      { ...input, nextDueDate: "2025-12-31" },
      categories,
    ) ?? "",
    /before the start date/,
  );
  assert.match(
    validateRecurringRuleInput(
      { ...input, nextDueDate: "2026-02-02" },
      categories,
    ) ?? "",
    /end date/,
  );
});

test("skipping advances the rule but creates no actual transaction", () => {
  const data = makeData();
  const skipped = settleRecurringOccurrence(
    data,
    data.recurringOccurrences[0].id,
    "skipped",
    "2026-01-31T10:00:00.000Z",
  );

  assert.equal(skipped.transactions.length, 0);
  assert.equal(
    skipped.recurringOccurrences.find(
      (item) => item.scheduledDate === "2026-02-28",
    )?.status,
    "pending",
  );
  assert.equal(skipped.recurringRules[0].nextDueDate, "2026-02-28");
  assert.equal(
    skipped.recurringOccurrences.find((item) => item.status === "skipped")
      ?.status,
    "skipped",
  );
});

test("confirming creates one normal transaction and a repeated confirmation is idempotent", () => {
  const data = makeData();
  const confirmed = settleRecurringOccurrence(
    data,
    data.recurringOccurrences[0].id,
    "confirmed",
    "2026-01-31T10:00:00.000Z",
  );
  const retried = settleRecurringOccurrence(
    confirmed,
    data.recurringOccurrences[0].id,
    "confirmed",
    "2026-01-31T10:01:00.000Z",
  );

  assert.equal(confirmed.transactions.length, 1);
  const completedOccurrence = confirmed.recurringOccurrences.find(
    (item) => item.scheduledDate === "2026-01-31",
  );
  assert.equal(completedOccurrence?.status, "confirmed");
  assert.equal(
    confirmed.transactions[0].id,
    completedOccurrence?.transactionId,
  );
  assert.equal(confirmed.transactions[0].amountPaise, 125000);
  assert.equal(retried, confirmed);
  assert.equal(retried.transactions.length, 1);
});

test("a pre-existing idempotency key blocks a duplicate transaction", () => {
  const data = makeData();
  const duplicateId = `recurring-occurrence::${data.recurringOccurrences[0].id}`;
  const withCollision: FinanceData = {
    ...data,
    transactions: [
      {
        id: duplicateId,
        type: "expense",
        description: "Existing linked expense",
        amountPaise: 500,
        categoryId: "expense",
        date: "2026-01-31",
        createdAt: "2026-01-31T10:00:00.000Z",
        updatedAt: "2026-01-31T10:00:00.000Z",
      },
    ],
  };

  assert.throws(
    () =>
      settleRecurringOccurrence(
        withCollision,
        data.recurringOccurrences[0].id,
        "confirmed",
      ),
    /already exists/,
  );
  assert.equal(withCollision.recurringOccurrences[0].status, "pending");
  assert.equal(withCollision.transactions.length, 1);
});

test("individual occurrence edits do not change its recurring rule", () => {
  const data = makeData();
  const edited = updatePendingOccurrence(
    data,
    data.recurringOccurrences[0].id,
    { amountPaise: 150000, date: "2026-02-02" },
    "2026-01-31T10:00:00.000Z",
  );
  const confirmed = settleRecurringOccurrence(
    edited,
    edited.recurringOccurrences[0].id,
    "confirmed",
    "2026-02-02T10:00:00.000Z",
  );

  assert.equal(edited.recurringRules[0].amountPaise, 125000);
  assert.equal(edited.recurringRules[0].nextDueDate, "2026-01-31");
  assert.equal(confirmed.transactions[0].amountPaise, 150000);
  assert.equal(confirmed.transactions[0].date, "2026-02-02");
});

test("a missed occurrence is offered one at a time and is never assumed paid", () => {
  const overdueRule = makeRule({
    startDate: "2020-01-31",
    nextDueDate: "2020-01-31",
  });
  const data = makeData(overdueRule);
  const skipped = settleRecurringOccurrence(
    data,
    data.recurringOccurrences[0].id,
    "skipped",
    "2026-10-14T10:00:00.000Z",
  );
  const pending = skipped.recurringOccurrences.filter(
    (item) => item.status === "pending",
  );

  assert.equal(skipped.transactions.length, 0);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].scheduledDate, "2020-02-29");
  assert.equal(
    skipped.recurringOccurrences.filter((item) => item.status === "skipped")
      .length,
    1,
  );
});

test("end date includes its occurrence but prevents schedules beyond the boundary", () => {
  const rule = makeRule({
    startDate: "2026-01-31",
    nextDueDate: "2026-02-28",
    endDate: "2026-02-28",
  });
  const data = makeData(rule);
  const completed = settleRecurringOccurrence(
    data,
    data.recurringOccurrences[0].id,
    "confirmed",
    "2026-02-28T10:00:00.000Z",
  );

  assert.equal(completed.recurringRules[0].active, false);
  assert.equal(completed.recurringRules[0].nextDueDate, "2026-03-31");
  assert.equal(
    completed.recurringOccurrences.filter((item) => item.status === "pending")
      .length,
    0,
  );
});

test("scheduled amounts stay out of financial totals until confirmed", () => {
  const data = makeData();
  const actualBefore = getMonthlyFinancialSummary(
    data.transactions,
    categories,
    "2026-01",
  );
  assert.equal(actualBefore.expensePaise, 0);
  assert.equal(actualBefore.transactionCount, 0);

  const confirmed = settleRecurringOccurrence(
    data,
    data.recurringOccurrences[0].id,
    "confirmed",
    "2026-01-31T10:00:00.000Z",
  );
  const actualAfter = getMonthlyFinancialSummary(
    confirmed.transactions,
    categories,
    "2026-01",
  );
  assert.equal(actualAfter.expensePaise, 125000);
  assert.equal(actualAfter.transactionCount, 1);
});
