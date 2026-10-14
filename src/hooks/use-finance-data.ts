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
  clearFinanceData,
  loadFinanceData,
  resetFinanceData,
  saveFinanceData,
} from "@/lib/finance-storage";
import type {
  Category,
  CategoryRuleInput,
  FinanceData,
  Transaction,
  TransactionInput,
  TransactionType,
} from "@/types/finance";

type FinanceDataState = {
  data: FinanceData | null;
  isLoading: boolean;
  error: string | null;
};

export function useFinanceData() {
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
      const transaction: Transaction = {
        ...input,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };
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
