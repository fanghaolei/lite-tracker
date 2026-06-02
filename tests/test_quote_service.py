from datetime import datetime, timedelta

from app.db import models
from app.services import quotes


def test_zero_cache_is_refetched(db_session, monkeypatch):
    db_session.add(models.QuoteCache(
        ticker="AAPL",
        price=0,
        prev_close=0,
        fetched_at=datetime.now()
    ))
    db_session.commit()

    monkeypatch.setattr(
        quotes,
        "fetch_yahoo_quotes",
        lambda tickers: {"AAPL": {"price": 150.0, "prev_close": 149.0}},
    )

    result = quotes.get_live_quotes(["AAPL"], db=db_session)
    row = db_session.query(models.QuoteCache).filter(models.QuoteCache.ticker == "AAPL").first()

    assert result["AAPL"]["price"] == 150.0
    assert result["AAPL"]["cached"] is False
    assert row.price == 150.0
    assert row.prev_close == 149.0


def test_failed_fetch_keeps_stale_good_cache(db_session, monkeypatch):
    fetched_at = datetime.now() - timedelta(hours=1)
    db_session.add(models.QuoteCache(
        ticker="MSFT",
        price=300.0,
        prev_close=299.0,
        fetched_at=fetched_at
    ))
    db_session.commit()

    monkeypatch.setattr(
        quotes,
        "fetch_yahoo_quotes",
        lambda tickers: {"MSFT": {"price": 0, "prev_close": 0}},
    )

    result = quotes.get_live_quotes(["MSFT"], db=db_session)
    row = db_session.query(models.QuoteCache).filter(models.QuoteCache.ticker == "MSFT").first()

    assert result["MSFT"]["price"] == 300.0
    assert result["MSFT"]["cached"] is True
    assert result["MSFT"]["stale"] is True
    assert row.price == 300.0
    assert row.fetched_at == fetched_at
