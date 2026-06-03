# API Reference

All API routes are under `/api`.

## Holdings

- `POST /api/holdings`
  - Create or update one holding.
- `GET /api/holdings`
  - List current holdings.
- `DELETE /api/holdings/{ticker}?account={account}`
  - Delete one holding lot by ticker and account.
- `POST /api/asset-types/{ticker}`
  - Update ticker-level asset type.

## Market Data

- `GET /api/sync`
  - Force-refresh live quote cache for non-manual, non-cash holdings.
  - Returns synced tickers and refreshed quotes.
- `POST /api/quotes`
  - Fetch live quotes for a ticker list, using the server-side quote cache when fresh.
- `GET /api/history`
  - Return YTD portfolio history (snapshot + backfill).

## Snapshots

- `GET /api/snapshots`
  - List snapshots.
- `GET /api/snapshots/{snapshot_date}`
  - Get one snapshot by `YYYY-MM-DD`.
- `POST /api/snapshots`
  - Save snapshot for today.
  - Request body: `{ "overwrite": false }`
  - Returns `409` if a snapshot for today exists and `overwrite` is `false`.

## Cash Flow

- `GET /api/cash-flow`
- `POST /api/cash-flow`
- `DELETE /api/cash-flow/{item_id}`
- `GET /api/cash-flow/recurring`
- `POST /api/cash-flow/recurring/{item_id}/cash-account`

## Mortgage

- `GET /api/mortgage`
- `GET /api/mortgage/estimate`
- `GET /api/mortgage/estimate/history`
- `POST /api/mortgage/estimate/refresh`

## Settings

- `GET /api/settings/branding`
  - Return app name and page subtitles.
- `POST /api/settings/branding`
  - Update one or more branding fields.
