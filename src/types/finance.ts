export type TransactionCategory =
  | "Housing"
  | "Food & drink"
  | "Transport"
  | "Shopping"
  | "Health"
  | "Income";

export type Transaction = {
  id: string;
  name: string;
  category: TransactionCategory;
  date: string;
  amount: number;
  direction: "income" | "expense";
};

export type SpendingMonth = {
  label: string;
  amount: number;
};

export type SpendingCategory = {
  label: Exclude<TransactionCategory, "Income">;
  amount: number;
  color: string;
};
