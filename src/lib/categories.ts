import type { Category } from "@/types/finance";

const categoryColors = [
  "#214c3a",
  "#70927d",
  "#a9bcae",
  "#d1a56f",
  "#d9dfd8",
];

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
  }),
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
      (category) => category.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
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
