"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Download, Upload } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import {
  createFinanceBackup,
  parseFinanceBackup,
  planFinanceRestore,
  type FinanceBackup,
  type RestoreMode,
  type RestorePlan,
} from "@/lib/finance-backup";
import { formatRupees } from "@/lib/finance-utils";
import type { FinanceData } from "@/types/finance";

type FinanceBackupManagerProps = {
  data: FinanceData | null;
  onRestore: (data: FinanceData) => Promise<boolean>;
};

const emptyFinanceData: FinanceData = {
  categories: [],
  rules: [],
  transactions: [],
  recurringRules: [],
  recurringOccurrences: [],
  budgets: [],
};

function getCategoryName(backup: FinanceBackup, categoryId: string): string {
  return (
    backup.data.categories.find((category) => category.id === categoryId)?.name ??
    "Unknown category"
  );
}

export function FinanceBackupManager({
  data,
  onRestore,
}: FinanceBackupManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [backup, setBackup] = useState<FinanceBackup | null>(null);
  const [mode, setMode] = useState<RestoreMode>("merge");
  const [plan, setPlan] = useState<RestorePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const closeDialog = () => {
    setIsOpen(false);
    setBackup(null);
    setPlan(null);
    setError(null);
  };

  const downloadBackup = () => {
    if (!data) return;
    const contents = JSON.stringify(createFinanceBackup(data), null, 2);
    const url = URL.createObjectURL(
      new Blob([contents], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `spendly-backup-${new Date()
      .toISOString()
      .replaceAll(":", "-")}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const selectBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setIsOpen(true);
    setBackup(null);
    setPlan(null);
    setError(null);
    setIsReading(true);
    try {
      setBackup(parseFinanceBackup(await file.text()));
      setMode(data ? "merge" : "replace");
    } catch (readError) {
      setError(
        readError instanceof Error
          ? readError.message
          : "The selected backup could not be read.",
      );
    } finally {
      setIsReading(false);
    }
  };

  const reviewRestore = () => {
    if (!backup) return;
    try {
      setPlan(
        planFinanceRestore(data ?? emptyFinanceData, backup.data, mode),
      );
      setError(null);
    } catch (planningError) {
      setPlan(null);
      setError(
        planningError instanceof Error
          ? planningError.message
          : "This backup cannot be safely merged with current data.",
      );
    }
  };

  const confirmRestore = async () => {
    if (!plan) return;
    setIsRestoring(true);
    if (await onRestore(plan.data)) {
      closeDialog();
    } else {
      setError(
        "The backup was not fully saved. Review the current saved data before retrying.",
      );
    }
    setIsRestoring(false);
  };

  return (
    <>
      <section
        aria-labelledby="backup-heading"
        className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white px-5 py-4 shadow-card sm:px-6"
      >
        <div>
          <h2
            className="text-sm font-semibold tracking-[-0.02em] text-ink"
            id="backup-heading"
          >
            Back up your data
          </h2>
          <p className="mt-1 text-sm text-muted">
            Export categories, rules, transactions, recurring schedules,
            occurrence history, and monthly budgets, or restore them from a
            backup file.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            className="button-secondary"
            disabled={!data}
            onClick={downloadBackup}
            type="button"
          >
            <Download aria-hidden="true" className="size-4" />
            Export backup
          </button>
          <button
            className="button-secondary"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Upload aria-hidden="true" className="size-4" />
            Restore backup
          </button>
          <input
            accept="application/json,.json"
            className="sr-only"
            onChange={selectBackup}
            ref={fileInputRef}
            type="file"
          />
        </div>
      </section>

      {isOpen && (
        <Modal
          description="Review the file and choose how it should affect your current Spendly data."
          onClose={closeDialog}
          title="Restore a backup"
        >
          <div className="space-y-5 px-5 py-5 sm:px-6">
            {isReading && (
              <p className="text-sm text-muted" role="status">
                Reading and validating the selected file…
              </p>
            )}
            {error && (
              <p
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
                role="alert"
              >
                {error}
              </p>
            )}
            {backup && (
              <>
                <section
                  aria-label="Backup preview"
                  className="space-y-3 rounded-xl border border-border bg-canvas/60 p-4"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <h3 className="text-sm font-semibold text-ink">
                      File preview
                    </h3>
                    <p className="text-xs text-muted">
                      Exported{" "}
                      {new Date(backup.exportedAt).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <p className="text-xs text-muted">
                    {backup.data.categories.length} categories ·{" "}
                    {backup.data.rules.length} rules ·{" "}
                    {backup.data.transactions.length} transactions
                    {" · "}
                    {backup.data.recurringRules.length} recurring schedules
                    {" · "}
                    {backup.data.recurringOccurrences.length} occurrences
                    {" · "}
                    {backup.data.budgets.length} monthly budgets
                  </p>
                  <div className="space-y-1 text-xs text-muted">
                    <p>
                      Categories:{" "}
                      {backup.data.categories
                        .slice(0, 5)
                        .map((category) => category.name)
                        .join(", ")}
                      {backup.data.categories.length > 5 &&
                        `, and ${backup.data.categories.length - 5} more`}
                    </p>
                    {backup.data.rules.length > 0 && (
                      <p>
                        Rules:{" "}
                        {backup.data.rules
                          .slice(0, 3)
                          .map(
                            (rule) =>
                              `${getCategoryName(backup, rule.categoryId)} (${rule.keywords.join(", ")})`,
                          )
                          .join("; ")}
                        {backup.data.rules.length > 3 &&
                          `; and ${backup.data.rules.length - 3} more`}
                      </p>
                    )}
                  </div>
                  <ul className="max-h-44 divide-y divide-border overflow-y-auto">
                    {backup.data.transactions.slice(0, 5).map((transaction) => (
                      <li
                        className="flex items-start justify-between gap-3 py-2 text-xs"
                        key={transaction.id}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">
                            {transaction.description}
                          </span>
                          <span className="text-muted">
                            {transaction.date} ·{" "}
                            {getCategoryName(backup, transaction.categoryId)} ·{" "}
                            {transaction.type}
                          </span>
                        </span>
                        <span className="shrink-0 font-medium text-ink" data-financial-value>
                          {formatRupees(
                            transaction.amountPaise,
                            backup.data.preferences?.defaultCurrency ?? "INR",
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {backup.data.transactions.length > 5 && (
                    <p className="text-xs text-muted">
                      And {backup.data.transactions.length - 5} more
                      transactions.
                    </p>
                  )}
                </section>

                <fieldset className="space-y-2">
                  <legend className="mb-2 text-sm font-semibold text-ink">
                    Restore method
                  </legend>
                  <label className="flex cursor-pointer gap-3 rounded-xl border border-border p-3.5">
                    <input
                      checked={mode === "merge"}
                      disabled={!data}
                      name="restore-mode"
                      onChange={() => {
                        setMode("merge");
                        setPlan(null);
                        setError(null);
                      }}
                      type="radio"
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink">
                        Merge with current data
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted">
                        Keep current records and add backup records. Identical
                        IDs are skipped; conflicting IDs stop the merge.
                        Nothing currently saved is overwritten.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer gap-3 rounded-xl border border-border p-3.5">
                    <input
                      checked={mode === "replace"}
                      name="restore-mode"
                      onChange={() => {
                        setMode("replace");
                        setPlan(null);
                        setError(null);
                      }}
                      type="radio"
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink">
                        Replace all current data
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted">
                        Replace categories, rules, transactions, recurring
                        schedules, occurrence history, and monthly budgets saved in this browser
                        with the contents of this backup.
                      </span>
                    </span>
                  </label>
                </fieldset>

                {plan && (
                  <p className="rounded-xl border border-sage-200 bg-sage-100 px-3.5 py-3 text-sm text-forest-800">
                    Ready to {mode === "replace" ? "replace" : "merge"}:{" "}
                    {plan.added.categories} categories, {plan.added.rules}{" "}
                    rules, {plan.added.transactions} transactions,{" "}
                    {plan.added.recurringRules} recurring schedules, and{" "}
                    {plan.added.recurringOccurrences} occurrences will be added.
                    {" "}
                    {plan.added.budgets} monthly budgets will be added.
                    {mode === "replace" &&
                      " This will remove all existing categories, rules, transactions, recurring schedules, occurrence history, and monthly budgets."}
                    {" "}Nothing changes until you confirm below.
                  </p>
                )}
              </>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                className="button-secondary"
                onClick={closeDialog}
                type="button"
              >
                Cancel
              </button>
              {backup && !plan && (
                <button
                  className="button-primary"
                  onClick={reviewRestore}
                  type="button"
                >
                  Review restore
                </button>
              )}
              {plan && (
                <button
                  className={`button-primary ${
                    mode === "replace" ? "bg-red-800 hover:bg-red-700" : ""
                  }`}
                  disabled={isRestoring}
                  onClick={() => void confirmRestore()}
                  type="button"
                >
                  Confirm {mode === "replace" ? "replacement" : "merge"}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
