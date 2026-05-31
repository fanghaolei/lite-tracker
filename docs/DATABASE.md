# Database Schema

Database file: `lite-tracker.db` (SQLite).

## Portfolio Tables

- `holdings`
  - Current positions by ticker and account.
- `ticker_asset_types`
  - Ticker-level classification (`stock`, `fund`, `cash equivalents`, `crypto`, `other`).
- `history`
  - Daily close price history by ticker and date.
- `quote_cache`
  - Cached live quote and `prev_close`.

## Snapshot Tables

- `snapshots`
  - Daily portfolio summary totals.
- `snapshot_items`
  - Per-holding snapshot details.
  - Unique constraint on `(snapshot_id, ticker, account)`.

## Cash Flow Tables

- `cash_flow_items`
  - Scheduled one-time income/expense entries.
- `recurring_cash_flows`
  - Recurring income/expense templates.

## Mortgage Tables

- `mortgage_profiles`
  - Mortgage terms and principal balance.
- `property_estimates`
  - Property estimates by source and date.
  - Unique constraint on `(source, date)`.

## App Settings

- `app_settings`
  - Local key/value settings such as app branding.
  - Stores customizable labels without hardcoding user-specific values in source code.
