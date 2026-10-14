import { spendingCategories } from "@/lib/demo-data";

const totalSpending = spendingCategories.reduce(
  (total, category) => total + category.amount,
  0,
);

export function CategoryBreakdown() {
  return (
    <section
      aria-labelledby="categories-heading"
      className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6"
      id="categories"
    >
      <div>
        <h2
          className="text-base font-semibold tracking-[-0.02em] text-ink"
          id="categories-heading"
        >
          Spending by category
        </h2>
        <p className="mt-1 text-sm text-muted">Where your money is going</p>
      </div>

      <div className="mt-6 flex h-2.5 overflow-hidden rounded-full bg-canvas">
        {spendingCategories.map(({ label, amount, color }) => (
          <span
            aria-hidden="true"
            key={label}
            style={{
              backgroundColor: color,
              width: `${(amount / totalSpending) * 100}%`,
            }}
          />
        ))}
      </div>

      <ul className="mt-5 space-y-4">
        {spendingCategories.map(({ label, amount, color }) => (
          <li className="flex items-center gap-3" key={label}>
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="min-w-0 flex-1 truncate text-sm text-muted">
              {label}
            </span>
            <span className="text-sm font-medium tabular-nums text-ink">
              ${amount.toLocaleString("en-US")}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-border pt-4 text-xs text-muted">
        Total tracked spending{" "}
        <span className="float-right font-semibold text-ink">
          ${totalSpending.toLocaleString("en-US")}
        </span>
      </p>
    </section>
  );
}
