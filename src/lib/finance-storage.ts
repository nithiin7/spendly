import { getDemoFinanceData } from "./demo-data.ts";
import {
  defaultCategories,
  defaultCategoryRules,
} from "./categories.ts";
import { isFinanceData } from "./finance-utils.ts";
import type { FinanceData, FinancePreferences } from "@/types/finance";

const storageKey = "spendly.finance.v1";
const migrationKey = "spendly.finance.migration.v1";

function getBrowserStorage(): Storage {
  if (typeof window === "undefined") {
    throw new Error("Browser storage is unavailable.");
  }
  return window.localStorage;
}

function parseStoredData(stored: string): { data: FinanceData; changed: boolean } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error(
      "Saved finance data could not be read. Your stored data was left unchanged.",
    );
  }
  if (!isFinanceData(parsed)) {
    throw new Error(
      "Saved finance data has an unsupported format. Your stored data was left unchanged.",
    );
  }
  const data: FinanceData = {
    preferences: parsed.preferences ?? {
      defaultCurrency: "INR",
      dateFormat: "DD/MM/YYYY",
      hideBalances: false,
    },
    categories: parsed.categories.map((category) => ({
      ...category,
      isFallback:
        category.isFallback ?? category.name.toLocaleLowerCase() === "other",
    })),
    rules: parsed.rules ?? defaultCategoryRules,
    transactions: parsed.transactions.map((transaction) => ({
      ...transaction,
      categorySource: transaction.categorySource ?? "manual",
    })),
    recurringRules: parsed.recurringRules ?? [],
    recurringOccurrences: parsed.recurringOccurrences ?? [],
    budgets: parsed.budgets ?? [],
  };
  return {
    data,
    changed:
      parsed.rules === undefined ||
      parsed.recurringRules === undefined ||
      parsed.recurringOccurrences === undefined ||
      parsed.budgets === undefined ||
      parsed.preferences === undefined ||
      parsed.categories.some((category) => category.isFallback === undefined) ||
      parsed.transactions.some(
        (transaction) => transaction.categorySource === undefined,
      ),
  };
}

export function hasStoredFinanceData(): boolean {
  return getBrowserStorage().getItem(storageKey) !== null;
}

export function clearStoredFinanceData(): void {
  const storage = getBrowserStorage();
  storage.removeItem(storageKey);
  storage.removeItem(migrationKey);
}

export function readStoredFinanceData(): FinanceData | null {
  const stored = getBrowserStorage().getItem(storageKey);
  return stored === null ? null : parseStoredData(stored).data;
}

export function getOrCreateFinanceMigrationId(): string {
  const storage = getBrowserStorage();
  const existing = storage.getItem(migrationKey);
  if (existing) return existing;
  const migrationId = crypto.randomUUID();
  storage.setItem(migrationKey, migrationId);
  return migrationId;
}

export function loadFinanceData(): FinanceData {
  const storage = getBrowserStorage();
  const stored = storage.getItem(storageKey);
  if (stored !== null) {
    const { data, changed } = parseStoredData(stored);
    if (changed) storage.setItem(storageKey, JSON.stringify(data));
    return data;
  }

  const initialData = getDemoFinanceData();
  storage.setItem(storageKey, JSON.stringify(initialData));
  return initialData;
}

export function saveFinanceData(data: FinanceData): void {
  const storage = getBrowserStorage();
  storage.removeItem(migrationKey);
  storage.setItem(storageKey, JSON.stringify(data));
}

export function resetFinanceData(
  preferences?: FinancePreferences,
): FinanceData {
  const demoData = {
    ...getDemoFinanceData(),
    ...(preferences ? { preferences } : {}),
  };
  saveFinanceData(demoData);
  return demoData;
}

export function clearFinanceData(
  preferences?: FinancePreferences,
): FinanceData {
  const emptyData: FinanceData = {
    categories: defaultCategories.map((category) => ({ ...category })),
    rules: defaultCategoryRules.map((rule) => ({
      ...rule,
      keywords: [...rule.keywords],
    })),
    transactions: [],
    recurringRules: [],
    recurringOccurrences: [],
    budgets: [],
    ...(preferences ? { preferences } : {}),
  };
  saveFinanceData(emptyData);
  return emptyData;
}
