"use client";

import { useState, useSyncExternalStore } from "react";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  PiggyBank,
  Wallet,
} from "lucide-react";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { useFinanceData } from "@/hooks/finance-data-provider";
import { Modal } from "@/components/ui/modal";
import Link from "next/link";
import {
  formatRupees,
  getCurrentMonthKey,
  getMonthlyFinancialSummary,
  getSpendingMonths,
} from "@/lib/finance-utils";
import { calculateMonthlyBudgetAnalytics } from "@/lib/monthly-budgets";
import type { TransactionType } from "@/types/finance";

const subscribeToMonthChanges = () => () => {};

function LoadingDashboard() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading your finance data"
      className="space-y-7"
      role="status"
    >
      <div className="h-24 animate-pulse rounded-2xl bg-sage-100" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="h-32 animate-pulse rounded-2xl border border-border bg-white"
            key={index}
          />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl border border-border bg-white" />
    </div>
  );
}

export function FinanceDashboard() {
  const finance = useFinanceData();
  const [resetError, setResetError] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const currentMonth = useSyncExternalStore(
    subscribeToMonthChanges,
    getCurrentMonthKey,
    () => "",
  );
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [quickCreateType, setQuickCreateType] =
    useState<TransactionType | null>(null);

  if (finance.isLoading) return <LoadingDashboard />;

  if (!finance.data) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-lg font-semibold text-ink">
          Your finance data could not be loaded
        </h2>
        <p className="mt-2 text-sm text-muted" role="alert">
          {finance.error ??
            "The browser did not provide access to local storage. Your existing data has not been replaced."}
        </p>
        <p className="mt-3 text-sm text-muted">
          If the saved data is damaged, you can explicitly replace it with the
          Spendly sample data.
        </p>
        <button
          className="button-primary mt-5"
          onClick={() => setConfirmReset(true)}
          type="button"
        >
          Reset to sample data
        </button>
        {resetError && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            Sample data could not be saved to this browser.
          </p>
        )}
        {confirmReset && (
          <Modal
            description="This replaces any saved data with the Spendly sample transactions and default categories."
            onClose={() => setConfirmReset(false)}
            size="small"
            title="Replace saved data?"
          >
            <div className="space-y-4 px-5 py-5 sm:px-6">
              {resetError && (
                <p className="text-sm text-red-700" role="alert">
                  Sample data could not be saved. Your existing stored data was
                  left unchanged.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  className="button-secondary"
                  onClick={() => setConfirmReset(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="button-primary"
                  onClick={() => {
                    if (!finance.resetDemoData()) setResetError(true);
                    else {
                      setResetError(false);
                      setConfirmReset(false);
                    }
                  }}
                  type="button"
                >
                  Replace data
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  const monthKey = selectedMonth ?? currentMonth;
  if (!monthKey) return <LoadingDashboard />;

  const { categories, transactions } = finance.data;
  const summary = getMonthlyFinancialSummary(
    transactions,
    categories,
    monthKey,
  );
  const monthlyBudget = finance.data.budgets.find(
    (item) =>
      item.year === Number(monthKey.slice(0, 4)) &&
      item.month === Number(monthKey.slice(5, 7)),
  );
  const budgetAnalytics = calculateMonthlyBudgetAnalytics(
    transactions,
    categories,
    monthlyBudget,
    monthKey,
  );
  const spendingMonths = getSpendingMonths(transactions, 6, monthKey);
  const selectedMonthLabel = new Date(
    Number(monthKey.slice(0, 4)),
    Number(monthKey.slice(5, 7)) - 1,
    1,
  ).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const savingsRate =
    summary.savingsRate === null
      ? "—"
      : `${summary.savingsRate.toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
  const expenseComparison =
    summary.previousMonth.expensePaise > 0
      ? summary.expenseChangePaise === 0
        ? "Same spending as last month"
        : `${formatRupees(Math.abs(summary.expenseChangePaise))} ${
            summary.expenseChangePaise > 0 ? "more" : "less"
          } than last month`
      : summary.expensePaise > 0
        ? "No expenses last month"
        : "No expenses this month";
  const largestExpenseLabel = summary.largestExpense
    ? `${summary.largestExpense.description} · ${formatRupees(summary.largestExpense.amountPaise)}`
    : "No expenses recorded";

  return (
    <div className="space-y-7" id="overview">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-sage-200 bg-sage-100 px-2.5 py-1 text-[11px] font-semibold text-forest-800">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-positive"
            />
            Private · saved on this device
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.045em] text-ink sm:text-[30px]">
            Your money, in perspective
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            Your financial snapshot for {selectedMonthLabel}.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <label className="sr-only" htmlFor="dashboard-month">
            Select dashboard month
          </label>
          <CalendarPicker
            className="form-input w-full sm:w-auto"
            id="dashboard-month"
            mode="month"
            onChange={setSelectedMonth}
            value={monthKey}
          />
          <button
            className="button-secondary"
            onClick={() => setQuickCreateType("income")}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add income
          </button>
          <button
            className="button-primary"
            onClick={() => setQuickCreateType("expense")}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Add expense
          </button>
        </div>
      </div>

      {finance.error && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {finance.error}
        </p>
      )}

      <section
        aria-label="Monthly financial summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          icon={Wallet}
          label="Remaining balance"
          note="Income minus expenses"
          tone={summary.balancePaise >= 0 ? "positive" : "default"}
          value={formatRupees(summary.balancePaise)}
        />
        <SummaryCard
          icon={ArrowDownToLine}
          label="Total income"
          note="Salary and other income"
          value={formatRupees(summary.incomePaise)}
        />
        <SummaryCard
          icon={ArrowUpFromLine}
          label="Total expenses"
          note="Across all expense categories"
          value={formatRupees(summary.expensePaise)}
        />
        <SummaryCard
          icon={PiggyBank}
          label="Savings rate"
          note={
            summary.incomePaise > 0
              ? "Net savings as a share of income"
              : "Add income to calculate your rate"
          }
          tone={summary.balancePaise >= 0 ? "positive" : "default"}
          value={savingsRate}
        />
      </section>

      <section
        aria-label={`${selectedMonthLabel} budget`}
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5 shadow-card sm:px-6"
      >
        <div>
          <p className="text-sm font-medium text-ink">
            {budgetAnalytics.overall
              ? `${formatRupees(budgetAnalytics.overall.spentPaise)} of ${formatRupees(budgetAnalytics.overall.budgetPaise)} spent against your budget`
              : "Plan your monthly spending"}
          </p>
          <p className="mt-1 text-sm text-muted">
            {budgetAnalytics.overall
              ? `${formatRupees(budgetAnalytics.overall.remainingPaise)} remaining · ${budgetAnalytics.overall.utilizationPercent.toLocaleString("en-IN", { maximumFractionDigits: 1 })}% used`
              : "Review category limits and compare actual expenses"}
          </p>
        </div>
        <Link className="button-secondary" href="/budgets">
          {budgetAnalytics.overall ? "View budget" : "Manage budgets"}
        </Link>
      </section>

      <section
        aria-label="Monthly details and previous month comparison"
        className="grid gap-3 sm:grid-cols-3"
      >
        <article className="rounded-xl border border-border bg-white px-4 py-3.5">
          <p className="text-xs font-medium text-muted">Transactions</p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {summary.transactionCount}
          </p>
        </article>
        <article className="min-w-0 rounded-xl border border-border bg-white px-4 py-3.5">
          <p className="text-xs font-medium text-muted">Largest expense</p>
          <p className="mt-1 truncate text-sm font-semibold text-ink" title={largestExpenseLabel}>
            {largestExpenseLabel}
          </p>
        </article>
        <article className="rounded-xl border border-border bg-white px-4 py-3.5">
          <p className="text-xs font-medium text-muted">Compared with last month</p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {expenseComparison}
          </p>
        </article>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
        <SpendingChart currentMonth={monthKey} months={spendingMonths} />
        <CategoryBreakdown categories={summary.categoryTotals} />
      </div>

      {transactions.length === 0 && (
        <section className="rounded-2xl border border-sage-200 bg-sage-100/70 px-5 py-6 sm:px-7">
          <h2 className="text-base font-semibold text-forest-900">
            Start with your first income or expense
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Add your salary or another income source, then record expenses to
            see your monthly balance and spending patterns. Your entries stay
            in this browser.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="button-secondary"
              onClick={() => setQuickCreateType("income")}
              type="button"
            >
              Add income
            </button>
            <button
              className="button-primary"
              onClick={() => setQuickCreateType("expense")}
              type="button"
            >
              Add expense
            </button>
          </div>
        </section>
      )}

      <RecentTransactions
        categories={categories}
        onAdd={() => setQuickCreateType("expense")}
        transactions={transactions}
      />

      {quickCreateType && (
        <TransactionForm
          categories={categories}
          initialType={quickCreateType}
          onAddCategory={finance.addCustomCategory}
          onClose={() => setQuickCreateType(null)}
          onRenameCategory={finance.editCategory}
          onSave={finance.addTransaction}
          rules={finance.data.rules}
        />
      )}
    </div>
  );
}
