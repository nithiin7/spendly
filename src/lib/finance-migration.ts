import { createFinanceBackup, parseFinanceBackup } from "./finance-backup.ts";
import type { Category, FinanceData, MonthlyBudget } from "../types/finance.ts";

export type FinanceImportCounts = {
  categories: number;
  rules: number;
  transactions: number;
  recurringRules: number;
  recurringOccurrences: number;
  budgets: number;
  budgetAllocations: number;
};

export type FinanceMigrationPlan = {
  data: FinanceData;
  added: FinanceImportCounts;
  conflictsResolved: number;
};

export function createMigrationRecordId(
  migrationId: string,
  entityType: string,
  recordId: string,
  attempt: number,
): string {
  return `migration:${migrationId}:${entityType}:${encodeURIComponent(recordId)}:${attempt}`;
}

function categoryNameKey(category: Category): string {
  return `${category.type}:${category.name.trim().toLocaleLowerCase()}`;
}

function sameRecordContent<T extends { id: string }>(
  left: T,
  right: T,
): boolean {
  const withoutTimestamps = (record: T) =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(record).filter(
          ([key]) => key !== "id" && key !== "createdAt" && key !== "updatedAt",
        ),
      ),
    );
  return withoutTimestamps(left) === withoutTimestamps(right);
}

function remapConflictingId<T extends { id: string }>(
  record: T,
  existing: T[],
  idFactory: (attempt: number) => string,
): { record: T; changed: boolean; alreadyPresent: boolean } {
  const collision = existing.find((item) => item.id === record.id);
  if (!collision || sameRecordContent(collision, record)) {
    return { record, changed: false, alreadyPresent: false };
  }

  const firstCandidate = idFactory(0);
  const previouslyImported = existing.find(
    (item) => item.id === firstCandidate && sameRecordContent(item, record),
  );
  if (previouslyImported) {
    return { record: previouslyImported, changed: false, alreadyPresent: true };
  }
  let attempt = 0;
  let id = firstCandidate;
  attempt += 1;
  while (existing.some((item) => item.id === id)) id = idFactory(attempt++);
  return { record: { ...record, id }, changed: true, alreadyPresent: false };
}

function allocationCount(data: FinanceData): number {
  return data.budgets.reduce(
    (total, budget) => total + budget.allocations.length,
    0,
  );
}

function countAdded(
  current: FinanceData,
  merged: FinanceData,
): FinanceImportCounts {
  return {
    categories: merged.categories.length - current.categories.length,
    rules: merged.rules.length - current.rules.length,
    transactions: merged.transactions.length - current.transactions.length,
    recurringRules:
      merged.recurringRules.length - current.recurringRules.length,
    recurringOccurrences:
      merged.recurringOccurrences.length - current.recurringOccurrences.length,
    budgets: merged.budgets.length - current.budgets.length,
    budgetAllocations: allocationCount(merged) - allocationCount(current),
  };
}

