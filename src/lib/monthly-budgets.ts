import type {
  BudgetCategoryAnalysis,
  BudgetProgress,
  BudgetStatus,
  Category,
  CategoryBudgetAllocation,
  MonthlyBudget,
  MonthlyBudgetAnalytics,
  RepeatedBudgetOverrun,
  Transaction,
} from "@/types/finance";

export const BUDGET_APPROACHING_THRESHOLD_PERCENT = 80;

export function isValidMonthKey(monthKey: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(monthKey);
}

export function monthlyBudgetMonthKey(
  budget: Pick<MonthlyBudget, "year" | "month">,
): string {
  return `${budget.year}-${String(budget.month).padStart(2, "0")}`;
}

function getProgress(
  spentPaise: number,
  budgetPaise: number,
): BudgetProgress | null {
  if (!Number.isSafeInteger(budgetPaise) || budgetPaise <= 0) return null;
  const utilizationPercent = (spentPaise / budgetPaise) * 100;
  const status: BudgetStatus =
    spentPaise > budgetPaise
      ? "over"
      : utilizationPercent >= BUDGET_APPROACHING_THRESHOLD_PERCENT
        ? "approaching"
        : "normal";
  return {
    budgetPaise,
    spentPaise,
    remainingPaise: budgetPaise - spentPaise,
    utilizationPercent,
    status,
  };
}

export function calculateMonthlyBudgetAnalytics(
  transactions: Transaction[],
  categories: Category[],
  budget: MonthlyBudget | null | undefined,
  monthKey: string,
): MonthlyBudgetAnalytics {
  if (!isValidMonthKey(monthKey)) {
    throw new Error("Choose a valid month for budget calculations.");
  }

  const categoryById = new Map(
    categories
      .filter((category) => category.type === "expense")
      .map((category) => [category.id, category]),
  );
  const allocations = new Map<string, number>();
  if (budget && monthlyBudgetMonthKey(budget) === monthKey) {
    for (const allocation of budget.allocations) {
      if (!allocations.has(allocation.categoryId)) {
        allocations.set(allocation.categoryId, allocation.amountPaise);
      }
    }
  }

  const transactionIds = new Set<string>();
  const categorySpending = new Map<string, number>();
  let expensePaise = 0;
  for (const transaction of transactions) {
    if (
      transaction.type !== "expense" ||
      transaction.date.slice(0, 7) !== monthKey ||
      transactionIds.has(transaction.id)
    ) {
      continue;
    }
    transactionIds.add(transaction.id);
    expensePaise += transaction.amountPaise;
    categorySpending.set(
      transaction.categoryId,
      (categorySpending.get(transaction.categoryId) ?? 0) +
        transaction.amountPaise,
    );
  }

  const categoryIds = new Set([
    ...allocations.keys(),
    ...categorySpending.keys(),
  ]);
  const categoryAnalyses: BudgetCategoryAnalysis[] = [...categoryIds]
    .map((categoryId) => {
      const category = categoryById.get(categoryId);
      const spentPaise = categorySpending.get(categoryId) ?? 0;
      const progress = allocations.has(categoryId)
        ? getProgress(spentPaise, allocations.get(categoryId)!)
        : null;
      return {
        categoryId,
        label: category?.name ?? "Unknown category",
        color: category?.color ?? "#7b887f",
        spentPaise,
        budgetPaise: progress?.budgetPaise ?? null,
        remainingPaise: progress?.remainingPaise ?? null,
        utilizationPercent: progress?.utilizationPercent ?? null,
        status: progress?.status ?? null,
      };
    })
    .sort(
      (left, right) =>
        right.spentPaise - left.spentPaise ||
        left.label.localeCompare(right.label),
    );
  const highestSpendingCategories = categoryAnalyses.filter(
    (category) => category.spentPaise > 0,
  );
  const approachingCategories = categoryAnalyses.filter(
    (category) => category.status === "approaching",
  );
  const overBudgetCategories = categoryAnalyses.filter(
    (category) => category.status === "over",
  );
  const unbudgetedCategories = categoryAnalyses.filter(
    (category) => category.spentPaise > 0 && category.budgetPaise === null,
  );
  const overall =
    budget?.overallLimitPaise === undefined
      ? null
      : getProgress(expensePaise, budget.overallLimitPaise);

  return {
    monthKey,
    expensePaise,
    overall,
    categories: categoryAnalyses,
    highestSpendingCategories,
    approachingCategories,
    overBudgetCategories,
    unbudgetedCategories,
    unbudgetedExpensePaise: unbudgetedCategories.reduce(
      (sum, category) => sum + category.spentPaise,
      0,
    ),
    overBudgetCategoryCount: overBudgetCategories.length,
  };
}

