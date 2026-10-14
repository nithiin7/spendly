import type {
  Category,
  CategoryRule,
  FinanceData,
  MonthlyBudget,
  RecurringOccurrence,
  RecurringRule,
  Transaction,
} from "@/types/finance";
import {
  isCalendarDate,
  isRecurringOccurrence,
  isRecurringRule,
} from "./recurring-transactions.ts";
import { isMonthlyBudget, validateMonthlyBudgets } from "./monthly-budgets.ts";
import { isCurrencyCode } from "./currency.ts";

export const FINANCE_BACKUP_SCHEMA_VERSION = 1;

export type FinanceBackup = {
  schemaVersion: typeof FINANCE_BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  data: FinanceData;
};

export type RestoreMode = "merge" | "replace";

export type RestorePlan = {
  data: FinanceData;
  added: {
    categories: number;
    rules: number;
    transactions: number;
    recurringRules: number;
    recurringOccurrences: number;
    budgets: number;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasValidId(
  value: unknown,
): value is Record<string, unknown> & { id: string } {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0
  );
}

function hasUniqueIds(values: unknown[], label: string): void {
  const ids = new Set<string>();
  for (const value of values) {
    if (!hasValidId(value)) continue;
    if (ids.has(value.id)) {
      throw new Error(`Backup contains a duplicate ${label} ID: ${value.id}.`);
    }
    ids.add(value.id);
  }
}

function isValidCategory(value: unknown): value is Category {
  return (
    hasValidId(value) &&
    typeof value.name === "string" &&
    value.name.trim().length > 0 &&
    typeof value.color === "string" &&
    value.color.trim().length > 0 &&
    typeof value.isDefault === "boolean" &&
    typeof value.isFallback === "boolean" &&
    (value.type === "income" || value.type === "expense")
  );
}

function isValidRule(value: unknown): value is CategoryRule {
  return (
    hasValidId(value) &&
    typeof value.categoryId === "string" &&
    Array.isArray(value.keywords) &&
    value.keywords.length > 0 &&
    value.keywords.every(
      (keyword) => typeof keyword === "string" && keyword.trim().length > 0,
    ) &&
    typeof value.priority === "number" &&
    Number.isInteger(value.priority) &&
    value.priority >= 0 &&
    value.priority <= 1000 &&
    typeof value.isDefault === "boolean"
  );
}

function isValidTransaction(value: unknown): value is Transaction {
  if (
    !hasValidId(value) ||
    (value.type !== "income" && value.type !== "expense") ||
    typeof value.description !== "string" ||
    value.description.trim().length === 0 ||
    typeof value.amountPaise !== "number" ||
    !Number.isSafeInteger(value.amountPaise) ||
    value.amountPaise <= 0 ||
    typeof value.categoryId !== "string" ||
    (value.categorySource !== undefined &&
      value.categorySource !== "suggested" &&
      value.categorySource !== "manual") ||
    !isCalendarDate(String(value.date)) ||
    typeof value.createdAt !== "string" ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    typeof value.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(value.updatedAt))
  ) {
    return false;
  }
  return (
    (value.paymentMethod === undefined ||
      typeof value.paymentMethod === "string") &&
    (value.notes === undefined || typeof value.notes === "string")
  );
}

