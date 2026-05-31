"""Unit tests for app/snapshot_service.py"""
import pytest
from datetime import datetime, date
from unittest.mock import patch, MagicMock

from app import models, snapshot_service
from app.snapshot_service import (
    _snapshot_item_for_holding,
    _quote_for_holding,
    _get_asset_type_map,
    _serialize_snapshot,
    _serialize_snapshot_item
)


class TestQuoteForHolding:
    """Test quote retrieval logic for holdings."""

    def test_cash_holding_always_returns_1(self, sample_cash_holding):
        """CASH holdings should always have price and prev_close of 1.0."""
        quotes = {"AAPL": {"price": 150.0, "prev_close": 145.0}}
        quote = _quote_for_holding(sample_cash_holding, quotes)
        assert quote["price"] == 1.0
        assert quote["prev_close"] == 1.0

    def test_manual_holding_returns_manual_price(self, db_session):
        """Manual holdings should return their manual_price."""
        holding = models.Holding(
            ticker="GOLD",
            shares=10.0,
            average_cost=1800.0,
            is_manual=True,
            manual_price=1900.0
        )
        quotes = {}
        quote = _quote_for_holding(holding, quotes)
        assert quote["price"] == 1900.0
        assert quote["prev_close"] == 1900.0

    def test_manual_holding_with_zero_price(self, db_session):
        """Manual holding with None/zero price should return 0."""
        holding = models.Holding(
            ticker="GOLD",
            shares=10.0,
            average_cost=1800.0,
            is_manual=True,
            manual_price=None
        )
        quote = _quote_for_holding(holding, {})
        assert quote["price"] == 0
        assert quote["prev_close"] == 0

    def test_market_holding_uses_quotes(self, db_session):
        """Non-manual, non-cash holdings should use provided quotes."""
        holding = models.Holding(
            ticker="AAPL",
            shares=100.0,
            average_cost=150.0,
            is_manual=False
        )
        quotes = {"AAPL": {"price": 175.0, "prev_close": 170.0}}
        quote = _quote_for_holding(holding, quotes)
        assert quote["price"] == 175.0
        assert quote["prev_close"] == 170.0

    def test_missing_quote_defaults_to_zero(self, db_session):
        """Holdings without quotes in dict should default to 0."""
        holding = models.Holding(
            ticker="MISSING",
            shares=50.0,
            average_cost=100.0,
            is_manual=False
        )
        quote = _quote_for_holding(holding, {})
        assert quote["price"] == 0
        assert quote["prev_close"] == 0


