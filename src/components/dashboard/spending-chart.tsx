import { monthlySpending } from "@/lib/demo-data";

const chartMax = Math.max(...monthlySpending.map(({ amount }) => amount));

export function SpendingChart() {
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
            Spending overview
          </h2>
          <p className="mt-1 text-sm text-muted">Your monthly expenses</p>
        </div>
        <span className="rounded-lg bg-canvas px-2.5 py-1.5 text-xs font-medium text-muted">
          Last 6 months
        </span>
      </div>

      <div
        aria-label="Monthly spending from May through October: $1,760, $2,140, $1,880, $2,460, $2,010, and $2,140"
        className="mt-7 grid h-[188px] grid-cols-6 items-end gap-3 sm:gap-5"
        role="img"
      >
        {monthlySpending.map(({ label, amount }) => {
          const height = Math.max(20, Math.round((amount / chartMax) * 100));
          const isCurrentMonth = label === "Oct";

          return (
            <div className="flex h-full flex-col items-center justify-end gap-2" key={label}>
              <div className="flex h-full w-full items-end">
                <div
                  className={`w-full rounded-t-md ${
                    isCurrentMonth ? "bg-forest-700" : "bg-sage-200"
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${label}: $${amount.toLocaleString("en-US")}`}
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
      <div className="mt-5 flex items-center gap-2 border-t border-border pt-4">
        <span aria-hidden="true" className="size-2 rounded-full bg-forest-700" />
        <span className="text-xs text-muted">Spending</span>
        <span className="ml-auto text-xs font-semibold text-ink">
          $2,140 this month
        </span>
      </div>
    </section>
  );
}
