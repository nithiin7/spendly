"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
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
import { supportedCurrencies } from "@/lib/currency";
import type { DateFormat } from "@/types/finance";

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
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [preserveOriginalAmounts, setPreserveOriginalAmounts] = useState(true);
  const [conversionAcknowledged, setConversionAcknowledged] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState({
    completed: 0,
    total: 0,
  });
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const preferences = finance.data?.preferences ?? {
    defaultCurrency: "INR",
    dateFormat: "DD/MM/YYYY" as const,
    hideBalances: false,
  };

  const changeCurrency = async () => {
    if (!pendingCurrency || !conversionAcknowledged) return;
    setIsConverting(true);
    setConversionProgress({ completed: 0, total: 0 });
    const saved = await finance.changeDefaultCurrency(
      pendingCurrency,
      preserveOriginalAmounts,
      (completed, total) => setConversionProgress({ completed, total }),
    );
    setIsConverting(false);
    if (saved) {
      setPendingCurrency(null);
      setConversionAcknowledged(false);
      setConversionProgress({ completed: 0, total: 0 });
    }
  };

  const savePreference = async (
    patch: Partial<typeof preferences>,
  ): Promise<void> => {
    setIsSavingPreferences(true);
    await finance.updatePreferences({ ...preferences, ...patch });
    setIsSavingPreferences(false);
  };
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
      <section
        aria-labelledby="preferences-heading"
        className="space-y-5 rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6"
      >
        <div>
          <h3 className="font-semibold text-ink" id="preferences-heading">
            Display preferences
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            Choose how amounts and dates appear throughout Spendly.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink">Default currency</span>
            <select
              className="form-input"
              disabled={!finance.data || finance.isSaving || isSavingPreferences}
              onChange={(event) => {
                if (event.target.value !== preferences.defaultCurrency) {
                  setPendingCurrency(event.target.value);
                  setConversionAcknowledged(false);
                  setPreserveOriginalAmounts(true);
                }
              }}
              value={pendingCurrency ?? preferences.defaultCurrency}
            >
              {[...new Set([preferences.defaultCurrency, ...supportedCurrencies])].map(
                (currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ),
              )}
            </select>
            <span className="block text-xs text-muted">
              Saved amounts are shown and summarized in this currency.
            </span>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink">Date format</span>
            <select
              className="form-input"
              disabled={!finance.data || finance.isSaving || isSavingPreferences}
              onChange={(event) =>
                void savePreference({ dateFormat: event.target.value as DateFormat })
              }
              value={preferences.dateFormat}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </label>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input
            checked={preferences.hideBalances}
            className="mt-0.5"
            disabled={!finance.data || finance.isSaving || isSavingPreferences}
            onChange={(event) =>
              void savePreference({ hideBalances: event.target.checked })
            }
            type="checkbox"
          />
          <span>
            <span className="font-medium text-ink">Hide balances</span>
            <span className="mt-0.5 block text-muted">
              Blur financial totals on this device when you want more privacy.
            </span>
          </span>
        </label>
      </section>
      <FinanceBackupManager
        data={finance.data}
        onRestore={finance.restoreData}
      />
      {pendingCurrency && (
        <Modal
          description={`Changing the default currency to ${pendingCurrency} requires historical exchange rates for your saved records.`}
          onClose={() => {
            if (!isConverting) setPendingCurrency(null);
          }}
          title="Change default currency?"
        >
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="note">
              <p className="font-semibold">Amounts will be converted using historical rates</p>
              <p className="mt-1">
                This includes transactions, recurring schedules and history, budgets,
                and category allocations. It may take a while. Spendly will save
                nothing if any required exchange rate is unavailable.
              </p>
            </div>
            <fieldset className="space-y-3 text-sm">
              <legend className="mb-2 font-medium text-ink">
                What should happen to original currency details?
              </legend>
              <label className="flex items-start gap-2.5">
                <input
                  checked={preserveOriginalAmounts}
                  disabled={isConverting}
                  name="currency-history"
                  onChange={() => setPreserveOriginalAmounts(true)}
                  type="radio"
                />
                <span>
                  Keep each record&apos;s original amount and currency for reference.
                </span>
              </label>
              <label className="flex items-start gap-2.5">
                <input
                  checked={!preserveOriginalAmounts}
                  disabled={isConverting}
                  name="currency-history"
                  onChange={() => setPreserveOriginalAmounts(false)}
                  type="radio"
                />
                <span>
                  Convert all saved amounts permanently and remove their original
                  currency details.
                </span>
              </label>
            </fieldset>
            <label className="flex items-start gap-2.5 text-sm text-ink">
              <input
                checked={conversionAcknowledged}
                disabled={isConverting}
                onChange={(event) => setConversionAcknowledged(event.target.checked)}
                type="checkbox"
              />
              <span>
                I understand this updates all saved monetary records using
                historical exchange rates.
              </span>
            </label>
            {isConverting && (
              <div aria-live="polite" className="space-y-2">
                <progress
                  aria-label="Converting saved amounts"
                  className="w-full accent-forest-800"
                  max={conversionProgress.total || 1}
                  value={conversionProgress.completed}
                />
                <p className="text-xs text-muted">
                  {conversionProgress.total
                    ? `Converting record ${conversionProgress.completed} of ${conversionProgress.total}…`
                    : "Loading historical exchange rates…"}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button
                className="button-secondary"
                disabled={isConverting}
                onClick={() => setPendingCurrency(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="button-primary"
                disabled={!conversionAcknowledged || isConverting || finance.isSaving}
                onClick={() => void changeCurrency()}
                type="button"
              >
                {isConverting ? "Converting…" : "Confirm currency change"}
              </button>
            </div>
          </div>
        </Modal>
      )}
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