class TestSnapshotItemCalculations:
    """Test snapshot item calculations including P/L."""

    def test_stock_cost_basis_calculation(self, sample_holding):
        """Cost basis for stocks should be shares * average_cost."""
        asset_type_map = {"AAPL": "stock"}
        quotes = {"AAPL": {"price": 180.0, "prev_close": 175.0}}
        
        item = _snapshot_item_for_holding(sample_holding, quotes, asset_type_map)
        
        assert item["cost_basis"] == 100.0 * 150.0  # 15000
        assert item["market_value"] == 100.0 * 180.0  # 18000
        assert item["total_pnl"] == 18000 - 15000  # 3000 profit

    def test_cash_cost_basis_calculation(self, sample_cash_holding):
        """Cost basis for CASH should be the shares amount (not shares * price)."""
        asset_type_map = {"CASH": "cash equivalents"}
        quotes = {}
        
        item = _snapshot_item_for_holding(sample_cash_holding, quotes, asset_type_map)
        
        assert item["cost_basis"] == 10000.0  # shares for CASH
        assert item["market_value"] == 10000.0  # 10000 * 1.0
        assert item["total_pnl"] == 0  # CASH has no P/L

    def test_daily_pnl_calculation(self, sample_holding):
        """Daily P/L should be shares * (live_price - prev_close)."""
        asset_type_map = {"AAPL": "stock"}
        quotes = {"AAPL": {"price": 180.0, "prev_close": 175.0}}
        
        item = _snapshot_item_for_holding(sample_holding, quotes, asset_type_map)
        
        expected_daily_pnl = 100.0 * (180.0 - 175.0)  # 500
        assert item["daily_pnl"] == expected_daily_pnl

    def test_daily_pnl_zero_when_prev_close_zero(self, sample_holding):
        """Daily P/L should be 0 when prev_close is 0."""
        asset_type_map = {"AAPL": "stock"}
        quotes = {"AAPL": {"price": 180.0, "prev_close": 0}}
        
        item = _snapshot_item_for_holding(sample_holding, quotes, asset_type_map)
        
        assert item["daily_pnl"] == 0

    def test_negative_pnl(self, sample_holding):
        """Negative P/L should be calculated correctly."""
        asset_type_map = {"AAPL": "stock"}
        quotes = {"AAPL": {"price": 140.0, "prev_close": 145.0}}
        
        item = _snapshot_item_for_holding(sample_holding, quotes, asset_type_map)
        
        assert item["market_value"] == 100.0 * 140.0  # 14000
        assert item["total_pnl"] == 14000 - 15000  # -1000 loss
        assert item["daily_pnl"] == 100.0 * (140.0 - 145.0)  # -500

    def test_zero_shares_zero_pnl(self, db_session):
        """Zero shares should result in zero P/L."""
        holding = models.Holding(
            ticker="AAPL",
            shares=0.0,
            average_cost=150.0
        )
        asset_type_map = {"AAPL": "stock"}
        quotes = {"AAPL": {"price": 180.0, "prev_close": 175.0}}
        
        item = _snapshot_item_for_holding(holding, quotes, asset_type_map)
        
        assert item["cost_basis"] == 0
        assert item["market_value"] == 0
        assert item["daily_pnl"] == 0
        assert item["total_pnl"] == 0

    def test_fractional_shares(self, db_session):
        """Fractional shares should be handled correctly."""
        holding = models.Holding(
            ticker="AAPL",
            shares=0.5,
            average_cost=150.0
        )
        asset_type_map = {"AAPL": "stock"}
        quotes = {"AAPL": {"price": 200.0, "prev_close": 195.0}}
        
        item = _snapshot_item_for_holding(holding, quotes, asset_type_map)
        
        assert item["cost_basis"] == 0.5 * 150.0  # 75
        assert item["market_value"] == 0.5 * 200.0  # 100
        assert item["total_pnl"] == 25.0
        assert item["daily_pnl"] == 0.5 * (200.0 - 195.0)  # 2.5

    def test_manual_holding_pnl(self, db_session):
        """Manual holdings should use manual_price for P/L."""
        holding = models.Holding(
            ticker="GOLD",
            shares=10.0,
            average_cost=1800.0,
            is_manual=True,
            manual_price=1850.0
        )
        asset_type_map = {"GOLD": "other"}
        quotes = {}
        
        item = _snapshot_item_for_holding(holding, quotes, asset_type_map)
        
        assert item["cost_basis"] == 10.0 * 1800.0  # 18000
        assert item["market_value"] == 10.0 * 1850.0  # 18500
        assert item["total_pnl"] == 500.0
        # Daily P/L uses manual_price for both current and prev_close
        assert item["daily_pnl"] == 0

    def test_crypto_holding_calculations(self, sample_crypto_holding):
        """Crypto holdings should calculate correctly."""
        asset_type_map = {"BTC-USD": "crypto"}
        quotes = {"BTC-USD": {"price": 50000.0, "prev_close": 48000.0}}
        
        item = _snapshot_item_for_holding(sample_crypto_holding, quotes, asset_type_map)
        
        assert item["cost_basis"] == 0.5 * 40000.0  # 20000
        assert item["market_value"] == 0.5 * 50000.0  # 25000
        assert item["total_pnl"] == 5000.0
        assert item["daily_pnl"] == 0.5 * (50000.0 - 48000.0)  # 1000


