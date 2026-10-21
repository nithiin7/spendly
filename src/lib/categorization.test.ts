import assert from "node:assert/strict";
import test from "node:test";
import { defaultCategories, defaultCategoryRules } from "./categories.ts";
import {
  applyCategorySuggestion,
  createCategoryRule,
  suggestCategory,
  updateCategoryRule,
} from "./categorization.ts";

const categoryId = (name: string) => {
  const category = defaultCategories.find((item) => item.name === name);
  assert.ok(category, `Expected default category ${name}`);
  return category.id;
};

test("suggests the expected category for common expense descriptions", () => {
  const examples = [
    ["Monthly rent", "Rent"],
    ["Petrol pump", "Fuel"],
    ["Swiggy dinner", "Food and dining"],
    ["BigBasket groceries", "Groceries"],
    ["BESCOM electricity bill", "Utilities"],
    ["Amazon household items", "Household"],
    ["Flight ticket", "Travel"],
    ["Netflix subscription", "Subscriptions"],
    ["Uber ride", "Transport"],
  ] as const;

  for (const [description, categoryName] of examples) {
    const suggestion = suggestCategory(
      description,
      defaultCategories,
      defaultCategoryRules,
    );
    assert.equal(suggestion?.categoryId, categoryId(categoryName), description);
    assert.equal(suggestion?.confidence, "matched", description);
  }
});

test("normalizes case, whitespace, and punctuation before matching", () => {
  const suggestion = suggestCategory(
    "  BESCOM---ELECTRICITY   bill! ",
    defaultCategories,
    defaultCategoryRules,
  );
  assert.equal(suggestion?.categoryId, categoryId("Utilities"));
  assert.equal(suggestion?.matchedKeyword, "electricity bill");
});

test("uses Other when no rule is a reliable match", () => {
  const suggestion = suggestCategory(
    "Unfamiliar local merchant",
    defaultCategories,
    defaultCategoryRules,
  );
  assert.equal(suggestion?.categoryId, categoryId("Other"));
  assert.equal(suggestion?.matchedRuleId, null);
  assert.equal(suggestion?.confidence, "fallback");
  const renamedFallback = defaultCategories.map((category) =>
    category.isFallback ? { ...category, name: "Unclassified" } : category,
  );
  assert.equal(
    suggestCategory(
      "Unfamiliar local merchant",
      renamedFallback,
      defaultCategoryRules,
    )?.categoryId,
    categoryId("Other"),
  );
  assert.equal(
    suggestCategory("", defaultCategories, defaultCategoryRules),
    null,
  );
});

test("higher rule priority wins overlapping matches; phrase length breaks ties", () => {
  const priorityOverlap = suggestCategory(
    "Monthly rent",
    defaultCategories,
    defaultCategoryRules,
  );
  assert.equal(priorityOverlap?.categoryId, categoryId("Rent"));

  const rules = [
    ...defaultCategoryRules,
    {
      id: "custom-short",
      categoryId: categoryId("Shopping"),
      keywords: ["coffee"],
      priority: 80,
      isDefault: false,
    },
    {
      id: "custom-long",
      categoryId: categoryId("Food and dining"),
      keywords: ["coffee shop"],
      priority: 80,
      isDefault: false,
    },
  ];
  assert.equal(
    suggestCategory("Coffee shop", defaultCategories, rules)?.categoryId,
    categoryId("Food and dining"),
  );

  const explicitPriorityRules = [
    ...rules,
    {
      id: "custom-priority",
      categoryId: categoryId("Fuel"),
      keywords: ["coffee shop"],
      priority: 90,
      isDefault: false,
    },
  ];
  assert.equal(
    suggestCategory("Coffee shop", defaultCategories, explicitPriorityRules)
      ?.categoryId,
    categoryId("Fuel"),
  );
});

test("a manual category selection is never replaced by a later suggestion", () => {
  const suggestion = suggestCategory(
    "Swiggy dinner",
    defaultCategories,
    defaultCategoryRules,
  );
  assert.ok(suggestion);
  const manuallySelected = {
    categoryId: categoryId("Household"),
    categorySource: "manual" as const,
  };
  assert.deepEqual(
    applyCategorySuggestion(manuallySelected, suggestion),
    manuallySelected,
  );
  assert.deepEqual(
    applyCategorySuggestion(
      { categoryId: null, categorySource: "suggested" },
      suggestion,
    ),
    {
      categoryId: categoryId("Food and dining"),
      categorySource: "suggested",
    },
  );
});

test("custom category rules can be created and edited", () => {
  const rule = createCategoryRule(
    categoryId("Groceries"),
    ["  Local mart ", "corner shop"],
    75,
    defaultCategories,
    defaultCategoryRules,
  );
  assert.deepEqual(rule.keywords, ["local mart", "corner shop"]);
  assert.equal(rule.isDefault, false);
  assert.equal(
    suggestCategory("Local-Mart groceries", defaultCategories, [
      ...defaultCategoryRules,
      rule,
    ])?.categoryId,
    categoryId("Groceries"),
  );

  const editedRules = updateCategoryRule(
    [...defaultCategoryRules, rule],
    rule.id,
    {
      categoryId: categoryId("Household"),
      keywords: ["home supplies"],
      priority: 82,
    },
    defaultCategories,
  );
  assert.equal(
    suggestCategory("Home supplies", defaultCategories, editedRules)
      ?.categoryId,
    categoryId("Household"),
  );
});
