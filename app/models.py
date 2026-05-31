from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Boolean, ForeignKey, UniqueConstraint
from .core.database import Base

class Holding(Base):
    __tablename__ = "holdings"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True)
    asset_type = Column(String, index=True, default="stock")
    shares = Column(Float, default=0.0)
    average_cost = Column(Float, default=0.0)
    account = Column(String, index=True, default="Default")
    is_manual = Column(Boolean, default=False)
    manual_price = Column(Float, nullable=True)

class TickerAssetType(Base):
    __tablename__ = "ticker_asset_types"
    ticker = Column(String, primary_key=True, index=True)
    asset_type = Column(String, index=True, default="stock")
    updated_at = Column(DateTime, index=True)

class History(Base):
    __tablename__ = "history"
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True)
    date = Column(Date)
    price = Column(Float)

class QuoteCache(Base):
    __tablename__ = "quote_cache"
    ticker = Column(String, primary_key=True, index=True)
    price = Column(Float, default=0.0)
    prev_close = Column(Float, default=0.0)
    fetched_at = Column(DateTime, index=True)

class Snapshot(Base):
    __tablename__ = "snapshots"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, index=True)
    total_value = Column(Float, default=0.0)
    cash_value = Column(Float, default=0.0)
    daily_pnl = Column(Float, default=0.0)
    total_pnl = Column(Float, default=0.0)
    created_at = Column(DateTime, index=True)

class SnapshotItem(Base):
    __tablename__ = "snapshot_items"
    id = Column(Integer, primary_key=True, index=True)
    snapshot_id = Column(Integer, ForeignKey("snapshots.id"), index=True)
    date = Column(Date, index=True)
    ticker = Column(String, index=True)
    asset_type = Column(String, index=True, default="stock")
    account = Column(String, index=True)
    shares = Column(Float, default=0.0)
    average_cost = Column(Float, default=0.0)
    is_manual = Column(Boolean, default=False)
    manual_price = Column(Float, nullable=True)
    live_price = Column(Float, default=0.0)
    prev_close = Column(Float, default=0.0)
    cost_basis = Column(Float, default=0.0)
    market_value = Column(Float, default=0.0)
    daily_pnl = Column(Float, default=0.0)
    total_pnl = Column(Float, default=0.0)

    __table_args__ = (
        UniqueConstraint("snapshot_id", "ticker", "account", name="uq_snapshot_ticker_account"),
    )

class CashFlowItem(Base):
    __tablename__ = "cash_flow_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String, index=True, default="Bill")
    flow_type = Column(String, index=True, default="expense")
    cash_account = Column(String, index=True, default="")
    amount = Column(Float, default=0.0)
    due_date = Column(Date, index=True)
    is_paid = Column(Boolean, default=False)
    notes = Column(String, default="")
    created_at = Column(DateTime, index=True)

class PropertyEstimate(Base):
    __tablename__ = "property_estimates"
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, index=True)
    value = Column(Float, default=0.0)
    date = Column(Date, index=True)
    url = Column(String, default="")

    __table_args__ = (
        UniqueConstraint("source", "date", name="uq_property_estimate_source_date"),
    )

class MortgageProfile(Base):
    __tablename__ = "mortgage_profiles"
    id = Column(Integer, primary_key=True, index=True)
    property_address_line1 = Column(String, default="")
    property_address_line2 = Column(String, default="")
    principal_balance = Column(Float, default=0.0)
    origination_date = Column(Date, nullable=True)
    maturity_date = Column(Date, nullable=True)
    original_term_months = Column(Integer, default=0)
    remaining_term_months = Column(Integer, default=0)
    annual_interest_rate = Column(Float, default=0.0)
    updated_at = Column(DateTime, index=True)

class RecurringCashFlow(Base):
    __tablename__ = "recurring_cash_flows"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String, index=True, default="Bill")
    flow_type = Column(String, index=True, default="expense")
    cash_account = Column(String, index=True, default="")
    amount = Column(Float, default=0.0)
    start_date = Column(Date, index=True)
    cadence = Column(String, index=True, default="biweekly")
    is_active = Column(Boolean, default=True)
    notes = Column(String, default="")
    created_at = Column(DateTime, index=True)
    updated_at = Column(DateTime, index=True)

class AppSetting(Base):
    __tablename__ = "app_settings"
    key = Column(String, primary_key=True, index=True)
    value = Column(String, default="")
    updated_at = Column(DateTime, index=True)
