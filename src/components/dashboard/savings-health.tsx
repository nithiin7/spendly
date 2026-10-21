"use client";

import { formatRupees } from "@/lib/finance-utils";
import type { SavingsHealthMonth } from "@/types/finance";

function formatPercent(value: number | null): string {
  return value === null
    ? "—"
    : `${value.toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
}

export function SavingsHealth({
  months,
  currency,
}: {
  months: SavingsHealthMonth[];
  currency: string;
}) {
  const selectedMonth = months.at(-1);
  if (!selectedMonth) return null;

  const maxSpendingRatio = Math.max(
    100,
    ...months.map((month) => month.spendingToIncomePercent ?? 0),
  );
  const planDescription =
    selectedMonth.plannedExpenseSource === "overall-limit"
      ? "Calculated as income minus the overall expense limit."
      : selectedMonth.plannedExpenseSource === "category-allocations"
        ? "Calculated as income minus the total of category expense limits."
        : "No expense budget is set, so planned savings are not available.";

  return (
    <section
      aria-labelledby="savings-health-heading"
      className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6"
    >
      <div>
        <h3
          className="text-base font-semibold tracking-[-0.02em] text-ink"
          id="savings-health-heading"
        >
          Savings and financial health — {selectedMonth.label}
        </h3>
        <p className="mt-1 text-sm text-muted">
          Track actual income left after expenses and compare spending with
          income over time.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted">Actual income</p>
          <p
            className="mt-1 text-lg font-semibold tabular-nums text-ink"
            data-financial-value
          >
            {formatRupees(selectedMonth.incomePaise, currency)}
          </p>
        </article>
        <article className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted">Income left after expenses</p>
          <p
            className={`mt-1 text-lg font-semibold tabular-nums ${
              selectedMonth.actualSavingsPaise < 0 ? "text-red-700" : "text-ink"
            }`}
            data-financial-value
          >
            {formatRupees(selectedMonth.actualSavingsPaise, currency)}
          </p>
          <p className="mt-1 text-xs text-muted">Actual savings</p>
        </article>
        <article className="rounded-xl border border-border p-4">
          <p className="text-xs text-muted">Actual savings rate</p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-ink">
            {formatPercent(selectedMonth.actualSavingsRate)}
          </p>
          <p className="mt-1 text-xs text-muted">Income left ÷ actual income</p>
        </article>
        <article className="rounded-xl border border-sage-200 bg-sage-100/50 p-4">
          <p className="text-xs text-muted">Planned savings estimate</p>
          <p
            className={`mt-1 text-lg font-semibold tabular-nums ${
              selectedMonth.plannedSavingsPaise !== null &&
              selectedMonth.plannedSavingsPaise < 0
                ? "text-amber-900"
                : "text-forest-800"
            }`}
            data-financial-value
          >
            {selectedMonth.plannedSavingsPaise === null
              ? "Not set"
              : formatRupees(selectedMonth.plannedSavingsPaise, currency)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {selectedMonth.plannedSavingsPaise === null
              ? "Needs an expense budget"
              : "Income less planned expenses"}
          </p>
        </article>
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-ink">
              Spending relative to income
            </h4>
            <p className="mt-1 text-xs text-muted">
              Actual expenses as a share of monthly income
            </p>
          </div>
          <span className="text-xs text-muted">
            Savings rate = income left ÷ income
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {months.map((month) => {
            const spendingWidth =
              month.spendingToIncomePercent === null
                ? 0
                : Math.min(
                    100,
                    (month.spendingToIncomePercent / maxSpendingRatio) * 100,
                  );

            return (
              <div
                aria-label={`${month.label}: spending ${formatPercent(month.spendingToIncomePercent)} of income, savings rate ${formatPercent(month.actualSavingsRate)}`}
                className={`rounded-xl border px-3.5 py-3 ${
                  month.monthKey === selectedMonth.monthKey
                    ? "border-forest-700 bg-sage-100/40"
                    : "border-border"
                }`}
                key={month.monthKey}
              >
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <span className="text-sm font-medium text-ink">
                    {month.label}
                    {month.monthKey === selectedMonth.monthKey && (
                      <span className="ml-2 text-xs font-normal text-forest-700">
                        Selected
                      </span>
                    )}
                  </span>
                  <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span className="text-muted">
                      Spending{" "}
                      <span className="font-medium text-ink">
                        {formatPercent(month.spendingToIncomePercent)}
                      </span>
                    </span>
                    <span className="text-muted">
                      Savings rate{" "}
                      <span
                        className={`font-medium ${
                          month.actualSavingsRate !== null &&
                          month.actualSavingsRate < 0
                            ? "text-red-700"
                            : "text-ink"
                        }`}
                      >
                        {formatPercent(month.actualSavingsRate)}
                      </span>
                    </span>
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="mt-2 h-2 overflow-hidden rounded-full bg-canvas"
                >
                  <div
                    className={`h-full rounded-full ${
                      month.spendingToIncomePercent !== null &&
                      month.spendingToIncomePercent > 100
                        ? "bg-red-600"
                        : "bg-forest-700"
                    }`}
                    style={{ width: `${spendingWidth}%` }}
                  />
                </div>
                {month.incomePaise === 0 && (
                  <p className="mt-1 text-xs text-muted">
                    No income recorded; percentage is unavailable.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-5 border-t border-border pt-4 text-xs text-muted">
        Actual savings come from recorded income minus recorded expenses.
        Planned savings is an estimate, not a separate savings-account balance.
        {` ${planDescription}`}
      </p>
    </section>
  );
}
