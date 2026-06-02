# Architecture

## Runtime Structure

- Backend: FastAPI (`main.py`)
- Data layer: SQLAlchemy + SQLite (`lite-tracker.db`)
- Frontend: React + TypeScript built by Vite into `static/react`

## Frontend Modules

- `ui/src/components/*Page.tsx`
  - Page-level data fetching, state, and composition.
- `ui/src/components/portfolio`
  - Portfolio form, chart panel, and TanStack tables.
- `ui/src/components/accounts`
  - Account allocation chart panel and expandable account table.
- `ui/src/components/cash-flow`
  - Cash-flow editor, timeline, resources table, and details table.
- `ui/src/components/mortgage`
  - Mortgage equity, payoff, stats, and loan detail panels.
- `ui/src/domain`
  - Frontend-only calculations, form defaults, grouping, and formatting helpers.

## Backend Modules

- `app/api/endpoints.py`
  - API route handlers.
- `app/db/schemas.py`
  - Pydantic request and response schemas.
- `app/db/models.py`
  - SQLAlchemy table models.
- `app/db/operations.py`
  - Holding, cash-flow, and recurring cash-flow DB operations.
- `app/db/session.py`
  - SQLite engine, session factory, and database path resolution.
- `app/db/enums.py`
  - Asset type enum and normalization.
- `app/services/quotes.py`
  - Live quote retrieval and quote cache.
- `app/services/history.py`
  - Price history sync and YTD portfolio history.
- `app/services/snapshots.py`
  - Snapshot creation and snapshot retrieval.
- `app/services/mortgage.py`
  - Mortgage profile and property estimate operations.
- `app/services/settings.py`
  - Local app branding settings.
- `app/demo/demo_data.py`
  - Fake demo database seed data.

## Data Flow

1. Frontend calls `/api/...`.
2. Endpoint validates input using Pydantic schemas.
3. Endpoint delegates to repository/service modules.
4. Modules read/write SQLAlchemy models.
5. Response is serialized back to JSON.

## Key Design Rules

- Asset type is ticker-level (stored in `ticker_asset_types`).
- Live quote cache is server-side (`quote_cache` table).
- One snapshot per date in `snapshots`.
- History output can mix:
  - `snapshot` points from saved snapshots.
  - `backfill` points from history + current holdings.
