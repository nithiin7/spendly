import {
  ArrowDownLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  HeartPulse,
  House,
  ShoppingBag,
  ShoppingBasket,
  TrainFront,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { recentTransactions } from "@/lib/demo-data";
import type { TransactionCategory } from "@/types/finance";

const categoryIcons: Record<TransactionCategory, LucideIcon> = {
  Housing: House,
  "Food & drink": ShoppingBasket,
  Transport: TrainFront,
  Shopping: ShoppingBag,
  Health: HeartPulse,
  Income: BriefcaseBusiness,
};

function formatAmount(amount: number, direction: "income" | "expense") {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

  return direction === "income" ? `+${formatted}` : `−${formatted}`;
}

export function RecentTransactions() {
  return (
    <section
      aria-labelledby="transactions-heading"
      className="overflow-hidden rounded-2xl border border-border bg-white shadow-card"
      id="transactions"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5 sm:px-6">
        <div>
          <h2
            className="text-base font-semibold tracking-[-0.02em] text-ink"
            id="transactions-heading"
          >
            Recent transactions
          </h2>
          <p className="mt-1 text-sm text-muted">Your latest account activity</p>
        </div>
        <span className="text-xs font-medium text-muted">This month</span>
      </div>
      <ul className="divide-y divide-border">
        {recentTransactions.map((transaction) => {
          const Icon = categoryIcons[transaction.category];
          const isIncome = transaction.direction === "income";

          return (
            <li
              className="flex items-center gap-3 px-5 py-4 sm:gap-4 sm:px-6"
              key={transaction.id}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-canvas text-forest-800">
                <Icon aria-hidden="true" className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {transaction.name}
                </p>
                <p className="mt-1 truncate text-xs text-muted">
                  {transaction.category}
                  <span aria-hidden="true" className="px-1.5">
                    ·
                  </span>
                  {transaction.date}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {isIncome ? (
                  <ArrowDownLeft
                    aria-hidden="true"
                    className="hidden size-3.5 text-positive sm:block"
                  />
                ) : (
                  <ArrowUpRight
                    aria-hidden="true"
                    className="hidden size-3.5 text-muted sm:block"
                  />
                )}
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    isIncome ? "text-positive" : "text-ink"
                  }`}
                >
                  {formatAmount(transaction.amount, transaction.direction)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
