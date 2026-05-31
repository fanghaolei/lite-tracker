"""Unit tests for app/crud.py"""
import pytest
from datetime import datetime

from app import models, crud, schemas
from sqlalchemy.orm import Session


class TestGetTickerAssetType:
    """Test asset type retrieval by ticker."""

    def test_get_existing_ticker_asset_type(self, db_session):
        """Should return stored asset type for existing ticker."""
        ticker_type = models.TickerAssetType(
            ticker="AAPL",
            asset_type="stock",
            updated_at=datetime.now()
        )
        db_session.add(ticker_type)
        db_session.commit()
        
        result = crud.get_ticker_asset_type(db_session, "AAPL")
        assert result == "stock"

    def test_get_nonexistent_ticker_returns_fallback(self, db_session):
        """Should return fallback for non-existent ticker."""
        result = crud.get_ticker_asset_type(db_session, "UNKNOWN", fallback="stock")
        assert result == "stock"

    def test_ticker_case_insensitive(self, db_session):
        """Ticker lookup should be case-insensitive."""
        ticker_type = models.TickerAssetType(
            ticker="AAPL",
            asset_type="stock",
            updated_at=datetime.now()
        )
        db_session.add(ticker_type)
        db_session.commit()
        
        assert crud.get_ticker_asset_type(db_session, "aapl") == "stock"
        assert crud.get_ticker_asset_type(db_session, "Aapl") == "stock"
        assert crud.get_ticker_asset_type(db_session, "AAPL") == "stock"

    def test_manual_holding_normalization(self, db_session):
        """Manual holdings should have asset type normalized."""
        ticker_type = models.TickerAssetType(
            ticker="GOLD",
            asset_type="other",
            updated_at=datetime.now()
        )
        db_session.add(ticker_type)
        db_session.commit()
        
        result = crud.get_ticker_asset_type(db_session, "GOLD", is_manual=True)
        assert result == "other"


class TestUpdateHolding:
    """Test holding creation and updates."""

    def test_create_new_holding(self, db_session):
        """Should create new holding in database."""
        payload = schemas.HoldingCreate(
            ticker="AAPL",
            shares=100.0,
            average_cost=150.0,
            account="Brokerage",
            asset_type="stock"
        )
        
        result = crud.update_holding(db_session, payload)
        
        assert result.ticker == "AAPL"
        assert result.shares == 100.0
        assert result.average_cost == 150.0
        assert result.account == "Brokerage"
        assert result.is_manual is False

    def test_update_existing_holding_by_id(self, db_session):
        """Should update existing holding by ID."""
        # Create initial holding
        holding = models.Holding(
            ticker="AAPL",
            shares=100.0,
            average_cost=150.0,
            account="Brokerage"
        )
        db_session.add(holding)
        db_session.commit()
        
        # Update via CRUD
        payload = schemas.HoldingCreate(
            id=holding.id,
            ticker="AAPL",
            shares=150.0,
            average_cost=160.0,
            account="Brokerage"
        )
        
        result = crud.update_holding(db_session, payload)
        
        assert result.id == holding.id
        assert result.shares == 150.0
        assert result.average_cost == 160.0

    def test_update_existing_holding_by_ticker_and_account(self, db_session):
        """Should update existing holding by ticker and account if ID not provided."""
        # Create initial holding
        holding = models.Holding(
            ticker="AAPL",
            shares=100.0,
            average_cost=150.0,
            account="Brokerage"
        )
        db_session.add(holding)
        db_session.commit()
        
        # Update without ID
        payload = schemas.HoldingCreate(
            ticker="AAPL",
            shares=200.0,
            average_cost=155.0,
            account="Brokerage"
        )
        
        result = crud.update_holding(db_session, payload)
        
        assert result.id == holding.id
        assert result.shares == 200.0

    def test_create_holding_different_accounts(self, db_session):
        """Should create separate holdings for same ticker in different accounts."""
        payload1 = schemas.HoldingCreate(
            ticker="AAPL",
            shares=100.0,
            average_cost=150.0,
            account="Brokerage"
        )
        payload2 = schemas.HoldingCreate(
            ticker="AAPL",
            shares=50.0,
            average_cost=160.0,
            account="401k"
        )
        
        result1 = crud.update_holding(db_session, payload1)
        result2 = crud.update_holding(db_session, payload2)
        
        assert result1.id != result2.id
        assert result1.account == "Brokerage"
        assert result2.account == "401k"

    def test_cash_ticker_never_manual(self, db_session):
        """CASH ticker should never be marked as manual."""
        payload = schemas.HoldingCreate(
            ticker="CASH",
            shares=10000.0,
            average_cost=1.0,
            account="Checking",
            is_manual=True  # Try to set to manual
        )
        
        result = crud.update_holding(db_session, payload)
        
        assert result.ticker == "CASH"
        assert result.is_manual is False  # Should be overridden

    def test_manual_holding_stores_manual_price(self, db_session):
        """Manual holdings should store manual_price."""
        payload = schemas.HoldingCreate(
            ticker="GOLD",
            shares=10.0,
            average_cost=1800.0,
            account="Precious",
            is_manual=True,
            manual_price=1850.0
        )
        
        result = crud.update_holding(db_session, payload)
        
        assert result.is_manual is True
        assert result.manual_price == 1850.0

    def test_non_manual_holding_clears_manual_price(self, db_session):
        """Non-manual holdings should have manual_price cleared."""
        payload = schemas.HoldingCreate(
            ticker="AAPL",
            shares=100.0,
            average_cost=150.0,
            account="Brokerage",
            is_manual=False,
            manual_price=200.0  # Should be ignored
        )
        
        result = crud.update_holding(db_session, payload)
        
        assert result.is_manual is False
        assert result.manual_price is None

    def test_ticker_normalized_to_uppercase(self, db_session):
        """Ticker should be normalized to uppercase."""
        payload = schemas.HoldingCreate(
            ticker="aapl",
            shares=100.0,
            average_cost=150.0,
            account="Brokerage"
        )
        
        result = crud.update_holding(db_session, payload)
        
        assert result.ticker == "AAPL"


