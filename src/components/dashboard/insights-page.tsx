"use client";

import { useState, useSyncExternalStore } from "react";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { FinancePageState } from "@/components/finance/finance-page-state";
import { PageEntrance } from "@/components/ui/page-entrance";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { CashFlowTrends } from "@/components/dashboard/cash-flow-trends";
import { SpendingAnalysis } from "@/components/dashboard/spending-analysis";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { useFinanceData } from "@/hooks/finance-data-provider";
import Link from "next/link";
import {
  formatRupees,
  getCurrentMonthKey,
  getCashFlowMonths,
  getMonthlySpendingAnalysis,
  getMonthlyFinancialSummary,
  getPreviousMonthKey,
  getSpendingMonths,
} from "@/lib/finance-utils";
import { calculateMonthlyBudgetAnalytics } from "@/lib/monthly-budgets";

const subscribeToMonthChanges = () => () => {};

export function InsightsPage() {
  const finance = useFinanceData();
  const currentMonth = useSyncExternalStore(
    subscribeToMonthChanges,
    getCurrentMonthKey,
    () => "",
  );
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [trendMonths, setTrendMonths] = useState<6 | 12>(6);

  if (!finance.data) {
    return (
      <FinancePageState error={finance.error} isLoading={finance.isLoading} />
    );
  }
  if (!currentMonth) {
    return <FinancePageState error={null} isLoading />;
  }

  const monthKey = selectedMonth ?? currentMonth;
  const { transactions, categories, recurringOccurrences } = finance.data;
  const currency = finance.data.preferences?.defaultCurrency ?? "INR";
  const formatMoney = (amountPaise: number) =>
    formatRupees(amountPaise, currency);
  const summary = getMonthlyFinancialSummary(transactions, categories, monthKey);
  const spendingAnalysis = getMonthlySpendingAnalysis(
    transactions,
    categories,
    recurringOccurrences,
    monthKey,
  );
  const monthlyBudget = finance.data.budgets.find(
    (budget) =>
      budget.year === Number(monthKey.slice(0, 4)) &&
      budget.month === Number(monthKey.slice(5, 7)),
  );
  const budgetAnalytics = calculateMonthlyBudgetAnalytics(
    transactions,
    categories,
    monthlyBudget,
    monthKey,
  );
  const previousMonthKey = getPreviousMonthKey(monthKey);
  const previousMonth = getMonthlyFinancialSummary(
    transactions,
    categories,
    previousMonthKey,
  );
  const months = getSpendingMonths(transactions, 6, monthKey);
  const cashFlowMonths = getCashFlowMonths(transactions, trendMonths, currentMonth);
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
    <PageEntrance>
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
          <CalendarPicker
            className="form-input sm:w-auto"
            mode="month"
            onChange={setSelectedMonth}
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
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink" data-financial-value>
            {formatMoney(summary.expensePaise)}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <p className="text-sm text-muted">{previousLabel} expenses</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink" data-financial-value>
            {formatMoney(previousMonth.expensePaise)}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-white p-5 shadow-card">
          <p className="text-sm text-muted">Change in spending</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-ink" data-financial-value>
            {formatMoney(Math.abs(summary.expenseChangePaise))}
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

      <CashFlowTrends
        currency={currency}
        months={cashFlowMonths}
        onChangePeriod={setTrendMonths}
        onSelectMonth={setSelectedMonth}
        selectedMonth={monthKey}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
        <SpendingChart currentMonth={monthKey} currency={currency} months={months} />
        <CategoryBreakdown categories={summary.categoryTotals} currency={currency} />
      </div>

      <SpendingAnalysis
        analysis={spendingAnalysis}
        currency={currency}
        monthLabel={monthLabel}
        previousMonthLabel={previousLabel}
        totalExpensePaise={summary.expensePaise}
      />

      <section
        aria-labelledby="budget-comparison-heading"
        className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3
              className="text-base font-semibold text-ink"
              id="budget-comparison-heading"
            >
              Budget versus actual — {monthLabel}
            </h3>
            <p className="mt-1 text-sm text-muted">
              Actuals include all confirmed expenses, including categories
              without a budget.
            </p>
          </div>
          <Link className="button-secondary" href="/budgets">
            Manage budgets
          </Link>
        </div>
        {!monthlyBudget ? (
          <p className="mt-5 rounded-xl border border-dashed border-border bg-canvas/50 px-4 py-5 text-center text-sm text-muted">
            No budget is set for this month. Create one to compare your planned
            limits with actual spending.
          </p>
        ) : (
          <div className="mt-5 space-y-5">
            {budgetAnalytics.overall ? (
              <div className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className="font-medium text-ink">Overall</span>
                  <span className="text-muted" data-financial-value>
                    {formatMoney(budgetAnalytics.overall.spentPaise)} actual
                    {" / "}
                    {formatMoney(budgetAnalytics.overall.budgetPaise)} budget
                  </span>
                </div>
                <div
                  aria-label={`Overall budget ${budgetAnalytics.overall.utilizationPercent.toLocaleString("en-IN", { maximumFractionDigits: 1 })}% used`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={Math.min(100, Math.max(0, budgetAnalytics.overall.utilizationPercent))}
                  aria-valuetext={`${budgetAnalytics.overall.utilizationPercent.toLocaleString("en-IN", { maximumFractionDigits: 1 })}% used`}
                  className="mt-3 h-2 overflow-hidden rounded-full bg-canvas"
                  role="progressbar"
                >
                  <div
                    className={`h-full rounded-full ${
                      budgetAnalytics.overall.status === "over"
                        ? "bg-red-600"
                        : budgetAnalytics.overall.status === "approaching"
                          ? "bg-amber-500"
                          : "bg-forest-700"
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(0, budgetAnalytics.overall.utilizationPercent))}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted" data-financial-value>
                  {budgetAnalytics.overall.status === "over"
                    ? `${formatMoney(Math.abs(budgetAnalytics.overall.remainingPaise))} over budget`
                    : `${formatMoney(budgetAnalytics.overall.remainingPaise)} remaining`}
                </p>
              </div>
            ) : (
              <p className="rounded-xl bg-canvas/60 px-4 py-3 text-sm text-muted">
                No overall limit is set for this month.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {budgetAnalytics.categories
                .filter((category) => category.budgetPaise !== null)
                .map((category) => (
                  <article
                    className="rounded-xl border border-border p-4"
                    key={category.categoryId}
                  >
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="font-medium text-ink">{category.label}</span>
                      <span className="text-muted" data-financial-value>
                        {formatMoney(category.spentPaise)} /{" "}
                        {formatMoney(category.budgetPaise!)}
                      </span>
                    </div>
                    <div
                      aria-label={`${category.label} budget ${category.utilizationPercent?.toLocaleString("en-IN", { maximumFractionDigits: 1 }) ?? 0}% used`}
                      aria-valuemax={100}
                      aria-valuemin={0}
                      aria-valuenow={Math.min(100, Math.max(0, category.utilizationPercent ?? 0))}
                      className="mt-3 h-2 overflow-hidden rounded-full bg-canvas"
                      role="progressbar"
                    >
                      <div
                        className={`h-full rounded-full ${
                          category.status === "over"
                            ? "bg-red-600"
                            : category.status === "approaching"
                              ? "bg-amber-500"
                              : "bg-forest-700"
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(0, category.utilizationPercent ?? 0))}%`,
                        }}
                      />
                    </div>
                  </article>
                ))}
            </div>
            <p className="text-sm text-muted" data-financial-value>
              {formatMoney(budgetAnalytics.unbudgetedExpensePaise)} spent in
              categories without allocations.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6">
        <h3 className="text-base font-semibold text-ink">
          Income and savings — {monthLabel}
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted">Income</p>
            <p className="mt-1 font-semibold text-ink" data-financial-value>
              {formatMoney(summary.incomePaise)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">Net balance</p>
            <p className="mt-1 font-semibold text-ink">
              {formatMoney(summary.balancePaise)}
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
    </PageEntrance>
  );
}
