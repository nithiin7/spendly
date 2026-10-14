"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Sparkles } from "lucide-react";
import { FinancePageState } from "@/components/finance/finance-page-state";
import { CustomDropdown } from "@/components/ui/custom-dropdown";
import { CategoryRulesManager } from "@/components/transactions/category-rules-manager";
import { useFinanceData } from "@/hooks/finance-data-provider";
import type { Category, TransactionType } from "@/types/finance";

export function CategoriesPage() {
  const finance = useFinanceData();
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<TransactionType>("expense");
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!finance.data) {
    return (
      <FinancePageState error={finance.error} isLoading={finance.isLoading} />
    );
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await finance.addCustomCategory(newName, newType);
      setNewName("");
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Category could not be added.",
      );
    }
  }

  async function saveCategory(category: Category) {
    if (!(await finance.editCategory(category.id, editName))) {
      setError("The category name could not be saved.");
      return;
    }
    setEditing(null);
    setEditName("");
    setError(null);
  }

  const { categories, rules } = finance.data;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.04em] text-ink">
            Categories and rules
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            Organize your entries and manage local automatic category suggestions.
          </p>
        </div>
        <button
          className="button-secondary"
          onClick={() => setShowRules(true)}
          type="button"
        >
          <Sparkles aria-hidden="true" className="size-4" />
          Automatic rules ({rules.length})
        </button>
      </div>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      <section
        aria-labelledby="category-list-heading"
        className="overflow-hidden rounded-2xl border border-border bg-white shadow-card"
      >
        <div className="border-b border-border px-5 py-4 sm:px-6">
          <h3 className="font-semibold text-ink" id="category-list-heading">
            Your categories
          </h3>
        </div>
        <ul className="divide-y divide-border">
          {categories.map((category) => (
            <li
              className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:px-6"
              key={category.id}
            >
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {editing?.id === category.id ? (
                <>
                  <label className="sr-only" htmlFor={`edit-${category.id}`}>
                    Edit {category.name} category name
                  </label>
                  <input
                    autoFocus
                    className="form-input min-w-[160px] flex-1"
                    id={`edit-${category.id}`}
                    maxLength={40}
                    onChange={(event) => setEditName(event.target.value)}
                    value={editName}
                  />
                  <button
                    className="button-primary"
                    onClick={() => saveCategory(category)}
                    type="button"
                  >
                    Save
                  </button>
                  <button
                    className="button-secondary"
                    onClick={() => setEditing(null)}
                    type="button"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                    {category.name}
                  </span>
                  <span className="rounded-full bg-canvas px-2.5 py-1 text-xs capitalize text-muted">
                    {category.type}
                  </span>
                  {category.isDefault && (
                    <span className="text-xs text-muted">Built-in</span>
                  )}
                  <button
                    aria-label={`Rename ${category.name} category`}
                    className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-700"
                    onClick={() => {
                      setEditing(category);
                      setEditName(category.name);
                      setError(null);
                    }}
                    type="button"
                  >
                    <Pencil aria-hidden="true" className="size-4" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <form
        className="rounded-2xl border border-border bg-white p-5 shadow-card sm:p-6"
        onSubmit={addCategory}
      >
        <h3 className="font-semibold text-ink">Add a category</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
          <label>
            <span className="sr-only">New category name</span>
            <input
              className="form-input"
              maxLength={40}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Category name"
              required
              value={newName}
            />
          </label>
          <label>
            <span className="sr-only">New category type</span>
            <CustomDropdown
              className="form-input"
              onChange={(type) =>
                setNewType(type as TransactionType)
              }
              options={[
                { value: "expense", label: "Expense" },
                { value: "income", label: "Income" },
              ]}
              value={newType}
            />
          </label>
          <button className="button-primary" type="submit">
            Add category
          </button>
        </div>
      </form>

      {showRules && (
        <CategoryRulesManager
          categories={categories}
          onAdd={finance.addCategorizationRule}
          onClose={() => setShowRules(false)}
          onDelete={finance.deleteCategorizationRule}
          onEdit={finance.editCategorizationRule}
          rules={rules}
        />
      )}
    </div>
  );
}
