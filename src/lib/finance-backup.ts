import type {
  Category,
  CategoryRule,
  FinanceData,
  Transaction,
} from "@/types/finance";

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

function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
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
    !isValidCalendarDate(String(value.date)) ||
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
    !Array.isArray(value.categories) ||
    !Array.isArray(value.rules) ||
    !Array.isArray(value.transactions)
  ) {
    throw new Error(
      "Backup data must include categories, rules, and transactions arrays.",
    );
  }

  hasUniqueIds(value.categories, "category");
  hasUniqueIds(value.rules, "rule");
  hasUniqueIds(value.transactions, "transaction");

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

  let combinedAmountPaise = 0;
  for (const transaction of value.transactions) {
    combinedAmountPaise += transaction.amountPaise;
    if (!Number.isSafeInteger(combinedAmountPaise)) {
      throw new Error("Backup transaction amounts exceed the safe paise limit.");
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

  return {
    categories,
    rules: value.rules,
    transactions: value.transactions,
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
    left.createdAt === right.createdAt &&
    left.updatedAt === right.updatedAt
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
  if (mode === "replace") {
    return {
      data: incoming,
      added: {
        categories: incoming.categories.length,
        rules: incoming.rules.length,
        transactions: incoming.transactions.length,
      },
    };
  }

  const categories = mergeById(
    current.categories,
    incoming.categories,
    "category",
    sameCategory,
  );
  const categoryNames = new Set(
    current.categories.map(
      (category) => `${category.type}:${category.name.toLocaleLowerCase()}`,
    ),
  );
  for (const category of incoming.categories) {
    const isExistingId = current.categories.some(({ id }) => id === category.id);
    const key = `${category.type}:${category.name.toLocaleLowerCase()}`;
    if (!isExistingId && categoryNames.has(key)) {
      throw new Error(
        `Cannot merge: category "${category.name}" already exists with a different ID.`,
      );
    }
    categoryNames.add(key);
  }

  const rules = mergeById(current.rules, incoming.rules, "rule", sameRule);
  const transactions = mergeById(
    current.transactions,
    incoming.transactions,
    "transaction",
    sameTransaction,
  );

  return {
    data: {
      categories: categories.records,
      rules: rules.records,
      transactions: transactions.records,
    },
    added: {
      categories: categories.added,
      rules: rules.added,
      transactions: transactions.added,
    },
  };
}