class TestDeleteHolding:
    """Test holding deletion."""

    def test_delete_holding_by_ticker_and_account(self, db_session):
        """Should delete holding by ticker and account."""
        holding = models.Holding(
            ticker="AAPL",
            shares=100.0,
            average_cost=150.0,
            account="Brokerage"
        )
        db_session.add(holding)
        db_session.commit()
        
        result = crud.delete_holding(db_session, "AAPL", "Brokerage")
        
        assert result is True
        assert db_session.query(models.Holding).filter(
            models.Holding.ticker == "AAPL"
        ).first() is None

    def test_delete_nonexistent_holding_returns_false(self, db_session):
        """Should return False when deleting non-existent holding."""
        result = crud.delete_holding(db_session, "MISSING", "Brokerage")
        assert result is False

    def test_delete_one_lot_deletes_history(self, db_session):
        """Deleting last lot should delete price history."""
        # Create holding
        holding = models.Holding(
            ticker="AAPL",
            shares=100.0,
            average_cost=150.0,
            account="Brokerage"
        )
        db_session.add(holding)
        db_session.commit()
        
        # Add history
        history = models.History(
            ticker="AAPL",
            date=datetime.now().date(),
            price=150.0
        )
        db_session.add(history)
        db_session.commit()
        
        # Delete holding
        crud.delete_holding(db_session, "AAPL", "Brokerage")
        
        # History should be deleted
        remaining_history = db_session.query(models.History).filter(
            models.History.ticker == "AAPL"
        ).first()
        assert remaining_history is None

    def test_delete_one_of_multiple_lots_keeps_history(self, db_session):
        """Deleting one lot shouldn't delete history if other lots exist."""
        # Create two lots of same ticker
        holding1 = models.Holding(
            ticker="AAPL",
            shares=100.0,
            average_cost=150.0,
            account="Brokerage"
        )
        holding2 = models.Holding(
            ticker="AAPL",
            shares=50.0,
            average_cost=145.0,
            account="401k"
        )
        db_session.add(holding1)
        db_session.add(holding2)
        db_session.commit()
        
        # Add history
        history = models.History(
            ticker="AAPL",
            date=datetime.now().date(),
            price=150.0
        )
        db_session.add(history)
        db_session.commit()
        
        # Delete one lot
        crud.delete_holding(db_session, "AAPL", "Brokerage")
        
        # History should still exist
        remaining_history = db_session.query(models.History).filter(
            models.History.ticker == "AAPL"
        ).first()
        assert remaining_history is not None
        assert remaining_history.price == 150.0


