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

## Next steps

1. Add focused automated tests for finance calculations, validation, and
   persistence edge cases.
2. Add salary and monthly budget settings, then derive remaining-budget views.
3. Consider a charting library when interactive chart requirements justify it.

## Checks

```bash
npm run lint
npm run build
```
