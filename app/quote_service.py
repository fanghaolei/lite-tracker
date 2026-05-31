from datetime import datetime, timedelta

import pandas as pd
import yfinance as yf
from sqlalchemy.orm import Session

from . import models

QUOTE_CACHE_MINUTES = 15


def fetch_yahoo_quotes(tickers: list):
    requested = [ticker.upper().strip() for ticker in tickers if ticker.strip()]
    yahoo_tickers = [ticker for ticker in requested if ticker != "CASH"]
    quotes = {}

    if "CASH" in requested:
        quotes["CASH"] = {"price": 1.0, "prev_close": 1.0}
    if not yahoo_tickers:
        return quotes

    try:
        data = yf.download(" ".join(yahoo_tickers), period="5d", interval="1d", progress=False)
        if data.empty or "Close" not in data:
            return {ticker: {"price": 0, "prev_close": 0} for ticker in yahoo_tickers}

        close_data = data["Close"]
        for ticker in yahoo_tickers:
            try:
                if isinstance(close_data, pd.DataFrame):
                    prices = close_data[ticker].dropna() if ticker in close_data.columns else pd.Series()
                else:
                    prices = close_data.dropna()

                if prices.empty:
                    quotes[ticker] = {"price": 0, "prev_close": 0}
                    continue

                latest = round(float(prices.iloc[-1]), 2)
                previous = round(float(prices.iloc[-2]), 2) if len(prices) > 1 else latest
                quotes[ticker] = {"price": latest, "prev_close": previous}
            except Exception:
                quotes[ticker] = {"price": 0, "prev_close": 0}
        return quotes
    except Exception as exc:
        print(f"Quote Error: {exc}")
        return {ticker: {"price": 0, "prev_close": 0} for ticker in yahoo_tickers}


def get_live_quotes(tickers: list, db: Session = None, force: bool = False):
    requested = sorted({ticker.upper().strip() for ticker in tickers if ticker and ticker.strip()})
    if not requested:
        return {}

    quotes = {}
    yahoo_tickers = [ticker for ticker in requested if ticker != "CASH"]
    if "CASH" in requested:
        quotes["CASH"] = {"price": 1.0, "prev_close": 1.0, "cached": True}
    if not yahoo_tickers:
        return quotes
    if db is None:
        return {**quotes, **fetch_yahoo_quotes(yahoo_tickers)}

    now = datetime.now()
    fresh_after = now - timedelta(minutes=QUOTE_CACHE_MINUTES)
    missing = []

    cached_rows = db.query(models.QuoteCache).filter(models.QuoteCache.ticker.in_(yahoo_tickers)).all()
    cached_by_ticker = {row.ticker: row for row in cached_rows}
    for ticker in yahoo_tickers:
        row = cached_by_ticker.get(ticker)
        if row and row.fetched_at and row.fetched_at >= fresh_after and not force:
            quotes[ticker] = {"price": row.price, "prev_close": row.prev_close, "cached": True}
        else:
            missing.append(ticker)

    if missing:
        fetched = fetch_yahoo_quotes(missing)
        for ticker, quote in fetched.items():
            price = quote.get("price", 0)
            prev_close = quote.get("prev_close", 0)
            row = cached_by_ticker.get(ticker) or db.query(models.QuoteCache).filter(
                models.QuoteCache.ticker == ticker
            ).first()
            if row:
                row.price = price
                row.prev_close = prev_close
                row.fetched_at = now
            else:
                db.add(models.QuoteCache(ticker=ticker, price=price, prev_close=prev_close, fetched_at=now))
            quotes[ticker] = {"price": price, "prev_close": prev_close, "cached": False}
        db.commit()

    return quotes
