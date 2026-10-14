import { getDemoFinanceData } from "./demo-data.ts";
import {
  defaultCategories,
  defaultCategoryRules,
} from "./categories.ts";
import { isFinanceData } from "./finance-utils.ts";
import type { FinanceData } from "@/types/finance";

const storageKey = "spendly.finance.v1";

function getBrowserStorage(): Storage {
  if (typeof window === "undefined") {
    throw new Error("Browser storage is unavailable.");
  }
  return window.localStorage;
}

export function loadFinanceData(): FinanceData {
  const storage = getBrowserStorage();
  const stored = storage.getItem(storageKey);
  if (stored !== null) {
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
    const normalizedData: FinanceData = {
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
    if (
      parsed.rules === undefined ||
      parsed.recurringRules === undefined ||
      parsed.recurringOccurrences === undefined ||
      parsed.budgets === undefined ||
      parsed.categories.some(
        (category) => category.isFallback === undefined,
      ) ||
      parsed.transactions.some(
        (transaction) => transaction.categorySource === undefined,
      )
    ) {
      storage.setItem(storageKey, JSON.stringify(normalizedData));
    }
    return normalizedData;
  }

  const initialData = getDemoFinanceData();
  storage.setItem(storageKey, JSON.stringify(initialData));
  return initialData;
}

export function saveFinanceData(data: FinanceData): void {
  getBrowserStorage().setItem(storageKey, JSON.stringify(data));
}

export function resetFinanceData(): FinanceData {
  const demoData = getDemoFinanceData();
  saveFinanceData(demoData);
  return demoData;
}

export function clearFinanceData(): FinanceData {
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
  };
  saveFinanceData(emptyData);
  return emptyData;
}
