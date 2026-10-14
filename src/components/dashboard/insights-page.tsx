"use client";

import { useState, useSyncExternalStore } from "react";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { FinancePageState } from "@/components/finance/finance-page-state";
import { PageEntrance } from "@/components/ui/page-entrance";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { BudgetPlannerPerformance } from "@/components/dashboard/budget-planner-performance";
import { CashFlowTrends } from "@/components/dashboard/cash-flow-trends";
import { SpendingAnalysis } from "@/components/dashboard/spending-analysis";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { useFinanceData } from "@/hooks/finance-data-provider";
import {
  formatRupees,
  getCurrentMonthKey,
  getCashFlowMonths,
  getMonthlySpendingAnalysis,
  getMonthlyFinancialSummary,
  getPreviousMonthKey,
  getSpendingMonths,
} from "@/lib/finance-utils";
import {
  calculateMonthlyBudgetAnalytics,
  getRepeatedBudgetOverruns,
} from "@/lib/monthly-budgets";

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
  const repeatedBudgetOverruns = getRepeatedBudgetOverruns(
    transactions,
    categories,
    finance.data.budgets,
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

      <BudgetPlannerPerformance
        analytics={budgetAnalytics}
        budget={monthlyBudget}
        currency={currency}
        monthLabel={monthLabel}
        repeatedOverruns={repeatedBudgetOverruns}
      />

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
