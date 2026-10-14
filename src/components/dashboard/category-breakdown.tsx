import { formatRupees } from "@/lib/finance-utils";
import type { SpendingCategory } from "@/types/finance";

export function CategoryBreakdown({
  categories,
  currency = "INR",
}: {
  categories: SpendingCategory[];
  currency?: string;
}) {
  const totalSpending = categories.reduce(
    (total, category) => total + category.amountPaise,
    0,
  );

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
        {categories.map(({ id, amountPaise, color }) => (
          <span
            aria-hidden="true"
            key={id}
            style={{
              backgroundColor: color,
              width:
                totalSpending === 0
                  ? "0%"
                  : `${(amountPaise / totalSpending) * 100}%`,
            }}
          />
        ))}
      </div>

      {categories.length > 0 ? (
        <ul className="mt-5 space-y-4">
          {categories.map(({ id, label, amountPaise, color }) => (
            <li className="flex items-center gap-3" key={id}>
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-muted">
                {label}
              </span>
              <span className="text-sm font-medium tabular-nums text-ink">
                <span data-financial-value>
                  {formatRupees(amountPaise, currency)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-muted">
          No expenses recorded this month.
        </p>
      )}
      <p className="mt-5 border-t border-border pt-4 text-xs text-muted">
        Total tracked spending{" "}
        <span className="float-right font-semibold text-ink">
          <span data-financial-value>
            {formatRupees(totalSpending, currency)}
          </span>
        </span>
      </p>
    </section>
  );
}
