# Setup

Use this after cloning the repo on Windows, macOS, or Linux.

## Prerequisites

- Python 3.11 or newer
- Node.js 20 LTS or newer
- Git

Check versions:

```bash
python --version
node --version
npm --version
```

On macOS/Linux, use `python3` if `python` is not available.

## One Command

From the repo root:

Windows:

```powershell
py -3 setup_app.py
```

macOS/Linux:

```bash
python3 setup_app.py
```

The helper will:

- Create `.venv`
- Install Python dependencies from `requirements.txt`
- Install frontend dependencies with `npm install`
- Create or update the SQLite schema in `lite-tracker.db`
- Build the React frontend into `static/react`
- Start the FastAPI app

Open:

```text
http://127.0.0.1:8000
```

Stop the app with `Ctrl+C`.

If `.venv` already exists, the helper stops and asks you to remove or rename it yourself. It will also stop if you run it from inside an active virtual environment.

## Demo Mode

Use demo mode to try the app with fake data:

Windows:

```powershell
py -3 setup_app.py --demo
```

macOS/Linux:

```bash
python3 setup_app.py --demo
```

Demo mode creates `demo-lite-tracker.db` and starts the app with `LITE_TRACKER_DB_PATH` pointing to that database. It does not modify `lite-tracker.db`.

To start the demo app manually after setup:

```powershell
python main.py --demo
```

The `--demo` flag uses `demo-lite-tracker.db` and creates it with fake data if it does not exist.

To return to the real local database, run:

```bash
python main.py
```

If you previously set `LITE_TRACKER_DB_PATH` manually, clear it first.

PowerShell:

```powershell
Remove-Item Env:LITE_TRACKER_DB_PATH
```

Command Prompt:

```cmd
set LITE_TRACKER_DB_PATH=
```

macOS/Linux:

```bash
unset LITE_TRACKER_DB_PATH
```

## Existing Data

The local database is `lite-tracker.db` in the repo root. It is ignored by git.

To move data from another computer:

1. Run setup once on the new computer.
2. Stop the app.
3. Replace the new `lite-tracker.db` with your backup copy.
4. Start the app again with `python main.py` from the activated `.venv`.

## Manual Setup

Use this only if the helper fails.

Create and activate a virtual environment:

Windows:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
npm install
```

Initialize the database:

```bash
python -c "from app.db.session import Base, engine; from app.db import models; Base.metadata.create_all(bind=engine)"
```

Build frontend and start:

```bash
npm run build
python main.py
```

## Checks

Run tests:

```bash
python -m pytest tests -q
```

Rebuild frontend after React changes:

```bash
npm run build
```
