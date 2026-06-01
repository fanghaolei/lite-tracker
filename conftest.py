import pytest
import os
import tempfile
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.db.session import Base
from app.db import models


@pytest.fixture(scope="function")
def db_session() -> Session:
    """Create an in-memory SQLite database for each test."""
    # Use in-memory SQLite for tests (much faster)
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestSessionLocal()
    
    yield db
    
    db.close()


@pytest.fixture
def sample_holding(db_session: Session) -> models.Holding:
    """Create a sample stock holding for tests."""
    holding = models.Holding(
        ticker="AAPL",
        asset_type="stock",
        shares=100.0,
        average_cost=150.0,
        account="Brokerage",
        is_manual=False
    )
    db_session.add(holding)
    db_session.commit()
    db_session.refresh(holding)
    return holding


@pytest.fixture
def sample_cash_holding(db_session: Session) -> models.Holding:
    """Create a CASH holding for tests."""
    holding = models.Holding(
        ticker="CASH",
        asset_type="cash equivalents",
        shares=10000.0,
        average_cost=1.0,
        account="Checking",
        is_manual=True
    )
    db_session.add(holding)
    db_session.commit()
    db_session.refresh(holding)
    return holding


@pytest.fixture
def sample_crypto_holding(db_session: Session) -> models.Holding:
    """Create a crypto holding for tests."""
    holding = models.Holding(
        ticker="BTC-USD",
        asset_type="crypto",
        shares=0.5,
        average_cost=40000.0,
        account="Crypto",
        is_manual=False
    )
    db_session.add(holding)
    db_session.commit()
    db_session.refresh(holding)
    return holding
