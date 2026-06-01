from datetime import datetime, timedelta

import pandas as pd
import yfinance as yf
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db import models

_portfolio_history_cache = None


def clear_history_cache():
    global _portfolio_history_cache
    _portfolio_history_cache = None


def sync_tickers_history(tickers: list, db: Session):
    clear_history_cache()
    tickers = sorted({ticker.upper().strip() for ticker in tickers if ticker and ticker.upper().strip() != "CASH"})
    if not tickers:
        return

    try:
        start_date = datetime.now().date().replace(month=1, day=1)
        end_date = datetime.now().date() + timedelta(days=1)
        data = yf.download(tickers, start=start_date.isoformat(), end=end_date.isoformat(), interval="1d", progress=False)
        if data.empty or "Close" not in data:
            return

        db.query(models.History).filter(models.History.ticker.in_(tickers)).delete()
        close_data = data["Close"]

        for ticker in tickers:
            ticker_close = _ticker_close_series(close_data, ticker, len(tickers))
            if ticker_close is None:
                continue

            for date_value, price in ticker_close.dropna().items():
                if pd.notnull(price):
                    db.add(models.History(
                        ticker=ticker,
                        date=date_value.date() if hasattr(date_value, "date") else pd.to_datetime(date_value).date(),
                        price=round(float(price), 2)
                    ))
        db.commit()
    except Exception as exc:
        print(f"Bulk sync error for {tickers}: {exc}")


def sync_ticker_history(ticker: str, db: Session):
    sync_tickers_history([ticker], db)


def ensure_ytd_history(tickers: list, db: Session):
    start_date = datetime.now().date().replace(month=1, day=1)
    tickers_to_check = sorted({ticker.upper() for ticker in tickers if ticker and ticker.upper() != "CASH"})
    if not tickers_to_check:
        return

    results = db.query(
        models.History.ticker,
        func.min(models.History.date).label("oldest"),
        func.max(models.History.date).label("newest")
    ).filter(models.History.ticker.in_(tickers_to_check)).group_by(models.History.ticker).all()

    stats_by_ticker = {result.ticker: (result.oldest, result.newest) for result in results}
    to_sync = []
    for ticker in tickers_to_check:
        oldest, newest = stats_by_ticker.get(ticker, (None, None))
        if not oldest or oldest > start_date or not newest or newest < datetime.now().date() - timedelta(days=5):
            to_sync.append(ticker)

    if to_sync:
        print(f"Syncing tickers in bulk: {to_sync}")
        sync_tickers_history(to_sync, db)


def calculate_portfolio_history(db: Session):
    global _portfolio_history_cache
    if _portfolio_history_cache is not None:
        return _portfolio_history_cache

    holdings = db.query(models.Holding).all()
    if not holdings:
        return []

    start_date = datetime.now().date().replace(month=1, day=1)
    today = datetime.now().date()
    cash_value = sum(holding.shares for holding in holdings if holding.ticker == "CASH")
    manual_value = sum(
        holding.shares * (holding.manual_price or 0)
        for holding in holdings
        if holding.ticker != "CASH" and holding.is_manual
    )
    shares_by_ticker = _aggregate_live_priced_shares(holdings)
    snapshot_values = _get_ytd_snapshot_values(db, start_date, today)

    if not shares_by_ticker:
        result = _cash_only_history(start_date, today, cash_value + manual_value, snapshot_values)
        _portfolio_history_cache = result
        return result

    ensure_ytd_history(list(shares_by_ticker.keys()), db)
    history_rows = db.query(models.History).filter(
        models.History.ticker.in_(shares_by_ticker.keys()),
        models.History.date >= start_date,
        models.History.date <= today
    ).all()

    if not history_rows:
        result = [
            {"date": snapshot_date.strftime("%Y-%m-%d"), "value": round(value, 2), "source": "snapshot"}
            for snapshot_date, value in sorted(snapshot_values.items())
        ]
        _portfolio_history_cache = result
        return result

    try:
        result = _build_backfilled_history(history_rows, snapshot_values, shares_by_ticker, cash_value + manual_value)
        _portfolio_history_cache = result
        return result
    except Exception as exc:
        print(f"History processing error: {exc}")
        return []


def _ticker_close_series(close_data, ticker: str, ticker_count: int):
    if isinstance(close_data, pd.Series):
        return close_data
    if isinstance(close_data, pd.DataFrame):
        if ticker in close_data.columns:
            series = close_data[ticker]
        elif ticker_count == 1:
            series = close_data.iloc[:, 0]
        else:
            return None
        return series.squeeze() if isinstance(series, pd.DataFrame) else series
    return None


def _aggregate_live_priced_shares(holdings):
    shares_by_ticker = {}
    for holding in holdings:
        if holding.ticker != "CASH" and not holding.is_manual:
            shares_by_ticker[holding.ticker] = shares_by_ticker.get(holding.ticker, 0) + holding.shares
    return shares_by_ticker


def _get_ytd_snapshot_values(db: Session, start_date, today):
    snapshots = db.query(models.Snapshot).filter(
        models.Snapshot.date >= start_date,
        models.Snapshot.date <= today
    ).order_by(models.Snapshot.date).all()
    return {snapshot.date: float(snapshot.total_value or 0) for snapshot in snapshots}


def _cash_only_history(start_date, today, static_value: float, snapshot_values: dict):
    return [
        {
            "date": day.date().strftime("%Y-%m-%d"),
            "value": round(snapshot_values.get(day.date(), static_value), 2),
            "source": "snapshot" if day.date() in snapshot_values else "backfill"
        }
        for day in pd.date_range(start=start_date, end=today, freq="D")
    ]


def _build_backfilled_history(history_rows, snapshot_values: dict, shares_by_ticker: dict, static_value: float):
    frame = pd.DataFrame([
        {"date": row.date, "ticker": row.ticker, "price": row.price}
        for row in history_rows
    ])
    pivot = frame.pivot_table(index="date", columns="ticker", values="price").sort_index().ffill().bfill().fillna(0)
    date_index = pivot.index.union(pd.Index(snapshot_values.keys())).sort_values()
    pivot = pivot.reindex(date_index).ffill().bfill().fillna(0)

    history = []
    for date_value, row in pivot.iterrows():
        date_key = date_value.date() if hasattr(date_value, "date") else date_value
        if date_key in snapshot_values:
            total_value = snapshot_values[date_key]
            source = "snapshot"
        else:
            total_value = static_value + sum(
                price * shares_by_ticker[ticker]
                for ticker, price in row.items()
                if ticker in shares_by_ticker
            )
            source = "backfill"
        history.append({
            "date": date_value.strftime("%Y-%m-%d"),
            "value": round(float(total_value), 2),
            "source": source
        })
    return sorted(history, key=lambda item: item["date"])
