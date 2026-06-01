# Lite Tracker

Lite Tracker is a local-first finance tracker with a FastAPI backend and a React frontend.

## Demo Preview

[![Animated demo preview](docs/assets/demo/demo-preview.gif)](docs/assets/demo/demo-preview.gif)

Click the preview to open and replay the GIF.

Screenshots:
[Portfolio](docs/assets/demo/portfolio.png) |
[Accounts](docs/assets/demo/accounts.png) |
[Cash Flow](docs/assets/demo/cash-flow.png) |
[Mortgage](docs/assets/demo/mortgage.png)

## Quick Start

Run the setup helper from the repo root.

Windows:
`py -3 setup_app.py`

macOS/Linux:
`python3 setup_app.py`

App URL: `http://127.0.0.1:8000`

See `docs/SETUP.md` for prerequisites, manual setup, and moving `lite-tracker.db` to a new computer.

## Demo Mode

To start with fake demo data instead of your local database:

Windows:
`py -3 setup_app.py --demo`

macOS/Linux:
`python3 setup_app.py --demo`

Demo mode creates `demo-lite-tracker.db` and starts the app with `LITE_TRACKER_DB_PATH` pointing to that file. Your real `lite-tracker.db` is not changed.

If dependencies are already installed:

`python main.py --demo`

The `--demo` flag uses `demo-lite-tracker.db` and creates it with fake data if it does not exist.

To switch back to the real local database, start normally:

`python main.py`

If you previously set `LITE_TRACKER_DB_PATH` manually, clear it first:

PowerShell:
`Remove-Item Env:LITE_TRACKER_DB_PATH`

macOS/Linux:
`unset LITE_TRACKER_DB_PATH`

## Tests

Run all tests:
`python -m pytest tests -v`

Current baseline:
- 70 tests passing

## Documentation

- `docs/SETUP.md` - Local setup
- `docs/ARCHITECTURE.md` - System structure
- `docs/API.md` - API endpoints
- `docs/DATABASE.md` - Database schema
- `docs/TESTING.md` - Test workflow
- `docs/DEVELOPMENT.md` - Development workflow
- `docs/DEPLOYMENT.md` - Deployment checklist
- `docs/TROUBLESHOOTING.md` - Common issues
