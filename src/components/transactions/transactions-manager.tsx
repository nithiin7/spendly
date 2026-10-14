"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowDownUp,
  ArrowUpRight,
  CalendarDays,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { CategoryRulesManager } from "@/components/transactions/category-rules-manager";
import {
  filterAndSortTransactions,
  formatTransactionAmount,
} from "@/lib/finance-utils";
import type {
  Category,
  CategoryRule,
  CategoryRuleInput,
  Transaction,
  TransactionInput,
  TransactionType,
} from "@/types/finance";
import { TransactionForm } from "./transaction-form";

type TransactionsManagerProps = {
  categories: Category[];
  rules: CategoryRule[];
  transactions: Transaction[];
  onAdd: (input: TransactionInput) => boolean;
  onUpdate: (id: string, input: TransactionInput) => boolean;
  onDelete: (id: string) => boolean;
  onAddCategory: (name: string, type: TransactionType) => Category;
  onRenameCategory: (id: string, name: string) => boolean;
  onAddRule: (input: CategoryRuleInput) => boolean;
  onEditRule: (ruleId: string, input: CategoryRuleInput) => boolean;
  onDeleteRule: (ruleId: string) => boolean;
  onResetDemo: () => boolean;
};

type Confirmation =
  | { type: "delete"; transaction: Transaction }
  | { type: "reset" }
  | null;

type TransactionSort =
  | "date-desc"
  | "date-asc"
  | "amount-desc"
  | "amount-asc";

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function TransactionsManager({
  categories,
  rules,
  transactions,
  onAdd,
  onUpdate,
  onDelete,
  onAddCategory,
  onRenameCategory,
  onAddRule,
  onEditRule,
  onDeleteRule,
  onResetDemo,
}: TransactionsManagerProps) {
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("all");
  const [type, setType] = useState<TransactionType | "all">("all");
  const [categoryId, setCategoryId] = useState("");
  const [sort, setSort] = useState<TransactionSort>("date-desc");
  const [editing, setEditing] = useState<Transaction | null | "new">(null);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [showRules, setShowRules] = useState(false);

  const filteredTransactions = useMemo(
    () =>
      filterAndSortTransactions(transactions, {
        query,
        month,
        type,
        categoryId,
        sort,
      }),
    [transactions, query, month, type, categoryId, sort],
  );

  const months = [...new Set(transactions.map(({ date }) => date.slice(0, 7)))]
    .sort()
    .reverse();
  const filteredCategories =
    type === "all"
      ? categories
      : categories.filter((category) => category.type === type);

  function clearFilters() {
    setQuery("");
    setMonth("all");
    setType("all");
    setCategoryId("");
    setSort("date-desc");
  }

  function updateType(value: TransactionType | "all") {
    setType(value);
    if (
      value !== "all" &&
      !categories.some(
        (category) => category.id === categoryId && category.type === value,
      )
    ) {
      setCategoryId("");
    }
  }

  function confirmAction(): boolean {
    if (!confirmation) return false;
    const succeeded =
      confirmation.type === "delete"
        ? onDelete(confirmation.transaction.id)
        : onResetDemo();
    if (succeeded) setConfirmation(null);
    return succeeded;
  }

  return (
    <>
      <TransactionPanel
        categories={categories}
        categoryId={categoryId}
        clearFilters={clearFilters}
        filteredTransactions={filteredTransactions}
        filters={{ query, month, type, sort }}
        months={months}
        onAdd={() => setEditing("new")}
        onManageRules={() => setShowRules(true)}
        onDelete={(transaction) =>
          setConfirmation({ type: "delete", transaction })
        }
        onEdit={setEditing}
        onReset={() => setConfirmation({ type: "reset" })}
        onSearch={setQuery}
        onSelectCategory={setCategoryId}
        onSelectMonth={setMonth}
        onSelectSort={setSort}
        onSelectType={updateType}
        transactions={transactions}
        categoriesForFilter={filteredCategories}
      />
      {editing !== null && (
        <TransactionForm
          categories={categories}
          rules={rules}
          onAddCategory={onAddCategory}
          onClose={() => setEditing(null)}
          onRenameCategory={onRenameCategory}
          onSave={(input) =>
            editing === "new" ? onAdd(input) : onUpdate(editing.id, input)
          }
          transaction={editing === "new" ? undefined : editing}
        />
      )}
      {confirmation && (
        <ConfirmationDialog
          confirmation={confirmation}
          onClose={() => setConfirmation(null)}
          onConfirm={confirmAction}
        />
      )}
      {showRules && (
        <CategoryRulesManager
          categories={categories}
          onAdd={onAddRule}
          onClose={() => setShowRules(false)}
          onDelete={onDeleteRule}
          onEdit={onEditRule}
          rules={rules}
        />
      )}
    </>
  );
}