export function getRepeatedBudgetOverruns(
  transactions: Transaction[],
  categories: Category[],
  budgets: MonthlyBudget[],
  endMonthKey: string,
  count = 6,
): RepeatedBudgetOverrun[] {
  if (!isValidMonthKey(endMonthKey)) {
    throw new Error("Choose a valid month for budget calculations.");
  }

  const [year, month] = endMonthKey.split("-").map(Number);
  const budgetByMonth = new Map(
    budgets.map((budget) => [monthlyBudgetMonthKey(budget), budget]),
  );
  const categoryById = new Map(
    categories
      .filter((category) => category.type === "expense")
      .map((category) => [category.id, category]),
  );
  const categoryPerformance = new Map<
    string,
    { budgetedMonths: number; overBudgetMonths: number }
  >();

  for (let index = 0; index < count; index += 1) {
    const date = new Date(Date.UTC(year, month - count + index, 1));
    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const budget = budgetByMonth.get(monthKey);
    if (!budget) continue;

    const spentByCategory = new Map<string, number>();
    for (const transaction of transactions) {
      if (
        transaction.type === "expense" &&
        transaction.date.slice(0, 7) === monthKey
      ) {
        spentByCategory.set(
          transaction.categoryId,
          (spentByCategory.get(transaction.categoryId) ?? 0) +
            transaction.amountPaise,
        );
      }
    }

    for (const allocation of budget.allocations) {
      const category = categoryById.get(allocation.categoryId);
      if (!category) continue;
      const performance = categoryPerformance.get(category.id) ?? {
        budgetedMonths: 0,
        overBudgetMonths: 0,
      };
      performance.budgetedMonths += 1;
      if ((spentByCategory.get(category.id) ?? 0) > allocation.amountPaise) {
        performance.overBudgetMonths += 1;
      }
      categoryPerformance.set(category.id, performance);
    }
  }

  return [...categoryPerformance.entries()]
    .filter(([, performance]) => performance.overBudgetMonths >= 2)
    .map(([categoryId, performance]) => {
      const category = categoryById.get(categoryId)!;
      return {
        categoryId,
        label: category.name,
        color: category.color,
        ...performance,
      };
    })
    .sort(
      (left, right) =>
        right.overBudgetMonths - left.overBudgetMonths ||
        right.overBudgetMonths * left.budgetedMonths -
          left.overBudgetMonths * right.budgetedMonths ||
        right.budgetedMonths - left.budgetedMonths ||
        left.label.localeCompare(right.label),
    );
}

export function isMonthlyBudget(value: unknown): value is MonthlyBudget {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const budget = value as Record<string, unknown>;
  if (
    typeof budget.id !== "string" ||
    budget.id.trim().length === 0 ||
    !Number.isInteger(budget.year) ||
    Number(budget.year) < 1000 ||
    Number(budget.year) > 9999 ||
    !Number.isInteger(budget.month) ||
    Number(budget.month) < 1 ||
    Number(budget.month) > 12 ||
    (budget.overallLimitPaise !== undefined &&
      (!Number.isSafeInteger(budget.overallLimitPaise) ||
        Number(budget.overallLimitPaise) <= 0)) ||
    !Array.isArray(budget.allocations) ||
    typeof budget.createdAt !== "string" ||
    !Number.isFinite(Date.parse(budget.createdAt)) ||
    typeof budget.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(budget.updatedAt))
  ) {
    return false;
  }
  const categoryIds = new Set<string>();
  return budget.allocations.every((item: unknown) => {
    if (
      typeof item !== "object" ||
      item === null ||
      Array.isArray(item) ||
      typeof (item as CategoryBudgetAllocation).categoryId !== "string" ||
      (item as CategoryBudgetAllocation).categoryId.trim().length === 0 ||
      !Number.isSafeInteger((item as CategoryBudgetAllocation).amountPaise) ||
      (item as CategoryBudgetAllocation).amountPaise <= 0
    ) {
      return false;
    }
    const categoryId = (item as CategoryBudgetAllocation).categoryId;
    if (categoryIds.has(categoryId)) return false;
    categoryIds.add(categoryId);
    return true;
  });
}

export function validateMonthlyBudgets(
  values: unknown[],
  categories: Category[],
): values is MonthlyBudget[] {
  const ids = new Set<string>();
  const months = new Set<string>();
  return values.every((value) => {
    if (!isMonthlyBudget(value) || ids.has(value.id)) return false;
    const monthKey = monthlyBudgetMonthKey(value);
    if (months.has(monthKey)) return false;
    if (
      value.allocations.some(
        (allocation) =>
          !categories.some(
            (category) =>
              category.id === allocation.categoryId &&
              category.type === "expense",
          ),
      )
    ) {
      return false;
    }
    ids.add(value.id);
    months.add(monthKey);
    return true;
  });
}

export function copyPreviousMonthAllocations(
  budgets: MonthlyBudget[],
  year: number,
  month: number,
): CategoryBudgetAllocation[] | null {
  const previous = new Date(Date.UTC(year, month - 2, 1));
  const previousKey = `${previous.getUTCFullYear()}-${String(previous.getUTCMonth() + 1).padStart(2, "0")}`;
  const source = budgets.find(
    (item) => monthlyBudgetMonthKey(item) === previousKey,
  );
  return source
    ? source.allocations.map((allocation) => ({ ...allocation }))
    : null;
}
