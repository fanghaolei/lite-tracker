from pydantic import BaseModel
from datetime import date
from typing import List, Optional
from .asset_types import AssetType

class TickerPayload(BaseModel):
    tickers: List[str]

class SnapshotCreate(BaseModel):
    overwrite: bool = False

class HoldingCreate(BaseModel):
    id: Optional[int] = None
    ticker: str
    asset_type: Optional[AssetType] = None
    shares: float
    average_cost: float
    account: str
    is_manual: bool = False
    manual_price: Optional[float] = None

class TickerAssetTypeUpdate(BaseModel):
    asset_type: AssetType

class CashFlowItemCreate(BaseModel):
    id: Optional[int] = None
    name: str
    category: str = "Bill"
    flow_type: str = "expense"
    cash_account: Optional[str] = ""
    amount: float
    due_date: date
    is_paid: bool = False
    notes: Optional[str] = ""

class MortgageEstimateRefresh(BaseModel):
    force: bool = True

class RecurringCashFlowAccountUpdate(BaseModel):
    cash_account: Optional[str] = ""

class BrandingSettings(BaseModel):
    app_name: str
    portfolio_subtitle: str
    accounts_subtitle: str
    cashflow_subtitle: str
    mortgage_subtitle: str

class BrandingSettingsUpdate(BaseModel):
    app_name: Optional[str] = None
    portfolio_subtitle: Optional[str] = None
    accounts_subtitle: Optional[str] = None
    cashflow_subtitle: Optional[str] = None
    mortgage_subtitle: Optional[str] = None
