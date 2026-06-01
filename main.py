import argparse
import html
import json
import os
import re
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
from fastapi.responses import HTMLResponse
from app.db.session import engine, Base, SessionLocal
from app.api.endpoints import router as api_router
from app.db import models  # Required to register tables for metadata
from app.services.settings import DEFAULT_BRANDING, get_branding_settings

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
    return react_page("index.html", "Portfolio")

@app.get("/accounts")
async def read_accounts():
    return react_page("accounts.html", "Accounts")

@app.get("/cash-flow")
async def read_cash_flow():
    return react_page("cash-flow.html", "Cash Flow")

@app.get("/mortgage")
async def read_mortgage():
    return react_page("mortgage.html", "Mortgage")


def react_page(filename: str, view_label: str) -> HTMLResponse:
    page = (BASE_DIR / "static" / "react" / filename).read_text(encoding="utf-8")
    branding = load_branding_payload()
    title = f"{branding['app_name']} | {view_label}"
    page = re.sub(
        r"<title>.*?</title>",
        f"<title>{html.escape(title)}</title>",
        page,
        count=1,
        flags=re.IGNORECASE | re.DOTALL,
    )
    branding_json = json.dumps(branding).replace("</", "<\\/")
    bootstrap = (
        "<script>"
        f"window.__LITE_TRACKER_BRANDING__ = {branding_json};"
        "try { localStorage.setItem('liteTracker.branding', JSON.stringify(window.__LITE_TRACKER_BRANDING__)); } catch (e) {}"
        "</script>"
    )
    page = page.replace("</head>", f"  {bootstrap}\n</head>", 1)
    return HTMLResponse(page, headers=HTML_NO_CACHE_HEADERS)


def load_branding_payload() -> dict[str, str]:
    db = SessionLocal()
    try:
        return get_branding_settings(db).model_dump()
    except Exception:
        return DEFAULT_BRANDING.copy()
    finally:
        db.close()

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
