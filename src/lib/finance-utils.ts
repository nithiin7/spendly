import type {
  Category,
  CategoryRule,
  FinanceData,
  MonthlyFinancialSummary,
  SpendingCategory,
  SpendingMonth,
  Transaction,
  TransactionType,
} from "@/types/finance";
import {
  isRecurringOccurrence,
  isRecurringRule,
} from "./recurring-transactions.ts";
import { validateMonthlyBudgets } from "./monthly-budgets.ts";
import { isCurrencyCode } from "./currency.ts";

export function formatRupees(amountPaise: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountPaise / 100);
}

export function parseRupeesToPaise(value: string): number | null {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  const [rupees, paise = ""] = normalized.split(".");
  const amountPaise = Number(rupees) * 100 + Number(paise.padEnd(2, "0"));
  return Number.isSafeInteger(amountPaise) && amountPaise > 0
    ? amountPaise
    : null;
}

export function dateToMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function getCurrentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getPreviousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const previousMonth = new Date(Date.UTC(year, month - 2, 1));
  return `${previousMonth.getUTCFullYear()}-${String(previousMonth.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getMonthlyTotals(
  transactions: Transaction[],
  monthKey: string,
): { incomePaise: number; expensePaise: number; savingsPaise: number } {
  const totals = transactions.reduce(
    (result, transaction) => {
      if (dateToMonthKey(transaction.date) === monthKey) {
        result[transaction.type] += transaction.amountPaise;
      }
      return result;
    },
    { income: 0, expense: 0 },
  );

  return {
    incomePaise: totals.income,
    expensePaise: totals.expense,
    savingsPaise: totals.income - totals.expense,
  };
}

export function removeTransaction(
  transactions: Transaction[],
  transactionId: string,
): Transaction[] {
  return transactions.filter((transaction) => transaction.id !== transactionId);
}

export function getMonthlyFinancialSummary(
  transactions: Transaction[],
  categories: Category[],
  monthKey: string,
): MonthlyFinancialSummary {
  const previousMonthKey = getPreviousMonthKey(monthKey);
  const selectedTransactions = transactions.filter(
    (transaction) => dateToMonthKey(transaction.date) === monthKey,
  );
  const previousTransactions = transactions.filter(
    (transaction) => dateToMonthKey(transaction.date) === previousMonthKey,
  );
  const totalsFor = (items: Transaction[]) => {
    const result = { incomePaise: 0, expensePaise: 0 };
    for (const transaction of items) {
      if (transaction.type === "income") {
        result.incomePaise += transaction.amountPaise;
      } else {
        result.expensePaise += transaction.amountPaise;
      }
    }
    return result;
  };
  const currentTotals = totalsFor(selectedTransactions);
  const previousTotals = totalsFor(previousTransactions);
  const previousBalancePaise =
    previousTotals.incomePaise - previousTotals.expensePaise;
  const largestExpense =
    selectedTransactions
      .filter((transaction) => transaction.type === "expense")
      .sort((left, right) => right.amountPaise - left.amountPaise)[0] ?? null;
  const expenseChangePaise =
    currentTotals.expensePaise - previousTotals.expensePaise;

  return {
    incomePaise: currentTotals.incomePaise,
    expensePaise: currentTotals.expensePaise,
    balancePaise: currentTotals.incomePaise - currentTotals.expensePaise,
    savingsRate:
      currentTotals.incomePaise > 0
        ? ((currentTotals.incomePaise - currentTotals.expensePaise) /
            currentTotals.incomePaise) *
          100
        : null,
    transactionCount: selectedTransactions.length,
    largestExpense,
    categoryTotals: getSpendingCategories(transactions, categories, monthKey),
    previousMonth: {
      ...previousTotals,
      balancePaise: previousBalancePaise,
    },
    expenseChangePaise,
    expenseChangePercent:
      previousTotals.expensePaise > 0
        ? (expenseChangePaise / previousTotals.expensePaise) * 100
        : null,
  };
}

export function getSpendingMonths(
  transactions: Transaction[],
  count = 6,
  endMonthKey = getCurrentMonthKey(),
): SpendingMonth[] {
  const [year, month] = endMonthKey.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const monthDate = new Date(Date.UTC(year, month - count + index, 1));
    const monthKey = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const amountPaise = transactions.reduce(
      (sum, transaction) =>
        transaction.type === "expense" &&
        dateToMonthKey(transaction.date) === monthKey
          ? sum + transaction.amountPaise
          : sum,
      0,
    );

    return {
      monthKey,
      label: new Intl.DateTimeFormat("en", {
        month: "short",
        timeZone: "UTC",
      }).format(monthDate),
      amountPaise,
    };
  });
}

export function getSpendingCategories(
  transactions: Transaction[],
  categories: Category[],
  monthKey: string,
): SpendingCategory[] {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (
      transaction.type === "expense" &&
      dateToMonthKey(transaction.date) === monthKey
    ) {
      totals.set(
        transaction.categoryId,
        (totals.get(transaction.categoryId) ?? 0) + transaction.amountPaise,
      );
    }
  }

  return categories
    .map((category) => ({
      id: category.id,
      label: category.name,
      amountPaise: totals.get(category.id) ?? 0,
      color: category.color,
    }))
    .filter(({ amountPaise }) => amountPaise > 0)
    .sort((left, right) => right.amountPaise - left.amountPaise);
}

export function filterAndSortTransactions(
  transactions: Transaction[],
  filters: {
    query: string;
    month: string;
    type: TransactionType | "all";
    categoryId: string;
    sort: "date-desc" | "date-asc" | "amount-desc" | "amount-asc";
  },
): Transaction[] {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase();
  return transactions
    .filter((transaction) => {
      return (
        (!normalizedQuery ||
          transaction.description.toLocaleLowerCase().includes(normalizedQuery)) &&
        (filters.month === "all" ||
          dateToMonthKey(transaction.date) === filters.month) &&
        (filters.type === "all" || transaction.type === filters.type) &&
        (!filters.categoryId || transaction.categoryId === filters.categoryId)
      );
    })
    .sort((left, right) => {
      switch (filters.sort) {
        case "date-asc":
          return left.date.localeCompare(right.date) || left.createdAt.localeCompare(right.createdAt);
        case "amount-desc":
          return right.amountPaise - left.amountPaise;
        case "amount-asc":
          return left.amountPaise - right.amountPaise;
        case "date-desc":
        default:
          return right.date.localeCompare(left.date) || right.createdAt.localeCompare(left.createdAt);
      }
    });
}

export function isFinanceData(value: unknown): value is FinanceData {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const preferences = candidate.preferences;
  const validPreferences =
    preferences === undefined ||
    (typeof preferences === "object" &&
      preferences !== null &&
      typeof (preferences as Record<string, unknown>).defaultCurrency ===
        "string" &&
      isCurrencyCode(
        (preferences as Record<string, string>).defaultCurrency,
      ) &&
      ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].includes(
        (preferences as Record<string, string>).dateFormat,
      ) &&
      typeof (preferences as Record<string, unknown>).hideBalances ===
        "boolean");
  if (
    !Array.isArray(candidate.categories) ||
    !Array.isArray(candidate.transactions)
  ) {
    return false;
  }
  const storedCategories: unknown[] = candidate.categories;
  const storedTransactions: unknown[] = candidate.transactions;
  const storedRecurringRules: unknown[] = Array.isArray(candidate.recurringRules)
    ? candidate.recurringRules
    : [];
  const storedRecurringOccurrences: unknown[] = Array.isArray(
    candidate.recurringOccurrences,
  )
    ? candidate.recurringOccurrences
    : [];
  const storedBudgets: unknown[] = Array.isArray(candidate.budgets)
    ? candidate.budgets
    : [];
  const validCategories = storedCategories.every(
    (category: unknown) =>
      typeof category === "object" &&
      category !== null &&
      typeof (category as Category).id === "string" &&
      typeof (category as Category).name === "string" &&
      typeof (category as Category).color === "string" &&
      typeof (category as Category).isDefault === "boolean" &&
      ((category as Category).isFallback === undefined ||
        typeof (category as Category).isFallback === "boolean") &&
      ((category as Category).type === "income" ||
        (category as Category).type === "expense"),
  );
  const validRules =
    candidate.rules === undefined ||
    (Array.isArray(candidate.rules) &&
      candidate.rules.every(
        (rule: unknown) =>
          typeof rule === "object" &&
          rule !== null &&
          typeof (rule as CategoryRule).id === "string" &&
          typeof (rule as CategoryRule).categoryId === "string" &&
          storedCategories.some(
            (category: unknown) =>
              typeof category === "object" &&
              category !== null &&
              (category as Category).id ===
                (rule as CategoryRule).categoryId,
          ) &&
          Array.isArray((rule as CategoryRule).keywords) &&
          (rule as CategoryRule).keywords.every(
            (keyword: unknown) =>
              typeof keyword === "string" && keyword.trim().length > 0,
          ) &&
          Number.isInteger((rule as CategoryRule).priority) &&
          typeof (rule as CategoryRule).isDefault === "boolean",
      ));
  const validTransactions = storedTransactions.every(
    (transaction: unknown) => {
      if (typeof transaction !== "object" || transaction === null) {
        return false;
      }
      const item = transaction as Transaction;
      return (
        typeof item.id === "string" &&
        (item.type === "income" || item.type === "expense") &&
        typeof item.description === "string" &&
        item.description.trim().length > 0 &&
        Number.isSafeInteger(item.amountPaise) &&
        item.amountPaise > 0 &&
        typeof item.categoryId === "string" &&
        (item.categorySource === undefined ||
          item.categorySource === "manual" ||
          item.categorySource === "suggested") &&
        storedCategories.some(
          (category: unknown) =>
            typeof category === "object" &&
            category !== null &&
            (category as Category).id === item.categoryId &&
            (category as Category).type === item.type,
        ) &&
        /^\d{4}-\d{2}-\d{2}$/.test(item.date) &&
        typeof item.createdAt === "string" &&
        typeof item.updatedAt === "string" &&
        (item.paymentMethod === undefined ||
          typeof item.paymentMethod === "string") &&
        (item.notes === undefined || typeof item.notes === "string")
      );
    },
  );

  const validRecurringRules =
    candidate.recurringRules === undefined ||
    (Array.isArray(candidate.recurringRules) &&
      storedRecurringRules.every(
        (rule) =>
          isRecurringRule(rule) &&
          storedCategories.some(
            (category) =>
              typeof category === "object" &&
              category !== null &&
              (category as Category).id === rule.categoryId &&
              (category as Category).type === rule.type,
          ),
      ));
  const validRecurringOccurrences =
    candidate.recurringOccurrences === undefined ||
    (Array.isArray(candidate.recurringOccurrences) &&
      storedRecurringOccurrences.every(
        (occurrence) =>
          isRecurringOccurrence(occurrence) &&
          storedCategories.some(
            (category) =>
              typeof category === "object" &&
              category !== null &&
              (category as Category).id === occurrence.categoryId &&
              (category as Category).type === occurrence.type,
          ),
      ));
  const validBudgets =
    candidate.budgets === undefined ||
    (Array.isArray(candidate.budgets) &&
      validCategories &&
      validateMonthlyBudgets(storedBudgets, storedCategories as Category[]));
  const recurringIdsUnique =
    new Set(
      storedRecurringRules.map((rule) =>
        isRecurringRule(rule) ? rule.id : "",
      ),
    )
      .size === storedRecurringRules.length &&
    new Set(
      storedRecurringOccurrences.map((occurrence) =>
        isRecurringOccurrence(occurrence) ? occurrence.id : "",
      ),
    ).size === storedRecurringOccurrences.length;
  const occurrenceTransactionIdsUnique =
    new Set(
      storedRecurringOccurrences
        .filter(
          (occurrence) =>
            typeof occurrence === "object" &&
            occurrence !== null &&
            typeof (occurrence as { transactionId?: unknown }).transactionId ===
              "string",
        )
        .map((occurrence) => (occurrence as { transactionId: string }).transactionId),
    ).size ===
    storedRecurringOccurrences.filter(
      (occurrence) =>
        typeof occurrence === "object" &&
        occurrence !== null &&
        typeof (occurrence as { transactionId?: unknown }).transactionId ===
          "string",
    ).length;

  return (
    validPreferences &&
    validCategories &&
    validRules &&
    validTransactions &&
    validRecurringRules &&
    validRecurringOccurrences &&
    validBudgets &&
    recurringIdsUnique &&
    occurrenceTransactionIdsUnique
  );
}

export function formatTransactionAmount(
  amountPaise: number,
  type: TransactionType,
  currency = "INR",
): string {
  const amount = formatRupees(amountPaise, currency);
  return type === "income" ? `+${amount}` : `−${amount}`;
}

function transactionCsvHeaders(currency: string) {
  return [
  "Date (YYYY-MM-DD)",
  "Type",
  "Description",
  "Category",
  `Amount (${currency})`,
  "Original Amount",
  "Original Currency",
  "Exchange Rate Date",
  "Payment Method",
  "Notes",
  "Category Source",
  "Created At",
  "Updated At",
  ];
}

function escapeCsvValue(value: string): string {
  const safeValue = /^[\t\r ]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export function createTransactionsCsv(
  transactions: Transaction[],
  categories: Category[],
  currency = "INR",
): string {
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const rows = transactions.map((transaction) => [
    transaction.date,
    transaction.type,
    transaction.description,
    categoryNames.get(transaction.categoryId) ?? "Uncategorized",
    (transaction.amountPaise / 100).toFixed(2),
    transaction.originalAmountPaise === undefined
      ? ""
      : (transaction.originalAmountPaise / 100).toFixed(2),
    transaction.originalCurrency ?? "",
    transaction.exchangeRateDate ?? "",
    transaction.paymentMethod ?? "",
    transaction.notes ?? "",
    transaction.categorySource === "suggested" ? "Suggested" : "Confirmed",
    transaction.createdAt,
    transaction.updatedAt,
  ]);
  return [transactionCsvHeaders(currency), ...rows]
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\r\n");
}
