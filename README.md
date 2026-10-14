<div align="center">

# Spendly

### Your money, in perspective.

A private, browser-based finance app for tracking income, expenses, and spending patterns.

<a href="https://github.com/nithiin7/spendly"><img alt="GitHub repository" src="https://img.shields.io/badge/GitHub-nithiin7%2Fspendly-181717?logo=github"></a>
<img alt="Next.js 16.4.0" src="https://img.shields.io/badge/Next.js-16.4.0-black?logo=nextdotjs">
<img alt="React 19.3.0" src="https://img.shields.io/badge/React-19.3.0-149eca?logo=react">
<img alt="Tailwind CSS 4.3.3" src="https://img.shields.io/badge/Tailwind_CSS-4.3.3-06b6d4?logo=tailwindcss">
<img alt="TypeScript 5.9.3" src="https://img.shields.io/badge/TypeScript-5.9.3-3178c6?logo=typescript">

</div>

Spendly is a personal finance tracker built with Next.js, TypeScript, Tailwind CSS, and Supabase. Manage transactions and categories, review monthly summaries and charts, and export your records as CSV. Authenticated records are stored in a user-scoped Supabase database; the existing browser data remains available for migration.

## Pages

- **Overview (`/`)** — monthly balance, savings rate, spending breakdown, trends, and recent activity.
- **Transactions (`/transactions`)** — search, filter, sort, add, edit, delete, and export entries.
- **Income (`/income`)** — income transactions and monthly income history.
- **Recurring (`/recurring`)** — manage scheduled income and expense occurrences, and confirm or skip them.
- **Budgets (`/budgets`)** — set monthly overall and optional category spending limits, review confirmed actuals, and copy category allocations from the previous month.
- **Insights (`/insights`)** — month selection, comparisons, and spending analytics.
- **Categories (`/categories`)** — categories and automatic categorization rules.
- **Settings (`/settings`)** — JSON backup and restore, and local-data migration.

## Features

- 💸 Add, edit, delete, search, filter, sort, and export income and expense transactions.
- 🔁 Schedule recurring income and expenses; upcoming entries do not affect actual totals until confirmed, and skipped or confirmed occurrences remain in history.
- 🏷️ Organize transactions with custom categories and editable, rule-based suggestions.
- 📊 Review monthly income, expenses, balance, savings rate, category totals, and six-month spending trends.
- 🎯 Compare confirmed expenses with monthly and category budgets, including spending that has no category allocation.
- 🔒 Keep finance records private to the signed-in account using Supabase Auth and PostgreSQL row-level security.
- 💾 Export a versioned JSON backup of categories, rules, transactions, recurring history, and monthly budgets; preview and validate a backup before merging or replacing local data.
- ↩️ Clear saved data or restore the included sample data, with confirmation.

## Screenshot

![Spendly dashboard](./public/spendly.png)

## Technology

Next.js 16 · React 19 · TypeScript 5 · Tailwind CSS 4 · Lucide React

## Run locally

Requirements: Node.js 22.6.0 or newer and npm. The test script uses Node’s built-in TypeScript stripping.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). To check the project, run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`. GitHub Actions runs these checks on pushes and pull requests.

## Supabase setup

1. Create a Supabase project and configure the Site URL and allowed redirect URLs in **Authentication → URL Configuration**. Include `http://localhost:3000/**` and your deployed app URL. The OAuth providers must redirect back to Supabase's callback URL shown in each provider's dashboard settings; Spendly then completes the flow at `/auth/callback`.
2. In **Authentication → Providers**, enable **Email** for email/password sign-in and email verification. Configure verification and password recovery templates to return users to the app.
3. To enable Google sign-in, create an OAuth client in Google Cloud Console. Add the Supabase Auth callback URL shown on the Supabase Google provider page as an authorized redirect URI. Copy the Google client ID and secret into **Supabase → Authentication → Providers → Google** and enable the provider.
4. To enable Microsoft sign-in, register an application in Microsoft Entra ID. Add the Supabase Auth callback URL shown on the Supabase Azure/Microsoft provider page as a Web redirect URI. Copy the application (client) ID and client secret into **Supabase → Authentication → Providers → Azure**, choose the appropriate tenant, and enable the provider. The app requests the `email` scope.
5. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the project's Connect/API settings. These are the only Supabase credentials needed by the app; keep OAuth client secrets in the Supabase dashboard and never put secrets or service-role keys in browser code.
6. Apply both versioned migrations, in order: `20261014000000_finance_schema.sql` and `20261014000001_finance_migrations.sql`. With the Supabase CLI, run `supabase link --project-ref PROJECT_REF` and then `supabase db push`; the CLI applies both migrations.
7. Run the database authorization tests with `supabase test db` after installing/configuring the Supabase CLI and its local database dependencies. This verifies the owner and cross-account RLS cases against the configured local database.
8. Run `npm ci`, then `npm run dev`. Create an account or sign in at `/auth/sign-in`; Google and Microsoft buttons are shown on the sign-in and sign-up pages.

### Importing existing browser data

1. Sign in on the browser/device that contains the existing Spendly data, then open **Settings**.
2. Review the detected record counts and merge preview. Spendly validates the complete dataset before writing. Existing cloud records are retained; matching categories are linked, conflicting record IDs are remapped, and existing monthly budget/allocation values win.
3. Choose **Import local data**. The import can be retried after a network or database failure; the browser copy is retained, and successful imports are recorded per account to prevent duplicate imports.
4. Verify the imported records in the app and export a backup if desired. Only then select the verification checkbox and choose **Remove browser copy**. JSON backup and restore remain available and accept older backup formats.

If cloud and local data both exist, the import merges them; it never replaces the cloud dataset. If a migration fails, keep the browser data, reload cloud data from the error banner, and retry from Settings. Do not clear the browser copy as a recovery step.

This schema covers the data model currently present in Spendly: categories, categorization rules, income/expense transactions, recurring rules and occurrences, monthly budgets, and category allocations. The current application has no Planner/monthly plan or preferences entity; those are intentionally not invented by the migration. Amounts are stored as integer paise, preserving the domain representation. Existing string record IDs are retained.

## Data and privacy

Supabase Auth identifies each user and PostgreSQL row-level security restricts every finance table to its owner. The public URL and publishable key are not privileged credentials; access control is enforced by RLS rather than trusting client-supplied owner IDs. Do not disable RLS or deploy privileged keys to a browser. Local browser data is not encrypted; keep JSON backups and CSV exports private.

JSON backups are downloaded to your device and retain their versioned schema for compatibility with existing exports. Backup files are validated before import; keep exported files private and secure. Local-to-cloud migration must be previewed while signed in. It validates record relationships before import and must not remove browser data until successful migration has been verified. If both local and cloud records exist, use merge/reconciliation instead of replacing cloud data.

See [Contributing](./CONTRIBUTING.md) for how to get involved and [LICENSE](./LICENSE) for the project’s license.
