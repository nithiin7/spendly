<div align="center">

# Spendly

### Personal finance tracking made simple

A private, browser-first finance app for tracking income, expenses, recurring bills, budgets, and spending patterns.

<a href="https://github.com/nithiin7/spendly"><img alt="GitHub repository" src="https://img.shields.io/badge/GitHub-nithiin7%2Fspendly-181717?logo=github"></a>
<img alt="Next.js 16.4.0" src="https://img.shields.io/badge/Next.js-16.4.0-black?logo=nextdotjs">
<img alt="React 19.3.0" src="https://img.shields.io/badge/React-19.3.0-149eca?logo=react">
<img alt="Tailwind CSS 4.3.3" src="https://img.shields.io/badge/Tailwind_CSS-4.3.3-06b6d4?logo=tailwindcss">
<img alt="TypeScript 5.9.3" src="https://img.shields.io/badge/TypeScript-5.9.3-3178c6?logo=typescript">

</div>

Spendly helps you keep your money organized without overcomplicating it. Use it to track daily spending, monitor income, stay ahead of recurring charges, and understand where your money is going.

## Quick features

- Dashboard overview: monthly balance, income, expenses, savings rate, and recent activity
- Transactions: add, edit, delete, search, filter, sort, and manage income and expense entries
- Income tracking: separate income records and monthly income summaries
- Recurring transactions: schedule future income and bills and confirm or skip each occurrence
- Budgets: set monthly overall and category limits and compare them with actual spending
- Insights: compare month-over-month trends and see category breakdowns over time
- Categories and rules: create custom categories and automate tagging with matching rules
- Settings and backups: change currency/date preferences, export JSON backups, and restore data safely
- Private/local-first: keep your finance data on the current device and migrate or back up when needed

## Main sections

- Overview — monthly snapshot of money in and out
- Transactions — add and manage every income and expense entry
- Income — track income separately from spending activity
- Recurring — manage scheduled bills and income that need confirmation
- Budgets — compare planned vs actual spending by month and category
- Insights — review trends, spending breakdowns, and comparisons
- Categories — organize transactions and create category rules
- Settings — backup, restore, and customize your display preferences

## How to use it

1. Open the dashboard and choose the month you want to review.
2. Add transactions from the Transactions or Income pages.
3. Create categories and rules so new entries are grouped automatically.
4. Set monthly budget limits in Budgets.
5. Review recurring payments in Recurring to confirm or skip upcoming items.
6. Use Insights to compare spending and spot patterns.
7. Back up your data from Settings whenever you want a safe restore point.

## Run locally

Requirements: Node.js 22.6.0 or newer and npm.

```bash
npm ci
npm run dev
```

Open http://localhost:3000

Common checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Supabase setup

Spendly supports private cloud storage and auth through Supabase. You can also run it in local-only mode without Supabase if you only want browser storage.

1. Create a Supabase project.
2. In the Supabase dashboard, go to Authentication → URL Configuration and add:
   - `http://localhost:3000/**`
   - your deployed app URL
3. In Authentication → Providers, enable Email sign-in and configure password recovery / verification flows.
4. To enable Google sign-in:
   - create an OAuth client in Google Cloud Console
   - add the Supabase Google callback URL as an authorized redirect URI
   - copy the client ID and secret into Supabase → Authentication → Providers → Google
5. To enable Microsoft sign-in:
   - create an app in Microsoft Entra ID
   - add the Supabase Azure callback URL as a redirect URI
   - copy the client ID and secret into Supabase → Authentication → Providers → Azure
6. Create a `.env.local` file from `.env.example` or add the values directly:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

7. Apply the database migrations in order:

```bash
supabase link --project-ref PROJECT_REF
supabase db push
```

8. Start the app:

```bash
npm run dev
```

Then sign in or create an account at `/auth/sign-in`.

## Privacy

Spendly is designed to keep your financial data personal. If you are signed in, your data is stored in your private Supabase account. If you are not signed in, it stays in the browser. You can still export backups and import or migrate local data safely from Settings.

## Screenshot

![Spendly dashboard](./public/spendly.png)

See [CONTRIBUTING.md](./CONTRIBUTING.md) for project contribution details and [LICENSE](./LICENSE) for licensing information.
