"""Unit tests for app/demo/demo_data.py"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import models
from app.demo.demo_data import create_demo_database


def test_create_demo_database_populates_core_tables(tmp_path):
    """Demo database should contain fake data for the main app pages."""
    db_path = tmp_path / "demo-lite-tracker.db"

    create_demo_database(db_path)

    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    session = sessionmaker(autocommit=False, autoflush=False, bind=engine)()
    try:
        assert session.query(models.Holding).count() >= 8
        assert session.query(models.CashFlowItem).count() >= 3
        assert session.query(models.RecurringCashFlow).count() >= 2
        assert session.query(models.MortgageProfile).count() == 1
        assert session.query(models.PropertyEstimate).count() >= 2
        assert session.query(models.Snapshot).count() >= 3

        app_name = session.query(models.AppSetting).filter(models.AppSetting.key == "app_name").one()
        assert app_name.value == "Demo Ledger"
    finally:
        session.close()
        engine.dispose()
