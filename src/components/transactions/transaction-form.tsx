"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, Pencil, Plus, X } from "lucide-react";
import { CalendarPicker } from "@/components/ui/calendar-picker";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { Modal } from "@/components/ui/modal";
import {
  convertMinorUnits,
  formatCurrency,
  getLatestExchangeRate,
  parseCurrencyAmount,
  supportedCurrencies,
} from "@/lib/currency";
import {
  applyCategorySuggestion,
  suggestCategory,
  type CategorySuggestion,
} from "@/lib/categorization";
import type {
  Category,
  CategoryRule,
  Transaction,
  TransactionInput,
  TransactionType,
  DateFormat,
} from "@/types/finance";

type TransactionFormProps = {
  transaction?: Transaction;
  initialType?: TransactionType;
  categories: Category[];
  rules: CategoryRule[];
  onClose: () => void;
  onSave: (input: TransactionInput) => Promise<boolean>;
  onAddCategory: (name: string, type: TransactionType) => Promise<Category>;
  onRenameCategory: (id: string, name: string) => Promise<boolean>;
  defaultCurrency: string;
  dateFormat: DateFormat;
};

function localToday(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export function TransactionForm({
  transaction,
  initialType = "expense",
  categories,
  rules,
  onClose,
  onSave,
  onAddCategory,
  onRenameCategory,
  defaultCurrency,
  dateFormat,
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(
    transaction?.type ?? initialType,
  );
  const availableCategories = categories.filter(
    (category) => category.type === type,
  );
  const [categoryId, setCategoryId] = useState(
    transaction?.categoryId ?? "",
  );
  const [categorySource, setCategorySource] = useState<"suggested" | "manual">(
    transaction ? transaction.categorySource ?? "manual" : "suggested",
  );
  const [description, setDescription] = useState(
    transaction?.description ?? "",
  );
  const [amount, setAmount] = useState(
    transaction
      ? ((transaction.originalAmountPaise ?? transaction.amountPaise) / 100).toFixed(2)
      : "",
  );
  const [currency, setCurrency] = useState(
    transaction?.originalCurrency ?? defaultCurrency,
  );
  const [date, setDate] = useState(transaction?.date ?? localToday());
  const [paymentMethod, setPaymentMethod] = useState(
    transaction?.paymentMethod ?? "",
  );
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [categoryName, setCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isRenamingCategory, setIsRenamingCategory] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [convertedPreview, setConvertedPreview] = useState<{
    amountPaise: number;
    rateDate: string;
    key: string;
  } | null>(null);
  const [previewError, setPreviewError] = useState<{
    key: string;
    message: string;
  } | null>(null);
  const previewKey = `${amount}|${currency}|${defaultCurrency}|${type}`;

  useEffect(() => {
    const enteredAmount = parseCurrencyAmount(amount);
    if (type !== "expense" || currency === defaultCurrency || enteredAmount === null) {
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      void getLatestExchangeRate(currency, defaultCurrency).then(
        (rate) => {
          if (!active) return;
          setConvertedPreview({
            amountPaise: convertMinorUnits(enteredAmount, rate.rate),
            rateDate: rate.rateDate,
            key: previewKey,
          });
          setPreviewError(null);
        },
        (caught: unknown) => {
          if (!active) return;
          setConvertedPreview(null);
          setPreviewError({
            key: previewKey,
            message:
              caught instanceof Error
                ? caught.message
                : "The current exchange rate could not be loaded.",
          });
        },
      );
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [amount, currency, defaultCurrency, previewKey, type]);

  function changeType(nextType: TransactionType) {
    setType(nextType);
    if (nextType === "income") setCurrency(defaultCurrency);
    const suggestion = suggestCategory(
      description,
      categories,
      rules,
      nextType,
    );
    const selection = applyCategorySuggestion(
      { categoryId, categorySource: "suggested" },
      suggestion,
    );
    setCategorySource(selection.categorySource);
    setCategoryId(selection.categoryId ?? "");
    setError(null);
  }

  function updateDescription(value: string) {
    setDescription(value);
    if (categorySource === "manual") return;
    const selection = applyCategorySuggestion(
      { categoryId, categorySource },
      suggestCategory(value, categories, rules, type),
    );
    setCategoryId(selection.categoryId ?? "");
    setCategorySource(selection.categorySource);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const enteredAmountPaise = parseCurrencyAmount(amount);
    if (enteredAmountPaise === null) {
      setError(`Enter an amount greater than 0 ${currency}, with up to two decimal places.`);
      return;
    }
    if (!description.trim()) {
      setError("Enter a description for this transaction.");
      return;
    }
    if (!categories.some((category) => category.id === categoryId && category.type === type)) {
      setError("Choose a category for this transaction.");
      return;
    }

    try {
      const rate = await getLatestExchangeRate(currency, defaultCurrency);
      const amountPaise = convertMinorUnits(enteredAmountPaise, rate.rate);
      const saved = await onSave({
        type,
        description: description.trim(),
        amountPaise,
        categoryId,
        categorySource,
        date,
        ...(currency !== defaultCurrency
          ? {
              originalAmountPaise: enteredAmountPaise,
              originalCurrency: currency,
              exchangeRateDate: rate.rateDate,
            }
          : {}),
        ...(paymentMethod.trim() ? { paymentMethod: paymentMethod.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      if (saved) onClose();
      else setError("This transaction could not be saved. Please try again.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? `The exchange rate could not be loaded: ${caught.message}`
          : "The exchange rate could not be loaded. Check your connection and retry.",
      );
    }
  }

  async function addCategory() {
    try {
      const category = await onAddCategory(categoryName, type);
      setCategoryId(category.id);
      setCategorySource("manual");
      setCategoryName("");
      setIsAddingCategory(false);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Category could not be added.",
      );
    }
  }

  async function renameSelectedCategory() {
    if (!categoryId || !(await onRenameCategory(categoryId, renameValue))) {
      setError("The category name could not be saved.");
      return;
    }
    setIsRenamingCategory(false);
    setRenameValue("");
    setError(null);
  }

  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );
  const currentSuggestion: CategorySuggestion | null = suggestCategory(
    description,
    categories,
    rules,
    type,
  );

  return (
    <Modal
      description="Enter the details below. Amounts are stored precisely in paise."
      onClose={onClose}
      title={transaction ? "Edit transaction" : "Add transaction"}
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
                onClick={() => changeType(option)}
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
              onChange={(event) => updateDescription(event.target.value)}
              placeholder="e.g. Weekly groceries"
              required
              type="text"
              value={description}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink">Amount ({currency})</span>
            <div className="relative">
              <input
                aria-describedby="amount-hint"
                aria-label={`Amount in ${currency}`}
                className="form-input"
                inputMode="decimal"
                maxLength={17}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
                type="text"
                value={amount}
              />
            </div>
            <span className="block text-xs text-muted" id="amount-hint">
              Enter a positive amount with up to two decimal places.
            </span>
            {currency !== defaultCurrency &&
              convertedPreview?.key === previewKey && (
              <span className="block text-xs font-medium text-forest-800" aria-live="polite">
                Approximately {formatCurrency(convertedPreview.amountPaise, defaultCurrency)} at the latest rate
                ({convertedPreview.rateDate}).
              </span>
            )}
            {currency !== defaultCurrency &&
              previewError?.key === previewKey && (
              <span className="block text-xs text-red-700" role="status">
                Rate preview unavailable: {previewError.message}
              </span>
            )}
          </label>
          {type === "expense" && (
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-ink">Currency</span>
              <select
                className="form-input"
                onChange={(event) => setCurrency(event.target.value)}
                value={currency}
              >
                {[...new Set([defaultCurrency, ...supportedCurrencies])].map(
                  (code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ),
                )}
              </select>
            </label>
          )}
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink">Date</span>
            <CalendarPicker
              dateFormat={dateFormat}
              onChange={setDate}
              value={date}
            />
          </label>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-ink" htmlFor="categoryId">
              Category
            </label>
            <div className="flex gap-2">
              <CustomDropdown
                className="form-input min-w-0 flex-1"
                id="categoryId"
                onChange={(categoryId) => {
                  setCategoryId(categoryId);
                  setCategorySource("manual");
                }}
                placeholder="Choose a category"
                required
                options={availableCategories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
                value={categoryId}
              />
              {selectedCategory && (
                <button
                  aria-label={`Rename ${selectedCategory.name} category`}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition-colors hover:bg-canvas hover:text-ink"
                  onClick={() => {
                    setRenameValue(selectedCategory.name);
                    setIsRenamingCategory((current) => !current);
                    setIsAddingCategory(false);
                  }}
                  type="button"
                >
                  <Pencil aria-hidden="true" className="size-4" />
                </button>
              )}
              <button
                aria-label="Create a category"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted transition-colors hover:bg-canvas hover:text-ink"
                onClick={() => {
                  setIsAddingCategory((current) => !current);
                  setIsRenamingCategory(false);
                }}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
              </button>
            </div>
            <p
              aria-live="polite"
              className={`mt-1.5 text-xs ${
                categorySource === "suggested"
                  ? "text-forest-800"
                  : "text-muted"
              }`}
            >
              {categorySource === "suggested"
                ? description.trim()
                  ? currentSuggestion?.confidence === "fallback"
                    ? "Suggested · no rule matched; using the fallback category."
                    : "Suggested from description · change category to confirm your choice."
                  : "Enter a description to get a category suggestion."
                : "Chosen by you · description changes won’t change this category."}
            </p>
            {isAddingCategory && (
              <div className="flex gap-2 pt-2">
                <input
                  aria-label="New category name"
                  className="form-input min-w-0 flex-1"
                  maxLength={40}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder={`New ${type} category`}
                  value={categoryName}
                />
                <button
                  aria-label="Save new category"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-forest-800 text-white hover:bg-forest-700"
                  onClick={addCategory}
                  type="button"
                >
                  <Check aria-hidden="true" className="size-4" />
                </button>
                <button
                  aria-label="Cancel creating category"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted hover:bg-canvas"
                  onClick={() => setIsAddingCategory(false)}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            )}
            {isRenamingCategory && (
              <div className="flex gap-2 pt-2">
                <input
                  aria-label="Rename selected category"
                  className="form-input min-w-0 flex-1"
                  maxLength={40}
                  onChange={(event) => setRenameValue(event.target.value)}
                  value={renameValue}
                />
                <button
                  aria-label="Save category name"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-forest-800 text-white hover:bg-forest-700"
                  onClick={renameSelectedCategory}
                  type="button"
                >
                  <Check aria-hidden="true" className="size-4" />
                </button>
                <button
                  aria-label="Cancel renaming category"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border text-muted hover:bg-canvas"
                  onClick={() => setIsRenamingCategory(false)}
                  type="button"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              </div>
            )}
          </div>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink">
              Payment method <span className="font-normal text-muted">· optional</span>
            </span>
            <input
              className="form-input"
              maxLength={50}
              onChange={(event) => setPaymentMethod(event.target.value)}
              placeholder="e.g. UPI, cash"
              type="text"
              value={paymentMethod}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-ink">
              Notes <span className="font-normal text-muted">· optional</span>
            </span>
            <input
              className="form-input"
              maxLength={200}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add a note"
              type="text"
              value={notes}
            />
          </label>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <button className="button-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="button-primary" type="submit">
            {transaction ? "Save changes" : "Add transaction"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
