"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createCategory,
  defaultCategoryRules,
  renameCategory,
} from "@/lib/categories";
import {
  createCategoryRule,
  removeCategoryRule,
  updateCategoryRule,
} from "@/lib/categorization";
import { removeTransaction } from "@/lib/finance-utils";
import {
  copyPreviousMonthAllocations,
  isValidMonthKey,
  monthlyBudgetMonthKey,
} from "@/lib/monthly-budgets";
import { createTransactionRecord } from "@/lib/transaction-factory";
import {
  createRecurringOccurrence,
  settleRecurringOccurrence as settleOccurrenceInData,
  updatePendingOccurrence,
  validateRecurringRuleInput,
} from "@/lib/recurring-transactions";
import {
  clearFinanceData,
  loadFinanceData,
  resetFinanceData,
  saveFinanceData,
} from "@/lib/finance-storage";
import type {
  Category,
  CategoryBudgetAllocation,
  CategoryRuleInput,
  FinanceData,
  MonthlyBudget,
  RecurringOccurrence,
  RecurringRule,
  RecurringRuleInput,
  TransactionInput,
  TransactionType,
} from "@/types/finance";

type FinanceDataState = {
  data: FinanceData | null;
  isLoading: boolean;
  error: string | null;
};

function getOrCreateMonthlyBudget(
  budgets: MonthlyBudget[],
  year: number,
  month: number,
  now: string,
): MonthlyBudget {
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  if (!isValidMonthKey(monthKey)) {
    throw new Error("Choose a valid month for this budget.");
  }
  return (
    budgets.find((budget) => monthlyBudgetMonthKey(budget) === monthKey) ?? {
      id: crypto.randomUUID(),
      year,
      month,
      allocations: [],
      createdAt: now,
      updatedAt: now,
    }
  );
}

