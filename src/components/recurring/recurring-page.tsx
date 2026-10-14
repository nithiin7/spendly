"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  Clock3,
  Pencil,
  Play,
  Plus,
  Repeat2,
  SkipForward,
  Trash2,
  Wallet,
  Pause,
} from "lucide-react";
import { FinancePageState } from "@/components/finance/finance-page-state";
import { Modal } from "@/components/ui/modal";
import { useFinanceData } from "@/hooks/finance-data-provider";
import { formatRupees, parseRupeesToPaise } from "@/lib/finance-utils";
import { isCalendarDate } from "@/lib/recurring-transactions";
import type {
  Category,
  RecurrenceFrequency,
  RecurringOccurrence,
  RecurringRule,
  RecurringRuleInput,
  TransactionType,
} from "@/types/finance";

function localToday(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function frequencyLabel(
  frequency: RecurrenceFrequency,
  interval?: number,
): string {
  if (frequency === "custom") return `Every ${interval} days`;
  return {
    weekly: "Weekly",
    monthly: "Monthly",
    quarterly: "Quarterly",
    yearly: "Yearly",
  }[frequency];
}

function occurrenceTransactionType(
  type: TransactionType,
): "Income" | "Expense" {
  return type === "income" ? "Income" : "Expense";
}

export function RecurringPage() {
  const finance = useFinanceData();
  const [editingRule, setEditingRule] = useState<RecurringRule | "new" | null>(
    null,
  );
  const [editingOccurrence, setEditingOccurrence] =
    useState<RecurringOccurrence | null>(null);
  const [deletingRule, setDeletingRule] = useState<RecurringRule | null>(null);

  if (!finance.data) {
    return (
      <FinancePageState error={finance.error} isLoading={finance.isLoading} />
    );
  }

  const { recurringRules, recurringOccurrences, categories } = finance.data;
  const today = localToday();
  const pendingOccurrences = recurringOccurrences
    .filter((occurrence) => occurrence.status === "pending")
    .sort((left, right) => left.date.localeCompare(right.date));
  const history = recurringOccurrences
    .filter((occurrence) => occurrence.status !== "pending")
    .sort((left, right) => right.date.localeCompare(left.date));
  const activeRuleCount = recurringRules.filter((rule) => rule.active).length;
  const overdueCount = pendingOccurrences.filter(
    (occurrence) => occurrence.date < today,
  ).length;
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  async function saveRule(input: RecurringRuleInput): Promise<boolean> {
    const saved =
      editingRule === "new"
        ? await finance.addRecurringRule(input)
        : editingRule
          ? await finance.editRecurringRule(editingRule.id, input)
          : false;
    if (saved) setEditingRule(null);
    return saved;
  }

  async function saveOccurrence(input: {
    amountPaise: number;
    date: string;
  }): Promise<boolean> {
    if (!editingOccurrence) return false;
    const saved = await finance.editRecurringOccurrence(
      editingOccurrence.id,
      input,
    );
    if (saved) setEditingOccurrence(null);
    return saved;
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-ink">
            Recurring transactions
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            Keep track of scheduled income and expenses. Nothing is recorded in
            your actuals until you confirm that it happened.
          </p>
        </div>
        <button
          className="button-primary"
          onClick={() => setEditingRule("new")}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
          New schedule
        </button>
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
        aria-label="Recurring overview"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        <OverviewCard
          icon={Repeat2}
          label="Active schedules"
          value={String(activeRuleCount)}
          note={`${recurringRules.length} total`}
        />
        <OverviewCard
          icon={CalendarDays}
          label="Next occurrences"
          value={String(pendingOccurrences.length)}
          note="Waiting for your decision"
        />
        <OverviewCard
          icon={AlertCircle}
          label="Overdue"
          value={String(overdueCount)}
          note="Not counted as paid"
          urgent={overdueCount > 0}
        />
      </section>

      <section
        aria-labelledby="occurrences-heading"
        className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-forest-800">
            <Clock3 aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h3
              className="text-base font-semibold tracking-[-0.02em] text-ink"
              id="occurrences-heading"
            >
              Upcoming and overdue
            </h3>
            <p className="mt-1 text-sm text-muted">
              Only the next occurrence for each schedule is shown. Past-due
              occurrences are never assumed paid; confirm or skip one at a time
              to move the schedule forward.
            </p>
          </div>
        </div>
        {pendingOccurrences.length ? (
          <ul className="mt-5 space-y-3">
            {pendingOccurrences.map((occurrence) => {
              const rule = recurringRules.find(
                (item) => item.id === occurrence.ruleId,
              );
              const category = categoryById.get(occurrence.categoryId);
              const isOverdue = occurrence.date < today;
              return (
                <li
                  className={`rounded-xl border p-4 ${
                    isOverdue
                      ? "border-amber-200 bg-amber-50/60"
                      : "border-border bg-canvas/40"
                  }`}
                  key={occurrence.id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        aria-hidden="true"
                        className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${
                          occurrence.type === "income"
                            ? "bg-sage-100 text-forest-800"
                            : "bg-white text-muted"
                        }`}
                      >
                        <Wallet className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-sm font-semibold text-ink">
                            {occurrence.description}
                          </h4>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isOverdue
                                ? "bg-amber-100 text-amber-900"
                                : "bg-white text-muted"
                            }`}
                          >
                            {isOverdue ? "Overdue" : "Upcoming"}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {occurrenceTransactionType(occurrence.type)} ·{" "}
                          {category?.name ?? "Category unavailable"} · Due{" "}
                          {formatDate(occurrence.date)}
                          {rule
                            ? ` · ${frequencyLabel(rule.frequency, rule.interval)}`
                            : ""}
                        </p>
                        <p
                          className={`mt-1.5 text-base font-semibold tabular-nums ${
                            occurrence.type === "income"
                              ? "text-forest-800"
                              : "text-ink"
                          }`}
                        >
                          {formatRupees(occurrence.amountPaise)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button
                        aria-label={`Edit amount or date for ${occurrence.description}`}
                        className="button-secondary"
                        onClick={() => setEditingOccurrence(occurrence)}
                        type="button"
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                        Edit occurrence
                      </button>
                      <button
                        className="button-secondary"
                        onClick={() =>
                          finance.skipRecurringOccurrence(occurrence.id)
                        }
                        type="button"
                      >
                        <SkipForward aria-hidden="true" className="size-4" />
                        Skip
                      </button>
                      <button
                        className="button-primary"
                        onClick={() =>
                          finance.confirmRecurringOccurrence(occurrence.id)
                        }
                        type="button"
                      >
                        <Check aria-hidden="true" className="size-4" />
                        Confirm payment
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-canvas/40 px-5 py-8 text-center">
            <CalendarDays
              aria-hidden="true"
              className="mx-auto size-7 text-muted"
            />
            <p className="mt-2 text-sm font-medium text-ink">
              Nothing is waiting for review
            </p>
            <p className="mt-1 text-sm text-muted">
              Add a schedule or resume a paused one to see its next occurrence
              here.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="rules-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3
              className="text-base font-semibold tracking-[-0.02em] text-ink"
              id="rules-heading"
            >
              Your schedules
            </h3>
            <p className="mt-1 text-sm text-muted">
              Edit the rule, pause it temporarily, or remove it.
            </p>
          </div>
        </div>
        {recurringRules.length ? (
          <ul className="grid gap-3 lg:grid-cols-2">
            {recurringRules.map((rule) => {
              const category = categoryById.get(rule.categoryId);
              return (
                <li
                  className="rounded-2xl border border-border bg-white p-5 shadow-card"
                  key={rule.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sage-100 text-forest-800">
                        <Repeat2 aria-hidden="true" className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold text-ink">
                          {rule.description}
                        </h4>
                        <p className="mt-1 text-xs text-muted">
                          {occurrenceTransactionType(rule.type)} ·{" "}
                          {category?.name ?? "Category unavailable"} ·{" "}
                          {frequencyLabel(rule.frequency, rule.interval)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        rule.active
                          ? "bg-sage-100 text-forest-800"
                          : "bg-canvas text-muted"
                      }`}
                    >
                      {rule.active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-4">
                    <div>
                      <p className="text-lg font-semibold tabular-nums text-ink">
                        {formatRupees(rule.amountPaise)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        Next due {formatDate(rule.nextDueDate)}
                        {rule.endDate ? ` · Ends ${formatDate(rule.endDate)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        aria-label={`Edit ${rule.description} schedule`}
                        className="button-secondary"
                        onClick={() => setEditingRule(rule)}
                        type="button"
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                        Edit
                      </button>
                      <button
                        aria-label={`${rule.active ? "Pause" : "Resume"} ${rule.description} schedule`}
                        className="button-secondary"
                        onClick={() =>
                          finance.setRecurringRuleActive(rule.id, !rule.active)
                        }
                        type="button"
                      >
                        {rule.active ? (
                          <Pause aria-hidden="true" className="size-4" />
                        ) : (
                          <Play aria-hidden="true" className="size-4" />
                        )}
                        {rule.active ? "Pause" : "Resume"}
                      </button>
                      <button
                        aria-label={`Delete ${rule.description} schedule`}
                        className="flex size-11 items-center justify-center rounded-xl border border-border text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeletingRule(rule)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-white px-5 py-9 text-center">
            <Repeat2
              aria-hidden="true"
              className="mx-auto size-8 text-muted"
            />
            <p className="mt-3 text-sm font-medium text-ink">
              No recurring schedules yet
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted">
              Add recurring income or expenses like rent, subscriptions, or
              salary. Scheduled amounts stay out of your actual totals until
              confirmed.
            </p>
          </div>
        )}
      </section>

      <section
        aria-labelledby="history-heading"
        className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6"
      >
        <h3
          className="text-base font-semibold tracking-[-0.02em] text-ink"
          id="history-heading"
        >
          Recurring history
        </h3>
        <p className="mt-1 text-sm text-muted">
          Confirmed occurrences create regular transactions; skipped ones are
          kept here without affecting your finances.
        </p>
        {history.length ? (
          <ul className="mt-4 divide-y divide-border">
            {history.map((occurrence) => (
              <li
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3"
                key={occurrence.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {occurrence.description}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatDate(occurrence.date)} ·{" "}
                    {categoryById.get(occurrence.categoryId)?.name ??
                      "Category unavailable"}
                  </p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums text-ink">
                    {formatRupees(occurrence.amountPaise)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      occurrence.status === "confirmed"
                        ? "bg-sage-100 text-forest-800"
                        : "bg-canvas text-muted"
                    }`}
                  >
                    {occurrence.status === "confirmed" ? "Confirmed" : "Skipped"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl bg-canvas/60 px-4 py-5 text-center text-sm text-muted">
            Confirmed and skipped occurrences will appear here.
          </p>
        )}
      </section>

      {editingRule !== null && (
        <RecurringRuleForm
          categories={categories}
          rule={editingRule === "new" ? undefined : editingRule}
          onClose={() => setEditingRule(null)}
          onSave={saveRule}
        />
      )}
      {editingOccurrence && (
        <OccurrenceForm
          occurrence={editingOccurrence}
          onClose={() => setEditingOccurrence(null)}
          onSave={saveOccurrence}
        />
      )}
      {deletingRule && (
        <Modal
          description="Confirmed and skipped history is kept. Its unconfirmed occurrence will be removed."
          onClose={() => setDeletingRule(null)}
          size="small"
          title="Delete this schedule?"
        >
          <div className="space-y-5 px-5 py-5 sm:px-6">
            <p className="text-sm text-muted">
              Delete <span className="font-semibold text-ink">{deletingRule.description}</span>?
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <button
                className="button-secondary"
                onClick={() => setDeletingRule(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800"
                onClick={() => {
                  void finance.deleteRecurringRule(deletingRule.id).then((saved) => {
                    if (saved) {
                    setDeletingRule(null);
                    }
                  });
                }}
                type="button"
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Delete schedule
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  note,
  urgent = false,
}: {
  icon: typeof Repeat2;
  label: string;
  value: string;
  note: string;
  urgent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-card">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-10 items-center justify-center rounded-xl ${
            urgent ? "bg-amber-100 text-amber-900" : "bg-sage-100 text-forest-800"
          }`}
        >
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <p className="text-sm font-medium text-muted">{label}</p>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold tracking-[-0.04em] text-ink">
          {value}
        </p>
        <p className="pb-1 text-xs text-muted">{note}</p>
      </div>
    </div>
  );
}

function RecurringRuleForm({
  rule,
  categories,
  onClose,
  onSave,
}: {
  rule?: RecurringRule;
  categories: Category[];
  onClose: () => void;
  onSave: (input: RecurringRuleInput) => Promise<boolean>;
}) {
  const today = localToday();
  const [type, setType] = useState<TransactionType>(rule?.type ?? "expense");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [amount, setAmount] = useState(
    rule ? (rule.amountPaise / 100).toFixed(2) : "",
  );
  const [categoryId, setCategoryId] = useState(rule?.categoryId ?? "");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(
    rule?.frequency ?? "monthly",
  );
  const [interval, setInterval] = useState(
    rule?.interval ? String(rule.interval) : "1",
  );
  const [startDate, setStartDate] = useState(rule?.startDate ?? today);
  const [nextDueDate, setNextDueDate] = useState(rule?.nextDueDate ?? today);
  const [endDate, setEndDate] = useState(rule?.endDate ?? "");
  const [notes, setNotes] = useState(rule?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const availableCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountPaise = parseRupeesToPaise(amount);
    if (amountPaise === null) {
      setError("Enter an amount greater than ₹0, with up to two decimal places.");
      return;
    }
    if (!availableCategories.some((category) => category.id === categoryId)) {
      setError("Choose a category for this schedule.");
      return;
    }
    const parsedInterval = Number(interval);
    const input: RecurringRuleInput = {
      description: description.trim(),
      type,
      amountPaise,
      categoryId,
      frequency,
      ...(frequency === "custom" ? { interval: parsedInterval } : {}),
      startDate,
      nextDueDate,
      ...(endDate ? { endDate } : {}),
      active: rule?.active ?? true,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    if (await onSave(input)) return;
    setError("This recurring schedule could not be saved. Review the details and try again.");
  }

  return (
    <Modal
      description="Set the schedule and category. Scheduled entries are not actual transactions until confirmed."
      onClose={onClose}
      title={rule ? "Edit recurring schedule" : "Create recurring schedule"}
    >
      <form className="space-y-5 px-5 py-5 sm:px-6" onSubmit={submit}>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Type</legend>
          <div className="grid grid-cols-2 rounded-xl bg-canvas p-1">
            {(["expense", "income"] as const).map((option) => (
              <button
                aria-pressed={type === option}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium capitalize transition-colors ${
                  type === option
                    ? "bg-white text-forest-800 shadow-card"
                    : "text-muted hover:text-ink"
                }`}
                key={option}
                onClick={() => {
                  setType(option);
                  setCategoryId(
                    categories.find((category) => category.type === option)?.id ??
                      "",
                  );
                }}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-ink">Description</span>
            <input
              autoFocus
              className="form-input"
              maxLength={100}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. Monthly rent"
              required
              value={description}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink">Amount (INR)</span>
            <div className="relative">
              <span
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted"
              >
                ₹
              </span>
              <input
                className="form-input pl-8"
                inputMode="decimal"
                maxLength={17}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
                value={amount}
              />
            </div>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink">Category</span>
            <select
              className="form-input"
              onChange={(event) => setCategoryId(event.target.value)}
              required
              value={categoryId}
            >
              <option disabled value="">
                Choose a category
              </option>
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink">Frequency</span>
            <select
              className="form-input"
              onChange={(event) =>
                setFrequency(event.target.value as RecurrenceFrequency)
              }
              value={frequency}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="custom">Custom interval</option>
            </select>
          </label>
          {frequency === "custom" && (
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-ink">
                Repeat every (days)
              </span>
              <input
                className="form-input"
                inputMode="numeric"
                min="1"
                onChange={(event) => setInterval(event.target.value)}
                required
                type="number"
                value={interval}
              />
            </label>
          )}
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink">Start date</span>
            <input
              className="form-input"
              onChange={(event) => {
                setStartDate(event.target.value);
                if (nextDueDate < event.target.value) {
                  setNextDueDate(event.target.value);
                }
              }}
              required
              type="date"
              value={startDate}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink">Next due date</span>
            <input
              className="form-input"
              min={startDate}
              onChange={(event) => setNextDueDate(event.target.value)}
              required
              type="date"
              value={nextDueDate}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink">
              End date <span className="font-normal text-muted">· optional</span>
            </span>
            <input
              className="form-input"
              min={startDate}
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-sm font-medium text-ink">
              Notes <span className="font-normal text-muted">· optional</span>
            </span>
            <input
              className="form-input"
              maxLength={200}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add a note"
              value={notes}
            />
          </label>
        </div>
        {error && (
          <p
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <button className="button-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="button-primary" type="submit">
            {rule ? "Save schedule" : "Create schedule"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function OccurrenceForm({
  occurrence,
  onClose,
  onSave,
}: {
  occurrence: RecurringOccurrence;
  onClose: () => void;
  onSave: (input: { amountPaise: number; date: string }) => Promise<boolean>;
}) {
  const [amount, setAmount] = useState(
    (occurrence.amountPaise / 100).toFixed(2),
  );
  const [date, setDate] = useState(occurrence.date);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountPaise = parseRupeesToPaise(amount);
    if (amountPaise === null) {
      setError("Enter an amount greater than ₹0, with up to two decimal places.");
      return;
    }
    if (!isCalendarDate(date)) {
      setError("Choose a valid date for this occurrence.");
      return;
    }
    if (!(await onSave({ amountPaise, date }))) {
      setError("This occurrence could not be saved. Please try again.");
    }
  }

  return (
    <Modal
      description="These changes apply to this occurrence only; the recurring schedule will stay unchanged."
      onClose={onClose}
      size="small"
      title="Edit this occurrence"
    >
      <form className="space-y-5 px-5 py-5 sm:px-6" onSubmit={submit}>
        <p className="text-sm font-medium text-ink">{occurrence.description}</p>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink">Amount (INR)</span>
          <input
            className="form-input"
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value)}
            required
            value={amount}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-ink">Occurrence date</span>
          <input
            className="form-input"
            onChange={(event) => setDate(event.target.value)}
            required
            type="date"
            value={date}
          />
        </label>
        {error && (
          <p
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <button className="button-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="button-primary" type="submit">
            Save occurrence
          </button>
        </div>
      </form>
    </Modal>
  );
}
