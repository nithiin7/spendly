"use client";

import { FinancePageState } from "@/components/finance/finance-page-state";
import { FinanceBackupManager } from "@/components/backup/finance-backup-manager";
import { useFinanceData } from "@/hooks/finance-data-provider";

export function SettingsPage() {
  const finance = useFinanceData();

  return (
    <div className="space-y-7">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-ink">
          Preferences and data
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          Your financial records stay in this browser. Export a backup
          regularly to keep a portable copy.
        </p>
      </div>
      {!finance.data && (
        <FinancePageState error={finance.error} isLoading={finance.isLoading} />
      )}
      {finance.error && finance.data && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {finance.error}
        </p>
      )}
      <FinanceBackupManager
        data={finance.data}
        onRestore={finance.restoreData}
      />
      <section className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6">
        <h3 className="font-semibold text-ink">Storage</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          Spendly saves your categories, automatic rules, and transactions to
          local browser storage. Data is not synced to an account or encrypted
          by this app.
        </p>
      </section>
    </div>
  );
}
