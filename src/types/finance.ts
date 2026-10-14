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

export type FinanceData = {
  categories: Category[];
  rules: CategoryRule[];
  transactions: Transaction[];
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
