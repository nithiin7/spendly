# Spendly

Spendly is a personal finance dashboard built with the Next.js App Router,
TypeScript, Tailwind CSS, and Lucide React. The current dashboard is a responsive
UI foundation populated with clearly labeled sample figures; it does not yet
save or edit financial data.

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
    dashboard/                  Summary cards, spending views, transactions
    layout/                     Responsive app shell and navigation
  lib/
    demo-data.ts                Typed sample dashboard data
  types/
    finance.ts                  Shared finance domain types
```

Keep route components focused on composition, share domain types in `types`,
and move reusable calculations and persistence into `lib` or focused feature
modules as those capabilities are added.

## Next implementation steps

1. Define the transaction and category model, then add transaction creation,
   editing, deletion, and accessible form validation.
2. Add a typed local-storage repository and a hook for loading, updating, and
   handling unavailable or invalid saved data.
3. Add salary and monthly budget settings, with pure, unit-tested calculations
   for totals, remaining budget, and savings rate.
4. Replace the sample figures with persisted data and add empty/loading states.
5. Add focused tests for calculation, validation, and persistence behavior;
   introduce a charting dependency only when interactive chart needs justify it.

## Checks

```bash
npm run lint
npm run build
```
