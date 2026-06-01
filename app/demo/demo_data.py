from datetime import date, datetime, timedelta
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import models
from app.db.session import Base


DEMO_DB_NAME = "demo-lite-tracker.db"


def create_demo_database(db_path: str | Path) -> Path:
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()

    engine = create_engine(f"sqlite:///{path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    try:
        seed_demo_data(session)
        session.commit()
    finally:
        session.close()
        engine.dispose()
    return path


def seed_demo_data(db) -> None:
    now = datetime.now()
    today = now.date()
    year_start = today.replace(month=1, day=1)

    holdings = [
        models.Holding(ticker="CASH", asset_type="cash equivalents", shares=18500, average_cost=1, account="Operating Checking", is_manual=True),
        models.Holding(ticker="CASH", asset_type="cash equivalents", shares=42000, average_cost=1, account="Emergency Savings", is_manual=True),
        models.Holding(ticker="CASH", asset_type="cash equivalents", shares=6500, average_cost=1, account="Brokerage Sweep", is_manual=True),
        models.Holding(ticker="VTI", asset_type="fund", shares=120, average_cost=210, account="Taxable Brokerage"),
        models.Holding(ticker="VXUS", asset_type="fund", shares=80, average_cost=58, account="Taxable Brokerage"),
        models.Holding(ticker="AAPL", asset_type="stock", shares=45, average_cost=165, account="Taxable Brokerage"),
        models.Holding(ticker="MSFT", asset_type="stock", shares=30, average_cost=340, account="Retirement Account"),
        models.Holding(ticker="BTC-USD", asset_type="crypto", shares=0.35, average_cost=59000, account="Crypto Wallet"),
        models.Holding(ticker="PVT-DEMO", asset_type="other", shares=100, average_cost=120, account="Private Investments", is_manual=True, manual_price=155),
    ]
    db.add_all(holdings)

    ticker_types = {
        "CASH": "cash equivalents",
        "VTI": "fund",
        "VXUS": "fund",
        "AAPL": "stock",
        "MSFT": "stock",
        "BTC-USD": "crypto",
        "PVT-DEMO": "other",
    }
    db.add_all([
        models.TickerAssetType(ticker=ticker, asset_type=asset_type, updated_at=now)
        for ticker, asset_type in ticker_types.items()
    ])

    quote_rows = {
        "VTI": (265.25, 263.80),
        "VXUS": (63.40, 63.05),
        "AAPL": (190.20, 188.75),
        "MSFT": (430.80, 428.10),
        "BTC-USD": (68500.00, 67250.00),
    }
    db.add_all([
        models.QuoteCache(ticker=ticker, price=price, prev_close=prev_close, fetched_at=now)
        for ticker, (price, prev_close) in quote_rows.items()
    ])

    history_prices = {
        "VTI": 245,
        "VXUS": 59,
        "AAPL": 178,
        "MSFT": 405,
        "BTC-USD": 61000,
    }
    day = year_start
    while day <= today:
        offset = (day - year_start).days
        for ticker, base_price in history_prices.items():
            price = base_price * (1 + offset * 0.0008) + ((offset % 17) - 8) * 0.35
            db.add(models.History(ticker=ticker, date=day, price=round(price, 2)))
        day += timedelta(days=7)

    snapshot_dates = [today - timedelta(days=60), today - timedelta(days=30), today]
    for index, snapshot_date in enumerate(snapshot_dates):
        total_value = 136000 + index * 6500
        db.add(models.Snapshot(
            date=snapshot_date,
            total_value=total_value,
            cash_value=67000,
            daily_pnl=420 + index * 35,
            total_pnl=11800 + index * 900,
            created_at=now - timedelta(days=(len(snapshot_dates) - index) * 3),
        ))

    cash_flows = [
        models.CashFlowItem(name="Demo Credit Card", category="Credit Card", flow_type="expense", cash_account="Operating Checking", amount=1850, due_date=today + timedelta(days=6), notes="Demo statement", created_at=now),
        models.CashFlowItem(name="Utility Bundle", category="Utility Bill", flow_type="expense", cash_account="Operating Checking", amount=325, due_date=today + timedelta(days=12), notes="Demo utilities", created_at=now),
        models.CashFlowItem(name="Quarterly Bonus", category="Bonus", flow_type="income", amount=2500, due_date=today + timedelta(days=18), notes="Demo income", created_at=now),
    ]
    db.add_all(cash_flows)

    db.add_all([
        models.RecurringCashFlow(name="Demo Salary", category="Salary", flow_type="income", amount=3250, start_date=_next_weekday(today, 3), cadence="biweekly", is_active=True, notes="Demo recurring income", created_at=now, updated_at=now),
        models.RecurringCashFlow(name="Demo Rent", category="Mortgage", flow_type="expense", cash_account="Operating Checking", amount=2200, start_date=today.replace(day=1), cadence="monthly-first", is_active=True, notes="Demo monthly housing payment", created_at=now, updated_at=now),
    ])

    db.add(models.MortgageProfile(
        property_address_line1="100 Market Street",
        property_address_line2="Austin, TX 78701",
        principal_balance=410000,
        origination_date=date(2024, 8, 1),
        maturity_date=date(2054, 8, 1),
        original_term_months=360,
        remaining_term_months=338,
        annual_interest_rate=0.05875,
        updated_at=now,
    ))
    db.add_all([
        models.PropertyEstimate(source="Demo Estimate", value=585000, date=today, url="https://example.com/demo-estimate"),
        models.PropertyEstimate(source="Demo Comparable", value=574000, date=today, url="https://example.com/demo-comparable"),
    ])

    db.add_all([
        models.AppSetting(key="app_name", value="Demo Ledger", updated_at=now),
        models.AppSetting(key="portfolio_subtitle", value="🌿 Demo portfolio growth 🪙", updated_at=now),
        models.AppSetting(key="accounts_subtitle", value="🧭 Demo accounts in balance 🪙", updated_at=now),
        models.AppSetting(key="cashflow_subtitle", value="📆 Demo cash flow with confidence 🪙", updated_at=now),
        models.AppSetting(key="mortgage_subtitle", value="🏠 Demo equity in motion 🪙", updated_at=now),
    ])


def _next_weekday(start: date, weekday: int) -> date:
    days_ahead = (weekday - start.weekday()) % 7
    return start + timedelta(days=days_ahead or 7)
