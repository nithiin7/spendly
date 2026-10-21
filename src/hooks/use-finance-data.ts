"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createCategory,
  defaultCategoryRules,
  renameCategory,
} from "@/lib/categories";
import { defaultCategories } from "@/lib/categories";
import {
  createCategoryRule,
  removeCategoryRule,
  updateCategoryRule,
} from "@/lib/categorization";
import { removeTransaction } from "@/lib/finance-utils";
import { convertFinanceDataCurrency } from "@/lib/finance-currency";
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
  clearStoredFinanceData,
  getOrCreateFinanceMigrationId,
  hasStoredFinanceData,
  loadFinanceData,
  readStoredFinanceData,
  resetFinanceData,
  saveFinanceData,
} from "@/lib/finance-storage";
import { getDemoFinanceData } from "@/lib/demo-data";
import {
  createMigrationRecordId,
  reconcileLocalFinanceData,
  type FinanceImportCounts,
} from "@/lib/finance-migration";
import { FinanceRepository } from "@/lib/finance-repository";
import { createClient } from "@/lib/supabase/client";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { SupabaseFinanceRepository } from "@/lib/supabase/finance-repository";
import type {
  Category,
  CategoryBudgetAllocation,
  CategoryRuleInput,
  FinanceData,
  FinancePreferences,
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
  isSaving: boolean;
  error: string | null;
  storageMode: "local" | "cloud";
  userEmail: string | null;
  localMigrationData: FinanceData | null;
  localMigrationError: string | null;
  cloudData: FinanceData | null;
  migrationComplete: boolean;
  migrationOutcome: {
    added: FinanceImportCounts;
    conflictsResolved: number;
  } | null;
};

function cloneDefaultFinanceData(): FinanceData {
  return {
    categories: defaultCategories.map((category) => ({ ...category })),
    rules: defaultCategoryRules.map((rule) => ({
      ...rule,
      keywords: [...rule.keywords],
    })),
    transactions: [],
    recurringRules: [],
    recurringOccurrences: [],
    budgets: [],
    preferences: {
      defaultCurrency: "INR",
      dateFormat: "DD/MM/YYYY",
      hideBalances: false,
    },
  };
}

