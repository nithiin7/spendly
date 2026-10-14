import { getDemoFinanceData } from "@/lib/demo-data";
import { isFinanceData } from "@/lib/finance-utils";
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
    return parsed;
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
