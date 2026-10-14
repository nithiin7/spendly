"use client";

import { useMemo, useState } from "react";
import { FinancePageState } from "@/components/finance/finance-page-state";
import { FinanceBackupManager } from "@/components/backup/finance-backup-manager";
import { PageEntrance } from "@/components/ui/page-entrance";
import { useFinanceData } from "@/hooks/finance-data-provider";
import {
  createMigrationRecordId,
  reconcileLocalFinanceData,
} from "@/lib/finance-migration";
import type { FinanceImportCounts } from "@/lib/finance-migration";
import { getOrCreateFinanceMigrationId } from "@/lib/finance-storage";

const countLabels: [keyof FinanceImportCounts, string][] = [
  ["categories", "Categories"],
  ["rules", "Categorization rules"],
  ["transactions", "Transactions"],
  ["recurringRules", "Recurring rules"],
  ["recurringOccurrences", "Occurrence history"],
  ["budgets", "Monthly budgets"],
  ["budgetAllocations", "Category allocations"],
];

function formatCounts(counts: FinanceImportCounts): string {
  return countLabels
    .map(([key, label]) => `${counts[key]} ${label.toLowerCase()}`)
    .join(" · ");
}

export function SettingsPage() {
  const finance = useFinanceData();
  const [isMigrating, setIsMigrating] = useState(false);
  const [verifiedLocalCopy, setVerifiedLocalCopy] = useState(false);
  const preview = useMemo(() => {
    if (!finance.localMigrationData || !finance.cloudData) return null;
    try {
      return {
        plan: reconcileLocalFinanceData(
          finance.cloudData,
          finance.localMigrationData,
          (entityType, recordId, attempt) =>
            createMigrationRecordId(
              getOrCreateFinanceMigrationId(),
              entityType,
              recordId,
              attempt,
            ),
        ),
        error: null,
      };
    } catch (error) {
      return {
        plan: null,
        error:
          error instanceof Error
            ? error.message
            : "Local data could not be validated for migration.",
      };
    }
  }, [finance.cloudData, finance.localMigrationData]);

  const importLocalData = async () => {
    setIsMigrating(true);
    await finance.migrateLocalData();
    setIsMigrating(false);
  };

  return (
    <PageEntrance>
    <div className="space-y-7">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-ink">
          Preferences and data
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          Manage your account data, move existing browser records to the cloud,
          and keep portable backups.
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
      {finance.storageMode === "cloud" && finance.localMigrationData && (
        <section
          aria-labelledby="migration-heading"
          className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6"
        >
          <div>
            <h3 className="font-semibold text-ink" id="migration-heading">
              Import browser data
            </h3>
            <p className="mt-1.5 text-sm leading-6 text-muted">
              Review the records detected in this browser and how they will
              merge with your account before importing. Cloud records are never
              replaced: matching categories are linked, ID collisions are
              remapped, and existing budget allocation values take precedence.
            </p>
          </div>
          {finance.localMigrationError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              {finance.localMigrationError} Your local copy has not been
              changed.
            </p>
          )}
          {preview?.error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
              The local dataset could not be validated: {preview.error} No
              records have been imported.
            </p>
          )}
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-ink">Available in this browser</dt>
              <dd className="mt-1 text-muted">
                {formatCounts({
                  categories: finance.localMigrationData.categories.length,
                  rules: finance.localMigrationData.rules.length,
                  transactions: finance.localMigrationData.transactions.length,
                  recurringRules: finance.localMigrationData.recurringRules.length,
                  recurringOccurrences:
                    finance.localMigrationData.recurringOccurrences.length,
                  budgets: finance.localMigrationData.budgets.length,
                  budgetAllocations:
                    finance.localMigrationData.budgets.reduce(
                      (total, budget) => total + budget.allocations.length,
                      0,
                    ),
                })}
              </dd>
            </div>
            {preview?.plan && (
              <div>
                <dt className="font-medium text-ink">Will be added</dt>
                <dd className="mt-1 text-muted">
                  {formatCounts(preview.plan.added)}
                  {" · "}
                  {preview.plan.conflictsResolved} conflicts reconciled
                </dd>
              </div>
            )}
          </dl>
          {finance.migrationComplete ? (
            <div className="space-y-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
              <p role="status">
                {finance.migrationOutcome
                  ? `Import completed: ${formatCounts(finance.migrationOutcome.added)}; ${finance.migrationOutcome.conflictsResolved} conflicts reconciled.`
                  : "This browser dataset was already imported to this account."}
                {" "}Your local copy remains available until you verify the cloud data.
              </p>
              <label className="flex items-start gap-2">
                <input
                  checked={verifiedLocalCopy}
                  onChange={(event) => setVerifiedLocalCopy(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  I have verified the imported records in my account and have a
                  separate backup if needed.
                </span>
              </label>
              <button
                className="button-secondary"
                disabled={!verifiedLocalCopy}
                onClick={() => {
                  if (verifiedLocalCopy) {
                    finance.clearLocalMigrationCopy();
                    setVerifiedLocalCopy(false);
                  }
                }}
                type="button"
              >
                Remove browser copy
              </button>
            </div>
          ) : (
            <button
              className="button-primary"
              disabled={
                isMigrating ||
                finance.isSaving ||
                !preview?.plan ||
                Boolean(finance.localMigrationError)
              }
              onClick={() => void importLocalData()}
              type="button"
            >
              {isMigrating ? "Importing…" : "Import local data"}
            </button>
          )}
        </section>
      )}
      <section className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6">
        <h3 className="font-semibold text-ink">Storage</h3>
        <p className="mt-2 text-sm leading-6 text-muted">
          {finance.storageMode === "cloud"
            ? `Your finance data is stored in your signed-in Supabase account${finance.userEmail ? ` (${finance.userEmail})` : ""} and synchronized across devices. A remaining browser copy is available for migration until you remove it after verification.`
            : "Your finance data is stored in this browser and is not synced to an account. Sign in to use cloud storage and migrate this data."}
        </p>
      </section>
    </div>
    </PageEntrance>
  );
}