function validateFinanceData(value: unknown): FinanceData {
  if (!isRecord(value)) {
    throw new Error("Backup data must be an object.");
  }
  if (
    value.preferences !== undefined &&
    (!isRecord(value.preferences) ||
      typeof value.preferences.defaultCurrency !== "string" ||
      !isCurrencyCode(value.preferences.defaultCurrency) ||
      !["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].includes(
        String(value.preferences.dateFormat),
      ) ||
      typeof value.preferences.hideBalances !== "boolean")
  ) {
    throw new Error("Backup contains invalid display preferences.");
  }
  if (
    !Array.isArray(value.categories) ||
    !Array.isArray(value.rules) ||
    !Array.isArray(value.transactions) ||
    (value.recurringRules !== undefined &&
      !Array.isArray(value.recurringRules)) ||
    (value.recurringOccurrences !== undefined &&
      !Array.isArray(value.recurringOccurrences)) ||
    (value.budgets !== undefined && !Array.isArray(value.budgets))
  ) {
    throw new Error(
      "Backup data must include valid categories, rules, transactions, and recurring records.",
    );
  }
  const recurringRules: unknown[] = value.recurringRules ?? [];
  const recurringOccurrences: unknown[] = value.recurringOccurrences ?? [];
  const budgets: unknown[] = value.budgets ?? [];

  hasUniqueIds(value.categories, "category");
  hasUniqueIds(value.rules, "rule");
  hasUniqueIds(value.transactions, "transaction");
  hasUniqueIds(recurringRules, "recurring rule");
  hasUniqueIds(recurringOccurrences, "recurring occurrence");
  hasUniqueIds(budgets, "monthly budget");

  if (!value.categories.every(isValidCategory)) {
    throw new Error("Backup contains a category with missing or invalid fields.");
  }
  if (!value.rules.every(isValidRule)) {
    throw new Error("Backup contains a rule with missing or invalid fields.");
  }
  if (!value.transactions.every(isValidTransaction)) {
    throw new Error(
      "Backup contains a transaction with missing or invalid fields or amount.",
    );
  }
  if (!recurringRules.every(isRecurringRule)) {
    throw new Error(
      "Backup contains a recurring rule with missing or invalid fields.",
    );
  }
  if (!recurringOccurrences.every(isRecurringOccurrence)) {
    throw new Error(
      "Backup contains a recurring occurrence with missing or invalid fields.",
    );
  }
  if (
    !budgets.every(isMonthlyBudget) ||
    !validateMonthlyBudgets(budgets, value.categories)
  ) {
    throw new Error(
      "Backup contains a monthly budget with invalid fields, duplicate month, allocation, or category reference.",
    );
  }

  const totalsByType = { income: 0, expense: 0 };
  for (const transaction of value.transactions) {
    totalsByType[transaction.type] += transaction.amountPaise;
    if (!Number.isSafeInteger(totalsByType[transaction.type])) {
      throw new Error(
        "Backup transaction amounts exceed the safe paise limit.",
      );
    }
  }

  const categories = value.categories;
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  for (const rule of value.rules) {
    if (!categoryById.has(rule.categoryId)) {
      throw new Error(
        `Rule "${rule.id}" references missing category "${rule.categoryId}".`,
      );
    }
  }
  for (const transaction of value.transactions) {
    const category = categoryById.get(transaction.categoryId);
    if (!category || category.type !== transaction.type) {
      throw new Error(
        `Transaction "${transaction.id}" references a missing or incompatible category.`,
      );
    }
  }
  for (const recurringRule of recurringRules) {
    const category = categoryById.get(recurringRule.categoryId);
    if (!category || category.type !== recurringRule.type) {
      throw new Error(
        `Recurring rule "${recurringRule.id}" references a missing or incompatible category.`,
      );
    }
  }
  const linkedTransactionIds = new Set<string>();
  for (const occurrence of recurringOccurrences) {
    const category = categoryById.get(occurrence.categoryId);
    if (!category || category.type !== occurrence.type) {
      throw new Error(
        `Recurring occurrence "${occurrence.id}" references a missing or incompatible category.`,
      );
    }
    if (occurrence.transactionId) {
      const transactionId = occurrence.transactionId;
      if (linkedTransactionIds.has(transactionId)) {
        throw new Error(
          `Recurring occurrence "${occurrence.id}" has a duplicate transaction link.`,
        );
      }
      linkedTransactionIds.add(transactionId);
    }
  }

  return {
    ...(value.preferences
      ? { preferences: value.preferences as FinanceData["preferences"] }
      : {}),
    categories,
    rules: value.rules,
    recurringRules: recurringRules as RecurringRule[],
    recurringOccurrences: recurringOccurrences as RecurringOccurrence[],
    budgets: budgets as MonthlyBudget[],
    transactions: value.transactions.map((transaction) => ({
      ...transaction,
      categorySource: transaction.categorySource ?? "manual",
    })),
  };
}

export function createFinanceBackup(
  data: FinanceData,
  exportedAt = new Date().toISOString(),
): FinanceBackup {
  return {
    schemaVersion: FINANCE_BACKUP_SCHEMA_VERSION,
    exportedAt,
    data,
  };
}

