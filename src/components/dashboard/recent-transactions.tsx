import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { formatRupees } from "@/lib/finance-utils";
import { formatFinanceDate } from "@/lib/currency";
import type { Category, DateFormat, Transaction } from "@/types/finance";

export function RecentTransactions({
  transactions,
  categories,
  onAdd,
  currency = "INR",
  dateFormat = "DD/MM/YYYY",
}: {
  transactions: Transaction[];
  categories: Category[];
  onAdd: () => void;
  currency?: string;
  dateFormat?: DateFormat;
}) {
  const recentTransactions = [...transactions]
    .sort(
      (left, right) =>
        right.date.localeCompare(left.date) ||
        right.createdAt.localeCompare(left.createdAt),
    )
    .slice(0, 5);

  return (
    <section
      aria-labelledby="recent-transactions-heading"
      className="overflow-hidden rounded-2xl border border-border bg-white shadow-card"
      id="recent-transactions"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-6">
        <div>
          <h2
            className="text-base font-semibold tracking-[-0.02em] text-ink"
            id="recent-transactions-heading"
          >
            Recent transactions
          </h2>
          <p className="mt-1 text-sm text-muted">Your latest activity</p>
        </div>
        <Link
          className="text-sm font-medium text-forest-800 hover:underline"
          href="/transactions"
        >
          View all
        </Link>
      </div>

      {recentTransactions.length > 0 ? (
        <ul className="divide-y divide-border border-t border-border">
          {recentTransactions.map((transaction) => {
            const category = categories.find(
              (item) => item.id === transaction.categoryId,
            );
            const isIncome = transaction.type === "income";
            const Icon = isIncome ? ArrowDownLeft : ArrowUpRight;

            return (
              <li
                className="flex items-center gap-3 px-5 py-3.5 sm:px-6"
                key={transaction.id}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                    isIncome
                      ? "bg-sage-100 text-positive"
                      : "bg-canvas text-forest-800"
                  }`}
                >
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {transaction.description}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {category?.name ?? "Uncategorized"} ·{" "}
                    {formatFinanceDate(transaction.date, dateFormat)}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    isIncome ? "text-positive" : "text-ink"
                  }`}
                >
                  <span data-financial-value>
                    {isIncome ? "+" : "−"}
                    {formatRupees(transaction.amountPaise, currency)}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="border-t border-border px-5 py-8 text-center sm:px-6">
          <p className="text-sm text-muted">
            No transactions yet. Add an income or expense to get started.
          </p>
          <button className="button-primary mt-4" onClick={onAdd} type="button">
            Add your first transaction
          </button>
        </div>
      )}
    </section>
  );
}