export function useFinanceDataState() {
  const [state, setState] = useState<FinanceDataState>({
    data: null,
    isLoading: true,
    error: null,
  });
  const dataRef = useRef<FinanceData | null>(null);

  useEffect(() => {
    try {
      const data = loadFinanceData();
      dataRef.current = data;
      setState({ data, isLoading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Your finance data could not be loaded.",
      });
    }
  }, []);

  const commit = useCallback((nextData: FinanceData): boolean => {
    try {
      saveFinanceData(nextData);
      dataRef.current = nextData;
      setState({ data: nextData, isLoading: false, error: null });
      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? `Changes could not be saved: ${error.message}`
            : "Changes could not be saved.",
      }));
      return false;
    }
  }, []);

  const addTransaction = useCallback(
    (input: TransactionInput): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      const now = new Date().toISOString();
      const transaction = createTransactionRecord(input, crypto.randomUUID(), now);
      return commit({
        ...current,
        transactions: [transaction, ...current.transactions],
      });
    },
    [commit],
  );

  const updateTransaction = useCallback(
    (id: string, input: TransactionInput): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      const existing = current.transactions.find(
        (transaction) => transaction.id === id,
      );
      if (!existing) return false;
      return commit({
        ...current,
        transactions: current.transactions.map((transaction) =>
          transaction.id === id
            ? { ...input, id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() }
            : transaction,
        ),
      });
    },
    [commit],
  );

  const deleteTransaction = useCallback(
    (id: string): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      return commit({
        ...current,
        transactions: removeTransaction(current.transactions, id),
      });
    },
    [commit],
  );

  const reportMutationError = useCallback((message: string) => {
    setState((previous) => ({ ...previous, error: message }));
  }, []);

  const addRecurringRule = useCallback(
    (input: RecurringRuleInput): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      const validationError = validateRecurringRuleInput(
        input,
        current.categories,
      );
      if (validationError) {
        reportMutationError(validationError);
        return false;
      }
      const now = new Date().toISOString();
      const rule: RecurringRule = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
      return commit({
        ...current,
        recurringRules: [rule, ...current.recurringRules],
        recurringOccurrences: input.active
          ? [
              createRecurringOccurrence(rule, rule.nextDueDate, now),
              ...current.recurringOccurrences,
            ]
          : current.recurringOccurrences,
      });
    },
    [commit, reportMutationError],
  );

  const editRecurringRule = useCallback(
    (ruleId: string, input: RecurringRuleInput): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      const existing = current.recurringRules.find((rule) => rule.id === ruleId);
      if (!existing) return false;
      const validationError = validateRecurringRuleInput(
        input,
        current.categories,
      );
      if (validationError) {
        reportMutationError(validationError);
        return false;
      }
      const now = new Date().toISOString();
      const rule: RecurringRule = {
        ...input,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
      const pending = current.recurringOccurrences.find(
        (occurrence) =>
          occurrence.ruleId === ruleId && occurrence.status === "pending",
      );
      const occurrencesWithoutPending = pending
        ? current.recurringOccurrences.filter(
            (occurrence) => occurrence.id !== pending.id,
          )
        : current.recurringOccurrences;
      const updatedPending: RecurringOccurrence | null = pending
        ? {
            ...pending,
            id: `${ruleId}::${rule.nextDueDate}`,
            scheduledDate: rule.nextDueDate,
            date:
              pending.date === pending.scheduledDate
                ? rule.nextDueDate
                : pending.date,
            description: rule.description,
            type: rule.type,
            amountPaise:
              pending.amountPaise === existing.amountPaise
                ? rule.amountPaise
                : pending.amountPaise,
            categoryId: rule.categoryId,
            updatedAt: now,
          }
        : null;
      if (
        updatedPending &&
        occurrencesWithoutPending.some(
          (occurrence) => occurrence.id === updatedPending.id,
        )
      ) {
        reportMutationError(
          "An occurrence already exists for that scheduled date. Choose a different next due date.",
        );
        return false;
      }
      return commit({
        ...current,
        recurringRules: current.recurringRules.map((item) =>
          item.id === ruleId ? rule : item,
        ),
        recurringOccurrences: updatedPending
          ? [updatedPending, ...occurrencesWithoutPending]
          : occurrencesWithoutPending,
      });
    },
    [commit, reportMutationError],
  );

  const setRecurringRuleActive = useCallback(
    (ruleId: string, active: boolean): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      const existing = current.recurringRules.find((rule) => rule.id === ruleId);
      if (!existing) return false;
      if (active && existing.endDate && existing.nextDueDate > existing.endDate) {
        reportMutationError(
          "This schedule has passed its end date and cannot be resumed.",
        );
        return false;
      }
      const now = new Date().toISOString();
      const rule = { ...existing, active, updatedAt: now };
      const hasPending = current.recurringOccurrences.some(
        (occurrence) =>
          occurrence.ruleId === ruleId && occurrence.status === "pending",
      );
      return commit({
        ...current,
        recurringRules: current.recurringRules.map((item) =>
          item.id === ruleId ? rule : item,
        ),
        recurringOccurrences:
          active && !hasPending
            ? [
                createRecurringOccurrence(rule, rule.nextDueDate, now),
                ...current.recurringOccurrences,
              ]
            : current.recurringOccurrences,
      });
    },
    [commit, reportMutationError],
  );

  const deleteRecurringRule = useCallback(
    (ruleId: string): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      if (!current.recurringRules.some((rule) => rule.id === ruleId)) {
        return false;
      }
      return commit({
        ...current,
        recurringRules: current.recurringRules.filter(
          (rule) => rule.id !== ruleId,
        ),
        recurringOccurrences: current.recurringOccurrences.filter(
          (occurrence) =>
            occurrence.ruleId !== ruleId ||
            occurrence.status !== "pending",
        ),
      });
    },
    [commit],
  );

  const saveOverallBudget = useCallback(
    (
      year: number,
      month: number,
      overallLimitPaise: number | undefined,
    ): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      if (
        overallLimitPaise !== undefined &&
        (!Number.isSafeInteger(overallLimitPaise) || overallLimitPaise <= 0)
      ) {
        reportMutationError("Enter an overall budget greater than ₹0.");
        return false;
      }
      try {
        const now = new Date().toISOString();
        const existing = getOrCreateMonthlyBudget(
          current.budgets,
          year,
          month,
          now,
        );
        const budget: MonthlyBudget = {
          ...existing,
          overallLimitPaise,
          updatedAt: now,
        };
        return commit({
          ...current,
          budgets: current.budgets.some((item) => item.id === budget.id)
            ? current.budgets.map((item) =>
                item.id === budget.id ? budget : item,
              )
            : [...current.budgets, budget],
        });
      } catch (error) {
        reportMutationError(
          error instanceof Error ? error.message : "The budget could not be saved.",
        );
        return false;
      }
    },
    [commit, reportMutationError],
  );

  const saveCategoryBudget = useCallback(
    (
      year: number,
      month: number,
      categoryId: string,
      amountPaise: number,
    ): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
        reportMutationError("Enter a category budget greater than ₹0.");
        return false;
      }
      if (
        !current.categories.some(
          (category) => category.id === categoryId && category.type === "expense",
        )
      ) {
        reportMutationError("Choose an existing expense category.");
        return false;
      }
      try {
        const now = new Date().toISOString();
        const existing = getOrCreateMonthlyBudget(
          current.budgets,
          year,
          month,
          now,
        );
        const allocation: CategoryBudgetAllocation = { categoryId, amountPaise };
        const budget: MonthlyBudget = {
          ...existing,
          allocations: [
            ...existing.allocations.filter(
              (item) => item.categoryId !== categoryId,
            ),
            allocation,
          ],
          updatedAt: now,
        };
        return commit({
          ...current,
          budgets: current.budgets.some((item) => item.id === budget.id)
            ? current.budgets.map((item) =>
                item.id === budget.id ? budget : item,
              )
            : [...current.budgets, budget],
        });
      } catch (error) {
        reportMutationError(
          error instanceof Error
            ? error.message
            : "The category budget could not be saved.",
        );
        return false;
      }
    },
    [commit, reportMutationError],
  );

  const removeCategoryBudget = useCallback(
    (year: number, month: number, categoryId: string): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      const existing = current.budgets.find(
        (budget) => monthlyBudgetMonthKey(budget) === monthKey,
      );
      if (!existing) return false;
      const now = new Date().toISOString();
      const budget = {
        ...existing,
        allocations: existing.allocations.filter(
          (item) => item.categoryId !== categoryId,
        ),
        updatedAt: now,
      };
      return commit({
        ...current,
        budgets: current.budgets.map((item) =>
          item.id === budget.id ? budget : item,
        ),
      });
    },
    [commit],
  );

  const copyCategoryBudgets = useCallback(
    (year: number, month: number): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      const previous = copyPreviousMonthAllocations(
        current.budgets,
        year,
        month,
      );
      if (!previous?.length) {
        reportMutationError(
          "There are no category budgets to copy from the previous month.",
        );
        return false;
      }
      try {
        const now = new Date().toISOString();
        const existing = getOrCreateMonthlyBudget(
          current.budgets,
          year,
          month,
          now,
        );
        const allocations = new Map(
          existing.allocations.map((item) => [item.categoryId, item]),
        );
        previous.forEach((item) => allocations.set(item.categoryId, item));
        const budget: MonthlyBudget = {
          ...existing,
          allocations: [...allocations.values()],
          updatedAt: now,
        };
        return commit({
          ...current,
          budgets: current.budgets.some((item) => item.id === budget.id)
            ? current.budgets.map((item) =>
                item.id === budget.id ? budget : item,
              )
            : [...current.budgets, budget],
        });
      } catch (error) {
        reportMutationError(
          error instanceof Error
            ? error.message
            : "The previous month's budgets could not be copied.",
        );
        return false;
      }
    },
    [commit, reportMutationError],
  );

  const deleteMonthlyBudget = useCallback(
    (budgetId: string): boolean => {
      const current = dataRef.current;
      if (!current || !current.budgets.some((budget) => budget.id === budgetId)) {
        return false;
      }
      return commit({
        ...current,
        budgets: current.budgets.filter((budget) => budget.id !== budgetId),
      });
    },
    [commit],
  );

  const editRecurringOccurrence = useCallback(
    (
      occurrenceId: string,
      input: { amountPaise: number; date: string },
    ): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      try {
        return commit(
          updatePendingOccurrence(current, occurrenceId, input),
        );
      } catch (error) {
        reportMutationError(
          error instanceof Error
            ? error.message
            : "This occurrence could not be edited.",
        );
        return false;
      }
    },
    [commit, reportMutationError],
  );

  const settleRecurringOccurrence = useCallback(
    (
      occurrenceId: string,
      status: "confirmed" | "skipped",
    ): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      try {
        const next = settleOccurrenceInData(
          current,
          occurrenceId,
          status,
        );
        return next === current || commit(next);
      } catch (error) {
        reportMutationError(
          error instanceof Error
            ? error.message
            : "This occurrence could not be updated.",
        );
        return false;
      }
    },
    [commit, reportMutationError],
  );

  const addCustomCategory = useCallback(
    (name: string, type: TransactionType): Category => {
      const current = dataRef.current;
      if (!current) {
        throw new Error("Finance data is still loading.");
      }
      const category = createCategory(name, current.categories, type);
      if (
        !commit({
          ...current,
          categories: [...current.categories, category],
          rules: current.rules ?? defaultCategoryRules,
        })
      ) {
        throw new Error("The new category could not be saved.");
      }
      return category;
    },
    [commit],
  );

  const addCategorizationRule = useCallback(
    (input: CategoryRuleInput): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      try {
        const rules = current.rules ?? defaultCategoryRules;
        const rule = createCategoryRule(
          input.categoryId,
          input.keywords,
          input.priority,
          current.categories,
          rules,
        );
        return commit({ ...current, rules: [...rules, rule] });
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error:
            error instanceof Error ? error.message : "Rule could not be added.",
        }));
        return false;
      }
    },
    [commit],
  );

  const editCategorizationRule = useCallback(
    (ruleId: string, input: CategoryRuleInput): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      try {
        const rules = updateCategoryRule(
          current.rules ?? defaultCategoryRules,
          ruleId,
          input,
          current.categories,
        );
        return commit({ ...current, rules });
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error:
            error instanceof Error ? error.message : "Rule could not be changed.",
        }));
        return false;
      }
    },
    [commit],
  );

  const deleteCategorizationRule = useCallback(
    (ruleId: string): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      try {
        const rules = removeCategoryRule(
          current.rules ?? defaultCategoryRules,
          ruleId,
        );
        return commit({ ...current, rules });
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error:
            error instanceof Error ? error.message : "Rule could not be removed.",
        }));
        return false;
      }
    },
    [commit],
  );

  const editCategory = useCallback(
    (categoryId: string, name: string): boolean => {
      const current = dataRef.current;
      if (!current) return false;
      try {
        const categories = renameCategory(
          current.categories,
          categoryId,
          name,
        );
        return commit({ ...current, categories });
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error:
            error instanceof Error ? error.message : "Category could not be changed.",
        }));
        return false;
      }
    },
    [commit],
  );

  const resetDemoData = useCallback((): boolean => {
    try {
      const data = resetFinanceData();
      dataRef.current = data;
      setState({ data, isLoading: false, error: null });
      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? `Sample data could not be restored: ${error.message}`
            : "Sample data could not be restored.",
      }));
      return false;
    }
  }, []);

  const clearAllData = useCallback((): boolean => {
    try {
      const data = clearFinanceData();
      dataRef.current = data;
      setState({ data, isLoading: false, error: null });
      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        error:
          error instanceof Error
            ? `Saved data could not be cleared: ${error.message}`
            : "Saved data could not be cleared.",
      }));
      return false;
    }
  }, []);

  const restoreData = useCallback(
    (data: FinanceData): boolean => commit(data),
    [commit],
  );

  return {
    ...state,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addRecurringRule,
    editRecurringRule,
    setRecurringRuleActive,
    deleteRecurringRule,
    saveOverallBudget,
    saveCategoryBudget,
    removeCategoryBudget,
    copyCategoryBudgets,
    deleteMonthlyBudget,
    editRecurringOccurrence,
    confirmRecurringOccurrence: (occurrenceId: string) =>
      settleRecurringOccurrence(occurrenceId, "confirmed"),
    skipRecurringOccurrence: (occurrenceId: string) =>
      settleRecurringOccurrence(occurrenceId, "skipped"),
    addCustomCategory,
    editCategory,
    addCategorizationRule,
    editCategorizationRule,
    deleteCategorizationRule,
    resetDemoData,
    clearAllData,
    restoreData,
  };
}
