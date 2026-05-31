# Lite Tracker Reference

This file is a compact technical overview. Use it when you need one page with core project facts.

## Stack

- Backend: FastAPI + SQLAlchemy
- Frontend: React + TypeScript + Vite
- Database: SQLite (`lite-tracker.db`)

## Backend Modules

- `app/api/endpoints.py` - API routes
- `app/crud.py` - DB write/read operations
- `app/asset_types.py` - asset type enum and normalization
- `app/quote_service.py` - live quotes and cache
- `app/history_service.py` - YTD history and sync
- `app/snapshot_service.py` - snapshot logic
- `app/mortgage_service.py` - mortgage and property estimates
- `app/settings_service.py` - local app settings

## Frontend Entry Points

- `/` - Portfolio
- `/accounts` - Accounts
- `/cash-flow` - Cash flow
- `/mortgage` - Mortgage

## Current Test Baseline

- 69 tests passing in `tests/`

## Common Commands

- Build frontend:
  `npm run build`
- Set up a new machine:
  `python setup_app.py`
- Run app:
  `python main.py`
- Run tests:
  `python -m pytest tests -v`
