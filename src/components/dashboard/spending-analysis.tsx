"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatRupees } from "@/lib/finance-utils";
import type { MonthlySpendingAnalysis } from "@/types/finance";

function formatChange(amountPaise: number, previousAmountPaise: number): string {
  if (previousAmountPaise === 0) return "New this month";
  if (amountPaise === 0) return "No spending this month";
  const changePaise = amountPaise - previousAmountPaise;
  if (changePaise === 0) return "No change";
  const percent = Math.abs((changePaise / previousAmountPaise) * 100);
  return `${changePaise > 0 ? "Up" : "Down"} ${percent.toLocaleString("en-IN", {
    maximumFractionDigits: 1,
  })}%`;
}

function ExpenseSplit({
  title,
  amountPaise,
  totalExpensePaise,
  currency,
  description,
  color,
}: {
  title: string;
  amountPaise: number;
  totalExpensePaise: number;
  currency: string;
  description: string;
  color: string;
}) {
  const percentage =
    totalExpensePaise > 0 ? (amountPaise / totalExpensePaise) * 100 : 0;

  return (
    <article className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink">{title}</span>
        <span
          className="text-sm font-semibold tabular-nums text-ink"
          data-financial-value
        >
          {formatRupees(amountPaise, currency)}
        </span>
      </div>
      <div
        aria-label={`${title}: ${percentage.toLocaleString("en-IN", { maximumFractionDigits: 1 })}% of expenses`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.min(100, percentage)}
        className="mt-3 h-2 overflow-hidden rounded-full bg-canvas"
        role="progressbar"
      >
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        {percentage.toLocaleString("en-IN", { maximumFractionDigits: 1 })}% of
        expenses · {description}
      </p>
    </article>
  );
}

export function SpendingAnalysis({
  analysis,
  monthLabel,
  previousMonthLabel,
  totalExpensePaise,
  currency,
}: {
  analysis: MonthlySpendingAnalysis;
  monthLabel: string;
  previousMonthLabel: string;
  totalExpensePaise: number;
  currency: string;
}) {
  return (
    <section
      aria-labelledby="spending-analysis-heading"
      className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6"
    >
      <div>
        <h3
          className="text-base font-semibold tracking-[-0.02em] text-ink"
          id="spending-analysis-heading"
        >
          Spending analysis — {monthLabel}
        </h3>
        <p className="mt-1 text-sm text-muted">
          See what is driving expenses and how category spending changed from{" "}
          {previousMonthLabel}.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ExpenseSplit
          amountPaise={analysis.fixedExpensePaise}
          color="bg-forest-700"
          currency={currency}
          description="Confirmed recurring transactions"
          title="Fixed expenses"
          totalExpensePaise={totalExpensePaise}
        />
        <ExpenseSplit
          amountPaise={analysis.variableExpensePaise}
          color="bg-amber-500"
          currency={currency}
          description="Other recorded expenses"
          title="Variable expenses"
          totalExpensePaise={totalExpensePaise}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="category-changes-heading">
          <div className="flex items-baseline justify-between gap-3">
            <h4
              className="text-sm font-semibold text-ink"
              id="category-changes-heading"
            >
              Top spending categories
            </h4>
            <span className="text-xs text-muted">vs. {previousMonthLabel}</span>
          </div>
          {analysis.categoryChanges.length > 0 ? (
            <ul className="mt-3 divide-y divide-border">
              {analysis.categoryChanges.map((category) => {
                const changePaise =
                  category.amountPaise - category.previousAmountPaise;
                const ChangeIcon =
                  changePaise > 0
                    ? ArrowUpRight
                    : changePaise < 0
                      ? ArrowDownRight
                      : Minus;
                const changeColor =
                  changePaise > 0
                    ? "text-red-700"
                    : changePaise < 0
                      ? "text-forest-700"
                      : "text-muted";

                return (
                  <li
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                    key={category.id}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <span className="truncate text-sm font-medium text-ink">
                          {category.label}
                        </span>
                        <span
                          className="text-sm font-semibold tabular-nums text-ink"
                          data-financial-value
                        >
                          {formatRupees(category.amountPaise, currency)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <span
                          className="text-xs text-muted"
                          data-financial-value
                        >
                          Previous:{" "}
                          {formatRupees(
                            category.previousAmountPaise,
                            currency,
                          )}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-xs ${changeColor}`}
                          data-financial-value
                        >
                          <ChangeIcon
                            aria-hidden="true"
                            className="size-3.5"
                          />
                          {formatChange(
                            category.amountPaise,
                            category.previousAmountPaise,
                          )}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
              No expenses to compare for these months.
            </p>
          )}
        </section>

        <section aria-labelledby="largest-expenses-heading">
          <h4
            className="text-sm font-semibold text-ink"
            id="largest-expenses-heading"
          >
            Largest transactions
          </h4>
          {analysis.largestTransactions.length > 0 ? (
            <ol className="mt-3 divide-y divide-border">
              {analysis.largestTransactions.map((transaction, index) => (
                <li
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  key={transaction.id}
                >
                  <span
                    aria-hidden="true"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-xs font-semibold text-muted"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {transaction.description}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {new Date(`${transaction.date}T00:00:00`).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short" },
                      )}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-sm font-semibold tabular-nums text-ink"
                    data-financial-value
                  >
                    {formatRupees(transaction.amountPaise, currency)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
              No expenses recorded this month.
            </p>
          )}
        </section>
      </div>
      <p className="mt-5 border-t border-border pt-4 text-xs text-muted">
        Fixed expenses are confirmed recurring transactions. Other recorded
        expenses are grouped as variable.
      </p>
    </section>
  );
}
