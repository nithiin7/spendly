"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatRupees } from "@/lib/finance-utils";
import type { CashFlowMonth } from "@/types/finance";

type CashFlowTrendsProps = {
  months: CashFlowMonth[];
  selectedMonth: string;
  currency: string;
  onSelectMonth: (monthKey: string) => void;
  onChangePeriod: (count: 6 | 12) => void;
};

function TrendChange({
  amountPaise,
  currency,
  isExpense,
}: {
  amountPaise: number;
  currency: string;
  isExpense: boolean;
}) {
  if (amountPaise === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted">
        <Minus aria-hidden="true" className="size-3.5" />
        No change
      </span>
    );
  }

  const increased = amountPaise > 0;
  const isPositiveChange = isExpense ? !increased : increased;
  const Icon = increased ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${
        isPositiveChange ? "text-forest-700" : "text-red-700"
      }`}
      data-financial-value
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {formatRupees(Math.abs(amountPaise), currency)}{" "}
      {increased ? "more" : "less"}
    </span>
  );
}

export function CashFlowTrends({
  months,
  selectedMonth,
  currency,
  onSelectMonth,
  onChangePeriod,
}: CashFlowTrendsProps) {
  const maxAmount = Math.max(
    1,
    ...months.flatMap(({ incomePaise, expensePaise, netPaise }) => [
      incomePaise,
      expensePaise,
      Math.abs(netPaise),
    ]),
  );

  return (
    <section
      aria-labelledby="cash-flow-trends-heading"
      className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3
            className="text-base font-semibold tracking-[-0.02em] text-ink"
            id="cash-flow-trends-heading"
          >
            Cash flow and monthly trends
          </h3>
          <p className="mt-1 text-sm text-muted">
            Compare income, expenses, and net cash flow month over month.
          </p>
        </div>
        <div
          aria-label="Trend period"
          className="inline-flex rounded-xl border border-border bg-canvas p-1"
          role="group"
        >
          {([6, 12] as const).map((count) => (
            <button
              aria-pressed={months.length === count}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-700 ${
                months.length === count
                  ? "bg-white text-ink shadow-sm"
                  : "text-muted hover:text-ink"
              }`}
              key={count}
              onClick={() => onChangePeriod(count)}
              type="button"
            >
              {count} months
            </button>
          ))}
        </div>
      </div>

      <div
        aria-label="Cash flow chart legend"
        className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted"
      >
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-forest-700" />
          Income
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-rose-400" />
          Expenses
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-sage-300" />
          Net cash flow
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {months.map((month) => {
          const isSelected = month.monthKey === selectedMonth;
          const metrics = [
            {
              label: "Income",
              amountPaise: month.incomePaise,
              changePaise: month.change.incomePaise,
              color: "bg-forest-700",
              isExpense: false,
            },
            {
              label: "Expenses",
              amountPaise: month.expensePaise,
              changePaise: month.change.expensePaise,
              color: "bg-rose-400",
              isExpense: true,
            },
            {
              label: "Net",
              amountPaise: month.netPaise,
              changePaise: month.change.netPaise,
              color: month.netPaise < 0 ? "bg-amber-500" : "bg-sage-300",
              isExpense: false,
            },
          ];

          return (
            <button
              aria-label={`Explore ${month.label}`}
              aria-pressed={isSelected}
              className={`rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-700 ${
                isSelected
                  ? "border-forest-700 bg-sage-100/70"
                  : "border-border hover:border-sage-300 hover:bg-canvas/50"
              }`}
              key={month.monthKey}
              onClick={() => onSelectMonth(month.monthKey)}
              type="button"
            >
              <span
                className={`text-sm font-semibold ${
                  isSelected ? "text-forest-800" : "text-ink"
                }`}
              >
                {month.label}
                {isSelected && (
                  <span className="ml-2 text-xs font-normal text-forest-700">
                    Selected
                  </span>
                )}
              </span>
              <span className="mt-3 block space-y-3">
                {metrics.map((metric) => (
                  <span className="block" key={metric.label}>
                    <span className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted">{metric.label}</span>
                      <span className="font-medium tabular-nums text-ink" data-financial-value>
                        {formatRupees(metric.amountPaise, currency)}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className="mt-1.5 block h-1 overflow-hidden rounded-full bg-canvas"
                    >
                      <span
                        className={`block h-full rounded-full ${metric.color}`}
                        style={{
                          width: `${Math.min(100, (Math.abs(metric.amountPaise) / maxAmount) * 100)}%`,
                        }}
                      />
                    </span>
                    <span className="mt-1 block text-right">
                      <TrendChange
                        amountPaise={metric.changePaise}
                        currency={currency}
                        isExpense={metric.isExpense}
                      />
                    </span>
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted">
        Changes compare each month with the month before it. Select a month to
        explore its breakdown below.
      </p>
    </section>
  );
}