class TestSnapshotSerialization:
    """Test snapshot serialization and formatting."""

    def test_serialize_snapshot_basic(self, db_session):
        """Snapshot serialization should format dates and round values."""
        snapshot = models.Snapshot(
            date=date(2024, 1, 15),
            total_value=100000.0,
            cash_value=10000.5,
            daily_pnl=1234.567,
            total_pnl=5000.999,
            created_at=datetime(2024, 1, 15, 14, 30, 0)
        )
        
        result = _serialize_snapshot(snapshot)
        
        assert result["date"] == "2024-01-15"
        assert result["total_value"] == 100000.0
        assert result["cash_value"] == 10000.5
        assert result["daily_pnl"] == 1234.57  # Rounded to 2 decimals
        assert result["total_pnl"] == 5001.0

    def test_serialize_snapshot_with_items(self, db_session):
        """Snapshot with items should serialize items array."""
        snapshot = models.Snapshot(
            date=date(2024, 1, 15),
            total_value=100000.0,
            cash_value=10000.0,
            daily_pnl=0,
            total_pnl=0,
            created_at=datetime(2024, 1, 15, 14, 30, 0)
        )
        
        item1 = models.SnapshotItem(
            ticker="AAPL",
            asset_type="stock",
            account="Brokerage",
            shares=100.0,
            average_cost=150.0,
            market_value=18000.0,
            cost_basis=15000.0,
            total_pnl=3000.0,
            daily_pnl=500.0
        )
        
        result = _serialize_snapshot(snapshot, items=[item1])
        
        assert "items" in result
        assert len(result["items"]) == 1
        assert result["items"][0]["ticker"] == "AAPL"

    def test_serialize_snapshot_none_created_at(self, db_session):
        """Snapshot with None created_at should handle gracefully."""
        snapshot = models.Snapshot(
            date=date(2024, 1, 15),
            total_value=100000.0,
            cash_value=10000.0,
            daily_pnl=0,
            total_pnl=0,
            created_at=None
        )
        
        result = _serialize_snapshot(snapshot)
        
        assert result["created_at"] is None

    def test_serialize_snapshot_item(self, db_session):
        """Snapshot item serialization should preserve all fields."""
        item = models.SnapshotItem(
            ticker="AAPL",
            asset_type="stock",
            account="Brokerage",
            shares=100.0,
            average_cost=150.0,
            is_manual=False,
            manual_price=None,
            live_price=180.0,
            prev_close=175.0,
            cost_basis=15000.0,
            market_value=18000.0,
            daily_pnl=500.0,
            total_pnl=3000.0
        )
        
        result = _serialize_snapshot_item(item)
        
        assert result["ticker"] == "AAPL"
        assert result["shares"] == 100.0
        assert result["market_value"] == 18000.0
        assert result["total_pnl"] == 3000.0


class TestGetAssetTypeMap:
    """Test asset type map retrieval."""

    def test_empty_holdings_returns_empty_map(self, db_session):
        """Empty holdings should return empty map."""
        result = _get_asset_type_map(db_session, [])
        assert result == {}

    def test_asset_type_map_with_single_holding(self, db_session, sample_holding):
        """Map should include asset type for queried holdings."""
        # Add ticker asset type to DB
        ticker_type = models.TickerAssetType(
            ticker="AAPL",
            asset_type="stock",
            updated_at=datetime.now()
        )
        db_session.add(ticker_type)
        db_session.commit()
        
        holdings = [sample_holding]
        result = _get_asset_type_map(db_session, holdings)
        
        assert "AAPL" in result
        assert result["AAPL"] == "stock"

    def test_asset_type_map_with_multiple_holdings(self, db_session):
        """Map should include all holdings' asset types."""
        holdings = [
            models.Holding(ticker="AAPL", asset_type="stock", shares=100),
            models.Holding(ticker="BTC", asset_type="crypto", shares=1),
            models.Holding(ticker="VTSAX", asset_type="fund", shares=50),
        ]
        
        for h in holdings:
            ticker_type = models.TickerAssetType(
                ticker=h.ticker,
                asset_type=h.asset_type,
                updated_at=datetime.now()
            )
            db_session.add(ticker_type)
        db_session.commit()
        
        result = _get_asset_type_map(db_session, holdings)
        
        assert len(result) == 3
        assert result["AAPL"] == "stock"
        assert result["BTC"] == "crypto"
        assert result["VTSAX"] == "fund"

    def test_asset_type_map_missing_ticker_in_db(self, db_session):
        """Missing tickers in DB should not be in result."""
        holdings = [
            models.Holding(ticker="AAPL", asset_type="stock", shares=100),
            models.Holding(ticker="MISSING", asset_type="stock", shares=50),
        ]
        
        ticker_type = models.TickerAssetType(
            ticker="AAPL",
            asset_type="stock",
            updated_at=datetime.now()
        )
        db_session.add(ticker_type)
        db_session.commit()
        
        result = _get_asset_type_map(db_session, holdings)
        
        assert "AAPL" in result
        assert "MISSING" not in result
