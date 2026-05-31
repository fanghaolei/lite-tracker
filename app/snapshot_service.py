from datetime import datetime

from sqlalchemy.orm import Session

from . import models
from .asset_types import normalize_asset_type
from .history_service import clear_history_cache
from .quote_service import get_live_quotes


def list_snapshots(db: Session):
    snapshots = db.query(models.Snapshot).order_by(models.Snapshot.date.desc()).all()
    return [_serialize_snapshot(snapshot) for snapshot in snapshots]


def get_snapshot(db: Session, snapshot_date: str):
    parsed_date = datetime.strptime(snapshot_date, "%Y-%m-%d").date()
    snapshot = db.query(models.Snapshot).filter(models.Snapshot.date == parsed_date).first()
    if not snapshot:
        return None

    items = db.query(models.SnapshotItem).filter(
        models.SnapshotItem.snapshot_id == snapshot.id
    ).order_by(models.SnapshotItem.account, models.SnapshotItem.ticker).all()
    return _serialize_snapshot(snapshot, items=items)


def save_snapshot(db: Session, overwrite: bool = False):
    clear_history_cache()
    snapshot_date = datetime.now().date()
    existing = db.query(models.Snapshot).filter(models.Snapshot.date == snapshot_date).first()
    if existing and not overwrite:
        return {"exists": True, "snapshot": _serialize_snapshot(existing)}

    if existing:
        db.query(models.SnapshotItem).filter(models.SnapshotItem.snapshot_id == existing.id).delete()
        db.delete(existing)
        db.commit()

    payload = _build_snapshot_payload(db)
    snapshot = models.Snapshot(
        date=snapshot_date,
        total_value=payload["total_value"],
        cash_value=payload["cash_value"],
        daily_pnl=payload["daily_pnl"],
        total_pnl=payload["total_pnl"],
        created_at=datetime.now()
    )
    db.add(snapshot)
    db.flush()

    for item in payload["items"]:
        db.add(models.SnapshotItem(snapshot_id=snapshot.id, date=snapshot_date, **item))

    db.commit()
    db.refresh(snapshot)
    return {"exists": False, "snapshot": _serialize_snapshot(snapshot)}


def _build_snapshot_payload(db: Session):
    holdings = db.query(models.Holding).all()
    tickers = sorted({holding.ticker for holding in holdings if holding.ticker != "CASH" and not holding.is_manual})
    quotes = get_live_quotes(tickers, db=db)
    asset_type_map = _get_asset_type_map(db, holdings)
    items = [_snapshot_item_for_holding(holding, quotes, asset_type_map) for holding in holdings]

    return {
        "total_value": sum(item["market_value"] for item in items),
        "cash_value": sum(item["market_value"] for item in items if item["ticker"] == "CASH"),
        "daily_pnl": sum(item["daily_pnl"] for item in items),
        "total_pnl": sum(item["total_pnl"] for item in items if item["ticker"] != "CASH"),
        "items": items
    }


def _snapshot_item_for_holding(holding, quotes, asset_type_map: dict):
    quote = _quote_for_holding(holding, quotes)
    live_price = quote.get("price", 0) or 0
    prev_close = quote.get("prev_close", 0) or 0
    cost_basis = holding.shares if holding.ticker == "CASH" else holding.shares * holding.average_cost
    market_value = holding.shares * live_price
    return {
        "ticker": holding.ticker,
        "asset_type": asset_type_map.get(
            holding.ticker,
            normalize_asset_type(holding.ticker, holding.asset_type, bool(holding.is_manual))
        ),
        "account": holding.account or "Default",
        "shares": holding.shares,
        "average_cost": holding.average_cost,
        "is_manual": bool(holding.is_manual),
        "manual_price": holding.manual_price,
        "live_price": live_price,
        "prev_close": prev_close,
        "cost_basis": cost_basis,
        "market_value": market_value,
        "daily_pnl": holding.shares * (live_price - prev_close) if prev_close > 0 else 0,
        "total_pnl": market_value - cost_basis
    }


def _quote_for_holding(holding, quotes):
    if holding.ticker == "CASH":
        return {"price": 1.0, "prev_close": 1.0}
    if holding.is_manual:
        price = holding.manual_price or 0
        return {"price": price, "prev_close": price}
    return quotes.get(holding.ticker, {"price": 0, "prev_close": 0})


def _get_asset_type_map(db: Session, holdings):
    tickers = sorted({holding.ticker for holding in holdings})
    if not tickers:
        return {}
    rows = db.query(models.TickerAssetType).filter(models.TickerAssetType.ticker.in_(tickers)).all()
    return {row.ticker: normalize_asset_type(row.ticker, row.asset_type) for row in rows}


def _serialize_snapshot(snapshot, items=None):
    data = {
        "id": snapshot.id,
        "date": snapshot.date.strftime("%Y-%m-%d"),
        "total_value": round(snapshot.total_value or 0, 2),
        "cash_value": round(snapshot.cash_value or 0, 2),
        "daily_pnl": round(snapshot.daily_pnl or 0, 2),
        "total_pnl": round(snapshot.total_pnl or 0, 2),
        "created_at": snapshot.created_at.isoformat() if snapshot.created_at else None
    }
    if items is not None:
        data["items"] = [_serialize_snapshot_item(item) for item in items]
    return data


def _serialize_snapshot_item(item):
    return {
        "ticker": item.ticker,
        "asset_type": item.asset_type,
        "account": item.account,
        "shares": item.shares,
        "average_cost": item.average_cost,
        "is_manual": item.is_manual,
        "manual_price": item.manual_price,
        "live_price": item.live_price,
        "prev_close": item.prev_close,
        "cost_basis": item.cost_basis,
        "market_value": item.market_value,
        "daily_pnl": item.daily_pnl,
        "total_pnl": item.total_pnl
    }
