import {
  defaultCategories,
  defaultCategoryRules,
} from "@/lib/categories";
import type { FinanceData } from "@/types/finance";

function makeDemoFinanceData(): FinanceData {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthDay = new Date(now.getFullYear(), now.getMonth(), 0);
  const formatDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const createdAt = now.toISOString();
  const dates = {
    today: formatDate(today),
    first: formatDate(firstOfMonth),
    previous: formatDate(previousMonthDay),
  };

  return {
    categories: defaultCategories,
    rules: defaultCategoryRules,
    transactions: [
      {
        id: "demo-1",
        type: "expense",
        description: "Monthly rent",
        amountPaise: 3200000,
        categoryId: "category-1",
        categorySource: "manual",
        date: dates.first,
        paymentMethod: "Bank transfer",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "demo-2",
        type: "income",
        description: "Monthly salary",
        amountPaise: 9500000,
        categoryId: "category-15",
        categorySource: "manual",
        date: dates.first,
        paymentMethod: "Bank transfer",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "demo-3",
        type: "expense",
        description: "Weekly groceries",
        amountPaise: 284650,
        categoryId: "category-3",
        categorySource: "manual",
        date: dates.today,
        paymentMethod: "UPI",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "demo-4",
        type: "expense",
        description: "Metro card recharge",
        amountPaise: 120000,
        categoryId: "category-6",
        categorySource: "manual",
        date: dates.today,
        paymentMethod: "UPI",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "demo-5",
        type: "expense",
        description: "Electricity bill",
        amountPaise: 186430,
        categoryId: "category-8",
        categorySource: "manual",
        date: dates.today,
        paymentMethod: "UPI",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "demo-6",
        type: "expense",
        description: "Dinner with friends",
        amountPaise: 147580,
        categoryId: "category-4",
        categorySource: "manual",
        date: dates.today,
        paymentMethod: "Card",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: "demo-7",
        type: "expense",
        description: "Cab to the airport",
        amountPaise: 76500,
        categoryId: "category-5",
        categorySource: "manual",
        date: dates.previous,
        paymentMethod: "UPI",
        createdAt,
        updatedAt: createdAt,
      },
    ],
  };
}

export function getDemoFinanceData(): FinanceData {
  const demoFinanceData = makeDemoFinanceData();
  return {
    categories: demoFinanceData.categories.map((category) => ({ ...category })),
    rules: demoFinanceData.rules.map((rule) => ({
      ...rule,
      keywords: [...rule.keywords],
    })),
    transactions: demoFinanceData.transactions.map((transaction) => ({
      ...transaction,
    })),
  };
}