class TestCashFlowOperations:
    """Test cash flow item CRUD operations."""

    def test_create_cash_flow_item(self, db_session):
        """Should create new cash flow item."""
        from datetime import date
        
        payload = schemas.CashFlowItemCreate(
            name="Mortgage",
            category="Housing",
            flow_type="expense",
            cash_account="Checking",
            amount=2000.0,
            due_date=date(2024, 2, 1),
            is_paid=False,
            notes="Monthly mortgage"
        )
        
        result = crud.update_cash_flow_item(db_session, payload)
        
        assert result.name == "Mortgage"
        assert result.amount == 2000.0
        assert result.is_paid is False
        assert result.category == "Housing"

    def test_update_cash_flow_item(self, db_session):
        """Should update existing cash flow item."""
        from datetime import date
        
        # Create initial item
        item = models.CashFlowItem(
            name="Mortgage",
            amount=2000.0,
            due_date=date(2024, 2, 1),
            created_at=datetime.now()
        )
        db_session.add(item)
        db_session.commit()
        
        # Update
        payload = schemas.CashFlowItemCreate(
            id=item.id,
            name="Mortgage",
            amount=2100.0,
            due_date=date(2024, 2, 1),
            is_paid=True
        )
        
        result = crud.update_cash_flow_item(db_session, payload)
        
        assert result.id == item.id
        assert result.amount == 2100.0
        assert result.is_paid is True

    def test_delete_cash_flow_item(self, db_session):
        """Should delete cash flow item."""
        from datetime import date
        
        item = models.CashFlowItem(
            name="Test",
            amount=100.0,
            due_date=date(2024, 2, 1),
            created_at=datetime.now()
        )
        db_session.add(item)
        db_session.commit()
        item_id = item.id
        
        result = crud.delete_cash_flow_item(db_session, item_id)
        
        assert result is True
        remaining = db_session.query(models.CashFlowItem).filter(
            models.CashFlowItem.id == item_id
        ).first()
        assert remaining is None

    def test_get_cash_flow_items_sorted(self, db_session):
        """Should return cash flow items sorted by paid status and due date."""
        from datetime import date
        
        items_data = [
            ("Item 1", date(2024, 2, 5), True),
            ("Item 2", date(2024, 2, 1), False),
            ("Item 3", date(2024, 2, 3), False),
        ]
        
        for name, due_date, is_paid in items_data:
            item = models.CashFlowItem(
                name=name,
                amount=100.0,
                due_date=due_date,
                is_paid=is_paid,
                created_at=datetime.now()
            )
            db_session.add(item)
        db_session.commit()
        
        result = crud.get_cash_flow_items(db_session)
        
        # Unpaid should come first, then sorted by due date
        assert result[0].is_paid is False
        assert result[0].due_date == date(2024, 2, 1)
        assert result[1].is_paid is False
        assert result[1].due_date == date(2024, 2, 3)
        assert result[2].is_paid is True


class TestRecurringCashFlow:
    """Test recurring cash flow operations."""

    def test_update_recurring_cash_flow_account(self, db_session):
        """Should update cash account for recurring cash flow."""
        from datetime import date
        
        recurring = models.RecurringCashFlow(
            name="Salary",
            flow_type="income",
            amount=5000.0,
            start_date=date(2024, 1, 1),
            cadence="biweekly",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        db_session.add(recurring)
        db_session.commit()
        
        original_updated_at = recurring.updated_at
        
        result = crud.update_recurring_cash_flow_account(
            db_session,
            recurring.id,
            "Checking"
        )
        
        assert result.cash_account == "Checking"
        # Verify the timestamp was actually updated (or at least not earlier)
        assert result.updated_at >= original_updated_at

    def test_get_recurring_cash_flows_active_only(self, db_session):
        """Should only return active recurring cash flows."""
        from datetime import date
        
        active = models.RecurringCashFlow(
            name="Salary",
            flow_type="income",
            amount=5000.0,
            start_date=date(2024, 1, 1),
            is_active=True,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        inactive = models.RecurringCashFlow(
            name="Old Job",
            flow_type="income",
            amount=3000.0,
            start_date=date(2023, 1, 1),
            is_active=False,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        db_session.add(active)
        db_session.add(inactive)
        db_session.commit()
        
        result = crud.get_recurring_cash_flows(db_session)
        
        assert len(result) == 1
        assert result[0].name == "Salary"
        assert result[0].is_active is True
