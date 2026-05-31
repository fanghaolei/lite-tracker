from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from app.core.database import engine, Base
from app.api.endpoints import router as api_router
from app import models  # Required to register tables for metadata

# Get the absolute path of the directory containing main.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Infrastructure setup
os.makedirs(os.path.join(BASE_DIR, "static", "css"), exist_ok=True)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Portfolio Core Data Engine")

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

HTML_NO_CACHE_HEADERS = {
    "Cache-Control": "no-store, max-age=0",
    "Pragma": "no-cache",
}

@app.get("/")
async def read_index():
    react_index = os.path.join(BASE_DIR, "static", "react", "index.html")
    return FileResponse(react_index, headers=HTML_NO_CACHE_HEADERS)

@app.get("/accounts")
async def read_accounts():
    react_accounts = os.path.join(BASE_DIR, "static", "react", "accounts.html")
    return FileResponse(react_accounts, headers=HTML_NO_CACHE_HEADERS)

@app.get("/cash-flow")
async def read_cash_flow():
    react_cash_flow = os.path.join(BASE_DIR, "static", "react", "cash-flow.html")
    return FileResponse(react_cash_flow, headers=HTML_NO_CACHE_HEADERS)

@app.get("/mortgage")
async def read_mortgage():
    react_mortgage = os.path.join(BASE_DIR, "static", "react", "mortgage.html")
    return FileResponse(react_mortgage, headers=HTML_NO_CACHE_HEADERS)

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
