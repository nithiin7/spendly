# Spendly

Spendly is a personal finance dashboard built with the Next.js App Router,
TypeScript, Tailwind CSS, and Lucide React. Add, edit, search, filter, sort, and
remove income and expense transactions. Data is stored in the current browser
using localStorage; no account or server sync is configured.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```text
src/
  app/
    globals.css                 Design tokens and global styles
    layout.tsx                  Root layout and page metadata
    page.tsx                    Dashboard route composition
  components/
    dashboard/                  Summary cards and transaction-derived views
    layout/                     Responsive app shell and navigation
    transactions/               Transaction form and management list
    ui/                         Accessible reusable dialog
  hooks/
    use-finance-data.ts          Client-side state and persistence actions
  lib/
    categories.ts               Default/custom category utilities
    categorization.ts           Local rule matching and category suggestions
    categorization.test.ts      Rule engine unit tests
    finance-utils.test.ts       Monthly calculation unit tests
    demo-data.ts                Sample finance data for first run/reset
    finance-storage.ts          Validated localStorage repository
    finance-utils.ts            INR formatting and finance calculations
  types/
    finance.ts                  Shared finance domain types
```

Transaction amounts are persisted as integer paise. Saved data is loaded only
in a client effect to keep browser APIs out of server rendering; if saved data
is invalid or storage is unavailable, Spendly reports the problem instead of
silently replacing it. The transaction panel includes an explicit confirmation
before resetting to the sample dataset.

## Monthly dashboard and income

Income is recorded as an ordinary income transaction with a date, description,
and positive amount; salary and other income use the same flow. Edit an existing
income row to update it: edits replace that transaction by its ID instead of
creating a second entry. Dashboard calculations use only the selected calendar
month and year, keep income separate from expenses, and derive balance, savings
rate, category totals, transaction count, largest expense, and the expense
comparison with the previous month. Amount calculations use paise; formatting
is applied only when displaying values.

The transaction list can export all saved transactions as a CSV file with
ISO-formatted dates, decimal INR amounts, and labeled columns. **Clear all
data** requires confirmation and clears transactions plus custom categories and
rules while retaining the default categories and rules for a clean start.

## Automatic categorization

Expense descriptions are normalized to lowercase, whitespace-separated words
with punctuation removed, then compared locally against the rules in
[`src/lib/categories.ts`](./src/lib/categories.ts). The highest-priority match
wins; when priorities tie, the longer matching phrase wins. A description with
no reliable match suggests the fallback `Other` category.

Open **Categorization rules** above the transactions list to add, edit, or remove
custom rules, or edit built-in rules. Enter comma-separated keywords/aliases
and an integer priority from 0–1000. Matching category suggestions are marked
as suggested; choosing a category manually marks it confirmed and future
description edits will not replace it. Rule evaluation never sends descriptions
outside the browser.

## Next steps

1. Add focused automated tests for validation and persistence edge cases.
2. Add monthly budget settings and derive remaining-budget views.
3. Consider a charting library if interactive chart requirements justify it.

## Checks

```bash
npm run lint
npm test
npm run build
```
