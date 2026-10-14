"use client";

import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  PiggyBank,
  Wallet,
} from "lucide-react";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { SpendingChart } from "@/components/dashboard/spending-chart";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { TransactionsManager } from "@/components/transactions/transactions-manager";
import { useFinanceData } from "@/hooks/use-finance-data";
import { Modal } from "@/components/ui/modal";
import {
  formatRupees,
  getCurrentMonthKey,
  getMonthlyTotals,
  getSpendingCategories,
  getSpendingMonths,
} from "@/lib/finance-utils";

function LoadingDashboard() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading your finance data"
      className="space-y-7"
      role="status"
    >
      <div className="h-24 animate-pulse rounded-2xl bg-sage-100" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            className="h-32 animate-pulse rounded-2xl border border-border bg-white"
            key={index}
          />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl border border-border bg-white" />
    </div>
  );
}

export function FinanceDashboard() {
  const finance = useFinanceData();
  const [resetError, setResetError] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (finance.isLoading) return <LoadingDashboard />;

  if (!finance.data) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-lg font-semibold text-ink">
          Your finance data could not be loaded
        </h2>
        <p className="mt-2 text-sm text-muted" role="alert">
          {finance.error ??
            "The browser did not provide access to local storage. Your existing data has not been replaced."}
        </p>
        <p className="mt-3 text-sm text-muted">
          If the saved data is damaged, you can explicitly replace it with the
          Spendly sample data.
        </p>
        <button
          className="button-primary mt-5"
          onClick={() => setConfirmReset(true)}
          type="button"
        >
          Reset to sample data
        </button>
        {resetError && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            Sample data could not be saved to this browser.
          </p>
        )}
        {confirmReset && (
          <Modal
            description="This replaces any saved data with the Spendly sample transactions and default categories."
            onClose={() => setConfirmReset(false)}
            size="small"
            title="Replace saved data?"
          >
            <div className="space-y-4 px-5 py-5 sm:px-6">
              {resetError && (
                <p className="text-sm text-red-700" role="alert">
                  Sample data could not be saved. Your existing stored data was
                  left unchanged.
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  className="button-secondary"
                  onClick={() => setConfirmReset(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="button-primary"
                  onClick={() => {
                    if (!finance.resetDemoData()) setResetError(true);
                    else {
                      setResetError(false);
                      setConfirmReset(false);
                    }
                  }}
                  type="button"
                >
                  Replace data
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  const { categories, transactions } = finance.data;
  const monthKey = getCurrentMonthKey();
  const totals = getMonthlyTotals(transactions, monthKey);
  const spendingMonths = getSpendingMonths(transactions);
  const spendingCategories = getSpendingCategories(
    transactions,
    categories,
    monthKey,
  );
  const savingsRate =
    totals.incomePaise > 0
      ? (totals.savingsPaise / totals.incomePaise) * 100
      : 0;
  const currentMonthLabel = new Intl.DateTimeFormat("en-IN", {
    month: "long",
  }).format(new Date());
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-7" id="overview">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-sage-200 bg-sage-100 px-2.5 py-1 text-[11px] font-semibold text-forest-800">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-positive"
            />
            Private · saved on this device
          </div>
          <h2 className="text-2xl font-semibold tracking-[-0.045em] text-ink sm:text-[30px]">
            Your money, in perspective
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            Here&apos;s your financial snapshot for {currentMonthLabel}.
          </p>
        </div>
        <p className="pb-1 text-xs text-muted">
          {currentMonthLabel} {currentYear} · INR
        </p>
      </div>

      {finance.error && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {finance.error}
        </p>
      )}

      <section
        aria-label="Monthly financial summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          icon={Wallet}
          label="Net this month"
          note="Income minus expenses"
          tone={totals.savingsPaise >= 0 ? "positive" : "default"}
          value={formatRupees(totals.savingsPaise)}
        />
        <SummaryCard
          icon={ArrowDownToLine}
          label="Income this month"
          note="Salary and other income"
          value={formatRupees(totals.incomePaise)}
        />
        <SummaryCard
          icon={ArrowUpFromLine}
          label="Spent this month"
          note="Across all expense categories"
          value={formatRupees(totals.expensePaise)}
        />
        <SummaryCard
          icon={PiggyBank}
          label="Savings rate"
          note={
            totals.incomePaise > 0
              ? "Net savings as a share of income"
              : "Add income to calculate your rate"
          }
          tone="positive"
          value={`${savingsRate.toLocaleString("en-IN", { maximumFractionDigits: 1 })}%`}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
        <SpendingChart currentMonth={monthKey} months={spendingMonths} />
        <CategoryBreakdown categories={spendingCategories} />
      </div>

      <TransactionsManager
        categories={categories}
        rules={finance.data.rules}
        onAdd={finance.addTransaction}
        onAddCategory={finance.addCustomCategory}
        onAddRule={finance.addCategorizationRule}
        onDelete={finance.deleteTransaction}
        onDeleteRule={finance.deleteCategorizationRule}
        onEditRule={finance.editCategorizationRule}
        onRenameCategory={finance.editCategory}
        onResetDemo={finance.resetDemoData}
        onUpdate={finance.updateTransaction}
        transactions={transactions}
      />
    </div>
  );
}
