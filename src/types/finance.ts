export type TransactionType = "income" | "expense";

export type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

export type FinancePreferences = {
  defaultCurrency: string;
  dateFormat: DateFormat;
  hideBalances: boolean;
};

export type OriginalCurrencyAmount = {
  originalAmountPaise?: number;
  originalCurrency?: string;
  exchangeRateDate?: string;
};

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

export type Transaction = OriginalCurrencyAmount & {
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

export type RecurringRule = OriginalCurrencyAmount & {
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

export type RecurringOccurrence = OriginalCurrencyAmount & {
  id: string;
  ruleId: string | null;
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

export type CategoryBudgetAllocation = OriginalCurrencyAmount & {
  categoryId: string;
  amountPaise: number;
};

export type MonthlyBudget = OriginalCurrencyAmount & {
  id: string;
  year: number;
  month: number;
  overallLimitPaise?: number;
  originalOverallLimitPaise?: number;
  allocations: CategoryBudgetAllocation[];
  createdAt: string;
  updatedAt: string;
};

export type FinanceData = {
  preferences?: FinancePreferences;
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

export type RepeatedBudgetOverrun = {
  categoryId: string;
  label: string;
  color: string;
  overBudgetMonths: number;
  budgetedMonths: number;
};

export type SpendingMonth = {
  label: string;
  monthKey: string;
  amountPaise: number;
};

export type CashFlowMonth = {
  label: string;
  monthKey: string;
  incomePaise: number;
  expensePaise: number;
  netPaise: number;
  change: {
    incomePaise: number;
    expensePaise: number;
    netPaise: number;
  };
};

export type SavingsHealthMonth = {
  label: string;
  monthKey: string;
  incomePaise: number;
  expensePaise: number;
  actualSavingsPaise: number;
  spendingToIncomePercent: number | null;
  actualSavingsRate: number | null;
  plannedSavingsPaise: number | null;
  plannedExpensePaise: number | null;
  plannedExpenseSource: "overall-limit" | "category-allocations" | null;
};

export type SpendingCategory = {
  id: string;
  label: string;
  amountPaise: number;
  color: string;
};

export type CategorySpendingComparison = SpendingCategory & {
  previousAmountPaise: number;
  changePaise: number;
  changePercent: number | null;
};

export type MonthlySpendingAnalysis = {
  categoryChanges: CategorySpendingComparison[];
  fixedExpensePaise: number;
  variableExpensePaise: number;
  largestTransactions: Transaction[];
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
