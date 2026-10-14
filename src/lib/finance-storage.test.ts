import assert from "node:assert/strict";
import test from "node:test";
import { getDemoFinanceData } from "./demo-data.ts";
import { loadFinanceData, saveFinanceData } from "./finance-storage.ts";
import {
  createRecurringOccurrence,
  settleRecurringOccurrence,
} from "./recurring-transactions.ts";
import type { RecurringRule } from "../types/finance.ts";

test("recurring rules, history, and monthly budgets persist across storage reloads", () => {
  const values = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage },
  });

  try {
    const data = getDemoFinanceData();
    const now = "2026-10-14T10:00:00.000Z";
    const rule: RecurringRule = {
      id: "rent-monthly",
      description: "Monthly rent",
      type: "expense",
      amountPaise: 2500000,
      categoryId: "category-1",
      frequency: "monthly",
      startDate: "2026-10-14",
      nextDueDate: "2026-10-14",
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    data.recurringRules.push(rule);
    data.recurringOccurrences.push(createRecurringOccurrence(rule, rule.nextDueDate, now));
    const settled = settleRecurringOccurrence(
      data,
      data.recurringOccurrences[0].id,
      "confirmed",
      now,
    );
    settled.budgets.push({
      id: "budget-2026-10",
      year: 2026,
      month: 10,
      overallLimitPaise: 3000000,
      allocations: [{ categoryId: "category-1", amountPaise: 2500000 }],
      createdAt: now,
      updatedAt: now,
    });
    saveFinanceData(settled);

    const reloaded = loadFinanceData();
    assert.deepEqual(reloaded.recurringRules, settled.recurringRules);
    assert.deepEqual(
      reloaded.recurringOccurrences,
      settled.recurringOccurrences,
    );
    assert.deepEqual(reloaded.budgets, settled.budgets);
    assert.equal(reloaded.transactions.length, settled.transactions.length);
  } finally {
    if (priorWindow) {
      Object.defineProperty(globalThis, "window", priorWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});

test("legacy saved finance data is migrated without changing transactions", () => {
  const values = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage },
  });

  try {
    const legacyData = getDemoFinanceData();
    const oldData = {
      categories: legacyData.categories,
      rules: legacyData.rules,
      transactions: legacyData.transactions,
    };
    values.set("spendly.finance.v1", JSON.stringify(oldData));

    const loaded = loadFinanceData();

    assert.deepEqual(loaded.transactions, oldData.transactions);
    assert.deepEqual(loaded.recurringRules, []);
    assert.deepEqual(loaded.recurringOccurrences, []);
    assert.deepEqual(loaded.budgets, []);
    const migrated = JSON.parse(values.get("spendly.finance.v1") ?? "{}");
    assert.deepEqual(migrated.recurringRules, []);
    assert.deepEqual(migrated.recurringOccurrences, []);
    assert.deepEqual(migrated.budgets, []);
  } finally {
    if (priorWindow) {
      Object.defineProperty(globalThis, "window", priorWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
  }
});
