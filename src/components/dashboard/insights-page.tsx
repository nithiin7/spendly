"use client";

import { useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { FinancePageState } from "@/components/finance/finance-page-state";
import { PageEntrance } from "@/components/ui/page-entrance";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { BudgetPlannerPerformance } from "@/components/dashboard/budget-planner-performance";
import { CashFlowTrends } from "@/components/dashboard/cash-flow-trends";
import { ActionableObservations } from "@/components/dashboard/actionable-observations";
import { SavingsHealth } from "@/components/dashboard/savings-health";
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
  getSavingsHealthMonths,
  getSpendingMonths,
} from "@/lib/finance-utils";
import {
  calculateMonthlyBudgetAnalytics,
  getRepeatedBudgetOverruns,
} from "@/lib/monthly-budgets";
import { getActionableObservations } from "@/lib/actionable-observations";

const subscribeToMonthChanges = () => () => {};

const insightTabs = [
  { id: "cash-flow", label: "Cash flow" },
  { id: "spending", label: "Spending analysis" },
  { id: "budget", label: "Budget & planner" },
  { id: "savings", label: "Savings & health" },
  { id: "observations", label: "Observations" },
] as const;

type InsightTabId = (typeof insightTabs)[number]["id"];

export function InsightsPage() {
  const finance = useFinanceData();
  const currentMonth = useSyncExternalStore(
    subscribeToMonthChanges,
    getCurrentMonthKey,
    () => "",
  );
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [trendMonths, setTrendMonths] = useState<6 | 12>(6);
  const [activeTab, setActiveTab] = useState<InsightTabId>("cash-flow");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

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
  const observations = getActionableObservations(
    transactions,
    categories,
    recurringOccurrences,
    finance.data.recurringRules,
    monthlyBudget,
    monthKey,
    currency,
  );
  const previousMonthKey = getPreviousMonthKey(monthKey);
  const previousMonth = getMonthlyFinancialSummary(
    transactions,
    categories,
    previousMonthKey,
  );
  const months = getSpendingMonths(transactions, 6, monthKey);
  const cashFlowMonths = getCashFlowMonths(transactions, trendMonths, currentMonth);
  const savingsHealthMonths = getSavingsHealthMonths(
    transactions,
    finance.data.budgets,
    6,
    monthKey,
  );
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

  function handleTabKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    const lastIndex = insightTabs.length - 1;
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    } else if (event.key === "ArrowLeft") {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = lastIndex;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    setActiveTab(insightTabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

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

      <div>
        <div
          aria-label="Insights sections"
          className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-white p-1.5 shadow-card"
          role="tablist"
        >
          {insightTabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                aria-controls="insights-tabpanel"
                aria-selected={isActive}
                className={`min-h-10 shrink-0 rounded-lg px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-700 focus-visible:ring-offset-1 sm:px-4 ${
                  isActive
                    ? "bg-forest-800 text-white shadow-sm"
                    : "text-muted hover:bg-canvas hover:text-ink"
                }`}
                id={`insights-tab-${tab.id}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                role="tab"
                tabIndex={isActive ? 0 : -1}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          aria-labelledby={`insights-tab-${activeTab}`}
          className="mt-5"
          id="insights-tabpanel"
          role="tabpanel"
          tabIndex={0}
        >
          {activeTab === "cash-flow" && (
            <div className="space-y-5">
              <CashFlowTrends
                currency={currency}
                months={cashFlowMonths}
                onChangePeriod={setTrendMonths}
                onSelectMonth={setSelectedMonth}
                selectedMonth={monthKey}
              />
              <SpendingChart
                currentMonth={monthKey}
                currency={currency}
                months={months}
              />
            </div>
          )}
          {activeTab === "spending" && (
            <div className="space-y-5">
              <SpendingAnalysis
                analysis={spendingAnalysis}
                currency={currency}
                monthLabel={monthLabel}
                previousMonthLabel={previousLabel}
                totalExpensePaise={summary.expensePaise}
              />
              <CategoryBreakdown
                categories={summary.categoryTotals}
                currency={currency}
              />
            </div>
          )}
          {activeTab === "budget" && (
            <BudgetPlannerPerformance
              analytics={budgetAnalytics}
              budget={monthlyBudget}
              currency={currency}
              monthLabel={monthLabel}
              repeatedOverruns={repeatedBudgetOverruns}
            />
          )}
          {activeTab === "savings" && (
            <SavingsHealth currency={currency} months={savingsHealthMonths} />
          )}
          {activeTab === "observations" && (
            <ActionableObservations
              monthLabel={monthLabel}
              observations={observations}
            />
          )}
        </div>
      </div>
    </div>
    </PageEntrance>
  );
}
