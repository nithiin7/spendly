import assert from "node:assert/strict";
import test from "node:test";
import {
  createMigrationRecordId,
  reconcileLocalFinanceData,
} from "./finance-migration.ts";
import type { FinanceData } from "../types/finance.ts";

const timestamp = "2026-10-14T10:00:00.000Z";
const expenseCategory = {
  id: "expense-local",
  name: "Daily spending",
  color: "#214c3a",
  isDefault: false,
  type: "expense" as const,
  isFallback: false,
};

function emptyData(categories = [expenseCategory]): FinanceData {
  return {
    categories,
    rules: [],
    transactions: [],
    recurringRules: [],
    recurringOccurrences: [],
    budgets: [],
  };
}

test("reconciles ID collisions and related records without replacing cloud values", () => {
  const cloudCategory = { ...expenseCategory, id: "expense-cloud" };
  const cloud: FinanceData = {
    ...emptyData([cloudCategory]),
    transactions: [
      {
        id: "shared-transaction",
        type: "expense",
        description: "Cloud record",
        amountPaise: 200,
        categoryId: cloudCategory.id,
        date: "2026-10-01",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    budgets: [
      {
        id: "cloud-budget",
        year: 2026,
        month: 10,
        overallLimitPaise: 10_000,
        allocations: [{ categoryId: cloudCategory.id, amountPaise: 400 }],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
  const recurringRule = {
    id: "local-recurring",
    description: "Weekly groceries",
    type: "expense" as const,
    amountPaise: 500,
    categoryId: expenseCategory.id,
    frequency: "weekly" as const,
    startDate: "2026-10-01",
    nextDueDate: "2026-10-15",
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const local: FinanceData = {
    ...emptyData(),
    rules: [
      {
        id: "local-rule",
        categoryId: expenseCategory.id,
        keywords: ["market"],
        priority: 1,
        isDefault: false,
      },
    ],
    transactions: [
      {
        id: "shared-transaction",
        type: "expense",
        description: "Local record",
        amountPaise: 300,
        categoryId: expenseCategory.id,
        date: "2026-10-02",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    recurringRules: [recurringRule],
    recurringOccurrences: [
      {
        id: "local-occurrence",
        ruleId: recurringRule.id,
        scheduledDate: "2026-10-15",
        date: "2026-10-15",
        description: recurringRule.description,
        type: "expense",
        amountPaise: recurringRule.amountPaise,
        categoryId: expenseCategory.id,
        status: "confirmed",
        transactionId: "shared-transaction",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    budgets: [
      {
        id: "local-budget",
        year: 2026,
        month: 10,
        overallLimitPaise: 12_000,
        allocations: [{ categoryId: expenseCategory.id, amountPaise: 800 }],
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
  let generatedId = 0;

  const result = reconcileLocalFinanceData(cloud, local, () => `remapped-${++generatedId}`);
  const importedTransaction = result.data.transactions.find(
    (transaction) => transaction.description === "Local record",
  );

  assert.ok(importedTransaction);
  assert.equal(importedTransaction.categoryId, cloudCategory.id);
  assert.notEqual(importedTransaction.id, "shared-transaction");
  assert.equal(
    result.data.recurringOccurrences[0].transactionId,
    importedTransaction.id,
  );
  assert.equal(result.data.recurringOccurrences[0].categoryId, cloudCategory.id);
  assert.equal(result.data.recurringRules[0].categoryId, cloudCategory.id);
  assert.deepEqual(
    result.data.budgets[0].allocations,
    [{ categoryId: cloudCategory.id, amountPaise: 400 }],
  );
  assert.equal(result.data.budgets[0].overallLimitPaise, 10_000);
  assert.equal(result.conflictsResolved, 4);
  assert.deepEqual(result.added, {
    categories: 0,
    rules: 1,
    transactions: 1,
    recurringRules: 1,
    recurringOccurrences: 1,
    budgets: 0,
    budgetAllocations: 0,
  });
});

test("treats a previously imported record with server timestamps as already present", () => {
  const local = emptyData();
  local.transactions.push({
    id: "existing-transaction",
    type: "expense",
    description: "Already imported",
    amountPaise: 100,
    categoryId: expenseCategory.id,
    categorySource: "manual",
    date: "2026-10-01",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const cloud = structuredClone(local);
  cloud.transactions[0].updatedAt = "2026-10-14T10:05:00.000Z";

  const result = reconcileLocalFinanceData(cloud, local, () => "unused-id");

  assert.equal(result.data.transactions.length, 1);
  assert.equal(result.data.transactions[0].id, "existing-transaction");
  assert.equal(result.added.transactions, 0);
  assert.equal(result.conflictsResolved, 0);
});

test("keeps collision remaps stable when a partial import is retried", () => {
  const cloud: FinanceData = {
    ...emptyData([{ ...expenseCategory, name: "Cloud category" }]),
    transactions: [
      {
        id: "shared-transaction",
        type: "expense",
        description: "Cloud record",
        amountPaise: 200,
        categoryId: expenseCategory.id,
        categorySource: "manual",
        date: "2026-10-01",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
  };
  const local = emptyData();
  local.transactions.push({
    id: "shared-transaction",
    type: "expense",
    description: "Local record",
    amountPaise: 300,
    categoryId: expenseCategory.id,
    categorySource: "manual",
    date: "2026-10-02",
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  const stableId = (entityType: string, recordId: string, attempt: number) =>
    createMigrationRecordId("migration-id", entityType, recordId, attempt);
  const firstAttempt = reconcileLocalFinanceData(cloud, local, stableId);
  const partialCloud = {
    ...cloud,
    categories: firstAttempt.data.categories,
    transactions: firstAttempt.data.transactions,
  };

  const retry = reconcileLocalFinanceData(partialCloud, local, stableId);

  assert.equal(retry.data.categories.length, 2);
  assert.equal(
    retry.data.transactions.length,
    2,
    JSON.stringify(retry.data.transactions.map(({ id, description }) => ({ id, description }))),
  );
  assert.equal(
    retry.data.transactions.find((transaction) => transaction.description === "Local record")?.id,
    firstAttempt.data.transactions.find((transaction) => transaction.description === "Local record")?.id,
  );
  assert.equal(retry.added.transactions, 0);
});

test("rejects an invalid local relationship before producing an import plan", () => {
  const local = emptyData();
  local.transactions.push({
    id: "orphaned-transaction",
    type: "expense",
    description: "Missing category",
    amountPaise: 100,
    categoryId: "missing-category",
    date: "2026-10-01",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  assert.throws(
    () => reconcileLocalFinanceData(emptyData(), local, () => "unused-id"),
    /invalid|relationship|category/i,
  );
});