function withDefaultCategories(data: FinanceData): FinanceData {
  if (data.categories.length > 0) return data;
  const defaults = cloneDefaultFinanceData();
  return {
    ...data,
    categories: defaults.categories,
    rules: data.rules.length > 0 ? data.rules : defaults.rules,
  };
}

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
    isSaving: false,
    error: null,
    storageMode: "local",
    userEmail: null,
    localMigrationData: null,
    localMigrationError: null,
    cloudData: null,
    migrationComplete: false,
    migrationOutcome: null,
  });
  const dataRef = useRef<FinanceData | null>(null);
  const persistedDataRef = useRef<FinanceData | null>(null);
  const repositoryRef = useRef<FinanceRepository | null>(null);
  const localModeRef = useRef(true);
  const isSavingRef = useRef(false);

  useEffect(() => {
    let active = true;
    let generation = 0;
    let ownerId: string | null = null;
    const config = getSupabasePublicConfig();

    if (!config) {
      localModeRef.current = true;
      try {
        const data = loadFinanceData();
        dataRef.current = data;
        setState({
          data,
          isLoading: false,
          isSaving: false,
          error: null,
          storageMode: "local",
          userEmail: null,
          localMigrationData: null,
          localMigrationError: null,
          cloudData: null,
          migrationComplete: false,
          migrationOutcome: null,
        });
      } catch (error) {
        setState((current) => ({
          ...current,
          data: null,
          isLoading: false,
          error:
            error instanceof Error
              ? error.message
              : "Your finance data could not be loaded.",
        }));
      }
      return () => {
        active = false;
      };
    }

    localModeRef.current = false;
    const supabase = createClient();

    const loadForUser = async (userId: string, email: string | null) => {
      if (ownerId === userId) return;
      ownerId = userId;
      const loadId = ++generation;
      const repository = new SupabaseFinanceRepository(supabase, userId);
      repositoryRef.current = repository;
      setState((current) => ({
        ...current,
        isLoading: true,
        error: null,
        storageMode: "cloud",
        userEmail: email,
      }));

      try {
        const cloudData = await repository.loadFinanceData();
        if (!active || loadId !== generation) return;
        persistedDataRef.current = cloudData;
        const data = withDefaultCategories(cloudData);
        dataRef.current = data;
        let localMigrationData: FinanceData | null = null;
        let localMigrationError: string | null = null;
        let migrationComplete = false;
        try {
          if (hasStoredFinanceData()) {
            localMigrationData = readStoredFinanceData();
            if (localMigrationData) {
              migrationComplete = await repository.hasCompletedMigration(
                getOrCreateFinanceMigrationId(),
              );
            }
          }
        } catch (error) {
          localMigrationError =
            error instanceof Error
              ? error.message
              : "Local finance data could not be previewed.";
        }
        setState({
          data,
          isLoading: false,
          isSaving: false,
          error: null,
          storageMode: "cloud",
          userEmail: email,
          localMigrationData,
          localMigrationError,
          cloudData,
          migrationComplete,
          migrationOutcome: null,
        });
      } catch {
        if (!active || loadId !== generation) return;
        setState((current) => ({
          ...current,
          isLoading: false,
          error:
            "Cloud finance data could not be loaded. Check your connection and retry.",
          storageMode: "cloud",
          userEmail: email,
        }));
      }
    };

    const subscription = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (session?.user) {
        void loadForUser(session.user.id, session.user.email ?? null);
      } else if (event === "SIGNED_OUT") {
        generation += 1;
        ownerId = null;
        dataRef.current = null;
        persistedDataRef.current = null;
        repositoryRef.current = null;
        setState({
          data: null,
          isLoading: false,
          isSaving: false,
          error: "Sign in to access your cloud finance data.",
          storageMode: "cloud",
          userEmail: null,
          localMigrationData: null,
          localMigrationError: null,
          cloudData: null,
          migrationComplete: false,
          migrationOutcome: null,
        });
      }
    });

    void supabase.auth.getUser().then(
      ({ data, error }) => {
        if (!active) return;
        if (error || !data.user) {
          setState((current) => ({
            ...current,
            data: null,
            isLoading: false,
            error:
              "Your session could not be verified. Sign in again to continue.",
            storageMode: "cloud",
          }));
          return;
        }
        void loadForUser(data.user.id, data.user.email ?? null);
      },
      () => {
        if (!active) return;
        setState((current) => ({
          ...current,
          data: null,
          isLoading: false,
          error:
            "Your session could not be verified. Sign in again to continue.",
          storageMode: "cloud",
        }));
      },
    );

    return () => {
      active = false;
      generation += 1;
      subscription.data.subscription.unsubscribe();
    };
  }, []);

  const reportMutationError = useCallback((message: string) => {
    setState((previous) => ({ ...previous, error: message }));
  }, []);

  const commit = useCallback(
    async (nextData: FinanceData): Promise<boolean> => {
      const previousData = dataRef.current;
      if (!previousData) return false;
      if (isSavingRef.current) {
        setState((current) => ({
          ...current,
          error:
            "A save is still in progress. Wait for it to finish, then retry.",
        }));
        return false;
      }
      isSavingRef.current = true;
      setState((current) => ({ ...current, isSaving: true, error: null }));
      try {
        if (localModeRef.current) {
          saveFinanceData(nextData);
        } else {
          const repository = repositoryRef.current;
          const persisted = persistedDataRef.current;
          if (!repository || !persisted) {
            throw new Error(
              "Cloud finance storage is not ready. Reload and retry.",
            );
          }
          await repository.persistChanges(persisted, nextData);
          persistedDataRef.current = nextData;
        }
        dataRef.current = nextData;
        setState((current) => ({
          ...current,
          data: nextData,
          cloudData: localModeRef.current ? null : nextData,
          isLoading: false,
          isSaving: false,
          error: null,
        }));
        return true;
      } catch (error) {
        const message =
          error instanceof Error
            ? `Changes could not be saved: ${error.message}`
            : "Changes could not be saved.";
        if (!localModeRef.current && repositoryRef.current) {
          try {
            const latest = await repositoryRef.current.loadFinanceData();
            persistedDataRef.current = latest;
            const refreshed = withDefaultCategories(latest);
            dataRef.current = refreshed;
            setState((current) => ({
              ...current,
              data: refreshed,
              cloudData: latest,
              isLoading: false,
              isSaving: false,
              error: `${message} The cloud copy was reloaded; review it before retrying.`,
            }));
          } catch {
            setState((current) => ({
              ...current,
              isSaving: false,
              error: `${message} The cloud copy could not be refreshed. Reconnect and reload before retrying.`,
            }));
          }
        } else {
          setState((current) => ({
            ...current,
            isSaving: false,
            error: message,
          }));
        }
        return false;
      } finally {
        isSavingRef.current = false;
      }
    },
    [],
  );

  const reloadData = useCallback(async (): Promise<void> => {
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      if (localModeRef.current) {
        const data = loadFinanceData();
        dataRef.current = data;
        setState((current) => ({
          ...current,
          data,
          isLoading: false,
          error: null,
          cloudData: null,
        }));
        return;
      }

      const supabase = createClient();
      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError || !authData.user) {
        throw new Error("Your session could not be verified. Sign in again.");
      }
      const repository = new SupabaseFinanceRepository(
        supabase,
        authData.user.id,
      );
      repositoryRef.current = repository;
      const cloudData = await repository.loadFinanceData();
      persistedDataRef.current = cloudData;
      const data = withDefaultCategories(cloudData);
      dataRef.current = data;
      let localMigrationData: FinanceData | null = null;
      let localMigrationError: string | null = null;
      let migrationComplete = false;
      try {
        if (hasStoredFinanceData()) {
          localMigrationData = readStoredFinanceData();
          if (localMigrationData) {
            migrationComplete = await repository.hasCompletedMigration(
              getOrCreateFinanceMigrationId(),
            );
          }
        }
      } catch (error) {
        localMigrationError =
          error instanceof Error
            ? error.message
            : "Local finance data could not be previewed.";
      }
      setState((current) => ({
        ...current,
        data,
        isLoading: false,
        error: null,
        cloudData,
        storageMode: "cloud",
        userEmail: authData.user.email ?? null,
        localMigrationData,
        localMigrationError,
        migrationComplete,
        migrationOutcome: null,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Finance data could not be reloaded. Check your connection and retry.",
      }));
    }
  }, []);

  const migrateLocalData = useCallback(async (): Promise<boolean> => {
    const repository = repositoryRef.current;
    const cloudData = persistedDataRef.current;
    if (!repository || !cloudData) {
      reportMutationError(
        "Cloud storage is not ready. Reload and retry the migration.",
      );
      return false;
    }

    try {
      const localData = readStoredFinanceData();
      if (!localData) {
        reportMutationError("No saved local Spendly data was found to import.");
        return false;
      }
      const migrationId = getOrCreateFinanceMigrationId();
      if (await repository.hasCompletedMigration(migrationId)) {
        setState((current) => ({
          ...current,
          localMigrationData: localData,
          migrationComplete: true,
          error: null,
        }));
        return true;
      }

      const plan = reconcileLocalFinanceData(
        cloudData,
        localData,
        (entityType, recordId, attempt) =>
          createMigrationRecordId(migrationId, entityType, recordId, attempt),
      );
      if (!(await commit(plan.data))) return false;

      await repository.recordCompletedMigration(migrationId, plan.added);
      setState((current) => ({
        ...current,
        data: plan.data,
        cloudData: plan.data,
        localMigrationData: localData,
        migrationComplete: true,
        migrationOutcome: {
          added: plan.added,
          conflictsResolved: plan.conflictsResolved,
        },
        error: null,
      }));
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Local finance data could not be imported.";
      setState((current) => ({
        ...current,
        error: `Migration did not complete: ${message} Your browser copy is unchanged; reload cloud data and retry.`,
      }));
      return false;
    }
  }, [commit, reportMutationError]);

  const clearLocalMigrationCopy = useCallback((): boolean => {
    if (!state.migrationComplete || state.storageMode !== "cloud") {
      reportMutationError(
        "Verify the migrated cloud data before removing the browser copy.",
      );
      return false;
    }
    try {
      clearStoredFinanceData();
      setState((current) => ({
        ...current,
        localMigrationData: null,
        localMigrationError: null,
        error: null,
      }));
      return true;
    } catch (error) {
      reportMutationError(
        error instanceof Error
          ? error.message
          : "The local copy could not be removed.",
      );
      return false;
    }
  }, [reportMutationError, state.migrationComplete, state.storageMode]);

  const addTransaction = useCallback(
    async (input: TransactionInput): Promise<boolean> => {
      const current = dataRef.current;
      if (!current) return false;
      const now = new Date().toISOString();
      const transaction = createTransactionRecord(
        input,
        crypto.randomUUID(),
        now,
      );
      return commit({
        ...current,
        transactions: [transaction, ...current.transactions],
      });
    },
    [commit],
  );

  const updateTransaction = useCallback(
    async (id: string, input: TransactionInput): Promise<boolean> => {
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
            ? {
                ...input,
                id,
                createdAt: existing.createdAt,
                updatedAt: new Date().toISOString(),
              }
            : transaction,
        ),
      });
    },
    [commit],
  );

  const deleteTransaction = useCallback(
    async (id: string): Promise<boolean> => {
      const current = dataRef.current;
      if (!current) return false;
      const now = new Date().toISOString();
      return commit({
        ...current,
        transactions: removeTransaction(current.transactions, id),
        recurringOccurrences: current.recurringOccurrences.map((occurrence) =>
          occurrence.transactionId === id
            ? { ...occurrence, transactionId: undefined, updatedAt: now }
            : occurrence,
        ),
      });
    },
    [commit],
  );

  const addRecurringRule = useCallback(
    async (input: RecurringRuleInput): Promise<boolean> => {
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
    async (ruleId: string, input: RecurringRuleInput): Promise<boolean> => {
      const current = dataRef.current;
      if (!current) return false;
      const existing = current.recurringRules.find(
        (rule) => rule.id === ruleId,
      );
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
    async (ruleId: string, active: boolean): Promise<boolean> => {
      const current = dataRef.current;
      if (!current) return false;
      const existing = current.recurringRules.find(
        (rule) => rule.id === ruleId,
      );
      if (!existing) return false;
      if (
        active &&
        existing.endDate &&
        existing.nextDueDate > existing.endDate
      ) {
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
    async (ruleId: string): Promise<boolean> => {
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
        recurringOccurrences: current.recurringOccurrences
          .filter(
            (occurrence) =>
              occurrence.ruleId !== ruleId || occurrence.status !== "pending",
          )
          .map((occurrence) =>
            occurrence.ruleId === ruleId
              ? {
                  ...occurrence,
                  ruleId: null,
                  updatedAt: new Date().toISOString(),
                }
              : occurrence,
          ),
      });
    },
    [commit],
  );

  const saveOverallBudget = useCallback(
    async (
      year: number,
      month: number,
      overallLimitPaise: number | undefined,
    ): Promise<boolean> => {
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
          error instanceof Error
            ? error.message
            : "The budget could not be saved.",
        );
        return false;
      }
    },
    [commit, reportMutationError],
  );

  const saveCategoryBudget = useCallback(
    async (
      year: number,
      month: number,
      categoryId: string,
      amountPaise: number,
    ): Promise<boolean> => {
      const current = dataRef.current;
      if (!current) return false;
      if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
        reportMutationError("Enter a category budget greater than ₹0.");
        return false;
      }
      if (
        !current.categories.some(
          (category) =>
            category.id === categoryId && category.type === "expense",
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
        const allocation: CategoryBudgetAllocation = {
          categoryId,
          amountPaise,
        };
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
    async (
      year: number,
      month: number,
      categoryId: string,
    ): Promise<boolean> => {
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
    async (year: number, month: number): Promise<boolean> => {
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
    async (budgetId: string): Promise<boolean> => {
      const current = dataRef.current;
      if (
        !current ||
        !current.budgets.some((budget) => budget.id === budgetId)
      ) {
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
    async (
      occurrenceId: string,
      input: { amountPaise: number; date: string },
    ): Promise<boolean> => {
      const current = dataRef.current;
      if (!current) return false;
      try {
        return commit(updatePendingOccurrence(current, occurrenceId, input));
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
    async (
      occurrenceId: string,
      status: "confirmed" | "skipped",
    ): Promise<boolean> => {
      const current = dataRef.current;
      if (!current) return false;
      try {
        const next = settleOccurrenceInData(current, occurrenceId, status);
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
    async (name: string, type: TransactionType): Promise<Category> => {
      const current = dataRef.current;
      if (!current) {
        throw new Error("Finance data is still loading.");
      }
      const category = createCategory(name, current.categories, type);
      if (
        !(await commit({
          ...current,
          categories: [...current.categories, category],
          rules: current.rules ?? defaultCategoryRules,
        }))
      ) {
        throw new Error("The new category could not be saved.");
      }
      return category;
    },
    [commit],
  );

  const addCategorizationRule = useCallback(
    async (input: CategoryRuleInput): Promise<boolean> => {
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
    async (ruleId: string, input: CategoryRuleInput): Promise<boolean> => {
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
            error instanceof Error
              ? error.message
              : "Rule could not be changed.",
        }));
        return false;
      }
    },
    [commit],
  );

  const deleteCategorizationRule = useCallback(
    async (ruleId: string): Promise<boolean> => {
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
            error instanceof Error
              ? error.message
              : "Rule could not be removed.",
        }));
        return false;
      }
    },
    [commit],
  );

  const editCategory = useCallback(
    async (categoryId: string, name: string): Promise<boolean> => {
      const current = dataRef.current;
      if (!current) return false;
      try {
        const categories = renameCategory(current.categories, categoryId, name);
        return commit({ ...current, categories });
      } catch (error) {
        setState((previous) => ({
          ...previous,
          error:
            error instanceof Error
              ? error.message
              : "Category could not be changed.",
        }));
        return false;
      }
    },
    [commit],
  );

  const resetDemoData = useCallback(async (): Promise<boolean> => {
    try {
      const preferences = dataRef.current?.preferences ?? {
        defaultCurrency: "INR",
        dateFormat: "DD/MM/YYYY" as const,
        hideBalances: false,
      };
      const samplePreferences = {
        ...preferences,
        defaultCurrency: "INR",
      };
      if (!localModeRef.current) {
        return await commit({
          ...getDemoFinanceData(),
          preferences: samplePreferences,
        });
      }
      const data = resetFinanceData(samplePreferences);
      dataRef.current = data;
      setState((current) => ({
        ...current,
        data,
        isLoading: false,
        isSaving: false,
        error: null,
      }));
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
  }, [commit]);

  const clearAllData = useCallback(async (): Promise<boolean> => {
    try {
      const preferences = dataRef.current?.preferences ?? {
        defaultCurrency: "INR",
        dateFormat: "DD/MM/YYYY" as const,
        hideBalances: false,
      };
      if (!localModeRef.current) {
        return await commit({ ...cloneDefaultFinanceData(), preferences });
      }
      const data = clearFinanceData(preferences);
      dataRef.current = data;
      setState((current) => ({
        ...current,
        data,
        isLoading: false,
        isSaving: false,
        error: null,
      }));
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
  }, [commit]);

  const restoreData = useCallback(
    (data: FinanceData): Promise<boolean> => commit(data),
    [commit],
  );

  const updatePreferences = useCallback(
    async (preferences: FinancePreferences): Promise<boolean> => {
      const current = dataRef.current;
      if (!current) return false;
      return commit({ ...current, preferences });
    },
    [commit],
  );

  const changeDefaultCurrency = useCallback(
    async (
      currency: string,
      preserveOriginalAmounts: boolean,
      onProgress: (completed: number, total: number) => void,
    ): Promise<boolean> => {
      const current = dataRef.current;
      if (!current) return false;
      const previousCurrency = current.preferences?.defaultCurrency ?? "INR";
      try {
        const converted = await convertFinanceDataCurrency(current, {
          fromCurrency: previousCurrency,
          toCurrency: currency,
          preserveOriginalAmounts,
          onProgress,
        });
        if (dataRef.current !== current) {
          throw new Error(
            "Finance data changed while rates were being prepared. Nothing was converted; retry the change.",
          );
        }
        return commit(converted);
      } catch (error) {
        setState((state) => ({
          ...state,
          error:
            error instanceof Error
              ? `Currency change was not saved: ${error.message}`
              : "Currency change was not saved. Retry when you are online.",
        }));
        return false;
      }
    },
    [commit],
  );

  return {
    ...state,
    reloadData,
    migrateLocalData,
    clearLocalMigrationCopy,
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
    updatePreferences,
    changeDefaultCurrency,
  };
}
