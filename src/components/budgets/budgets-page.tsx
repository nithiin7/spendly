"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { FinancePageState } from "@/components/finance/finance-page-state";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { Modal } from "@/components/ui/modal";
import { useFinanceData } from "@/hooks/finance-data-provider";
import {
  BUDGET_APPROACHING_THRESHOLD_PERCENT,
  calculateMonthlyBudgetAnalytics,
  copyPreviousMonthAllocations,
} from "@/lib/monthly-budgets";
import { formatRupees, getCurrentMonthKey, parseRupeesToPaise } from "@/lib/finance-utils";

const subscribeToMonthChanges = () => () => {};

type Removal = { kind: "budget" } | { kind: "allocation"; categoryId: string };

function monthLabel(monthKey: string): string {
  return new Date(
    Number(monthKey.slice(0, 4)),
    Number(monthKey.slice(5, 7)) - 1,
    1,
  ).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function percentageLabel(value: number): string {
  return `${value.toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
}

function statusLabel(status: "normal" | "approaching" | "over"): string {
  return status === "over"
    ? "Over budget"
    : status === "approaching"
      ? "Approaching limit"
      : "Within budget";
}

function StatusBanner({
  status,
  message,
}: {
  status: "normal" | "approaching" | "over";
  message: string;
}) {
  const classes =
    status === "over"
      ? "border-red-200 bg-red-50 text-red-800"
      : status === "approaching"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-sage-200 bg-sage-100 text-forest-800";
  const Icon = status === "normal" ? CheckCircle2 : AlertTriangle;
  return (
    <p className={`flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm ${classes}`}>
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

function ProgressBar({
  label,
  spentPaise,
  budgetPaise,
  utilizationPercent,
  status,
}: {
  label: string;
  spentPaise: number;
  budgetPaise: number;
  utilizationPercent: number;
  status: "normal" | "approaching" | "over";
}) {
  const width = Math.min(100, Math.max(0, utilizationPercent));
  const barColor =
    status === "over"
      ? "bg-red-600"
      : status === "approaching"
        ? "bg-amber-500"
        : "bg-forest-700";
  return (
    <div
      aria-label={`${label}: ${percentageLabel(utilizationPercent)} used`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={width}
      aria-valuetext={`${percentageLabel(utilizationPercent)} used`}
      className="h-2 overflow-hidden rounded-full bg-canvas"
      role="progressbar"
    >
      <div className={`h-full rounded-full transition-[width] ${barColor}`} style={{ width: `${width}%` }} />
      <span className="sr-only">
        {formatRupees(spentPaise)} spent of {formatRupees(budgetPaise)}
      </span>
    </div>
  );
}

export function BudgetsPage() {
  const finance = useFinanceData();
  const currentMonth = useSyncExternalStore(
    subscribeToMonthChanges,
    getCurrentMonthKey,
    () => "",
  );
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [overallDraft, setOverallDraft] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [categoryAmount, setCategoryAmount] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [removal, setRemoval] = useState<Removal | null>(null);

  const monthKey = selectedMonth || currentMonth;
  const [yearString, monthString] = monthKey.split("-");
  const year = Number(yearString);
  const month = Number(monthString);
  const budget = finance.data?.budgets.find(
    (item) => item.year === year && item.month === month,
  );

  const overallAmount =
    overallDraft ??
    (budget?.overallLimitPaise === undefined
      ? ""
      : (budget.overallLimitPaise / 100).toFixed(2));

  if (!finance.data) {
    return (
      <FinancePageState error={finance.error} isLoading={finance.isLoading} />
    );
  }
  if (!monthKey) return <FinancePageState error={null} isLoading />;

  const { categories, transactions, budgets } = finance.data;
  const analytics = calculateMonthlyBudgetAnalytics(
    transactions,
    categories,
    budget,
    monthKey,
  );
  const existingCategoryIds = new Set(
    (budget?.allocations ?? []).map((item) => item.categoryId),
  );
  const availableCategories = categories.filter(
    (category) =>
      category.type === "expense" &&
      (!existingCategoryIds.has(category.id) ||
        category.id === editingCategoryId),
  );
  const priorAllocations = copyPreviousMonthAllocations(budgets, year, month);
  const budgetedCategories = [...(budget?.allocations ?? [])]
    .map((allocation) => ({
      allocation,
      category: categories.find((item) => item.id === allocation.categoryId),
      analysis: analytics.categories.find(
        (item) => item.categoryId === allocation.categoryId,
      ),
    }))
    .sort(
      (left, right) =>
        (right.analysis?.spentPaise ?? 0) - (left.analysis?.spentPaise ?? 0),
    );

  async function createBudget() {
    if (await finance.saveOverallBudget(year, month, undefined)) {
      setFormError(null);
    }
  }

  async function saveOverall(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let amount: number | undefined;
    if (overallAmount.trim()) {
      const parsedAmount = parseRupeesToPaise(overallAmount);
      if (parsedAmount === null) {
        setFormError("Enter a valid amount greater than ₹0.");
        return;
      }
      amount = parsedAmount;
    }
    if (await finance.saveOverallBudget(year, month, amount)) {
      setOverallDraft(null);
      setFormError(null);
    }
  }

  async function saveAllocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = parseRupeesToPaise(categoryAmount);
    if (!amount) {
      setFormError("Enter a valid category budget greater than ₹0.");
      return;
    }
    const selectedCategoryId = editingCategoryId ?? categoryId;
    if (!selectedCategoryId) {
      setFormError("Choose an expense category.");
      return;
    }
    if (await finance.saveCategoryBudget(year, month, selectedCategoryId, amount)) {
      setCategoryAmount("");
      setCategoryId("");
      setEditingCategoryId(null);
      setFormError(null);
    }
  }

  async function confirmRemoval() {
    if (removal?.kind === "budget" && budget) {
      if (!(await finance.deleteMonthlyBudget(budget.id))) return;
    } else if (removal?.kind === "allocation") {
      if (!(await finance.removeCategoryBudget(year, month, removal.categoryId))) return;
    }
    setRemoval(null);
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-ink">
            Monthly budgets
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            Set a monthly spending limit and optional limits for your existing
            expense categories. Only confirmed expenses count toward actuals.
          </p>
        </div>
        <label className="w-full sm:w-auto">
          <span className="sr-only">Select budget month</span>
          <CalendarPicker
            className="form-input sm:w-auto"
            mode="month"
            onChange={(month) => {
              setSelectedMonth(month);
              setOverallDraft(null);
              setEditingCategoryId(null);
              setCategoryId("");
              setCategoryAmount("");
              setFormError(null);
            }}
            value={monthKey}
          />
        </label>
      </div>

      {finance.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {finance.error}
        </p>
      )}
      {formError && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {formError}
        </p>
      )}

      <section
        aria-label={`${monthLabel(monthKey)} budget overview`}
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard label="Actual expenses" value={formatRupees(analytics.expensePaise)} />
        <MetricCard
          label="Overall budget"
          value={
            analytics.overall
              ? formatRupees(analytics.overall.budgetPaise)
              : "Not set"
          }
        />
        <MetricCard
          label="Remaining overall"
          value={
            analytics.overall
              ? formatRupees(analytics.overall.remainingPaise)
              : "—"
          }
          negative={Boolean(
            analytics.overall && analytics.overall.remainingPaise < 0,
          )}
        />
        <MetricCard
          label="Budgeted categories over limit"
          value={String(analytics.overBudgetCategoryCount)}
          negative={analytics.overBudgetCategoryCount > 0}
        />
      </section>

      {analytics.overall && (
        <section className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-ink">Overall monthly limit</h3>
              <p className="mt-1 text-sm text-muted">
                {formatRupees(analytics.overall.spentPaise)} of{" "}
                {formatRupees(analytics.overall.budgetPaise)} spent ·{" "}
                {percentageLabel(analytics.overall.utilizationPercent)} used
              </p>
            </div>
            <span className="rounded-full bg-canvas px-3 py-1 text-xs font-medium text-ink">
              {statusLabel(analytics.overall.status)}
            </span>
          </div>
          <div className="mt-4">
            <ProgressBar
              budgetPaise={analytics.overall.budgetPaise}
              label="Overall budget"
              spentPaise={analytics.overall.spentPaise}
              status={analytics.overall.status}
              utilizationPercent={analytics.overall.utilizationPercent}
            />
          </div>
          <p className="mt-3 text-sm text-muted">
            {analytics.overall.status === "over"
              ? `${formatRupees(Math.abs(analytics.overall.remainingPaise))} over budget.`
              : `${formatRupees(analytics.overall.remainingPaise)} remaining.`}
          </p>
          <StatusBanner
            status={analytics.overall.status}
            message={
              analytics.overall.status === "over"
                ? "Your confirmed expenses are above this month's overall limit."
                : analytics.overall.status === "approaching"
                  ? `You have used at least ${BUDGET_APPROACHING_THRESHOLD_PERCENT}% of this month's overall limit.`
                  : "Your spending is comfortably within this month's overall limit."
            }
          />
        </section>
      )}

      <section
        aria-labelledby="budget-management-heading"
        className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3
              className="text-base font-semibold text-ink"
              id="budget-management-heading"
            >
              Manage {monthLabel(monthKey)}
            </h3>
            <p className="mt-1 text-sm text-muted">
              Category limits are optional; expenses in other categories still
              count toward total spending.
            </p>
          </div>
          {budget && (
            <button
              className="button-secondary text-red-700 hover:bg-red-50"
              onClick={() => setRemoval({ kind: "budget" })}
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-4" />
              Delete month
            </button>
          )}
        </div>

        {!budget ? (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-canvas/50 px-5 py-7 text-center">
            <h4 className="font-medium text-ink">No budget for this month yet</h4>
            <p className="mx-auto mt-1 max-w-lg text-sm text-muted">
              Create a monthly budget to set an overall limit, add category
              allocations, or both. You can leave any category unbudgeted.
            </p>
            <button className="button-primary mt-4" onClick={createBudget} type="button">
              <Plus aria-hidden="true" className="size-4" />
              Create monthly budget
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            <form
              className="grid gap-3 rounded-xl border border-border bg-canvas/40 p-4 sm:grid-cols-[minmax(0,1fr)_auto]"
              onSubmit={saveOverall}
            >
              <label>
                <span className="mb-1.5 block text-sm font-medium text-ink">
                  Overall monthly spending limit
                </span>
                <span className="relative block">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                    ₹
                  </span>
                  <input
                    className="form-input pl-8"
                    inputMode="decimal"
                    onChange={(event) => setOverallDraft(event.target.value)}
                    placeholder="No overall limit"
                    value={overallAmount}
                  />
                </span>
              </label>
              <div className="flex flex-wrap items-end gap-2">
                <button className="button-primary" type="submit">
                  Save limit
                </button>
                {budget.overallLimitPaise !== undefined && (
                  <button
                    className="button-secondary"
                    onClick={() => {
                      void finance.saveOverallBudget(year, month, undefined).then((saved) => {
                        if (saved) {
                        setOverallDraft(null);
                        setFormError(null);
                        }
                      });
                    }}
                    type="button"
                  >
                    Remove limit
                  </button>
                )}
              </div>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-ink">Category allocations</h4>
                <p className="mt-1 text-sm text-muted">
                  {budget.allocations.length
                    ? `${budget.allocations.length} category ${budget.allocations.length === 1 ? "limit" : "limits"}`
                    : "No category limits set"}
                </p>
              </div>
              <button
                className="button-secondary"
                disabled={!priorAllocations?.length}
                onClick={() =>
                  void finance.copyCategoryBudgets(year, month).then((saved) => {
                    if (saved) setFormError(null);
                  })
                }
                type="button"
              >
                <Copy aria-hidden="true" className="size-4" />
                Copy previous month
              </button>
            </div>

            {budgetedCategories.length > 0 && (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {budgetedCategories.map(({ allocation, category, analysis }) => (
                  <li className="px-4 py-4 sm:px-5" key={allocation.categoryId}>
                    {editingCategoryId === allocation.categoryId ? (
                      <form
                        className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                        onSubmit={saveAllocation}
                      >
                        <label>
                          <span className="mb-1.5 block text-xs font-medium text-muted">
                            {category?.name ?? "Category"} monthly limit
                          </span>
                          <input
                            autoFocus
                            className="form-input"
                            inputMode="decimal"
                            onChange={(event) => setCategoryAmount(event.target.value)}
                            value={categoryAmount}
                          />
                        </label>
                        <div className="flex gap-2">
                          <button className="button-primary" type="submit">Save</button>
                          <button
                            className="button-secondary"
                            onClick={() => {
                              setEditingCategoryId(null);
                              setCategoryAmount("");
                            }}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="size-3 shrink-0 rounded-full"
                            style={{ backgroundColor: category?.color ?? "#7b887f" }}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                            {category?.name ?? "Unknown category"}
                          </span>
                          {analysis?.status && (
                            <span className={`text-xs font-medium ${
                              analysis.status === "over"
                                ? "text-red-700"
                                : analysis.status === "approaching"
                                  ? "text-amber-800"
                                  : "text-forest-800"
                            }`}>
                              {statusLabel(analysis.status)}
                            </span>
                          )}
                          <button
                            aria-label={`Edit ${category?.name ?? "category"} budget`}
                            className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-700"
                            onClick={() => {
                              setEditingCategoryId(allocation.categoryId);
                              setCategoryAmount((allocation.amountPaise / 100).toFixed(2));
                              setFormError(null);
                            }}
                            type="button"
                          >
                            <Pencil aria-hidden="true" className="size-4" />
                          </button>
                          <button
                            aria-label={`Remove ${category?.name ?? "category"} budget`}
                            className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                            onClick={() =>
                              setRemoval({
                                kind: "allocation",
                                categoryId: allocation.categoryId,
                              })
                            }
                            type="button"
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-muted">
                          <span>
                            {formatRupees(analysis?.spentPaise ?? 0)} spent of{" "}
                            {formatRupees(allocation.amountPaise)}
                          </span>
                          <span>
                            {analysis?.remainingPaise !== null &&
                            analysis?.remainingPaise !== undefined
                              ? `${formatRupees(analysis.remainingPaise)} remaining`
                              : "No limit"}
                          </span>
                        </div>
                        {analysis?.budgetPaise && analysis.status && (
                          <div className="mt-2">
                            <ProgressBar
                              budgetPaise={analysis.budgetPaise}
                              label={category?.name ?? "Category"}
                              spentPaise={analysis.spentPaise}
                              status={analysis.status}
                              utilizationPercent={analysis.utilizationPercent ?? 0}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {!editingCategoryId && <form
              className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-[minmax(0,1fr)_minmax(150px,0.7fr)_auto]"
              onSubmit={saveAllocation}
            >
              <label>
                <span className="mb-1.5 block text-sm font-medium text-ink">
                  Expense category
                </span>
                <select
                  className="form-input"
                  disabled={Boolean(editingCategoryId)}
                  onChange={(event) => setCategoryId(event.target.value)}
                  required={!editingCategoryId}
                  value={editingCategoryId ?? categoryId}
                >
                  <option value="">Choose a category</option>
                  {availableCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-sm font-medium text-ink">
                  Monthly limit
                </span>
                <span className="relative block">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                    ₹
                  </span>
                  <input
                    className="form-input pl-8"
                    inputMode="decimal"
                    onChange={(event) => setCategoryAmount(event.target.value)}
                    placeholder="0.00"
                    required
                    value={categoryAmount}
                  />
                </span>
              </label>
              <button
                className="button-primary self-end"
                disabled={!editingCategoryId && availableCategories.length === 0}
                type="submit"
              >
                <Plus aria-hidden="true" className="size-4" />
                Add allocation
              </button>
            </form>}
            {availableCategories.length === 0 && !editingCategoryId && (
              <p className="text-sm text-muted">
                All expense categories have a budget.{" "}
                <Link className="font-medium text-forest-800 underline" href="/categories">
                  Add another expense category
                </Link>{" "}
                if needed.
              </p>
            )}
            {analytics.unbudgetedExpensePaise > 0 && (
              <p className="rounded-xl border border-border bg-canvas/50 px-4 py-3 text-sm text-muted">
                {formatRupees(analytics.unbudgetedExpensePaise)} spent in
                categories without a budget this month. These expenses are
                included in total spending and the overall budget.
              </p>
            )}
          </div>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <CategoryInsights
          categories={analytics.highestSpendingCategories}
          empty="No expenses recorded this month."
          heading="Highest-spending categories"
        />
        <CategoryInsights
          categories={[
            ...analytics.overBudgetCategories,
            ...analytics.approachingCategories,
          ]}
          empty="No budgeted categories are approaching or over their limits."
          heading="Categories to watch"
          showStatus
        />
        <CategoryInsights
          categories={analytics.unbudgetedCategories}
          empty="All spending categories have a budget, or no expenses were recorded."
          heading="Spending without a category budget"
        />
      </section>

      {removal && (
        <Modal
          description={
            removal.kind === "budget"
              ? `This permanently removes the ${monthLabel(monthKey)} budget and all of its category allocations. Transactions will not be changed.`
              : "This removes only this month's category allocation. Transactions and other budget limits will not be changed."
          }
          onClose={() => setRemoval(null)}
          size="small"
          title={removal.kind === "budget" ? "Delete this month's budget?" : "Remove category allocation?"}
        >
          <div className="flex justify-end gap-2 px-5 py-5 sm:px-6">
            <button
              className="button-secondary"
              onClick={() => setRemoval(null)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="button-primary bg-red-800 hover:bg-red-700"
              onClick={confirmRemoval}
              type="button"
            >
              Confirm removal
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  negative = false,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-border bg-white p-5 shadow-card">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${negative ? "text-red-700" : "text-ink"}`}>
        {value}
      </p>
    </article>
  );
}

function CategoryInsights({
  categories,
  heading,
  empty,
  showStatus = false,
}: {
  categories: ReturnType<typeof calculateMonthlyBudgetAnalytics>["categories"];
  heading: string;
  empty: string;
  showStatus?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6">
      <h3 className="font-semibold text-ink">{heading}</h3>
      {categories.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {categories.map((category) => (
            <li className="flex flex-wrap items-center gap-2 py-3" key={category.categoryId}>
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                {category.label}
              </span>
              {showStatus && category.status && (
                <span className="text-xs text-muted">{statusLabel(category.status)}</span>
              )}
              <span className="text-sm font-semibold text-ink">
                {formatRupees(category.spentPaise)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
