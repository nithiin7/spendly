import type {
  Category,
  MonthlyBudget,
  RecurringOccurrence,
  Transaction,
} from "@/types/finance";
import {
  calculateMonthlyBudgetAnalytics,
  isValidMonthKey,
} from "./monthly-budgets.ts";
import { formatRupees, getPreviousMonthKey } from "./finance-utils.ts";

export const SIGNIFICANT_CATEGORY_INCREASE_PERCENT = 20;

export type ActionableObservation = {
  id: string;
  kind: "budget-overrun" | "recurring-increase" | "category-increase";
  title: string;
  description: string;
  actionLabel: string;
  href: string;
};

export function getActionableObservations(
  transactions: Transaction[],
  categories: Category[],
  recurringOccurrences: RecurringOccurrence[],
  recurringRules: { id: string; description: string }[],
  budget: MonthlyBudget | undefined,
  monthKey: string,
  currency = "INR",
): ActionableObservation[] {
  if (!isValidMonthKey(monthKey)) {
    throw new Error("Choose a valid month for spending observations.");
  }
  const previousMonthKey = getPreviousMonthKey(monthKey);
  const observations: ActionableObservation[] = [];

  if (budget) {
    const analytics = calculateMonthlyBudgetAnalytics(
      transactions,
      categories,
      budget,
      monthKey,
    );
    if (analytics.overall?.status === "over") {
      observations.push({
        id: `budget-overrun:overall:${monthKey}`,
        kind: "budget-overrun",
        title: "Overall spending is over plan",
        description: `Spending is ${formatAmount(
          analytics.overall.spentPaise - analytics.overall.budgetPaise,
          currency,
        )} above the ${formatAmount(analytics.overall.budgetPaise, currency)} overall limit.`,
        actionLabel: "Review budget",
        href: "/budgets",
      });
    }
    for (const category of analytics.overBudgetCategories) {
      observations.push({
        id: `budget-overrun:${category.categoryId}:${monthKey}`,
        kind: "budget-overrun",
        title: `${category.label} is over its limit`,
        description: `Spending is ${formatAmount(
          category.spentPaise - (category.budgetPaise ?? 0),
          currency,
        )} above its ${formatAmount(category.budgetPaise ?? 0, currency)} category limit.`,
        actionLabel: "Review budget",
        href: "/budgets",
      });
    }
  }

  const categoryById = new Map(
    categories
      .filter((category) => category.type === "expense")
      .map((category) => [category.id, category]),
  );
  const spendingByMonth = new Map<string, Map<string, number>>();
  for (const transaction of transactions) {
    if (transaction.type !== "expense") continue;
    const month = transaction.date.slice(0, 7);
    if (month !== monthKey && month !== previousMonthKey) continue;
    const categoriesForMonth = spendingByMonth.get(month) ?? new Map();
    categoriesForMonth.set(
      transaction.categoryId,
      (categoriesForMonth.get(transaction.categoryId) ?? 0) +
        transaction.amountPaise,
    );
    spendingByMonth.set(month, categoriesForMonth);
  }

  const currentCategorySpending = spendingByMonth.get(monthKey) ?? new Map();
  const previousCategorySpending =
    spendingByMonth.get(previousMonthKey) ?? new Map();
  for (const [categoryId, currentAmount] of currentCategorySpending) {
    const previousAmount = previousCategorySpending.get(categoryId) ?? 0;
    const category = categoryById.get(categoryId);
    if (
      !category ||
      previousAmount === 0 ||
      currentAmount <= previousAmount ||
      ((currentAmount - previousAmount) / previousAmount) * 100 <
        SIGNIFICANT_CATEGORY_INCREASE_PERCENT
    ) {
      continue;
    }
    const increasePercent =
      ((currentAmount - previousAmount) / previousAmount) * 100;
    observations.push({
      id: `category-increase:${categoryId}:${monthKey}`,
      kind: "category-increase",
      title: `${category.name} spending increased significantly`,
      description: `Spending rose ${increasePercent.toLocaleString("en-IN", {
        maximumFractionDigits: 1,
      })}% from ${formatAmount(previousAmount, currency)} to ${formatAmount(currentAmount, currency)} compared with last month.`,
      actionLabel: "Review transactions",
      href: "/transactions",
    });
  }

  const transactionById = new Map(
    transactions.map((transaction) => [transaction.id, transaction]),
  );
  const recurringAmounts = new Map<
    string,
    { description: string; previousAmount: number; currentAmount: number }
  >();
  const seenTransactionIds = new Set<string>();
  for (const occurrence of recurringOccurrences) {
    if (
      occurrence.status !== "confirmed" ||
      occurrence.type !== "expense" ||
      !occurrence.ruleId ||
      !occurrence.transactionId ||
      seenTransactionIds.has(occurrence.transactionId)
    ) {
      continue;
    }
    const transaction = transactionById.get(occurrence.transactionId);
    if (!transaction || transaction.type !== "expense") continue;
    const month = transaction.date.slice(0, 7);
    if (month !== monthKey && month !== previousMonthKey) continue;
    seenTransactionIds.add(transaction.id);
    const record = recurringAmounts.get(occurrence.ruleId) ?? {
      description: occurrence.description,
      previousAmount: 0,
      currentAmount: 0,
    };
    if (month === monthKey) {
      record.currentAmount += transaction.amountPaise;
    } else {
      record.previousAmount += transaction.amountPaise;
    }
    recurringAmounts.set(occurrence.ruleId, record);
  }

  const ruleDescriptions = new Map(
    recurringRules.map((rule) => [rule.id, rule.description]),
  );
  for (const [ruleId, amounts] of recurringAmounts) {
    if (
      amounts.previousAmount === 0 ||
      amounts.currentAmount <= amounts.previousAmount
    ) {
      continue;
    }
    const description = ruleDescriptions.get(ruleId) ?? amounts.description;
    observations.push({
      id: `recurring-increase:${ruleId}:${monthKey}`,
      kind: "recurring-increase",
      title: `${description} recurring cost increased`,
      description: `Confirmed recurring expenses rose from ${formatAmount(
        amounts.previousAmount,
        currency,
      )} to ${formatAmount(amounts.currentAmount, currency)} compared with last month.`,
      actionLabel: "Review schedule",
      href: "/recurring",
    });
  }

  const kindOrder: Record<ActionableObservation["kind"], number> = {
    "budget-overrun": 0,
    "recurring-increase": 1,
    "category-increase": 2,
  };
  return observations.sort(
    (left, right) =>
      kindOrder[left.kind] - kindOrder[right.kind] ||
      left.title.localeCompare(right.title),
  );
}

function formatAmount(amountPaise: number, currency: string): string {
  return formatRupees(amountPaise, currency);
}
