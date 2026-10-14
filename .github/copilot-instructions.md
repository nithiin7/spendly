# Copilot instructions

- Read [AGENTS.md](../AGENTS.md) for the project structure, implementation patterns, financial precision rules, and verification commands.
- Keep changes focused and preserve existing UI behavior. Do not introduce dependencies or refactor unrelated application code without a clear need.
- Store money as integer paise and use the shared helpers in `src/lib/` for calculations, categorization, validation, persistence, and CSV export.
- Keep finance data in the existing browser-local storage flow. Do not add network transmission, analytics, credentials, or claims of encryption.
- For relevant code changes, run the applicable existing checks: `npm run lint`, `npm test`, and `npm run build`.
