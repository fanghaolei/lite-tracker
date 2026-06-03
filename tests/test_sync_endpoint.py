from app.api import endpoints
from app.db import models


def test_sync_all_forces_live_quote_cache_only(db_session, monkeypatch):
    db_session.add_all([
        models.Holding(
            ticker="AAPL",
            asset_type="stock",
            shares=5,
            average_cost=150,
            account="Brokerage",
            is_manual=False,
        ),
        models.Holding(
            ticker="CASH",
            asset_type="cash equivalents",
            shares=1000,
            average_cost=1,
            account="Checking",
            is_manual=False,
        ),
        models.Holding(
            ticker="PVT-DEMO",
            asset_type="other",
            shares=10,
            average_cost=100,
            account="Private",
            is_manual=True,
            manual_price=125,
        ),
    ])
    db_session.commit()
    calls = {}

    def fake_live_quotes(tickers, db=None, force=False):
        calls["quote_tickers"] = tickers
        calls["quote_db"] = db
        calls["force"] = force
        return {"AAPL": {"price": 155.0, "prev_close": 154.0, "cached": False}}

    monkeypatch.setattr(endpoints, "fetch_live_quotes", fake_live_quotes)

    result = endpoints.sync_all(db_session)

    assert result["status"] == "synced"
    assert result["tickers"] == ["AAPL"]
    assert result["quotes"]["AAPL"]["price"] == 155.0
    assert calls["quote_tickers"] == ["AAPL"]
    assert calls["quote_db"] is db_session
    assert calls["force"] is True
