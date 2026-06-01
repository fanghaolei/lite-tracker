from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from app.db import operations, schemas
from app.db.session import SessionLocal
from app.services.history import calculate_portfolio_history, sync_ticker_history
from app.services.mortgage import (
    get_latest_property_estimates,
    get_mortgage_profile as fetch_mortgage_profile,
    list_property_estimate_history,
    refresh_property_estimates,
)
from app.services.quotes import get_live_quotes as fetch_live_quotes
from app.services.settings import get_branding_settings, update_branding_settings
from app.services.snapshots import get_snapshot as fetch_snapshot
from app.services.snapshots import list_snapshots as fetch_snapshots
from app.services.snapshots import save_snapshot as persist_snapshot

router = APIRouter(prefix="/api")

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@router.post("/holdings")
def update_holding(holding: schemas.HoldingCreate, db: Session = Depends(get_db)):
    db_holding = operations.update_holding(db, holding)
    if not db_holding.is_manual:
        sync_ticker_history(db_holding.ticker, db)
    return db_holding

@router.get("/holdings")
def get_holdings(db: Session = Depends(get_db)):
    return operations.get_holdings(db)

@router.post("/asset-types/{ticker}")
def update_ticker_asset_type(ticker: str, payload: schemas.TickerAssetTypeUpdate, db: Session = Depends(get_db)):
    return operations.update_ticker_asset_type(db, ticker, payload.asset_type)

@router.delete("/holdings/{ticker}")
def delete_holding(ticker: str, account: str = Query(...), db: Session = Depends(get_db)):
    if not operations.delete_holding(db, ticker, account):
        raise HTTPException(status_code=404, detail="Holding not found")
    return {"status": "success"}

@router.get("/sync")
def sync_all(db: Session = Depends(get_db)):
    holdings = operations.get_holdings(db)
    for h in holdings:
        if not h.is_manual:
            sync_ticker_history(h.ticker, db)
    return {"status": "synced"}

@router.post("/quotes")
def get_live_quotes(payload: schemas.TickerPayload, db: Session = Depends(get_db)):
    return fetch_live_quotes(payload.tickers, db=db)

@router.get("/settings/branding", response_model=schemas.BrandingSettings)
def get_branding(db: Session = Depends(get_db)):
    return get_branding_settings(db)

@router.post("/settings/branding", response_model=schemas.BrandingSettings)
def update_branding(payload: schemas.BrandingSettingsUpdate, db: Session = Depends(get_db)):
    return update_branding_settings(db, payload)

@router.get("/history")
def get_portfolio_history(db: Session = Depends(get_db)):
    return calculate_portfolio_history(db)

@router.get("/snapshots")
def list_snapshots(db: Session = Depends(get_db)):
    return fetch_snapshots(db)

@router.get("/snapshots/{snapshot_date}")
def get_snapshot(snapshot_date: str, db: Session = Depends(get_db)):
    snapshot = fetch_snapshot(db, snapshot_date)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snapshot

@router.post("/snapshots")
def save_snapshot(payload: schemas.SnapshotCreate, db: Session = Depends(get_db)):
    result = persist_snapshot(db, overwrite=payload.overwrite)
    if result["exists"]:
        raise HTTPException(status_code=409, detail={
            "message": "A snapshot already exists for today.",
            "snapshot": result["snapshot"]
        })
    return result["snapshot"]

@router.get("/cash-flow")
def get_cash_flow_items(db: Session = Depends(get_db)):
    return operations.get_cash_flow_items(db)

@router.post("/cash-flow")
def update_cash_flow_item(item: schemas.CashFlowItemCreate, db: Session = Depends(get_db)):
    return operations.update_cash_flow_item(db, item)

@router.get("/cash-flow/recurring")
def get_recurring_cash_flows(db: Session = Depends(get_db)):
    return operations.get_recurring_cash_flows(db)

@router.post("/cash-flow/recurring/{item_id}/cash-account")
def update_recurring_cash_flow_account(item_id: int, payload: schemas.RecurringCashFlowAccountUpdate, db: Session = Depends(get_db)):
    item = operations.update_recurring_cash_flow_account(db, item_id, payload.cash_account or "")
    if not item:
        raise HTTPException(status_code=404, detail="Recurring cash flow not found")
    return item

@router.delete("/cash-flow/{item_id}")
def delete_cash_flow_item(item_id: int, db: Session = Depends(get_db)):
    if not operations.delete_cash_flow_item(db, item_id):
        raise HTTPException(status_code=404, detail="Cash flow item not found")
    return {"status": "success"}

@router.get("/mortgage")
def get_mortgage_profile(db: Session = Depends(get_db)):
    profile = fetch_mortgage_profile(db)
    if not profile:
        raise HTTPException(status_code=404, detail="Mortgage profile not found")
    return profile

@router.get("/mortgage/estimate")
def get_mortgage_estimate(db: Session = Depends(get_db)):
    return get_latest_property_estimates(db)

@router.get("/mortgage/estimate/history")
def get_mortgage_estimate_history(db: Session = Depends(get_db)):
    return list_property_estimate_history(db)

@router.post("/mortgage/estimate/refresh")
def refresh_mortgage_estimate(payload: schemas.MortgageEstimateRefresh = None, db: Session = Depends(get_db)):
    return refresh_property_estimates(db, force=payload.force if payload else True)
