import type {
  SpendingCategory,
  SpendingMonth,
  Transaction,
} from "@/types/finance";

export const monthlySpending: SpendingMonth[] = [
  { label: "May", amount: 1760 },
  { label: "Jun", amount: 2140 },
  { label: "Jul", amount: 1880 },
  { label: "Aug", amount: 2460 },
  { label: "Sep", amount: 2010 },
  { label: "Oct", amount: 2140 },
];

export const spendingCategories: SpendingCategory[] = [
  { label: "Housing", amount: 980, color: "#214c3a" },
  { label: "Food & drink", amount: 462, color: "#70927d" },
  { label: "Transport", amount: 286, color: "#a9bcae" },
  { label: "Shopping", amount: 248, color: "#d1a56f" },
  { label: "Health", amount: 164, color: "#d9dfd8" },
];

export const recentTransactions: Transaction[] = [
  {
    id: "tx-1",
    name: "Whole Foods Market",
    category: "Food & drink",
    date: "Today, 10:42 AM",
    amount: 68.42,
    direction: "expense",
  },
  {
    id: "tx-2",
    name: "Monthly paycheck",
    category: "Income",
    date: "Oct 12, 2026",
    amount: 5200,
    direction: "income",
  },
  {
    id: "tx-3",
    name: "City parking",
    category: "Transport",
    date: "Oct 11, 2026",
    amount: 18,
    direction: "expense",
  },
  {
    id: "tx-4",
    name: "Sunday Supply Co.",
    category: "Shopping",
    date: "Oct 10, 2026",
    amount: 84.9,
    direction: "expense",
  },
];
