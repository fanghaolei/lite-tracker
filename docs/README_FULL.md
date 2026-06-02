# Lite Tracker Reference

This file is a compact technical overview. Use it when you need one page with core project facts.

## Stack

- Backend: FastAPI + SQLAlchemy
- Frontend: React + TypeScript + Vite
- Database: SQLite (`lite-tracker.db`)

## Backend Modules

- `app/api/endpoints.py` - API routes
- `app/db/schemas.py` - Pydantic API schemas
- `app/db/models.py` - SQLAlchemy table models
- `app/db/operations.py` - DB read/write operations
- `app/db/session.py` - SQLite engine and session setup
- `app/db/enums.py` - asset type enum and normalization
- `app/services/quotes.py` - live quotes and cache
- `app/services/history.py` - YTD history and sync
- `app/services/snapshots.py` - snapshot logic
- `app/services/mortgage.py` - mortgage and property estimates
- `app/services/settings.py` - local app settings
- `app/demo/demo_data.py` - fake demo database setup

## Frontend Entry Points

- `/` - Portfolio
- `/accounts` - Accounts
- `/cash-flow` - Cash flow
- `/mortgage` - Mortgage

## Current Test Baseline

- 83 tests passing in `tests/`

## Common Commands

- Build frontend:
  `npm run build`
- Set up a new machine:
  `python setup_app.py`
- Run app:
  `python main.py`
- Run tests:
  `python -m pytest tests -v`
