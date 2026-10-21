"use client";

import { FinancePageState } from "@/components/finance/finance-page-state";
import { TransactionsManager } from "@/components/transactions/transactions-manager";
import { PageEntrance } from "@/components/ui/page-entrance";
import { useFinanceData } from "@/hooks/finance-data-provider";

export function TransactionsPage() {
  const finance = useFinanceData();
  if (!finance.data) {
    return (
      <FinancePageState error={finance.error} isLoading={finance.isLoading} />
    );
  }

  const { categories, transactions } = finance.data;

  return (
    <PageEntrance>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-ink">
            All transactions
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            Search, organize, and manage every income and expense entry.
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
        <TransactionsManager
          categories={categories}
          defaultCurrency={finance.data.preferences?.defaultCurrency ?? "INR"}
          dateFormat={finance.data.preferences?.dateFormat ?? "DD/MM/YYYY"}
          storageMode={finance.storageMode}
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
          rules={finance.data.rules}
          transactions={transactions}
        />
      </div>
    </PageEntrance>
  );
}
