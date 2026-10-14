<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project guidance

Spendly is a personal finance and expense tracker. It is a single Next.js App Router page; the UI is client-side where it needs browser storage, user interaction, or React state. There is no backend, authentication, cloud sync, or environment-variable configuration.

### Structure

- `src/app/`: the root layout, metadata, global styles, and dashboard route.
- `src/components/layout/`: responsive app shell and navigation.
- `src/components/dashboard/`: monthly summary, spending trend, category breakdown, and recent activity.
- `src/components/transactions/`: transaction forms and management, including category rules.
- `src/components/ui/`: shared UI primitives such as the modal.
- `src/hooks/`: finance state and mutation actions (`use-finance-data.ts`).
- `src/lib/`: categories, categorization, persistence, demo data, financial calculations, and their tests.
- `src/types/`: shared finance-domain types.

### Implementation conventions

- Keep TypeScript strict and use the existing `@/*` alias for imports from `src/`.
- Prefer server components by default; add `"use client"` only for hooks, event handlers, or browser APIs.
- Keep finance state changes in `useFinanceData` and persistence in `finance-storage.ts`. Do not access localStorage directly from UI components.
- Reuse the helpers in `src/lib/` instead of duplicating calculations, categorization, validation, or CSV behavior.
- Store monetary amounts as integer paise (`amountPaise`). Parse rupees to paise at input boundaries, reject unsafe values, calculate with integers, and format as INR only for display/export. Do not use floating-point rupees for arithmetic.
- Keep transaction dates as `YYYY-MM-DD` strings and month keys as `YYYY-MM`.
- Surface storage and mutation failures to the user; do not silently replace invalid saved data or report a failed save as successful.

### Verification

Use the scripts defined in `package.json`:

```bash
npm run dev
npm run lint
npm test
npm run build
```

Tests use Node’s built-in test runner and live in `src/lib/*.test.ts`. Add or update focused tests for changes to financial calculations, currency parsing, categorization, persistence validation, or CSV generation. Run lint, tests, and a production build for relevant changes; do not claim checks passed unless they were run.

### Scope, dependencies, and privacy

- Preserve the existing design and behavior; keep changes focused and avoid unrelated rewrites.
- Do not add dependencies for functionality available in the existing stack or standard platform APIs.
- Do not add account, network, analytics, or sync behavior without explicit product approval.
- Treat transaction descriptions, amounts, notes, and exports as sensitive. Do not log or transmit finance data, add real personal data to fixtures, or imply that localStorage is encrypted.
- Do not add credentials or secrets. No environment variables are currently required.
