from sqlalchemy.orm import Session
from datetime import datetime
from app.db import models
from app.db import schemas
from app.db.enums import normalize_asset_type
from app.services.history import clear_history_cache

def get_ticker_asset_type(db: Session, ticker: str, fallback: str = None, is_manual: bool = False):
    normalized_ticker = ticker.upper()
    row = db.query(models.TickerAssetType).filter(
        models.TickerAssetType.ticker == normalized_ticker
    ).first()
    if row:
        return normalize_asset_type(normalized_ticker, row.asset_type, is_manual)
    return normalize_asset_type(normalized_ticker, fallback, is_manual)

def get_ticker_asset_type_map(db: Session, tickers):
    normalized_tickers = sorted({ticker.upper() for ticker in tickers})
    if not normalized_tickers:
        return {}

    rows = db.query(models.TickerAssetType).filter(
        models.TickerAssetType.ticker.in_(normalized_tickers)
    ).all()
    return {
        row.ticker: normalize_asset_type(row.ticker, row.asset_type)
        for row in rows
    }

def set_ticker_asset_type(db: Session, ticker: str, asset_type: str, is_manual: bool = False):
    normalized_ticker = ticker.upper()
    normalized_type = normalize_asset_type(normalized_ticker, asset_type, is_manual)
    row = db.query(models.TickerAssetType).filter(
        models.TickerAssetType.ticker == normalized_ticker
    ).first()
    if row:
        row.asset_type = normalized_type
        row.updated_at = datetime.now()
    else:
        row = models.TickerAssetType(
            ticker=normalized_ticker,
            asset_type=normalized_type,
            updated_at=datetime.now()
        )
        db.add(row)

    db.query(models.Holding).filter(models.Holding.ticker == normalized_ticker).update(
        {"asset_type": normalized_type},
        synchronize_session=False
    )
    return row

def apply_ticker_asset_types(db: Session, holdings):
    type_map = get_ticker_asset_type_map(db, [holding.ticker for holding in holdings])
    for holding in holdings:
        holding.asset_type = type_map.get(
            holding.ticker,
            normalize_asset_type(holding.ticker, holding.asset_type, bool(holding.is_manual))
        )
    return holdings

def get_holdings(db: Session):
    return apply_ticker_asset_types(db, db.query(models.Holding).all())

def update_holding(db: Session, holding: schemas.HoldingCreate):
    db_holding = None
    ticker = holding.ticker.upper()
    is_manual = holding.is_manual and ticker != "CASH"
    manual_price = holding.manual_price if is_manual else None
    existing_asset_type = get_ticker_asset_type(db, ticker, holding.asset_type, is_manual)
    asset_type = normalize_asset_type(ticker, holding.asset_type or existing_asset_type, is_manual)

    if holding.id:
        db_holding = db.query(models.Holding).filter(models.Holding.id == holding.id).first()
    
    if not db_holding:
        db_holding = db.query(models.Holding).filter(
            models.Holding.ticker == ticker,
            models.Holding.account == holding.account
        ).first()
    
    if db_holding:
        db_holding.ticker = ticker
        db_holding.asset_type = asset_type
        db_holding.shares = holding.shares
        db_holding.average_cost = holding.average_cost
        db_holding.account = holding.account
        db_holding.is_manual = is_manual
        db_holding.manual_price = manual_price
    else:
        db_holding = models.Holding(
            ticker=ticker,
            asset_type=asset_type,
            shares=holding.shares,
            average_cost=holding.average_cost,
            account=holding.account,
            is_manual=is_manual,
            manual_price=manual_price
        )
        db.add(db_holding)

    set_ticker_asset_type(db, ticker, asset_type, is_manual)
    
    db.commit()
    db.refresh(db_holding)
    db_holding.asset_type = get_ticker_asset_type(db, ticker, db_holding.asset_type, bool(db_holding.is_manual))
    clear_history_cache()
    return db_holding

def update_ticker_asset_type(db: Session, ticker: str, asset_type: str):
    normalized_ticker = ticker.upper()
    has_holding = db.query(models.Holding).filter(models.Holding.ticker == normalized_ticker).first()
    is_manual = bool(has_holding.is_manual) if has_holding else False
    row = set_ticker_asset_type(db, normalized_ticker, asset_type, is_manual)
    db.commit()
    db.refresh(row)
    clear_history_cache()
    return {"ticker": row.ticker, "asset_type": row.asset_type}

def delete_holding(db: Session, ticker: str, account: str = None):
    query = db.query(models.Holding).filter(models.Holding.ticker == ticker.upper())
    if account:
        query = query.filter(models.Holding.account == account)
    
    db_holding = query.first()
    if db_holding:
        # Only delete history if this is the last lot for this ticker
        remaining = db.query(models.Holding).filter(models.Holding.ticker == ticker.upper(), models.Holding.id != db_holding.id).count()
        if remaining == 0:
            db.query(models.History).filter(models.History.ticker == ticker.upper()).delete()
            
        db.delete(db_holding)
        db.commit()
        clear_history_cache()
        return True
    return False

def get_cash_flow_items(db: Session):
    return db.query(models.CashFlowItem).order_by(
        models.CashFlowItem.is_paid.asc(),
        models.CashFlowItem.due_date.asc(),
        models.CashFlowItem.name.asc()
    ).all()

def update_cash_flow_item(db: Session, item: schemas.CashFlowItemCreate):
    db_item = None
    if item.id:
        db_item = db.query(models.CashFlowItem).filter(models.CashFlowItem.id == item.id).first()

    fields = {
        "name": item.name.strip(),
        "category": item.category.strip() or "Bill",
        "flow_type": item.flow_type if item.flow_type in ("income", "expense") else "expense",
        "cash_account": (item.cash_account or "").strip(),
        "amount": item.amount,
        "due_date": item.due_date,
        "is_paid": item.is_paid,
        "notes": (item.notes or "").strip()
    }

    if db_item:
        for key, value in fields.items():
            setattr(db_item, key, value)
    else:
        db_item = models.CashFlowItem(**fields, created_at=datetime.now())
        db.add(db_item)

    db.commit()
    db.refresh(db_item)
    return db_item

def delete_cash_flow_item(db: Session, item_id: int):
    db_item = db.query(models.CashFlowItem).filter(models.CashFlowItem.id == item_id).first()
    if not db_item:
        return False
    db.delete(db_item)
    db.commit()
    return True

def get_recurring_cash_flows(db: Session):
    return db.query(models.RecurringCashFlow).filter(
        models.RecurringCashFlow.is_active == True
    ).order_by(
        models.RecurringCashFlow.start_date.asc(),
        models.RecurringCashFlow.name.asc()
    ).all()

def update_recurring_cash_flow_account(db: Session, item_id: int, cash_account: str):
    db_item = db.query(models.RecurringCashFlow).filter(models.RecurringCashFlow.id == item_id).first()
    if not db_item:
        return None
    db_item.cash_account = (cash_account or "").strip()
    db_item.updated_at = datetime.now()
    db.commit()
    db.refresh(db_item)
    return db_item
