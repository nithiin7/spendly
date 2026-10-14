"use client";

import { useState, useSyncExternalStore } from "react";
import { FinancePageState } from "@/components/finance/finance-page-state";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { useFinanceData } from "@/hooks/finance-data-provider";
import {
  formatRupees,
  getCurrentMonthKey,
  getMonthlyFinancialSummary,
  getPreviousMonthKey,
  getSpendingMonths,
} from "@/lib/finance-utils";

const subscribeToMonthChanges = () => () => {};

export function InsightsPage() {
  const finance = useFinanceData();
  const currentMonth = useSyncExternalStore(
    subscribeToMonthChanges,
    getCurrentMonthKey,
    () => "",
  );
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  if (!finance.data) {
    return (
      <FinancePageState error={finance.error} isLoading={finance.isLoading} />
    );
  }
  if (!currentMonth) {
    return <FinancePageState error={null} isLoading />;
  }

  const monthKey = selectedMonth ?? currentMonth;
  const { transactions, categories } = finance.data;
  const summary = getMonthlyFinancialSummary(transactions, categories, monthKey);
  const previousMonthKey = getPreviousMonthKey(monthKey);
  const previousMonth = getMonthlyFinancialSummary(
    transactions,
    categories,
    previousMonthKey,
  );
  const months = getSpendingMonths(transactions, 6, monthKey);
  const monthLabel = new Date(
    Number(monthKey.slice(0, 4)),
    Number(monthKey.slice(5, 7)) - 1,
    1,
  ).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const previousLabel = new Date(
    Number(previousMonthKey.slice(0, 4)),
    Number(previousMonthKey.slice(5, 7)) - 1,
    1,
  ).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-ink">
            Spending insights
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            Explore monthly patterns and compare your spending over time.
          </p>
        </div>
        <label className="w-full sm:w-auto">
          <span className="sr-only">Select insights month</span>
          <input
            className="form-input sm:w-auto"
            onChange={(event) => setSelectedMonth(event.target.value)}
            type="month"
            value={monthKey}
          />
        </label>
      </div>

      <section
        aria-label={`${monthLabel} compared with ${previousLabel}`}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <article className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <p className="text-sm text-muted">{monthLabel} expenses</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            {formatRupees(summary.expensePaise)}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <p className="text-sm text-muted">{previousLabel} expenses</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            {formatRupees(previousMonth.expensePaise)}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <p className="text-sm text-muted">Change in spending</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            {formatRupees(Math.abs(summary.expenseChangePaise))}
          </p>
          <p className="mt-1 text-xs text-muted">
            {summary.expenseChangePaise > 0
              ? "More than last month"
              : summary.expenseChangePaise < 0
                ? "Less than last month"
                : "No change from last month"}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <p className="text-sm text-muted">Change percentage</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            {summary.expenseChangePercent === null
              ? "—"
              : `${Math.abs(summary.expenseChangePercent).toLocaleString("en-IN", {
                  maximumFractionDigits: 1,
                })}%`}
          </p>
          <p className="mt-1 text-xs text-muted">Compared with previous month</p>
        </article>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
        <SpendingChart currentMonth={monthKey} months={months} />
        <CategoryBreakdown categories={summary.categoryTotals} />
      </div>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6">
        <h3 className="text-base font-semibold text-ink">
          Income and savings — {monthLabel}
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted">Income</p>
            <p className="mt-1 font-semibold text-ink">
              {formatRupees(summary.incomePaise)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Net balance</p>
            <p className="mt-1 font-semibold text-ink">
              {formatRupees(summary.balancePaise)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Savings rate</p>
            <p className="mt-1 font-semibold text-ink">
              {summary.savingsRate === null
                ? "—"
                : `${summary.savingsRate.toLocaleString("en-IN", {
                    maximumFractionDigits: 1,
                  })}%`}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
