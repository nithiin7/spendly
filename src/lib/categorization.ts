import type { Category, CategoryRule } from "@/types/finance";

export type CategorySuggestion = {
  categoryId: string;
  matchedRuleId: string | null;
  matchedKeyword: string | null;
  confidence: "matched" | "fallback";
};

export type CategorySelection = {
  categoryId: string | null;
  categorySource: "suggested" | "manual";
};

export function normalizeDescription(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function containsKeyword(description: string, keyword: string): boolean {
  const normalizedKeyword = normalizeDescription(keyword);
  if (!normalizedKeyword) return false;
  return ` ${description} `.includes(` ${normalizedKeyword} `);
}

export function suggestCategory(
  description: string,
  categories: Category[],
  rules: CategoryRule[],
  type: Category["type"] = "expense",
): CategorySuggestion | null {
  const normalizedDescription = normalizeDescription(description);
  if (!normalizedDescription) return null;

  const validCategoryIds = new Set(
    categories
      .filter((category) => category.type === type)
      .map((category) => category.id),
  );
  const candidates = rules
    .map((rule) => ({
      rule,
      matchedKeyword: validCategoryIds.has(rule.categoryId)
        ? rule.keywords
            .map((keyword) => normalizeDescription(keyword))
            .filter(
              (keyword) =>
                keyword && containsKeyword(normalizedDescription, keyword),
            )
            .sort((left, right) => right.length - left.length)[0]
        : undefined,
    }))
    .filter(
      (
        candidate,
      ): candidate is { rule: CategoryRule; matchedKeyword: string } =>
        candidate.matchedKeyword !== undefined,
    )
    .sort((left, right) => {
      if (right.rule.priority !== left.rule.priority) {
        return right.rule.priority - left.rule.priority;
      }
      return (
        right.matchedKeyword.length - left.matchedKeyword.length ||
        left.rule.id.localeCompare(right.rule.id)
      );
    });

  const match = candidates[0];
  if (match) {
    return {
      categoryId: match.rule.categoryId,
      matchedRuleId: match.rule.id,
      matchedKeyword: match.matchedKeyword,
      confidence: "matched",
    };
  }

  const otherCategory = categories.find(
    (category) => category.type === type && category.isFallback,
  );
  if (!otherCategory) return null;
  return {
    categoryId: otherCategory.id,
    matchedRuleId: null,
    matchedKeyword: null,
    confidence: "fallback",
  };
}

export function applyCategorySuggestion(
  current: CategorySelection,
  suggestion: CategorySuggestion | null,
): CategorySelection {
  if (current.categorySource === "manual") return current;
  return {
    categoryId: suggestion?.categoryId ?? null,
    categorySource: "suggested",
  };
}

export function createCategoryRule(
  categoryId: string,
  keywords: string[],
  priority: number,
  categories: Category[],
  rules: CategoryRule[],
): CategoryRule {
  const category = categories.find((item) => item.id === categoryId);
  if (!category) throw new Error("Choose a valid category for this rule.");
  if (!Number.isInteger(priority) || priority < 0 || priority > 1000) {
    throw new Error("Rule priority must be a whole number from 0 to 1000.");
  }

  const normalizedKeywords = [
    ...new Set(
      keywords
        .map((keyword) => keyword.trim())
        .filter(Boolean)
        .map(normalizeDescription),
    ),
  ].filter(Boolean);
  if (normalizedKeywords.length === 0) {
    throw new Error("Add at least one keyword or phrase.");
  }
  const collisions = normalizedKeywords.filter((keyword) =>
    rules.some(
      (rule) =>
        rule.categoryId !== categoryId &&
        rule.keywords.some(
          (existing) => normalizeDescription(existing) === keyword,
        ),
    ),
  );
  if (collisions.length > 0) {
    throw new Error(
      `The keyword “${collisions[0]}” is already assigned to another category.`,
    );
  }

  return {
    id: `rule-custom-${crypto.randomUUID()}`,
    categoryId,
    keywords: normalizedKeywords,
    priority,
    isDefault: false,
  };
}

export function updateCategoryRule(
  rules: CategoryRule[],
  ruleId: string,
  updates: Pick<CategoryRule, "categoryId" | "keywords" | "priority">,
  categories: Category[],
): CategoryRule[] {
  const existing = rules.find((rule) => rule.id === ruleId);
  if (!existing)
    throw new Error("That categorization rule could not be found.");
  const updated = createCategoryRule(
    updates.categoryId,
    updates.keywords,
    updates.priority,
    categories,
    rules.filter((rule) => rule.id !== ruleId),
  );
  return rules.map((rule) =>
    rule.id === ruleId
      ? { ...updated, id: ruleId, isDefault: existing.isDefault }
      : rule,
  );
}

export function removeCategoryRule(
  rules: CategoryRule[],
  ruleId: string,
): CategoryRule[] {
  const rule = rules.find((item) => item.id === ruleId);
  if (!rule) throw new Error("That categorization rule could not be found.");
  if (rule.isDefault) {
    throw new Error(
      "Built-in rules cannot be removed, but they can be edited.",
    );
  }
  return rules.filter((item) => item.id !== ruleId);
}
