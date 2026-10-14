"use client";

import { useSyncExternalStore } from "react";
import { ArrowDownToLine, Wallet } from "lucide-react";
import { FinancePageState } from "@/components/finance/finance-page-state";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { TransactionsManager } from "@/components/transactions/transactions-manager";
import { useFinanceData } from "@/hooks/finance-data-provider";
import { formatRupees, getCurrentMonthKey } from "@/lib/finance-utils";

const subscribeToMonthChanges = () => () => {};

export function IncomePage() {
  const finance = useFinanceData();
  const currentMonth = useSyncExternalStore(
    subscribeToMonthChanges,
    getCurrentMonthKey,
    () => "",
  );

  if (!finance.data) {
    return (
      <FinancePageState error={finance.error} isLoading={finance.isLoading} />
    );
  }

  const { categories, transactions, rules } = finance.data;
  const incomeTransactions = transactions.filter(
    (transaction) => transaction.type === "income",
  );
  const monthlyIncome = (monthKey: string) =>
    incomeTransactions
      .filter((transaction) => transaction.date.slice(0, 7) === monthKey)
      .reduce((total, transaction) => total + transaction.amountPaise, 0);
  const monthKeys = [
    ...new Set(incomeTransactions.map((transaction) => transaction.date.slice(0, 7))),
  ].sort().reverse();
  const selectedMonth = currentMonth || monthKeys[0] || "";

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-ink">
          Income and salary
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          Income is counted from your existing income transactions, including
          salary entries, exactly once.
        </p>
      </div>
      <section aria-label="Monthly income" className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          icon={ArrowDownToLine}
          label="Income this month"
          note={selectedMonth ? selectedMonth : "No income month selected"}
          tone="positive"
          value={formatRupees(selectedMonth ? monthlyIncome(selectedMonth) : 0)}
        />
        <SummaryCard
          icon={Wallet}
          label="All-time income entries"
          note={`${incomeTransactions.length} ${
            incomeTransactions.length === 1 ? "transaction" : "transactions"
          }`}
          value={formatRupees(
            incomeTransactions.reduce(
              (total, transaction) => total + transaction.amountPaise,
              0,
            ),
          )}
        />
      </section>

      <section
        aria-labelledby="income-history-heading"
        className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6"
      >
        <h3
          className="text-base font-semibold tracking-[-0.02em] text-ink"
          id="income-history-heading"
        >
          Monthly income history
        </h3>
        {monthKeys.length ? (
          <ul className="mt-4 divide-y divide-border">
            {monthKeys.map((monthKey) => (
              <li
                className="flex items-center justify-between gap-4 py-3 text-sm"
                key={monthKey}
              >
                <span className="text-muted">
                  {new Date(
                    Number(monthKey.slice(0, 4)),
                    Number(monthKey.slice(5, 7)) - 1,
                    1,
                  ).toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="font-semibold tabular-nums text-ink">
                  {formatRupees(monthlyIncome(monthKey))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">
            No income entries yet. Add salary or another income source below.
          </p>
        )}
      </section>

      {finance.error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {finance.error}
        </p>
      )}
      <TransactionsManager
        initialType="income"
        categories={categories}
        onAdd={finance.addTransaction}
        onAddCategory={finance.addCustomCategory}
        onAddRule={finance.addCategorizationRule}
        onClearAll={finance.clearAllData}
        onDelete={finance.deleteTransaction}
        onDeleteRule={finance.deleteCategorizationRule}
        onEditRule={finance.editCategorizationRule}
        onRenameCategory={finance.editCategory}
        onResetDemo={finance.resetDemoData}
        onUpdate={finance.updateTransaction}
        rules={rules}
        transactions={incomeTransactions}
      />
    </div>
  );
}