export function reconcileLocalFinanceData(
  current: FinanceData,
  local: FinanceData,
  idFactory: (entityType: string, recordId: string, attempt: number) => string,
): FinanceMigrationPlan {
  const validatedLocal = parseFinanceBackup(
    JSON.stringify(createFinanceBackup(local, "2000-01-01T00:00:00.000Z")),
  ).data;
  const cloudCurrency = current.preferences?.defaultCurrency ?? "INR";
  const browserCurrency = validatedLocal.preferences?.defaultCurrency ?? "INR";
  if (cloudCurrency !== browserCurrency) {
    throw new Error(
      `Cannot merge ${browserCurrency} browser data into ${cloudCurrency} account data. Set both datasets to the same default currency first.`,
    );
  }
  const categoryIds = new Map<string, string>();
  const categories = [...current.categories];
  const categoriesByName = new Map(
    categories.map((category) => [categoryNameKey(category), category]),
  );
  let conflictsResolved = 0;

  for (const category of validatedLocal.categories) {
    const sameId = categories.find((item) => item.id === category.id);
    if (sameId && sameRecordContent(sameId, category)) {
      categoryIds.set(category.id, category.id);
      continue;
    }
    const sameName = categoriesByName.get(categoryNameKey(category));
    if (sameName) {
      categoryIds.set(category.id, sameName.id);
      conflictsResolved += 1;
      continue;
    }
    const remapped = remapConflictingId(category, categories, (attempt) =>
      idFactory("category", category.id, attempt),
    );
    categoryIds.set(category.id, remapped.record.id);
    if (!remapped.alreadyPresent) categories.push(remapped.record);
    categoriesByName.set(categoryNameKey(remapped.record), remapped.record);
    if (remapped.changed) conflictsResolved += 1;
  }

  const rules = [...current.rules];
  const incomingRules = validatedLocal.rules.map((rule) => ({
    ...rule,
    categoryId: categoryIds.get(rule.categoryId) ?? rule.categoryId,
  }));
  for (const rule of incomingRules) {
    const existing = rules.find((item) => item.id === rule.id);
    if (existing && sameRecordContent(existing, rule)) continue;
    const remapped = remapConflictingId(rule, rules, (attempt) =>
      idFactory("rule", rule.id, attempt),
    );
    if (!remapped.alreadyPresent) rules.push(remapped.record);
    if (remapped.changed) conflictsResolved += 1;
  }

  const transactions = [...current.transactions];
  const transactionIds = new Map<string, string>();
  for (const source of validatedLocal.transactions) {
    const transaction = {
      ...source,
      categoryId: categoryIds.get(source.categoryId) ?? source.categoryId,
    };
    const existing = transactions.find((item) => item.id === transaction.id);
    if (existing && sameRecordContent(existing, transaction)) {
      transactionIds.set(source.id, source.id);
      continue;
    }
    const remapped = remapConflictingId(transaction, transactions, (attempt) =>
      idFactory("transaction", transaction.id, attempt),
    );
    transactionIds.set(source.id, remapped.record.id);
    if (!remapped.alreadyPresent) transactions.push(remapped.record);
    if (remapped.changed) conflictsResolved += 1;
  }

  const recurringRules = [...current.recurringRules];
  const recurringRuleIds = new Map<string, string>();
  for (const source of validatedLocal.recurringRules) {
    const rule = {
      ...source,
      categoryId: categoryIds.get(source.categoryId) ?? source.categoryId,
    };
    const existing = recurringRules.find((item) => item.id === rule.id);
    if (existing && sameRecordContent(existing, rule)) {
      recurringRuleIds.set(source.id, source.id);
      continue;
    }
    const remapped = remapConflictingId(rule, recurringRules, (attempt) =>
      idFactory("recurring-rule", rule.id, attempt),
    );
    recurringRuleIds.set(source.id, remapped.record.id);
    if (!remapped.alreadyPresent) recurringRules.push(remapped.record);
    if (remapped.changed) conflictsResolved += 1;
  }

  const recurringOccurrences = [...current.recurringOccurrences];
  for (const source of validatedLocal.recurringOccurrences) {
    const occurrence = {
      ...source,
      ruleId:
        source.ruleId === null
          ? null
          : (recurringRuleIds.get(source.ruleId) ?? source.ruleId),
      categoryId: categoryIds.get(source.categoryId) ?? source.categoryId,
      ...(source.transactionId
        ? {
            transactionId:
              transactionIds.get(source.transactionId) ?? source.transactionId,
          }
        : {}),
    };
    const existing = recurringOccurrences.find(
      (item) => item.id === occurrence.id,
    );
    if (existing && sameRecordContent(existing, occurrence)) {
      continue;
    }
    const remapped = remapConflictingId(
      occurrence,
      recurringOccurrences,
      (attempt) => idFactory("occurrence", occurrence.id, attempt),
    );
    if (!remapped.alreadyPresent) recurringOccurrences.push(remapped.record);
    if (remapped.changed) conflictsResolved += 1;
  }

  const budgets = [...current.budgets];
  for (const source of validatedLocal.budgets) {
    const allocations = source.allocations.map((allocation) => ({
      ...allocation,
      categoryId:
        categoryIds.get(allocation.categoryId) ?? allocation.categoryId,
    }));
    const sameMonth = budgets.find(
      (budget) => budget.year === source.year && budget.month === source.month,
    );
    if (sameMonth) {
      const mergedAllocations = [...sameMonth.allocations];
      for (const allocation of allocations) {
        const existing = mergedAllocations.find(
          (item) => item.categoryId === allocation.categoryId,
        );
        if (!existing) mergedAllocations.push(allocation);
        else if (existing.amountPaise !== allocation.amountPaise) {
          conflictsResolved += 1;
        }
      }
      const mergedBudget: MonthlyBudget = {
        ...sameMonth,
        overallLimitPaise:
          sameMonth.overallLimitPaise ?? source.overallLimitPaise,
        allocations: mergedAllocations,
      };
      budgets[budgets.indexOf(sameMonth)] = mergedBudget;
      if (
        sameMonth.id !== source.id ||
        sameMonth.overallLimitPaise !== source.overallLimitPaise
      ) {
        conflictsResolved += 1;
      }
      continue;
    }

    const remapped = remapConflictingId(
      { ...source, allocations },
      budgets,
      (attempt) => idFactory("budget", source.id, attempt),
    );
    if (!remapped.alreadyPresent) budgets.push(remapped.record);
    if (remapped.changed) conflictsResolved += 1;
  }

  const merged = parseFinanceBackup(
    JSON.stringify(
      createFinanceBackup(
        {
          ...(current.preferences ? { preferences: current.preferences } : {}),
          categories,
          rules,
          transactions,
          recurringRules,
          recurringOccurrences,
          budgets,
        },
        "2000-01-01T00:00:00.000Z",
      ),
    ),
  ).data;

  return {
    data: merged,
    added: countAdded(current, merged),
    conflictsResolved,
  };
}
