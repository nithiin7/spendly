import assert from "node:assert/strict";
import test from "node:test";
import { defaultCategories } from "./categories.ts";
import { getActionableObservations } from "./actionable-observations.ts";
import type {
  MonthlyBudget,
  RecurringOccurrence,
  Transaction,
} from "../types/finance.ts";

function transaction(
  id: string,
  date: string,
  amountPaise: number,
  categoryId = "category-1",
  type: Transaction["type"] = "expense",
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

function occurrence(
  id: string,
  ruleId: string,
  transactionId: string,
  date: string,
  amountPaise: number,
  status: RecurringOccurrence["status"] = "confirmed",
): RecurringOccurrence {
  return {
    id,
    ruleId,
    scheduledDate: date,
    date,
    description: "Internet plan",
    type: "expense",
    amountPaise,
    categoryId: "category-8",
    status,
    ...(status === "confirmed" ? { transactionId } : {}),
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

function budget(): MonthlyBudget {
  return {
    id: "budget-2026-10",
    year: 2026,
    month: 10,
    overallLimitPaise: 40000,
    allocations: [{ categoryId: "category-1", amountPaise: 12000 }],
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };
}

test("reports over-budget spending, significant category growth, and rising confirmed recurring costs", () => {
  const transactions = [
    transaction("rent-prev", "2026-09-04", 10000),
    transaction("rent-current", "2026-10-04", 13000),
    transaction("internet-prev", "2026-09-10", 5000, "category-8"),
    transaction("internet-current", "2026-10-10", 7000, "category-8"),
    transaction("groceries-current", "2026-10-11", 30000, "category-3"),
    transaction("salary", "2026-10-01", 500000, "category-15", "income"),
  ];
  const observations = getActionableObservations(
    transactions,
    defaultCategories,
    [
      occurrence(
        "internet-occurrence-prev",
        "internet-rule",
        "internet-prev",
        "2026-09-10",
        5000,
      ),
      occurrence(
        "internet-occurrence-current",
        "internet-rule",
        "internet-current",
        "2026-10-10",
        7000,
      ),
      occurrence(
        "skipped-occurrence",
        "skipped-rule",
        "not-a-transaction",
        "2026-10-12",
        9000,
        "skipped",
      ),
    ],
    [{ id: "internet-rule", description: "Internet plan" }],
    budget(),
    "2026-10",
    "INR",
  );

  assert.deepEqual(
    observations.map(({ kind, title, actionLabel }) => [
      kind,
      title,
      actionLabel,
    ]),
    [
      ["budget-overrun", "Overall spending is over plan", "Review budget"],
      ["budget-overrun", "Rent is over its limit", "Review budget"],
      [
        "recurring-increase",
        "Internet plan recurring cost increased",
        "Review schedule",
      ],
      [
        "category-increase",
        "Rent spending increased significantly",
        "Review transactions",
      ],
      [
        "category-increase",
        "Utilities spending increased significantly",
        "Review transactions",
      ],
    ],
  );
  assert.match(observations[0].description, /₹100\.00 above the ₹400\.00/);
  assert.match(observations[2].description, /₹50\.00 to ₹70\.00/);
  assert.match(observations[4].description, /40%/);
});

test("does not flag sub-threshold category changes, new categories, or unconfirmed recurring costs", () => {
  const observations = getActionableObservations(
    [
      transaction("previous-rent", "2026-09-04", 10000),
      transaction("current-rent", "2026-10-04", 11999),
      transaction("new-category", "2026-10-05", 50000, "category-3"),
      transaction("internet-prev", "2026-09-10", 5000, "category-8"),
    ],
    defaultCategories,
    [
      occurrence(
        "internet-prev-occurrence",
        "internet-rule",
        "internet-prev",
        "2026-09-10",
        5000,
      ),
      occurrence(
        "internet-pending-occurrence",
        "internet-rule",
        "pending-not-transaction",
        "2026-10-10",
        9000,
        "pending",
      ),
    ],
    [{ id: "internet-rule", description: "Internet plan" }],
    undefined,
    "2026-10",
  );

  assert.deepEqual(observations, []);
});

test("rejects invalid month keys", () => {
  assert.throws(
    () =>
      getActionableObservations(
        [],
        defaultCategories,
        [],
        [],
        undefined,
        "2026-13",
      ),
    /valid month/,
  );
});