type TransactionPanelProps = {
  categories: Category[];
  categoriesForFilter: Category[];
  categoryId: string;
  clearFilters: () => void;
  filteredTransactions: Transaction[];
  filters: {
    query: string;
    month: string;
    type: TransactionType | "all";
    sort: TransactionSort;
  };
  months: string[];
  onAdd: () => void;
  onManageRules: () => void;
  onDelete: (transaction: Transaction) => void;
  onEdit: (transaction: Transaction) => void;
  onReset: () => void;
  onSearch: (value: string) => void;
  onSelectCategory: (value: string) => void;
  onSelectMonth: (value: string) => void;
  onSelectSort: (value: TransactionSort) => void;
  onSelectType: (value: TransactionType | "all") => void;
  transactions: Transaction[];
};

function TransactionPanel({
  categories,
  categoriesForFilter,
  categoryId,
  clearFilters,
  filteredTransactions,
  filters,
  months,
  onAdd,
  onManageRules,
  onDelete,
  onEdit,
  onReset,
  onSearch,
  onSelectCategory,
  onSelectMonth,
  onSelectSort,
  onSelectType,
  transactions,
}: TransactionPanelProps) {
  const hasActiveFilters =
    Boolean(filters.query) ||
    filters.month !== "all" ||
    filters.type !== "all" ||
    Boolean(categoryId);

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
            Transactions
          </h2>
          <p className="mt-1 text-sm text-muted">
            {transactions.length} {transactions.length === 1 ? "record" : "records"}{" "}
            saved on this device
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <button
            className="button-secondary"
            onClick={onManageRules}
            type="button"
          >
            <Sparkles aria-hidden="true" className="size-4" />
            Categorization rules
          </button>
          <button className="button-secondary" onClick={onReset} type="button">
            Reset sample data
          </button>
          <button className="button-primary" onClick={onAdd} type="button">
            <Plus aria-hidden="true" className="size-4" />
            Add transaction
          </button>
        </div>
      </div>

      <div className="grid gap-3 border-y border-border bg-canvas/60 px-5 py-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-[minmax(220px,1.5fr)_repeat(4,minmax(130px,1fr))]">
        <label className="relative sm:col-span-2 xl:col-span-1">
          <span className="sr-only">Search by description</span>
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <input
            className="form-input pl-9"
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search transactions"
            type="search"
            value={filters.query}
          />
        </label>
        <label>
          <span className="sr-only">Filter by month</span>
          <select
            className="form-input"
            onChange={(event) => onSelectMonth(event.target.value)}
            value={filters.month}
          >
            <option value="all">All months</option>
            {months.map((value) => (
              <option key={value} value={value}>
                {formatMonth(value)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by transaction type</span>
          <select
            className="form-input"
            onChange={(event) =>
              onSelectType(event.target.value as TransactionType | "all")
            }
            value={filters.type}
          >
            <option value="all">All types</option>
            <option value="expense">Expenses</option>
            <option value="income">Income</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by category</span>
          <select
            className="form-input"
            onChange={(event) => onSelectCategory(event.target.value)}
            value={categoryId}
          >
            <option value="">All categories</option>
            {categoriesForFilter.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Sort transactions</span>
          <select
            className="form-input"
            onChange={(event) =>
              onSelectSort(event.target.value as TransactionSort)
            }
            value={filters.sort}
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Amount: high to low</option>
            <option value="amount-asc">Amount: low to high</option>
          </select>
        </label>
      </div>

      {filteredTransactions.length > 0 ? (
        <>
          <div className="hidden grid-cols-[minmax(220px,1.5fr)_minmax(140px,1fr)_minmax(110px,0.8fr)_minmax(130px,1fr)_minmax(130px,0.9fr)_88px] gap-4 border-b border-border px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted md:grid">
            <span>Description</span>
            <span>Category</span>
            <span>Date</span>
            <span>Payment method</span>
            <span className="text-right">Amount</span>
            <span className="sr-only">Actions</span>
          </div>
          <ul className="divide-y divide-border">
            {filteredTransactions.map((transaction) => {
              const category = categories.find(
                (item) => item.id === transaction.categoryId,
              );

              return (
                <li
                  className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(220px,1.5fr)_minmax(140px,1fr)_minmax(110px,0.8fr)_minmax(130px,1fr)_minmax(130px,0.9fr)_88px] md:items-center md:gap-4 md:px-6"
                  key={transaction.id}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                        transaction.type === "income"
                          ? "bg-sage-100 text-positive"
                          : "bg-canvas text-forest-800"
                      }`}
                    >
                      {transaction.type === "income" ? (
                        <ArrowDownLeft aria-hidden="true" className="size-4" />
                      ) : (
                        <ArrowUpRight aria-hidden="true" className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {transaction.description}
                      </p>
                      {transaction.notes && (
                        <p className="truncate text-xs text-muted">
                          {transaction.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="pl-12 text-xs text-muted md:pl-0 md:text-sm md:text-ink">
                    <span className="md:hidden">Category · </span>
                    <span>{category?.name ?? "Uncategorized"}</span>
                    {transaction.categorySource === "suggested" ? (
                      <span className="ml-2 rounded-full bg-sage-100 px-2 py-0.5 text-[10px] font-medium text-forest-800">
                        Suggested
                      </span>
                    ) : (
                      <span className="ml-2 rounded-full bg-canvas px-2 py-0.5 text-[10px] font-medium text-muted">
                        Confirmed
                      </span>
                    )}
                  </span>
                  <span className="pl-12 text-xs text-muted md:pl-0 md:text-sm md:text-ink">
                    <span className="md:hidden">Date · </span>
                    {formatDate(transaction.date)}
                  </span>
                  <span className="pl-12 text-xs text-muted md:pl-0 md:text-sm">
                    <span className="md:hidden">Paid via · </span>
                    {transaction.paymentMethod ?? "—"}
                  </span>
                  <span
                    className={`pl-12 text-sm font-semibold tabular-nums md:pl-0 md:text-right ${
                      transaction.type === "income"
                        ? "text-positive"
                        : "text-ink"
                    }`}
                  >
                    <span className="mr-1 font-normal text-muted md:hidden">
                      Amount ·
                    </span>
                    {formatTransactionAmount(
                      transaction.amountPaise,
                      transaction.type,
                    )}
                  </span>
                  <div className="flex justify-end gap-1 md:justify-end">
                    <button
                      aria-label={`Edit ${transaction.description}`}
                      className="flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink"
                      onClick={() => onEdit(transaction)}
                      type="button"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      aria-label={`Delete ${transaction.description}`}
                      className="flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-700"
                      onClick={() => onDelete(transaction)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 sm:px-6">
            <p className="text-xs text-muted">
              Showing {filteredTransactions.length} of {transactions.length}{" "}
              transactions
            </p>
            {hasActiveFilters && (
              <button
                className="text-xs font-medium text-forest-800 underline-offset-2 hover:underline"
                onClick={clearFilters}
                type="button"
              >
                Clear filters
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="px-5 py-12 text-center sm:px-6">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-canvas text-muted">
            {transactions.length === 0 ? (
              <CalendarDays aria-hidden="true" className="size-5" />
            ) : (
              <Search aria-hidden="true" className="size-5" />
            )}
          </span>
          <h3 className="mt-4 text-sm font-semibold text-ink">
            {transactions.length === 0
              ? "No transactions yet"
              : "No matching transactions"}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            {transactions.length === 0
              ? "Add an income or expense to start understanding your money."
              : "Try changing your search or filters to find what you’re looking for."}
          </p>
          {hasActiveFilters ? (
            <button
              className="button-secondary mt-4"
              onClick={clearFilters}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
              Clear filters
            </button>
          ) : transactions.length === 0 ? (
            <button className="button-primary mt-4" onClick={onAdd} type="button">
              <Plus aria-hidden="true" className="size-4" />
              Add transaction
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ConfirmationDialog({
  confirmation,
  onClose,
  onConfirm,
}: {
  confirmation: Exclude<Confirmation, null>;
  onClose: () => void;
  onConfirm: () => boolean;
}) {
  const isReset = confirmation.type === "reset";
  const [error, setError] = useState(false);

  return (
    <Modal
      description={
        isReset
          ? "This replaces your saved transactions and custom categories with the original sample data."
          : `“${confirmation.transaction.description}” will be permanently removed from this device.`
      }
      onClose={onClose}
      size="small"
      title={isReset ? "Reset sample data?" : "Delete transaction?"}
    >
      <div className="space-y-4 px-5 py-5 sm:px-6">
        {error && (
          <p className="text-sm text-red-700" role="alert">
            The action could not be completed. Check the storage error above and try again.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button className="button-secondary" onClick={onClose} type="button">
            Cancel
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-700 px-4 text-sm font-medium text-white transition-colors hover:bg-red-800"
            onClick={() => {
              if (!onConfirm()) setError(true);
            }}
            type="button"
          >
            {isReset ? (
              <ArrowDownUp aria-hidden="true" className="size-4" />
            ) : (
              <Trash2 aria-hidden="true" className="size-4" />
            )}
            {isReset ? "Reset data" : "Delete"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