export function parseFinanceBackup(contents: string): FinanceBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  if (!isRecord(parsed)) {
    throw new Error("Backup file must contain a JSON object.");
  }
  if (parsed.schemaVersion !== FINANCE_BACKUP_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported backup schema version "${String(parsed.schemaVersion)}".`,
    );
  }
  if (
    typeof parsed.exportedAt !== "string" ||
    !Number.isFinite(Date.parse(parsed.exportedAt))
  ) {
    throw new Error("Backup is missing a valid export timestamp.");
  }

  return {
    schemaVersion: FINANCE_BACKUP_SCHEMA_VERSION,
    exportedAt: parsed.exportedAt,
    data: validateFinanceData(parsed.data),
  };
}

function sameCategory(left: Category, right: Category): boolean {
  return (
    left.id === right.id &&
    left.name === right.name &&
    left.color === right.color &&
    left.isDefault === right.isDefault &&
    left.type === right.type &&
    left.isFallback === right.isFallback
  );
}

function sameRule(left: CategoryRule, right: CategoryRule): boolean {
  return (
    left.id === right.id &&
    left.categoryId === right.categoryId &&
    left.priority === right.priority &&
    left.isDefault === right.isDefault &&
    left.keywords.length === right.keywords.length &&
    left.keywords.every((keyword, index) => keyword === right.keywords[index])
  );
}

function sameTransaction(left: Transaction, right: Transaction): boolean {
  return (
    left.id === right.id &&
    left.type === right.type &&
    left.description === right.description &&
    left.amountPaise === right.amountPaise &&
    left.categoryId === right.categoryId &&
    left.categorySource === right.categorySource &&
    left.date === right.date &&
    left.paymentMethod === right.paymentMethod &&
    left.notes === right.notes &&
    left.originalAmountPaise === right.originalAmountPaise &&
    left.originalCurrency === right.originalCurrency &&
    left.exchangeRateDate === right.exchangeRateDate &&
    left.createdAt === right.createdAt &&
    left.updatedAt === right.updatedAt
  );
}

function sameRecurringRule(left: RecurringRule, right: RecurringRule): boolean {
  return (
    left.id === right.id &&
    left.description === right.description &&
    left.type === right.type &&
    left.amountPaise === right.amountPaise &&
    left.categoryId === right.categoryId &&
    left.frequency === right.frequency &&
    left.interval === right.interval &&
    left.startDate === right.startDate &&
    left.nextDueDate === right.nextDueDate &&
    left.endDate === right.endDate &&
    left.active === right.active &&
    left.notes === right.notes &&
    left.originalAmountPaise === right.originalAmountPaise &&
    left.originalCurrency === right.originalCurrency &&
    left.exchangeRateDate === right.exchangeRateDate &&
    left.createdAt === right.createdAt &&
    left.updatedAt === right.updatedAt
  );
}

function sameRecurringOccurrence(
  left: RecurringOccurrence,
  right: RecurringOccurrence,
): boolean {
  return (
    left.id === right.id &&
    left.ruleId === right.ruleId &&
    left.scheduledDate === right.scheduledDate &&
    left.date === right.date &&
    left.description === right.description &&
    left.type === right.type &&
    left.amountPaise === right.amountPaise &&
    left.categoryId === right.categoryId &&
    left.status === right.status &&
    left.transactionId === right.transactionId &&
    left.originalAmountPaise === right.originalAmountPaise &&
    left.originalCurrency === right.originalCurrency &&
    left.exchangeRateDate === right.exchangeRateDate &&
    left.createdAt === right.createdAt &&
    left.updatedAt === right.updatedAt
  );
}

function sameMonthlyBudget(left: MonthlyBudget, right: MonthlyBudget): boolean {
  return (
    left.id === right.id &&
    left.year === right.year &&
    left.month === right.month &&
    left.overallLimitPaise === right.overallLimitPaise &&
    left.originalOverallLimitPaise === right.originalOverallLimitPaise &&
    left.originalCurrency === right.originalCurrency &&
    left.exchangeRateDate === right.exchangeRateDate &&
    left.createdAt === right.createdAt &&
    left.updatedAt === right.updatedAt &&
    left.allocations.length === right.allocations.length &&
    left.allocations.every(
      (allocation, index) =>
        allocation.categoryId === right.allocations[index].categoryId &&
        allocation.amountPaise === right.allocations[index].amountPaise &&
        allocation.originalAmountPaise ===
          right.allocations[index].originalAmountPaise &&
        allocation.originalCurrency ===
          right.allocations[index].originalCurrency &&
        allocation.exchangeRateDate ===
          right.allocations[index].exchangeRateDate,
    )
  );
}

function mergeById<T extends { id: string }>(
  current: T[],
  incoming: T[],
  label: string,
  areEqual: (left: T, right: T) => boolean,
): { records: T[]; added: number } {
  const records = [...current];
  const existingById = new Map(current.map((record) => [record.id, record]));
  let added = 0;
  for (const record of incoming) {
    const existing = existingById.get(record.id);
    if (existing) {
      if (!areEqual(existing, record)) {
        throw new Error(
          `Cannot merge: ${label} ID "${record.id}" already exists with different data.`,
        );
      }
      continue;
    }
    records.push(record);
    existingById.set(record.id, record);
    added += 1;
  }
  return { records, added };
}

export function planFinanceRestore(
  current: FinanceData,
  incoming: FinanceData,
  mode: RestoreMode,
): RestorePlan {
  const validatedIncoming = validateFinanceData(incoming);
  if (mode === "replace") {
    return {
      data: validatedIncoming,
      added: {
        categories: validatedIncoming.categories.length,
        rules: validatedIncoming.rules.length,
        transactions: validatedIncoming.transactions.length,
        recurringRules: validatedIncoming.recurringRules.length,
        recurringOccurrences: validatedIncoming.recurringOccurrences.length,
        budgets: validatedIncoming.budgets.length,
      },
    };
  }

  const validatedCurrent = validateFinanceData(current);
  const currentCurrency =
    validatedCurrent.preferences?.defaultCurrency ?? "INR";
  const incomingCurrency =
    validatedIncoming.preferences?.defaultCurrency ?? "INR";
  if (currentCurrency !== incomingCurrency) {
    throw new Error(
      `Cannot merge a ${incomingCurrency} backup into ${currentCurrency} data. Change the default currency first or replace the current data.`,
    );
  }
  const categories = mergeById(
    validatedCurrent.categories,
    validatedIncoming.categories,
    "category",
    sameCategory,
  );
  const categoryNames = new Set(
    validatedCurrent.categories.map(
      (category) => `${category.type}:${category.name.toLocaleLowerCase()}`,
    ),
  );
  for (const category of validatedIncoming.categories) {
    const isExistingId = validatedCurrent.categories.some(
      ({ id }) => id === category.id,
    );
    const key = `${category.type}:${category.name.toLocaleLowerCase()}`;
    if (!isExistingId && categoryNames.has(key)) {
      throw new Error(
        `Cannot merge: category "${category.name}" already exists with a different ID.`,
      );
    }
    categoryNames.add(key);
  }

  const rules = mergeById(
    validatedCurrent.rules,
    validatedIncoming.rules,
    "rule",
    sameRule,
  );
  const transactions = mergeById(
    validatedCurrent.transactions,
    validatedIncoming.transactions,
    "transaction",
    sameTransaction,
  );
  const recurringRules = mergeById(
    validatedCurrent.recurringRules,
    validatedIncoming.recurringRules,
    "recurring rule",
    sameRecurringRule,
  );
  const recurringOccurrences = mergeById(
    validatedCurrent.recurringOccurrences,
    validatedIncoming.recurringOccurrences,
    "recurring occurrence",
    sameRecurringOccurrence,
  );
  const budgets = mergeById(
    validatedCurrent.budgets,
    validatedIncoming.budgets,
    "monthly budget",
    sameMonthlyBudget,
  );
  const mergedData = validateFinanceData({
    ...(validatedCurrent.preferences
      ? { preferences: validatedCurrent.preferences }
      : {}),
    categories: categories.records,
    rules: rules.records,
    transactions: transactions.records,
    recurringRules: recurringRules.records,
    recurringOccurrences: recurringOccurrences.records,
    budgets: budgets.records,
  });

  return {
    data: mergedData,
    added: {
      categories: categories.added,
      rules: rules.added,
      transactions: transactions.added,
      recurringRules: recurringRules.added,
      recurringOccurrences: recurringOccurrences.added,
      budgets: budgets.added,
    },
  };
}
