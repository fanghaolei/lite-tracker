# Agent Guide

Use this file to get productive quickly in Lite Tracker. Human setup and usage instructions live in `README.md`. Optional local agent workflows can live in `.skills/*/SKILL.md`; `.skills/` is ignored by git.

## Project Snapshot

- App: local-first finance tracker.
- Backend: FastAPI, SQLAlchemy, SQLite.
- Frontend: React, TypeScript, Vite, Recharts, TanStack Table, TanStack Query.
- Real database: `lite-tracker.db` in the repo root, ignored by git.
- Demo database: `demo-lite-tracker.db`, fake data only, ignored by git.
- Built frontend output: `static/react`, ignored by git.

## Start Here

1. Check worktree before edits:

   ```bash
   git status --short
   ```

2. Prefer focused reads with `rg`:

   ```bash
   rg "term" app ui tests
   rg --files ui/src
   ```

3. Use existing structure and patterns. Do not add one-time migration code to the app codebase; use scratch scripts if needed.

4. Do not commit or push unless explicitly asked.

## Skills

- `.skills/frontend-ui/SKILL.md`
  - Use for React, TypeScript, chart, table, layout, and UI refactor work.
- `.skills/backend-data/SKILL.md`
  - Use for FastAPI routes, SQLAlchemy operations, schemas, quote cache, snapshots, cash flow, mortgage, and tests.
- `.skills/demo-assets/SKILL.md`
  - Use when refreshing README screenshots or `app/demo/assets/demo-preview.gif`.

## Runtime Commands

Install and run:

```bash
python setup_app.py
python main.py
python main.py --demo
```

Frontend:

```bash
npm run typecheck
npm run build
```

Backend tests:

```bash
python -m pytest tests -q
```

Windows temp fallback for tests:

```powershell
New-Item -ItemType Directory -Force .tmp\pytest | Out-Null
$env:TMP = "$PWD\.tmp\pytest"
$env:TEMP = "$PWD\.tmp\pytest"
python -m pytest tests -q
```

## Backend Map

- `main.py`
  - Runtime setup, `--demo` flag, React HTML serving, branding bootstrap.
- `app/api/endpoints.py`
  - API routes under `/api`.
- `app/db/models.py`
  - SQLAlchemy models.
- `app/db/schemas.py`
  - Pydantic request and response schemas.
- `app/db/operations.py`
  - Database read/write operations.
- `app/db/enums.py`
  - Asset type enum and normalization.
- `app/db/session.py`
  - SQLite engine, session factory, and database path resolution.
- `app/services/quotes.py`
  - Yahoo Finance quote retrieval and `quote_cache`.
- `app/services/history.py`
  - YTD portfolio history and historical price backfill.
- `app/services/snapshots.py`
  - Snapshot creation and retrieval.
- `app/services/mortgage.py`
  - Mortgage profile and property estimate operations.
- `app/services/settings.py`
  - Local app branding settings.
- `app/demo/demo_data.py`
  - Fake demo database seed data.

## Frontend Map

- `ui/src/main.tsx`
  - Route/page selection and app bootstrapping.
- `ui/src/api.ts`
  - Frontend API wrapper.
- `ui/src/types.ts`
  - Shared frontend types.
- `ui/src/finance.ts`
  - Portfolio/account calculations and formatting.
- `ui/src/components/*Page.tsx`
  - Page-level state, data fetching, and composition.
- `ui/src/components/portfolio`
  - Portfolio form, chart panel, and tables.
- `ui/src/components/accounts`
  - Account chart and expandable account table.
- `ui/src/components/cash-flow`
  - Cash flow editor, timeline, resources table, and details table.
- `ui/src/components/mortgage`
  - Mortgage stats, equity, payoff, and details panels.
- `ui/src/domain`
  - Frontend-only form defaults, grouping, date math, and calculations.
- `ui/src/data/queries.ts`
  - TanStack Query hooks.

## API Summary

All API routes are under `/api`.

- Holdings:
  - `GET /api/holdings`
  - `POST /api/holdings`
  - `DELETE /api/holdings/{ticker}?account={account}`
  - `POST /api/asset-types/{ticker}`
- Market data:
  - `GET /api/sync`: force-refresh live quote cache for non-manual, non-cash holdings. Do not mutate history data here.
  - `POST /api/quotes`: fetch live quotes using the server-side cache when fresh.
  - `GET /api/history`: return YTD portfolio history from snapshots and backfill.
- Snapshots:
  - `GET /api/snapshots`
  - `GET /api/snapshots/{snapshot_date}`
  - `POST /api/snapshots`
- Cash flow:
  - `GET /api/cash-flow`
  - `POST /api/cash-flow`
  - `DELETE /api/cash-flow/{item_id}`
  - `GET /api/cash-flow/recurring`
  - `POST /api/cash-flow/recurring`
  - `POST /api/cash-flow/recurring/{item_id}/cash-account`
- Mortgage:
  - `GET /api/mortgage`
  - `GET /api/mortgage/estimate`
  - `GET /api/mortgage/estimate/history`
  - `POST /api/mortgage/estimate/refresh`
- Settings:
  - `GET /api/settings/branding`
  - `POST /api/settings/branding`

## Database Summary

- `holdings`: current positions by ticker/account.
- `ticker_asset_types`: ticker-level asset class.
- `history`: historical daily close prices.
- `quote_cache`: cached live quote and previous close.
- `snapshots`: daily portfolio totals.
- `snapshot_items`: per-holding snapshot details.
- `cash_flow_items`: one-time income/expense rows.
- `recurring_cash_flows`: recurring flow templates.
- `recurring_cash_flow_skips`: skipped recurring occurrences.
- `mortgage_profiles`: mortgage terms and current principal.
- `mortgage_payment_effects`: reversible mortgage principal/interest effects from settled cash flows.
- `property_estimates`: source/date property value estimates.
- `app_settings`: local branding and page subtitles.

## Behavior Contracts

- User-specific data must live in SQLite, not source code.
- App name and subtitles are app settings.
- Asset type is ticker-level, not lot-level.
- Manual holdings use `manual_price`; live quote sync skips manual holdings and `CASH`.
- `/api/sync` refreshes live quote cache only. It must not alter `history`.
- Portfolio history may combine snapshot points and backfilled points.
- Snapshots are one per day; overwrites require confirmation in the UI.
- Cash-flow settlement updates associated cash accounts and can be reversed by unsetting settled state.
- Settled mortgage payments reduce principal and create reversible `mortgage_payment_effects`.
- Demo screenshots must only use fake demo data.

## Test Baseline

Current baseline: `85 passed`.

Covered modules:

- `tests/test_asset_types.py`
- `tests/test_operations.py`
- `tests/test_snapshot_service.py`
- `tests/test_settings_service.py`
- `tests/test_quote_service.py`
- `tests/test_sync_endpoint.py`
- `tests/test_demo_data.py`

## Git Hygiene

- Do not commit ignored local data: `*.db`, `.venv`, `node_modules`, `static/react`, `htmlcov`, `.coverage`, `.tmp`.
- Do not revert user changes unless explicitly asked.
- If demo media is refreshed, verify branding is `Demo Ledger` before keeping screenshots.
