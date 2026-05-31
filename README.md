# Lite Tracker

Lite Tracker is a local-first finance tracker with a FastAPI backend and a React frontend.

## Quick Start

Run the setup helper from the repo root.

Windows:
`py -3 setup_app.py`

macOS/Linux:
`python3 setup_app.py`

App URL: `http://127.0.0.1:8000`

See `docs/SETUP.md` for prerequisites, manual setup, and moving `lite-tracker.db` to a new computer.

## Tests

Run all tests:
`python -m pytest tests -v`

Current baseline:
- 69 tests passing

## Documentation

- `docs/SETUP.md` - Local setup
- `docs/ARCHITECTURE.md` - System structure
- `docs/API.md` - API endpoints
- `docs/DATABASE.md` - Database schema
- `docs/TESTING.md` - Test workflow
- `docs/DEVELOPMENT.md` - Development workflow
- `docs/DEPLOYMENT.md` - Deployment checklist
- `docs/TROUBLESHOOTING.md` - Common issues
