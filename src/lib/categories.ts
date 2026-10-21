import type { Category, CategoryRule } from "@/types/finance";

const categoryColors = ["#214c3a", "#70927d", "#a9bcae", "#d1a56f", "#d9dfd8"];

const defaultCategoryNames = [
  "Rent",
  "Household",
  "Groceries",
  "Food and dining",
  "Fuel",
  "Transport",
  "Travel",
  "Utilities",
  "Shopping",
  "Entertainment",
  "Health",
  "Subscriptions",
  "EMI and loans",
  "Other",
  "Salary",
  "Other income",
];

export const defaultCategories: Category[] = defaultCategoryNames.map(
  (name, index) => ({
    id: `category-${index + 1}`,
    name,
    color: categoryColors[index % categoryColors.length],
    isDefault: true,
    type: index < 14 ? "expense" : "income",
    isFallback: name === "Other",
  }),
);

const categoryIdByName = new Map(
  defaultCategories.map((category) => [category.name, category.id]),
);

type DefaultRuleDefinition = {
  category: string;
  keywords: string[];
  priority: number;
};

const defaultRuleDefinitions: DefaultRuleDefinition[] = [
  { category: "Rent", keywords: ["monthly rent"], priority: 110 },
  {
    category: "Household",
    keywords: ["amazon household", "household items"],
    priority: 105,
  },
  {
    category: "Utilities",
    keywords: ["bescom", "electricity bill"],
    priority: 100,
  },
  {
    category: "Food and dining",
    keywords: ["swiggy", "zomato"],
    priority: 100,
  },
  {
    category: "Groceries",
    keywords: ["bigbasket", "big basket"],
    priority: 100,
  },
  {
    category: "Subscriptions",
    keywords: ["netflix subscription"],
    priority: 100,
  },
  { category: "Travel", keywords: ["flight ticket"], priority: 100 },
  { category: "Transport", keywords: ["uber ride"], priority: 100 },
  { category: "Fuel", keywords: ["petrol pump"], priority: 100 },
  { category: "Rent", keywords: ["rent"], priority: 70 },
  { category: "Groceries", keywords: ["groceries", "grocery"], priority: 65 },
  {
    category: "Food and dining",
    keywords: ["dinner", "restaurant", "takeaway"],
    priority: 60,
  },
  { category: "Fuel", keywords: ["petrol", "diesel", "fuel"], priority: 60 },
  { category: "Travel", keywords: ["flight", "hotel", "airbnb"], priority: 60 },
  {
    category: "Subscriptions",
    keywords: ["subscription", "netflix", "spotify"],
    priority: 60,
  },
  {
    category: "Transport",
    keywords: ["uber", "ola cab", "metro", "bus fare"],
    priority: 60,
  },
  {
    category: "Utilities",
    keywords: ["electricity", "water bill", "internet bill"],
    priority: 60,
  },
  {
    category: "Household",
    keywords: ["household", "cleaning supplies"],
    priority: 55,
  },
];

export const defaultCategoryRules: CategoryRule[] = defaultRuleDefinitions.map(
  (rule, index) => {
    const categoryId = categoryIdByName.get(rule.category);
    if (!categoryId) {
      throw new Error(`No default category exists for rule: ${rule.category}`);
    }
    return {
      id: `rule-${index + 1}`,
      categoryId,
      keywords: rule.keywords,
      priority: rule.priority,
      isDefault: true,
    };
  },
);

export function createCategory(
  name: string,
  existingCategories: Category[],
  type: Category["type"],
): Category {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Enter a category name.");
  }
  if (
    existingCategories.some(
      (category) =>
        category.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
    )
  ) {
    throw new Error("A category with that name already exists.");
  }

  return {
    id: `category-${crypto.randomUUID()}`,
    name: trimmedName,
    color: categoryColors[existingCategories.length % categoryColors.length],
    isDefault: false,
    type,
    isFallback: false,
  };
}

export function renameCategory(
  categories: Category[],
  categoryId: string,
  name: string,
): Category[] {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Enter a category name.");
  }
  if (
    categories.some(
      (category) =>
        category.id !== categoryId &&
        category.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
    )
  ) {
    throw new Error("A category with that name already exists.");
  }
  if (!categories.some((category) => category.id === categoryId)) {
    throw new Error("That category could not be found.");
  }

  return categories.map((category) =>
    category.id === categoryId ? { ...category, name: trimmedName } : category,
  );
}
