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

def update_cash_balance(db: Session, holding_id: int, shares: float):
    db_holding = db.query(models.Holding).filter(
        models.Holding.id == holding_id,
        models.Holding.ticker == "CASH"
    ).first()
    if not db_holding:
        return None
    db_holding.shares = round(float(shares or 0), 2)
    db_holding.asset_type = "cash equivalents"
    db_holding.average_cost = 1
    db_holding.is_manual = False
    db_holding.manual_price = None
    db.commit()
    db.refresh(db_holding)
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
    old_cash_effect = _cash_flow_cash_effect(db_item) if db_item else None
    old_mortgage_effect = _get_mortgage_payment_effect(db, db_item.id) if db_item else None

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

    db.flush()
    _apply_cash_effect_delta(db, old_cash_effect, _cash_flow_cash_effect(db_item))
    _replace_mortgage_payment_effect(db, db_item, old_mortgage_effect)
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_cash_flow_item(db: Session, item_id: int):
    db_item = db.query(models.CashFlowItem).filter(models.CashFlowItem.id == item_id).first()
    if not db_item:
        return False
    _apply_cash_effect_delta(db, _cash_flow_cash_effect(db_item), None)
    _reverse_mortgage_payment_effect(db, _get_mortgage_payment_effect(db, db_item.id))
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

def get_recurring_cash_flow_skips(db: Session):
    return db.query(models.RecurringCashFlowSkip).order_by(
        models.RecurringCashFlowSkip.due_date.asc(),
        models.RecurringCashFlowSkip.recurring_cash_flow_id.asc()
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

def skip_recurring_cash_flow_occurrence(db: Session, item: schemas.RecurringCashFlowSkipCreate):
    recurring = db.query(models.RecurringCashFlow).filter(
        models.RecurringCashFlow.id == item.recurring_cash_flow_id,
        models.RecurringCashFlow.is_active == True
    ).first()
    if not recurring:
        return None

    existing = db.query(models.RecurringCashFlowSkip).filter(
        models.RecurringCashFlowSkip.recurring_cash_flow_id == item.recurring_cash_flow_id,
        models.RecurringCashFlowSkip.due_date == item.due_date
    ).first()
    if existing:
        return existing

    skip = models.RecurringCashFlowSkip(
        recurring_cash_flow_id=item.recurring_cash_flow_id,
        due_date=item.due_date,
        created_at=datetime.now()
    )
    db.add(skip)
    db.commit()
    db.refresh(skip)
    return skip

def update_recurring_cash_flow(db: Session, item: schemas.RecurringCashFlowCreate):
    db_item = None
    if item.id:
        db_item = db.query(models.RecurringCashFlow).filter(models.RecurringCashFlow.id == item.id).first()

    flow_type = item.flow_type if item.flow_type in ("income", "expense") else "expense"
    fields = {
        "name": item.name.strip(),
        "category": item.category.strip() or "Bill",
        "flow_type": flow_type,
        "cash_account": (item.cash_account or "").strip(),
        "amount": item.amount,
        "start_date": item.start_date,
        "cadence": item.cadence if item.cadence in ("biweekly", "monthly-first") else "biweekly",
        "is_active": item.is_active,
        "notes": (item.notes or "").strip(),
        "updated_at": datetime.now(),
    }

    if db_item:
        for key, value in fields.items():
            setattr(db_item, key, value)
    else:
        db_item = models.RecurringCashFlow(**fields, created_at=datetime.now())
        db.add(db_item)

    db.commit()
    db.refresh(db_item)
    return db_item

def delete_recurring_cash_flow(db: Session, item_id: int):
    db_item = db.query(models.RecurringCashFlow).filter(models.RecurringCashFlow.id == item_id).first()
    if not db_item:
        return False
    db_item.is_active = False
    db_item.updated_at = datetime.now()
    db.commit()
    return True

def _cash_flow_cash_effect(item):
    if not item or not item.is_paid or not item.cash_account:
        return None
    amount = float(item.amount or 0)
    if amount <= 0:
        return None
    delta = amount if (item.flow_type or "expense") == "income" else -amount
    return {"account": item.cash_account, "delta": delta}

def _apply_cash_effect_delta(db: Session, old_effect, new_effect):
    deltas = {}
    if old_effect:
        deltas[old_effect["account"]] = deltas.get(old_effect["account"], 0.0) - old_effect["delta"]
    if new_effect:
        deltas[new_effect["account"]] = deltas.get(new_effect["account"], 0.0) + new_effect["delta"]

    changed = False
    for account, delta in deltas.items():
        if abs(delta) < 0.001:
            continue
        cash = db.query(models.Holding).filter(
            models.Holding.ticker == "CASH",
            models.Holding.account == account
        ).first()
        if not cash:
            continue
        cash.shares = round(float(cash.shares or 0) + delta, 2)
        cash.asset_type = "cash equivalents"
        cash.average_cost = 1
        cash.is_manual = False
        cash.manual_price = None
        changed = True
    if changed:
        clear_history_cache()

def _get_mortgage_payment_effect(db: Session, cash_flow_item_id: int):
    return db.query(models.MortgagePaymentEffect).filter(
        models.MortgagePaymentEffect.cash_flow_item_id == cash_flow_item_id
    ).first()

def _replace_mortgage_payment_effect(db: Session, item, old_effect):
    _reverse_mortgage_payment_effect(db, old_effect)
    if old_effect:
        db.flush()
    if not _is_settled_mortgage_payment(item):
        return

    profile = db.query(models.MortgageProfile).order_by(models.MortgageProfile.id.asc()).first()
    if not profile:
        return

    principal_balance = float(profile.principal_balance or 0)
    amount = float(item.amount or 0)
    monthly_rate = float(profile.annual_interest_rate or 0) / 12
    interest_paid = min(amount, max(0.0, principal_balance * monthly_rate))
    principal_paid = min(principal_balance, max(0.0, amount - interest_paid))
    if principal_paid <= 0 and interest_paid <= 0:
        return

    term_delta = 1 if int(profile.remaining_term_months or 0) > 0 else 0
    profile.principal_balance = max(0.0, principal_balance - principal_paid)
    profile.remaining_term_months = max(0, int(profile.remaining_term_months or 0) - term_delta)
    db.add(models.MortgagePaymentEffect(
        cash_flow_item_id=item.id,
        principal_paid=principal_paid,
        interest_paid=interest_paid,
        applied_at=datetime.now()
    ))

def _reverse_mortgage_payment_effect(db: Session, effect):
    if not effect:
        return
    profile = db.query(models.MortgageProfile).order_by(models.MortgageProfile.id.asc()).first()
    if profile:
        profile.principal_balance = float(profile.principal_balance or 0) + float(effect.principal_paid or 0)
        profile.remaining_term_months = int(profile.remaining_term_months or 0) + 1
    db.delete(effect)

def _is_settled_mortgage_payment(item):
    if not item or not item.is_paid or (item.flow_type or "expense") == "income":
        return False
    text = f"{item.category or ''} {item.name or ''}".lower()
    return "mortgage" in text
