export type TransactionType = "income" | "expense";

export type Category = {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  type: TransactionType;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  description: string;
  amountPaise: number;
  categoryId: string;
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
