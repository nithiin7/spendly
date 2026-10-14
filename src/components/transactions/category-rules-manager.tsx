"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import type {
  Category,
  CategoryRule,
  CategoryRuleInput,
} from "@/types/finance";

type CategoryRulesManagerProps = {
  categories: Category[];
  rules: CategoryRule[];
  onClose: () => void;
  onAdd: (input: CategoryRuleInput) => Promise<boolean>;
  onEdit: (ruleId: string, input: CategoryRuleInput) => Promise<boolean>;
  onDelete: (ruleId: string) => Promise<boolean>;
};

type RuleForm = {
  categoryId: string;
  keywords: string;
  priority: string;
};

function toRuleForm(rule: CategoryRule): RuleForm {
  return {
    categoryId: rule.categoryId,
    keywords: rule.keywords.join(", "),
    priority: String(rule.priority),
  };
}

function parseRuleForm(form: RuleForm): CategoryRuleInput | null {
  const priority = Number(form.priority);
  if (!form.categoryId || !Number.isInteger(priority)) return null;
  const keywords = form.keywords
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  if (keywords.length === 0) return null;
  return { categoryId: form.categoryId, keywords, priority };
}

function RuleFields({
  form,
  categories,
  onChange,
}: {
  form: RuleForm;
  categories: Category[];
  onChange: (form: RuleForm) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(130px,0.8fr)_minmax(180px,1.6fr)_100px]">
      <label className="space-y-1">
        <span className="text-xs font-medium text-muted">Category</span>
        <select
          className="form-input"
          onChange={(event) =>
            onChange({ ...form, categoryId: event.target.value })
          }
          value={form.categoryId}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium text-muted">
          Keywords / aliases
        </span>
        <input
          className="form-input"
          onChange={(event) =>
            onChange({ ...form, keywords: event.target.value })
          }
          placeholder="e.g. petrol pump, fuel station"
          type="text"
          value={form.keywords}
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium text-muted">Priority</span>
        <input
          className="form-input"
          max={1000}
          min={0}
          onChange={(event) =>
            onChange({ ...form, priority: event.target.value })
          }
          type="number"
          value={form.priority}
        />
      </label>
    </div>
  );
}

export function CategoryRulesManager({
  categories,
  rules,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}: CategoryRulesManagerProps) {
  const expenseCategories = categories.filter(
    (category) => category.type === "expense",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<RuleForm | null>(null);
  const [newForm, setNewForm] = useState<RuleForm>({
    categoryId:
      expenseCategories.find((category) => category.name === "Other")?.id ??
      expenseCategories[0]?.id ??
      "",
    keywords: "",
    priority: "50",
  });
  const [error, setError] = useState<string | null>(null);

  async function saveNewRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = parseRuleForm(newForm);
    if (!input) {
      setError("Choose a category, enter keywords, and set a whole-number priority.");
      return;
    }
    if (!(await onAdd(input))) {
      setError("The rule could not be saved. Check for duplicate keywords.");
      return;
    }
    setNewForm({ ...newForm, keywords: "" });
    setError(null);
  }

  async function saveEditedRule(ruleId: string) {
    if (!editingForm) return;
    const input = parseRuleForm(editingForm);
    if (!input) {
      setError("Choose a category, enter keywords, and set a whole-number priority.");
      return;
    }
    if (!(await onEdit(ruleId, input))) {
      setError("The rule could not be saved. Check for duplicate keywords.");
      return;
    }
    setEditingId(null);
    setEditingForm(null);
    setError(null);
  }

  async function deleteRule(ruleId: string) {
    if (!(await onDelete(ruleId))) {
      setError("The custom rule could not be removed.");
    } else {
      setError(null);
    }
  }

  return (
    <Modal
      description="Rules run locally. Higher priority matches win; longer phrases break ties."
      onClose={onClose}
      title="Automatic category rules"
    >
      <div className="space-y-5 px-5 py-5 sm:px-6">
        <p className="rounded-xl bg-sage-100 px-3.5 py-3 text-sm leading-6 text-forest-800">
          Add comma-separated keywords or phrases for a category. For
          overlapping rules, the highest priority wins; ties go to the longer
          matching phrase. Unknown descriptions suggest Other.
        </p>

        <div className="max-h-[min(44vh,380px)] space-y-2 overflow-y-auto pr-1">
          {[...rules]
            .sort((left, right) => right.priority - left.priority)
            .map((rule) => {
              const category = categories.find(
                (item) => item.id === rule.categoryId,
              );
              const isEditing = editingId === rule.id;

              return (
                <div
                  className="rounded-xl border border-border p-3.5"
                  key={rule.id}
                >
                  {isEditing && editingForm ? (
                    <div className="space-y-3">
                      <RuleFields
                        categories={categories.filter(
                          (item) => item.type === category?.type,
                        )}
                        form={editingForm}
                        onChange={setEditingForm}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          className="button-secondary"
                          onClick={() => {
                            setEditingId(null);
                            setEditingForm(null);
                          }}
                          type="button"
                        >
                          Cancel
                        </button>
                        <button
                          className="button-primary"
                          onClick={() => saveEditedRule(rule.id)}
                          type="button"
                        >
                          <Save aria-hidden="true" className="size-4" />
                          Save rule
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-ink">
                            {category?.name ?? "Unknown category"}
                          </span>
                          <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] text-muted">
                            Priority {rule.priority}
                          </span>
                          {rule.isDefault && (
                            <span className="rounded-full bg-sage-100 px-2 py-0.5 text-[11px] font-medium text-forest-800">
                              Built-in
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 break-words text-xs leading-5 text-muted">
                          {rule.keywords.join(", ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button
                          aria-label={`Edit rule for ${category?.name ?? "unknown category"}`}
                          className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
                          onClick={() => {
                            setEditingId(rule.id);
                            setEditingForm(toRuleForm(rule));
                            setError(null);
                          }}
                          type="button"
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                        </button>
                        {!rule.isDefault && (
                          <button
                            aria-label={`Delete rule for ${category?.name ?? "unknown category"}`}
                            className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-red-50 hover:text-red-700"
                            onClick={() => void deleteRule(rule.id)}
                            type="button"
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        <form
          className="space-y-3 border-t border-border pt-5"
          onSubmit={saveNewRule}
        >
          <h3 className="text-sm font-semibold text-ink">Add a rule</h3>
          <RuleFields
            categories={expenseCategories}
            form={newForm}
            onChange={setNewForm}
          />
          <button className="button-primary" type="submit">
            <Plus aria-hidden="true" className="size-4" />
            Add rule
          </button>
        </form>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end border-t border-border pt-4">
          <button className="button-secondary" onClick={onClose} type="button">
            <X aria-hidden="true" className="size-4" />
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}
