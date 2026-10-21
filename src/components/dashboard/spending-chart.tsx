import type { SpendingMonth } from "@/types/finance";
import { formatRupees } from "@/lib/finance-utils";

export function SpendingChart({
  months,
  currentMonth,
  currency = "INR",
  hideBalances = false,
}: {
  months: SpendingMonth[];
  currentMonth: string;
  currency?: string;
  hideBalances?: boolean;
}) {
  const chartMax = Math.max(...months.map(({ amountPaise }) => amountPaise), 0);
  const selectedSpending =
    months.find(({ monthKey }) => monthKey === currentMonth)?.amountPaise ?? 0;

  return (
    <section
      aria-labelledby="spending-heading"
      className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6"
      id="reports"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            className="text-base font-semibold tracking-[-0.02em] text-ink"
            id="spending-heading"
          >
            Monthly spending trend
          </h2>
          <p className="mt-1 text-sm text-muted">
            Expense totals across six months
          </p>
        </div>
        <span className="rounded-lg bg-canvas px-2.5 py-1.5 text-xs font-medium text-muted">
          Six months
        </span>
      </div>

      <div
        aria-label={`Monthly spending trend for ${months.length} months`}
        className="mt-7 grid h-[188px] grid-cols-6 items-end gap-3 sm:gap-5"
        role="img"
      >
        {months.map(({ label, monthKey, amountPaise }) => {
          const height =
            chartMax === 0 ? 0 : Math.round((amountPaise / chartMax) * 100);
          const isCurrentMonth = monthKey === currentMonth;

          return (
            <div
              className="flex h-full flex-col items-center justify-end gap-2"
              key={monthKey}
            >
              <div className="flex h-full w-full items-end">
                <div
                  className={`w-full rounded-t-md transition-[height] ${
                    isCurrentMonth ? "bg-forest-700" : "bg-sage-200"
                  }`}
                  style={{ height: `${height}%` }}
                  title={
                    hideBalances
                      ? label
                      : `${label}: ${formatRupees(amountPaise, currency)}`
                  }
                />
              </div>
              <span
                className={`text-xs ${
                  isCurrentMonth
                    ? "font-semibold text-forest-800"
                    : "text-muted"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      {chartMax === 0 && (
        <p className="mt-2 text-center text-xs text-muted">
          Spending will appear here once you add an expense.
        </p>
      )}
      <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
        <span
          aria-hidden="true"
          className="size-2 rounded-full bg-forest-700"
        />
        <span className="text-xs text-muted">Spending</span>
        <span
          className="ml-auto text-xs font-semibold text-ink"
          data-financial-value
        >
          {formatRupees(selectedSpending, currency)} selected month
        </span>
      </div>
    </section>
  );
}
