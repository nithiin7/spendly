# Contributing to Spendly

Thanks for considering a contribution. Keep changes focused, preserve existing behavior, and describe any user-visible differences clearly.

## Development setup

Use Node.js 22.6.0 or newer and npm. The test script uses Node’s built-in TypeScript stripping:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The project currently has no environment-variable setup.

## Making a change

1. Create a branch from the current default branch. Use a descriptive prefix such as `feat/`, `fix/`, or `docs/`.
2. Keep the pull request limited to one coherent change. Avoid unrelated formatting, rewrites, or new dependencies.
3. Add or update focused tests when changing financial calculations, parsing, categorization, persistence validation, or CSV export.
4. Before opening a pull request, run the relevant checks:

   ```bash
   npm run lint
   npm run typecheck
   npm test
   npm run build
   ```

5. Do not include real financial data, credentials, or other sensitive information in code, screenshots, test fixtures, or issue reports.

## Commits and pull requests

Use a short, imperative Conventional Commit-style subject, for example `fix: preserve category selection` or `docs: clarify local data storage`.

Pull requests should explain the problem and solution, note any behavior or UI changes, and report the checks actually run. Include before-and-after screenshots for visual changes when useful, using sample data only. Call out any data-storage or privacy implications.

## Reporting issues

Use the bug report or feature request form in GitHub Issues. Keep reports focused and remove personal finance data before sharing logs, screenshots, or exported files.
