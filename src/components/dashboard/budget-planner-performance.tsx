"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type {
  MonthlyBudget,
  MonthlyBudgetAnalytics,
  RepeatedBudgetOverrun,
} from "@/types/finance";
import { formatRupees } from "@/lib/finance-utils";

function percentageLabel(value: number): string {
  return `${value.toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`;
}

function ProgressBar({
  label,
  spentPaise,
  budgetPaise,
  utilizationPercent,
  status,
  currency,
}: {
  label: string;
  spentPaise: number;
  budgetPaise: number;
  utilizationPercent: number;
  status: "normal" | "approaching" | "over";
  currency: string;
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
      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${width}%` }} />
      <span className="sr-only" data-financial-value>
        {formatRupees(spentPaise, currency)} spent of{" "}
        {formatRupees(budgetPaise, currency)}
      </span>
    </div>
  );
}

export function BudgetPlannerPerformance({
  monthLabel,
  budget,
  analytics,
  repeatedOverruns,
  currency,
}: {
  monthLabel: string;
  budget: MonthlyBudget | undefined;
  analytics: MonthlyBudgetAnalytics;
  repeatedOverruns: RepeatedBudgetOverrun[];
  currency: string;
}) {
  const budgetedCategories = analytics.categories.filter(
    (category) => category.budgetPaise !== null,
  );
  const totalCategoryBudgetPaise = budgetedCategories.reduce(
    (sum, category) => sum + (category.budgetPaise ?? 0),
    0,
  );
  const totalAllocatedActualPaise = budgetedCategories.reduce(
    (sum, category) => sum + category.spentPaise,
    0,
  );
  const unusedAllocations = budgetedCategories.filter(
    (category) => category.spentPaise === 0,
  );

  return (
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
            Budget and planner performance — {monthLabel}
          </h3>
          <p className="mt-1 text-sm text-muted">
            Compare this month’s plan with actual expenses and review recurring
            budget overruns.
          </p>
        </div>
        <Link className="button-secondary" href="/budgets">
          Manage budgets
        </Link>
      </div>

      {!budget ? (
        <p className="mt-5 rounded-xl border border-dashed border-border bg-canvas/50 px-4 py-5 text-center text-sm text-muted">
          No budget is set for this month. Create one to compare planned limits
          with actual spending.
        </p>
      ) : (
        <div className="mt-5 space-y-5">
          {analytics.overall ? (
            <article className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-medium text-ink">Overall limit</span>
                <span className="text-muted" data-financial-value>
                  {formatRupees(analytics.overall.spentPaise, currency)} actual
                  {" / "}
                  {formatRupees(analytics.overall.budgetPaise, currency)} planned
                </span>
              </div>
              <div className="mt-3">
                <ProgressBar
                  budgetPaise={analytics.overall.budgetPaise}
                  label="Overall budget"
                  spentPaise={analytics.overall.spentPaise}
                  status={analytics.overall.status}
                  utilizationPercent={analytics.overall.utilizationPercent}
                  currency={currency}
                />
              </div>
              <p
                className={`mt-2 text-xs ${
                  analytics.overall.status === "over"
                    ? "text-red-700"
                    : "text-muted"
                }`}
                data-financial-value
              >
                {analytics.overall.status === "over"
                  ? `${formatRupees(Math.abs(analytics.overall.remainingPaise), currency)} over the overall limit`
                  : `${formatRupees(analytics.overall.remainingPaise, currency)} remaining`}
              </p>
            </article>
          ) : (
            <p className="rounded-xl bg-canvas/60 px-4 py-3 text-sm text-muted">
              No overall spending limit is set for this month.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <article className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted">Category limits planned</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink" data-financial-value>
                {formatRupees(totalCategoryBudgetPaise, currency)}
              </p>
            </article>
            <article className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted">Actual in budgeted categories</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink" data-financial-value>
                {formatRupees(totalAllocatedActualPaise, currency)}
              </p>
            </article>
            <article className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted">Unbudgeted spending</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-ink" data-financial-value>
                {formatRupees(analytics.unbudgetedExpensePaise, currency)}
              </p>
            </article>
          </div>

          {budgetedCategories.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold text-ink">
                Category limits and actuals
              </h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {budgetedCategories.map((category) => (
                  <article
                    className="rounded-xl border border-border p-4"
                    key={category.categoryId}
                  >
                    <div className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="font-medium text-ink">
                        {category.label}
                      </span>
                      <span className="text-muted" data-financial-value>
                        {formatRupees(category.spentPaise, currency)} actual
                        {" / "}
                        {formatRupees(category.budgetPaise ?? 0, currency)} planned
                      </span>
                    </div>
                    {category.status && category.utilizationPercent !== null && (
                      <div className="mt-3">
                        <ProgressBar
                          budgetPaise={category.budgetPaise ?? 0}
                          label={`${category.label} limit`}
                          spentPaise={category.spentPaise}
                          status={category.status}
                          utilizationPercent={category.utilizationPercent}
                          currency={currency}
                        />
                      </div>
                    )}
                    <p
                      className={`mt-2 text-xs ${
                        category.status === "over"
                          ? "font-medium text-red-700"
                          : category.spentPaise === 0
                            ? "text-amber-800"
                            : "text-muted"
                      }`}
                      data-financial-value
                    >
                      {category.status === "over"
                        ? `${formatRupees(Math.abs(category.remainingPaise ?? 0), currency)} over limit`
                        : category.spentPaise === 0
                          ? `Unused allocation · ${formatRupees(category.budgetPaise ?? 0, currency)} unspent`
                          : `${formatRupees(category.remainingPaise ?? 0, currency)} remaining`}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-canvas/60 px-4 py-3 text-sm text-muted">
              No category limits are planned for this month.
            </p>
          )}

          {unusedAllocations.length > 0 && (
            <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-900">
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
              />
              <span>
                Unused allocations:{" "}
                {unusedAllocations.map((category) => category.label).join(", ")}.
              </span>
            </p>
          )}
        </div>
      )}

      <div className="mt-5 border-t border-border pt-5">
        <h4 className="text-sm font-semibold text-ink">
          Repeated category overruns
        </h4>
        <p className="mt-1 text-xs text-muted">
          Categories over their limit at least twice in the last six months
          with a category budget.
        </p>
        {repeatedOverruns.length > 0 ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {repeatedOverruns.map((category) => (
              <li
                className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50/60 px-3.5 py-3"
                key={category.categoryId}
              >
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-red-700"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">
                    {category.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    Over limit in {category.overBudgetMonths} of{" "}
                    {category.budgetedMonths} budgeted months
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-sage-100/70 px-3.5 py-3 text-sm text-forest-800">
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0" />
            No categories exceeded their limits repeatedly in this period.
          </p>
        )}
      </div>
    </section>
  );
}
