# Architecture

## Runtime Structure

- Backend: FastAPI (`main.py`)
- Data layer: SQLAlchemy + SQLite (`lite-tracker.db`)
- Frontend: React + TypeScript built by Vite into `static/react`

## Backend Modules

- `app/api/endpoints.py`
  - API route handlers.
- `app/crud.py`
  - Holding, cash-flow, and recurring cash-flow DB operations.
- `app/asset_types.py`
  - Asset type enum and normalization.
- `app/quote_service.py`
  - Live quote retrieval and quote cache.
- `app/history_service.py`
  - Price history sync and YTD portfolio history.
- `app/snapshot_service.py`
  - Snapshot creation and snapshot retrieval.
- `app/mortgage_service.py`
  - Mortgage profile and property estimate operations.

## Data Flow

1. Frontend calls `/api/...`.
2. Endpoint validates input using Pydantic schemas.
3. Endpoint delegates to CRUD/service modules.
4. Modules read/write SQLAlchemy models.
5. Response is serialized back to JSON.

## Key Design Rules

- Asset type is ticker-level (stored in `ticker_asset_types`).
- Live quote cache is server-side (`quote_cache` table).
- One snapshot per date in `snapshots`.
- History output can mix:
  - `snapshot` points from saved snapshots.
  - `backfill` points from history + current holdings.
