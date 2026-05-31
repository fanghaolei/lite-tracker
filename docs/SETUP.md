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
python -c "from app.core.database import Base, engine; from app import models; Base.metadata.create_all(bind=engine)"
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
