import argparse
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DEMO_DB_PATH = BASE_DIR / "demo-lite-tracker.db"


def configure_runtime(argv=None):
    parser = argparse.ArgumentParser(description="Run Lite Tracker.")
    parser.add_argument("--demo", action="store_true", help="Run against demo-lite-tracker.db.")
    args, _ = parser.parse_known_args(argv)

    if args.demo:
        os.environ["LITE_TRACKER_DB_PATH"] = str(DEMO_DB_PATH)
        if not DEMO_DB_PATH.exists():
            from app.demo.demo_data import create_demo_database
            create_demo_database(DEMO_DB_PATH)

    return args


RUNTIME_ARGS = configure_runtime()

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.db.session import engine, Base
from app.api.endpoints import router as api_router
from app.db import models  # Required to register tables for metadata

# Infrastructure setup
os.makedirs(BASE_DIR / "static" / "css", exist_ok=True)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Portfolio Core Data Engine")

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

HTML_NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, max-age=0",
    "Pragma": "no-cache",
}

@app.get("/")
async def read_index():
    react_index = BASE_DIR / "static" / "react" / "index.html"
    return FileResponse(react_index, headers=HTML_NO_CACHE_HEADERS)

@app.get("/accounts")
async def read_accounts():
    react_accounts = BASE_DIR / "static" / "react" / "accounts.html"
    return FileResponse(react_accounts, headers=HTML_NO_CACHE_HEADERS)

@app.get("/cash-flow")
async def read_cash_flow():
    react_cash_flow = BASE_DIR / "static" / "react" / "cash-flow.html"
    return FileResponse(react_cash_flow, headers=HTML_NO_CACHE_HEADERS)

@app.get("/mortgage")
async def read_mortgage():
    react_mortgage = BASE_DIR / "static" / "react" / "mortgage.html"
    return FileResponse(react_mortgage, headers=HTML_NO_CACHE_HEADERS)

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
