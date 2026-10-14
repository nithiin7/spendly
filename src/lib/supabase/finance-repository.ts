import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Category,
  CategoryRule,
  FinanceData,
  MonthlyBudget,
  RecurringOccurrence,
  RecurringRule,
  Transaction,
} from "@/types/finance";
import type { Database } from "@/types/supabase";
import type { FinanceRepository } from "@/lib/finance-repository";
import { isFinanceData } from "../finance-utils.ts";

type FinanceClient = SupabaseClient<Database>;
type RecordWithId = { id: string };

function databaseError(
  error: { message: string } | null,
  action: string,
): void {
  if (error) {
    throw new Error(
      `${action} failed. Check your connection and retry. Your data was not reported as saved.`,
    );
  }
}

function requireRow<T>(data: T | null, action: string): T {
  if (!data) throw new Error(`${action} returned no saved record.`);
  return data;
}

function ensureSafeAmount(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Cloud data contains an invalid ${label} amount.`);
  }
  return value;
}

function optionalSafeAmount(
  value: number | null | undefined,
  label: string,
): number | undefined {
  if (value === null || value === undefined) return undefined;
  return ensureSafeAmount(value, label);
}

function hasChanged<T>(previous: T, next: T): boolean {
  return JSON.stringify(previous) !== JSON.stringify(next);
}

function changedRecords<T extends RecordWithId>(
  previous: T[],
  next: T[],
): { added: T[]; updated: { previous: T; next: T }[]; deleted: T[] } {
  const previousById = new Map(previous.map((record) => [record.id, record]));
  const nextById = new Map(next.map((record) => [record.id, record]));
  return {
    added: next.filter((record) => !previousById.has(record.id)),
    updated: next.flatMap((record) => {
      const existing = previousById.get(record.id);
      return existing && hasChanged(existing, record)
        ? [{ previous: existing, next: record }]
        : [];
    }),
    deleted: previous.filter((record) => !nextById.has(record.id)),
  };
}

export class SupabaseFinanceRepository implements FinanceRepository {
  private readonly versions = new Map<string, string>();
  private readonly client: FinanceClient;
  private readonly userId: string;

  constructor(client: FinanceClient, userId: string) {
    this.client = client;
    this.userId = userId;
  }

  async hasCompletedMigration(migrationId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("finance_migrations")
      .select("migration_id")
      .eq("user_id", this.userId)
      .eq("migration_id", migrationId)
      .maybeSingle();
    databaseError(error, "Checking local-data migration status");
    return data !== null;
  }

  async recordCompletedMigration(
    migrationId: string,
    entityCounts: Record<string, number>,
  ): Promise<void> {
    const { error } = await this.client.from("finance_migrations").insert({
      user_id: this.userId,
      migration_id: migrationId,
      entity_counts: entityCounts,
    });
    databaseError(error, "Recording local-data migration");
  }

  private versionKey(table: string, id: string): string {
    return `${table}:${id}`;
  }

  private rememberVersion(table: string, id: string, updatedAt: string): void {
    this.versions.set(this.versionKey(table, id), updatedAt);
  }

  private expectedVersion(table: string, id: string): string {
    const version = this.versions.get(this.versionKey(table, id));
    if (!version) {
      throw new Error(
        "This record has no cloud version. Reload your finance data before retrying.",
      );
    }
    return version;
  }

  private async insertCategory(record: Category): Promise<void> {
    const { data, error } = await this.client
      .from("categories")
      .insert({
        id: record.id,
        user_id: this.userId,
        name: record.name,
        color: record.color,
        is_default: record.isDefault,
        type: record.type,
        is_fallback: record.isFallback,
      })
      .select("updated_at")
      .single();
    databaseError(error, "Saving category");
    this.rememberVersion(
      "categories",
      record.id,
      requireRow(data, "Saving category").updated_at,
    );
  }

  private async updateCategory(
    previous: Category,
    record: Category,
  ): Promise<void> {
    const { data, error } = await this.client
      .from("categories")
      .update({
        name: record.name,
        color: record.color,
        is_default: record.isDefault,
        type: record.type,
        is_fallback: record.isFallback,
      })
      .eq("user_id", this.userId)
      .eq("id", record.id)
      .eq("updated_at", this.expectedVersion("categories", previous.id))
      .select("updated_at")
      .maybeSingle();
    databaseError(error, "Updating category");
    if (!data) throw new Error("This category changed in another session. Reload and retry.");
    this.rememberVersion("categories", record.id, data.updated_at);
  }

  private async insertRule(record: CategoryRule): Promise<void> {
    const { data, error } = await this.client
      .from("category_rules")
      .insert({
        id: record.id,
        user_id: this.userId,
        category_id: record.categoryId,
        keywords: record.keywords,
        priority: record.priority,
        is_default: record.isDefault,
      })
      .select("updated_at")
      .single();
    databaseError(error, "Saving categorization rule");
    this.rememberVersion(
      "category_rules",
      record.id,
      requireRow(data, "Saving categorization rule").updated_at,
    );
  }

  private async updateRule(
    previous: CategoryRule,
    record: CategoryRule,
  ): Promise<void> {
    const { data, error } = await this.client
      .from("category_rules")
      .update({
        category_id: record.categoryId,
        keywords: record.keywords,
        priority: record.priority,
        is_default: record.isDefault,
      })
      .eq("user_id", this.userId)
      .eq("id", record.id)
      .eq("updated_at", this.expectedVersion("category_rules", previous.id))
      .select("updated_at")
      .maybeSingle();
    databaseError(error, "Updating categorization rule");
    if (!data) throw new Error("This rule changed in another session. Reload and retry.");
    this.rememberVersion("category_rules", record.id, data.updated_at);
  }

  private transactionFields(record: Transaction) {
    return {
      type: record.type,
      description: record.description,
      amount_paise: record.amountPaise,
      category_id: record.categoryId,
      category_source: record.categorySource ?? "manual",
      date: record.date,
      payment_method: record.paymentMethod ?? null,
      notes: record.notes ?? null,
      original_amount_paise: record.originalAmountPaise ?? null,
      original_currency: record.originalCurrency ?? null,
      exchange_rate_date: record.exchangeRateDate ?? null,
      updated_at: record.updatedAt,
    };
  }

  private async insertTransaction(record: Transaction): Promise<void> {
    const { data, error } = await this.client
      .from("transactions")
      .insert({
        ...this.transactionFields(record),
        id: record.id,
        user_id: this.userId,
        created_at: record.createdAt,
      })
      .select("updated_at")
      .single();
    databaseError(error, "Saving transaction");
    this.rememberVersion(
      "transactions",
      record.id,
      requireRow(data, "Saving transaction").updated_at,
    );
  }

  private async updateTransaction(
    previous: Transaction,
    record: Transaction,
  ): Promise<void> {
    const { data, error } = await this.client
      .from("transactions")
      .update(this.transactionFields(record))
      .eq("user_id", this.userId)
      .eq("id", record.id)
      .eq("updated_at", this.expectedVersion("transactions", previous.id))
      .select("updated_at")
      .maybeSingle();
    databaseError(error, "Updating transaction");
    if (!data) {
      throw new Error("This transaction changed in another session. Reload and retry.");
    }
    this.rememberVersion("transactions", record.id, data.updated_at);
  }

  private recurringRuleFields(record: RecurringRule) {
    return {
      description: record.description,
      type: record.type,
      amount_paise: record.amountPaise,
      category_id: record.categoryId,
      frequency: record.frequency,
      interval: record.interval ?? null,
      start_date: record.startDate,
      next_due_date: record.nextDueDate,
      end_date: record.endDate ?? null,
      active: record.active,
      notes: record.notes ?? null,
      original_amount_paise: record.originalAmountPaise ?? null,
      original_currency: record.originalCurrency ?? null,
      exchange_rate_date: record.exchangeRateDate ?? null,
      updated_at: record.updatedAt,
    };
  }

  private async insertRecurringRule(record: RecurringRule): Promise<void> {
    const { data, error } = await this.client
      .from("recurring_rules")
      .insert({
        ...this.recurringRuleFields(record),
        id: record.id,
        user_id: this.userId,
        created_at: record.createdAt,
      })
      .select("updated_at")
      .single();
    databaseError(error, "Saving recurring rule");
    this.rememberVersion(
      "recurring_rules",
      record.id,
      requireRow(data, "Saving recurring rule").updated_at,
    );
  }

  private async updateRecurringRule(
    previous: RecurringRule,
    record: RecurringRule,
  ): Promise<void> {
    const { data, error } = await this.client
      .from("recurring_rules")
      .update(this.recurringRuleFields(record))
      .eq("user_id", this.userId)
      .eq("id", record.id)
      .eq("updated_at", this.expectedVersion("recurring_rules", previous.id))
      .select("updated_at")
      .maybeSingle();
    databaseError(error, "Updating recurring rule");
    if (!data) throw new Error("This recurring rule changed in another session. Reload and retry.");
    this.rememberVersion("recurring_rules", record.id, data.updated_at);
  }

  private recurringOccurrenceFields(record: RecurringOccurrence) {
    return {
      rule_id: record.ruleId,
      scheduled_date: record.scheduledDate,
      date: record.date,
      description: record.description,
      type: record.type,
      amount_paise: record.amountPaise,
      category_id: record.categoryId,
      status: record.status,
      transaction_id: record.transactionId ?? null,
      original_amount_paise: record.originalAmountPaise ?? null,
      original_currency: record.originalCurrency ?? null,
      exchange_rate_date: record.exchangeRateDate ?? null,
      updated_at: record.updatedAt,
    };
  }

  private async insertOccurrence(record: RecurringOccurrence): Promise<void> {
    const { data, error } = await this.client
      .from("recurring_occurrences")
      .insert({
        ...this.recurringOccurrenceFields(record),
        id: record.id,
        user_id: this.userId,
        created_at: record.createdAt,
      })
      .select("updated_at")
      .single();
    databaseError(error, "Saving recurring occurrence");
    this.rememberVersion(
      "recurring_occurrences",
      record.id,
      requireRow(data, "Saving recurring occurrence").updated_at,
    );
  }

  private async updateOccurrence(
    previous: RecurringOccurrence,
    record: RecurringOccurrence,
  ): Promise<void> {
    const { data, error } = await this.client
      .from("recurring_occurrences")
      .update(this.recurringOccurrenceFields(record))
      .eq("user_id", this.userId)
      .eq("id", record.id)
      .eq(
        "updated_at",
        this.expectedVersion("recurring_occurrences", previous.id),
      )
      .select("updated_at")
      .maybeSingle();
    databaseError(error, "Updating recurring occurrence");
    if (!data) {
      throw new Error("This scheduled item changed in another session. Reload and retry.");
    }
    this.rememberVersion("recurring_occurrences", record.id, data.updated_at);
  }

  private monthlyBudgetFields(record: MonthlyBudget) {
    return {
      year: record.year,
      month: record.month,
      overall_limit_paise: record.overallLimitPaise ?? null,
      original_overall_limit_paise: record.originalOverallLimitPaise ?? null,
      original_currency: record.originalCurrency ?? null,
      exchange_rate_date: record.exchangeRateDate ?? null,
      updated_at: record.updatedAt,
    };
  }

  private async insertBudget(record: MonthlyBudget): Promise<void> {
    const { data, error } = await this.client
      .from("monthly_budgets")
      .insert({
        ...this.monthlyBudgetFields(record),
        id: record.id,
        user_id: this.userId,
        created_at: record.createdAt,
      })
      .select("updated_at")
      .single();
    databaseError(error, "Saving monthly budget");
    this.rememberVersion(
      "monthly_budgets",
      record.id,
      requireRow(data, "Saving monthly budget").updated_at,
    );
  }

  private async updateBudget(
    previous: MonthlyBudget,
    record: MonthlyBudget,
  ): Promise<void> {
    const { data, error } = await this.client
      .from("monthly_budgets")
      .update(this.monthlyBudgetFields(record))
      .eq("user_id", this.userId)
      .eq("id", record.id)
      .eq("updated_at", this.expectedVersion("monthly_budgets", previous.id))
      .select("updated_at")
      .maybeSingle();
    databaseError(error, "Updating monthly budget");
    if (!data) throw new Error("This monthly budget changed in another session. Reload and retry.");
    this.rememberVersion("monthly_budgets", record.id, data.updated_at);
  }

  private async syncCollection<T extends RecordWithId>(
    changes: ReturnType<typeof changedRecords<T>>,
    insert: (record: T) => Promise<void>,
    update: (previous: T, record: T) => Promise<void>,
  ): Promise<void> {
    for (const record of changes.added) await insert(record);
    for (const { previous, next } of changes.updated) {
      await update(previous, next);
    }
  }

  private async deleteOwnedRecord(
    table:
      | "categories"
      | "category_rules"
      | "transactions"
      | "recurring_rules"
      | "recurring_occurrences"
      | "monthly_budgets",
    id: string,
  ): Promise<void> {
    const { data, error } = await this.client
      .from(table)
      .delete()
      .eq("user_id", this.userId)
      .eq("id", id)
      .eq("updated_at", this.expectedVersion(table, id))
      .select("id")
      .maybeSingle();
    databaseError(error, `Deleting ${table.replaceAll("_", " ")}`);
    if (!data) {
      throw new Error("This record changed in another session. Reload and retry.");
    }
    this.versions.delete(this.versionKey(table, id));
  }

  private async persistCurrencyConversion(
    previous: FinanceData,
    next: FinanceData,
  ): Promise<void> {
    if (!next.preferences) {
      throw new Error("Currency preferences are missing. Reload and retry.");
    }
    if (
      JSON.stringify(previous.categories) !== JSON.stringify(next.categories) ||
      JSON.stringify(previous.rules) !== JSON.stringify(next.rules) ||
      previous.transactions.length !== next.transactions.length ||
      previous.recurringRules.length !== next.recurringRules.length ||
      previous.recurringOccurrences.length !== next.recurringOccurrences.length ||
      previous.budgets.length !== next.budgets.length
    ) {
      throw new Error("Finance data changed during currency conversion. Reload and retry.");
    }
    const previousTransactions = new Map(
      previous.transactions.map((record) => [record.id, record]),
    );
    const previousRules = new Map(
      previous.recurringRules.map((record) => [record.id, record]),
    );
    const previousOccurrences = new Map(
      previous.recurringOccurrences.map((record) => [record.id, record]),
    );
    const previousBudgets = new Map(previous.budgets.map((record) => [record.id, record]));
    const changes = {
      transactions: next.transactions.map((record) => {
        const old = previousTransactions.get(record.id);
        if (!old) throw new Error("Finance records changed. Reload and retry.");
        return {
          id: record.id,
          expected_updated_at: old.updatedAt,
          amount_paise: record.amountPaise,
          original_amount_paise: record.originalAmountPaise ?? null,
          original_currency: record.originalCurrency ?? null,
          exchange_rate_date: record.exchangeRateDate ?? null,
        };
      }),
      recurring_rules: next.recurringRules.map((record) => {
        const old = previousRules.get(record.id);
        if (!old) throw new Error("Finance records changed. Reload and retry.");
        return {
          id: record.id,
          expected_updated_at: old.updatedAt,
          amount_paise: record.amountPaise,
          original_amount_paise: record.originalAmountPaise ?? null,
          original_currency: record.originalCurrency ?? null,
          exchange_rate_date: record.exchangeRateDate ?? null,
        };
      }),
      recurring_occurrences: next.recurringOccurrences.map((record) => {
        const old = previousOccurrences.get(record.id);
        if (!old) throw new Error("Finance records changed. Reload and retry.");
        return {
          id: record.id,
          expected_updated_at: old.updatedAt,
          amount_paise: record.amountPaise,
          original_amount_paise: record.originalAmountPaise ?? null,
          original_currency: record.originalCurrency ?? null,
          exchange_rate_date: record.exchangeRateDate ?? null,
        };
      }),
      monthly_budgets: next.budgets.map((record) => {
        const old = previousBudgets.get(record.id);
        if (!old) throw new Error("Finance records changed. Reload and retry.");
        return {
          id: record.id,
          expected_updated_at: old.updatedAt,
          overall_limit_paise: record.overallLimitPaise ?? null,
          original_overall_limit_paise: record.originalOverallLimitPaise ?? null,
          original_currency: record.originalCurrency ?? null,
          exchange_rate_date: record.exchangeRateDate ?? null,
        };
      }),
      budget_allocations: next.budgets.flatMap((budget) => {
        const oldBudget = previousBudgets.get(budget.id);
        if (!oldBudget) throw new Error("Finance records changed. Reload and retry.");
        const oldByCategory = new Map(
          oldBudget.allocations.map((allocation) => [
            allocation.categoryId,
            allocation,
          ]),
        );
        return budget.allocations.map((allocation) => {
          const old = oldByCategory.get(allocation.categoryId);
          if (!old) throw new Error("Finance records changed. Reload and retry.");
          return {
            budget_id: budget.id,
            category_id: allocation.categoryId,
            expected_amount_paise: old.amountPaise,
            amount_paise: allocation.amountPaise,
            original_amount_paise: allocation.originalAmountPaise ?? null,
            original_currency: allocation.originalCurrency ?? null,
            exchange_rate_date: allocation.exchangeRateDate ?? null,
          };
        });
      }),
      preferences: {
        default_currency: next.preferences.defaultCurrency,
        date_format: next.preferences.dateFormat,
        hide_balances: next.preferences.hideBalances,
      },
    };
    if (
      changes.budget_allocations.length !==
      previous.budgets.reduce(
        (total, budget) => total + budget.allocations.length,
        0,
      )
    ) {
      throw new Error("Finance records changed. Reload and retry.");
    }
    const { error } = await this.client.rpc("apply_currency_conversion", {
      p_changes: changes,
    });
    databaseError(error, "Converting saved amounts");
    await this.loadFinanceData();
  }

  private async loadRows() {
    const [
      categoryRequest,
      ruleRequest,
      transactionRequest,
      recurringRuleRequest,
      occurrenceRequest,
      budgetRequest,
      allocationRequest,
      preferencesRequest,
    ] = await Promise.all([
      this.client.from("categories").select("*").eq("user_id", this.userId),
      this.client.from("category_rules").select("*").eq("user_id", this.userId),
      this.client.from("transactions").select("*").eq("user_id", this.userId),
      this.client.from("recurring_rules").select("*").eq("user_id", this.userId),
      this.client.from("recurring_occurrences").select("*").eq("user_id", this.userId),
      this.client.from("monthly_budgets").select("*").eq("user_id", this.userId),
      this.client.from("budget_allocations").select("*").eq("user_id", this.userId),
      this.client.from("user_preferences").select("*").eq("user_id", this.userId).maybeSingle(),
    ]);
    databaseError(categoryRequest.error, "Loading cloud finance data");
    databaseError(ruleRequest.error, "Loading cloud finance data");
    databaseError(transactionRequest.error, "Loading cloud finance data");
    databaseError(recurringRuleRequest.error, "Loading cloud finance data");
    databaseError(occurrenceRequest.error, "Loading cloud finance data");
    databaseError(budgetRequest.error, "Loading cloud finance data");
    databaseError(allocationRequest.error, "Loading cloud finance data");
    databaseError(preferencesRequest.error, "Loading cloud finance preferences");
    return {
      categories: categoryRequest.data ?? [],
      rules: ruleRequest.data ?? [],
      transactions: transactionRequest.data ?? [],
      recurringRules: recurringRuleRequest.data ?? [],
      recurringOccurrences: occurrenceRequest.data ?? [],
      budgets: budgetRequest.data ?? [],
      allocations: allocationRequest.data ?? [],
      preferences: preferencesRequest.data,
    };
  }

  async loadFinanceData(): Promise<FinanceData> {
    const rows = await this.loadRows();
    this.versions.clear();
    for (const [table, records] of [
      ["categories", rows.categories],
      ["category_rules", rows.rules],
      ["transactions", rows.transactions],
      ["recurring_rules", rows.recurringRules],
      ["recurring_occurrences", rows.recurringOccurrences],
      ["monthly_budgets", rows.budgets],
    ] as const) {
      for (const record of records) {
        this.rememberVersion(table, record.id, record.updated_at);
      }
    }

    const allocationMap = new Map<string, MonthlyBudget["allocations"]>();
    for (const row of rows.allocations) {
      const allocations = allocationMap.get(row.budget_id) ?? [];
      allocations.push({
        categoryId: row.category_id,
        amountPaise: ensureSafeAmount(row.amount_paise, "budget allocation"),
        ...(optionalSafeAmount(row.original_amount_paise, "budget allocation original") !== undefined
          ? { originalAmountPaise: optionalSafeAmount(row.original_amount_paise, "budget allocation original") }
          : {}),
        ...(row.original_currency ? { originalCurrency: row.original_currency } : {}),
        ...(row.exchange_rate_date ? { exchangeRateDate: row.exchange_rate_date } : {}),
      });
      allocationMap.set(row.budget_id, allocations);
    }

    const data: FinanceData = {
      categories: rows.categories.map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color,
        isDefault: row.is_default,
        type: row.type,
        isFallback: row.is_fallback,
      })),
      preferences: rows.preferences
        ? {
            defaultCurrency: rows.preferences.default_currency,
            dateFormat: rows.preferences.date_format,
            hideBalances: rows.preferences.hide_balances,
          }
        : {
            defaultCurrency: "INR",
            dateFormat: "DD/MM/YYYY",
            hideBalances: false,
          },
      rules: rows.rules.map((row) => ({
        id: row.id,
        categoryId: row.category_id,
        keywords: row.keywords,
        priority: row.priority,
        isDefault: row.is_default,
      })),
      transactions: rows.transactions.map((row) => ({
        id: row.id,
        type: row.type,
        description: row.description,
        amountPaise: ensureSafeAmount(row.amount_paise, "transaction"),
        ...(optionalSafeAmount(row.original_amount_paise, "transaction original") !== undefined
          ? { originalAmountPaise: optionalSafeAmount(row.original_amount_paise, "transaction original") }
          : {}),
        ...(row.original_currency ? { originalCurrency: row.original_currency } : {}),
        ...(row.exchange_rate_date ? { exchangeRateDate: row.exchange_rate_date } : {}),
        categoryId: row.category_id,
        categorySource: row.category_source,
        date: row.date,
        ...(row.payment_method ? { paymentMethod: row.payment_method } : {}),
        ...(row.notes ? { notes: row.notes } : {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      recurringRules: rows.recurringRules.map((row) => ({
        id: row.id,
        description: row.description,
        type: row.type,
        amountPaise: ensureSafeAmount(row.amount_paise, "recurring rule"),
        ...(optionalSafeAmount(row.original_amount_paise, "recurring rule original") !== undefined
          ? { originalAmountPaise: optionalSafeAmount(row.original_amount_paise, "recurring rule original") }
          : {}),
        ...(row.original_currency ? { originalCurrency: row.original_currency } : {}),
        ...(row.exchange_rate_date ? { exchangeRateDate: row.exchange_rate_date } : {}),
        categoryId: row.category_id,
        frequency: row.frequency,
        ...(row.interval !== null ? { interval: row.interval } : {}),
        startDate: row.start_date,
        nextDueDate: row.next_due_date,
        ...(row.end_date ? { endDate: row.end_date } : {}),
        active: row.active,
        ...(row.notes ? { notes: row.notes } : {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      recurringOccurrences: rows.recurringOccurrences.map((row) => ({
        id: row.id,
        ruleId: row.rule_id,
        scheduledDate: row.scheduled_date,
        date: row.date,
        description: row.description,
        type: row.type,
        amountPaise: ensureSafeAmount(row.amount_paise, "recurring occurrence"),
        ...(optionalSafeAmount(row.original_amount_paise, "occurrence original") !== undefined
          ? { originalAmountPaise: optionalSafeAmount(row.original_amount_paise, "occurrence original") }
          : {}),
        ...(row.original_currency ? { originalCurrency: row.original_currency } : {}),
        ...(row.exchange_rate_date ? { exchangeRateDate: row.exchange_rate_date } : {}),
        categoryId: row.category_id,
        status: row.status,
        ...(row.transaction_id ? { transactionId: row.transaction_id } : {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      budgets: rows.budgets.map((row) => ({
        id: row.id,
        year: row.year,
        month: row.month,
        ...(row.overall_limit_paise !== null
          ? { overallLimitPaise: ensureSafeAmount(row.overall_limit_paise, "monthly budget") }
          : {}),
        ...(optionalSafeAmount(row.original_overall_limit_paise, "monthly budget original") !== undefined
          ? { originalOverallLimitPaise: optionalSafeAmount(row.original_overall_limit_paise, "monthly budget original") }
          : {}),
        ...(row.original_currency ? { originalCurrency: row.original_currency } : {}),
        ...(row.exchange_rate_date ? { exchangeRateDate: row.exchange_rate_date } : {}),
        allocations: allocationMap.get(row.id) ?? [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    };
    if (!isFinanceData(data)) {
      throw new Error(
        "Cloud finance data has an invalid record or relationship. Your data was not changed.",
      );
    }
    return data;
  }

  async persistChanges(previous: FinanceData, next: FinanceData): Promise<void> {
    const sameIds = <T extends { id: string }>(before: T[], after: T[]) =>
      before.length === after.length &&
      before.every((record) => after.some((candidate) => candidate.id === record.id));
    const currencyOnlyChange =
      sameIds(previous.categories, next.categories) &&
      sameIds(previous.rules, next.rules) &&
      sameIds(previous.transactions, next.transactions) &&
      sameIds(previous.recurringRules, next.recurringRules) &&
      sameIds(previous.recurringOccurrences, next.recurringOccurrences) &&
      sameIds(previous.budgets, next.budgets) &&
      previous.budgets.every((budget) => {
        const changed = next.budgets.find((item) => item.id === budget.id);
        return (
          changed?.allocations.length === budget.allocations.length &&
          budget.allocations.every((allocation) =>
            changed.allocations.some(
              (item) => item.categoryId === allocation.categoryId,
            ),
          )
        );
      });
    if (
      currencyOnlyChange &&
      previous.preferences?.defaultCurrency !==
      next.preferences?.defaultCurrency
    ) {
      await this.persistCurrencyConversion(previous, next);
      return;
    }
    const categories = changedRecords(previous.categories, next.categories);
    const rules = changedRecords(previous.rules, next.rules);
    const transactions = changedRecords(previous.transactions, next.transactions);
    const recurringRules = changedRecords(previous.recurringRules, next.recurringRules);
    const occurrences = changedRecords(
      previous.recurringOccurrences,
      next.recurringOccurrences,
    );
    const budgets = changedRecords(previous.budgets, next.budgets);

    await this.syncCollection(categories,
      (record) => this.insertCategory(record),
      (oldRecord, record) => this.updateCategory(oldRecord, record));
    await this.syncCollection(recurringRules,
      (record) => this.insertRecurringRule(record),
      (oldRecord, record) => this.updateRecurringRule(oldRecord, record));
    await this.syncCollection(transactions,
      (record) => this.insertTransaction(record),
      (oldRecord, record) => this.updateTransaction(oldRecord, record));
    await this.syncCollection(budgets,
      (record) => this.insertBudget(record),
      (oldRecord, record) => this.updateBudget(oldRecord, record));
    await this.syncCollection(rules,
      (record) => this.insertRule(record),
      (oldRecord, record) => this.updateRule(oldRecord, record));
    await this.syncCollection(occurrences,
      (record) => this.insertOccurrence(record),
      (oldRecord, record) => this.updateOccurrence(oldRecord, record));

    const previousAllocations = previous.budgets.flatMap((budget) =>
      budget.allocations.map((allocation) => ({
        key: `${budget.id}\u0000${allocation.categoryId}`,
        user_id: this.userId,
        budget_id: budget.id,
        category_id: allocation.categoryId,
        category_type: "expense" as const,
        amount_paise: allocation.amountPaise,
        original_amount_paise: allocation.originalAmountPaise ?? null,
        original_currency: allocation.originalCurrency ?? null,
        exchange_rate_date: allocation.exchangeRateDate ?? null,
      })),
    );
    const nextAllocations = next.budgets.flatMap((budget) =>
      budget.allocations.map((allocation) => ({
        key: `${budget.id}\u0000${allocation.categoryId}`,
        user_id: this.userId,
        budget_id: budget.id,
        category_id: allocation.categoryId,
        category_type: "expense" as const,
        amount_paise: allocation.amountPaise,
        original_amount_paise: allocation.originalAmountPaise ?? null,
        original_currency: allocation.originalCurrency ?? null,
        exchange_rate_date: allocation.exchangeRateDate ?? null,
      })),
    );
    const allocationDiff = changedRecords(
      previousAllocations.map(({ key, ...record }) => ({ ...record, id: key })),
      nextAllocations.map(({ key, ...record }) => ({ ...record, id: key })),
    );
    for (const record of allocationDiff.added) {
      const { error } = await this.client.from("budget_allocations").insert({
        user_id: this.userId,
        budget_id: record.budget_id,
        category_id: record.category_id,
        amount_paise: record.amount_paise,
        original_amount_paise: record.original_amount_paise,
        original_currency: record.original_currency,
        exchange_rate_date: record.exchange_rate_date,
      });
      databaseError(error, "Saving category budget");
    }
    for (const { previous: oldRecord, next: record } of allocationDiff.updated) {
      const { data, error } = await this.client
        .from("budget_allocations")
        .update({
          amount_paise: record.amount_paise,
          original_amount_paise: record.original_amount_paise,
          original_currency: record.original_currency,
          exchange_rate_date: record.exchange_rate_date,
        })
        .eq("user_id", this.userId)
        .eq("budget_id", record.budget_id)
        .eq("category_id", record.category_id)
        .eq("amount_paise", oldRecord.amount_paise)
        .select("budget_id")
        .maybeSingle();
      databaseError(error, "Updating category budget");
      if (!data) throw new Error("This category budget changed in another session. Reload and retry.");
    }
    for (const record of allocationDiff.deleted) {
      const { data, error } = await this.client
        .from("budget_allocations")
        .delete()
        .eq("user_id", this.userId)
        .eq("budget_id", record.budget_id)
        .eq("category_id", record.category_id)
        .eq("amount_paise", record.amount_paise)
        .select("budget_id")
        .maybeSingle();
      databaseError(error, "Deleting category budget");
      if (!data) throw new Error("This category budget changed in another session. Reload and retry.");
    }

    for (const record of occurrences.deleted) {
      await this.deleteOwnedRecord("recurring_occurrences", record.id);
    }
    for (const record of transactions.deleted) {
      await this.deleteOwnedRecord("transactions", record.id);
    }
    for (const record of recurringRules.deleted) {
      await this.deleteOwnedRecord("recurring_rules", record.id);
    }
    for (const record of budgets.deleted) {
      await this.deleteOwnedRecord("monthly_budgets", record.id);
    }
    for (const record of rules.deleted) {
      await this.deleteOwnedRecord("category_rules", record.id);
    }
    for (const record of categories.deleted) {
      await this.deleteOwnedRecord("categories", record.id);
    }

    if (hasChanged(previous.preferences, next.preferences) && next.preferences) {
      const { error } = await this.client.from("user_preferences").upsert({
        user_id: this.userId,
        default_currency: next.preferences.defaultCurrency,
        date_format: next.preferences.dateFormat,
        hide_balances: next.preferences.hideBalances,
      });
      databaseError(error, "Saving user preferences");
    }
  }
}
