export type TransactionType = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  type: TransactionType;
  isFallback: boolean;
};

export type CategoryRule = {
  id: string;
  categoryId: string;
  keywords: string[];
  priority: number;
  isDefault: boolean;
};

export type CategoryRuleInput = Pick<
  CategoryRule,
  "categoryId" | "keywords" | "priority"
>;

export type Transaction = {
  id: string;
  type: TransactionType;
  description: string;
  amountPaise: number;
  categoryId: string;
  categorySource?: "suggested" | "manual";
  date: string;
  paymentMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type TransactionInput = Omit<
  Transaction,
  "id" | "createdAt" | "updatedAt"
>;

export type RecurrenceFrequency =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly"
  | "custom";

export type RecurringRule = {
  id: string;
  description: string;
  type: TransactionType;
  amountPaise: number;
  categoryId: string;
  frequency: RecurrenceFrequency;
  interval?: number;
  startDate: string;
  nextDueDate: string;
  endDate?: string;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type RecurringRuleInput = Omit<
  RecurringRule,
  "id" | "createdAt" | "updatedAt"
>;

export type RecurringOccurrenceStatus = "pending" | "confirmed" | "skipped";

export type RecurringOccurrence = {
  id: string;
  ruleId: string;
  scheduledDate: string;
  date: string;
  description: string;
  type: TransactionType;
  amountPaise: number;
  categoryId: string;
  status: RecurringOccurrenceStatus;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CategoryBudgetAllocation = {
  categoryId: string;
  amountPaise: number;
};

export type MonthlyBudget = {
  id: string;
  year: number;
  month: number;
  overallLimitPaise?: number;
  allocations: CategoryBudgetAllocation[];
  createdAt: string;
  updatedAt: string;
};

export type FinanceData = {
  categories: Category[];
  rules: CategoryRule[];
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  recurringOccurrences: RecurringOccurrence[];
  budgets: MonthlyBudget[];
};

export type BudgetStatus = "normal" | "approaching" | "over";

export type BudgetProgress = {
  budgetPaise: number;
  spentPaise: number;
  remainingPaise: number;
  utilizationPercent: number;
  status: BudgetStatus;
};

export type BudgetCategoryAnalysis = {
  categoryId: string;
  label: string;
  color: string;
  spentPaise: number;
  budgetPaise: number | null;
  remainingPaise: number | null;
  utilizationPercent: number | null;
  status: BudgetStatus | null;
};

export type MonthlyBudgetAnalytics = {
  monthKey: string;
  expensePaise: number;
  overall: BudgetProgress | null;
  categories: BudgetCategoryAnalysis[];
  highestSpendingCategories: BudgetCategoryAnalysis[];
  approachingCategories: BudgetCategoryAnalysis[];
  overBudgetCategories: BudgetCategoryAnalysis[];
  unbudgetedCategories: BudgetCategoryAnalysis[];
  unbudgetedExpensePaise: number;
  overBudgetCategoryCount: number;
};

export type SpendingMonth = {
  label: string;
  monthKey: string;
  amountPaise: number;
};

export type SpendingCategory = {
  id: string;
  label: string;
  amountPaise: number;
  color: string;
};

export type MonthlyFinancialSummary = {
  incomePaise: number;
  expensePaise: number;
  balancePaise: number;
  savingsRate: number | null;
  transactionCount: number;
  largestExpense: Transaction | null;
  categoryTotals: SpendingCategory[];
  previousMonth: {
    incomePaise: number;
    expensePaise: number;
    balancePaise: number;
  };
  expenseChangePaise: number;
  expenseChangePercent: number | null;
};
