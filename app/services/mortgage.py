import re
from datetime import datetime
from urllib.request import Request, urlopen

from sqlalchemy.orm import Session

from app.db import models

PROPERTY_ESTIMATE_PATTERNS = {
    "redfin": [
        r"Redfin Estimate[^$]{0,1200}\$([\d,]+)",
        r'"avmValue"\s*:\s*(\d+)',
        r'"predictedValue"\s*:\s*(\d+)'
    ],
    "zillow": [
        r"Zestimate[^$]{0,1200}\$([\d,]+)",
        r'"zestimate"\s*:\s*(\d+)',
        r'"homeValue"\s*:\s*(\d+)'
    ]
}


def serialize_property_estimate(estimate):
    return {
        "id": estimate.id,
        "source": estimate.source,
        "value": round(float(estimate.value or 0), 2),
        "date": estimate.date.strftime("%Y-%m-%d"),
        "url": estimate.url
    }


def serialize_mortgage_profile(profile):
    if not profile:
        return None
    return {
        "id": profile.id,
        "property_address_line1": profile.property_address_line1 or "",
        "property_address_line2": profile.property_address_line2 or "",
        "principal_balance": round(float(profile.principal_balance or 0), 2),
        "origination_date": profile.origination_date.strftime("%Y-%m-%d") if profile.origination_date else None,
        "maturity_date": profile.maturity_date.strftime("%Y-%m-%d") if profile.maturity_date else None,
        "original_term_months": profile.original_term_months or 0,
        "remaining_term_months": profile.remaining_term_months or 0,
        "annual_interest_rate": float(profile.annual_interest_rate or 0),
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None
    }


def get_mortgage_profile(db: Session):
    profile = db.query(models.MortgageProfile).order_by(models.MortgageProfile.id.asc()).first()
    return serialize_mortgage_profile(profile)


def parse_property_estimate(source: str, html: str):
    patterns = _patterns_for_source(source)
    for pattern in patterns:
        match = re.search(pattern, html, re.IGNORECASE | re.DOTALL)
        if match:
            return float(match.group(1).replace(",", ""))
    raise ValueError(f"Could not parse {source or 'property'} estimate")


def fetch_property_estimate(source: str, url: str):
    request = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/125.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
    )
    with urlopen(request, timeout=12) as response:
        html = response.read().decode("utf-8", errors="ignore")
    return parse_property_estimate(source, html)


def upsert_property_estimate(db: Session, source: str, value: float, url: str, estimate_date=None, commit: bool = True):
    estimate_date = estimate_date or datetime.now().date()
    row = db.query(models.PropertyEstimate).filter(
        models.PropertyEstimate.source == source,
        models.PropertyEstimate.date == estimate_date
    ).first()
    if row:
        row.value = value
        row.url = url
    else:
        row = models.PropertyEstimate(source=source, value=value, date=estimate_date, url=url)
        db.add(row)
    if commit:
        db.commit()
        db.refresh(row)
    else:
        db.flush()
    return row


def get_property_estimate_sources(db: Session):
    rows = db.query(models.PropertyEstimate.source, models.PropertyEstimate.url).order_by(
        models.PropertyEstimate.source.asc(),
        models.PropertyEstimate.date.desc()
    ).all()
    sources = {}
    for row in rows:
        if row.source not in sources:
            sources[row.source] = row.url
    return [{"source": source, "url": url} for source, url in sources.items() if source and url]


def get_latest_property_estimates(db: Session):
    profile = get_mortgage_profile(db)
    latest_date = db.query(models.PropertyEstimate.date).order_by(models.PropertyEstimate.date.desc()).first()
    if not latest_date:
        return {"profile": profile, "date": None, "estimates": []}

    rows = db.query(models.PropertyEstimate).filter(
        models.PropertyEstimate.date == latest_date[0]
    ).order_by(models.PropertyEstimate.source.asc()).all()
    return {
        "profile": profile,
        "date": latest_date[0].strftime("%Y-%m-%d"),
        "estimates": [serialize_property_estimate(row) for row in rows]
    }


def list_property_estimate_history(db: Session):
    rows = db.query(models.PropertyEstimate).order_by(
        models.PropertyEstimate.date.desc(),
        models.PropertyEstimate.source.asc()
    ).all()
    return [serialize_property_estimate(row) for row in rows]


def refresh_property_estimates(db: Session, force: bool = True):
    profile = get_mortgage_profile(db)
    today = datetime.now().date()
    if not force:
        existing = db.query(models.PropertyEstimate).filter(models.PropertyEstimate.date == today).all()
        if existing:
            return {
                "profile": profile,
                "date": today.strftime("%Y-%m-%d"),
                "cached": True,
                "errors": [],
                "estimates": [serialize_property_estimate(row) for row in existing]
            }

    refreshed = []
    errors = []
    for source_config in get_property_estimate_sources(db):
        try:
            value = fetch_property_estimate(source_config["source"], source_config["url"])
        except Exception as exc:
            previous = db.query(models.PropertyEstimate).filter(
                models.PropertyEstimate.source == source_config["source"]
            ).order_by(models.PropertyEstimate.date.desc()).first()
            if not previous:
                errors.append({
                    "source": source_config["source"],
                    "message": f"{exc}. No saved value exists for this source."
                })
                continue
            value = float(previous.value)
            errors.append({
                "source": source_config["source"],
                "message": f"{exc}. Kept the latest saved value for this source."
            })
        refreshed.append(upsert_property_estimate(
            db,
            source_config["source"],
            value,
            source_config["url"],
            estimate_date=today,
            commit=False
        ))

    if refreshed:
        db.commit()
        for row in refreshed:
            db.refresh(row)

    return {
        "profile": profile,
        "date": today.strftime("%Y-%m-%d"),
        "cached": False,
        "errors": errors,
        "estimates": [serialize_property_estimate(row) for row in refreshed]
    }


def _patterns_for_source(source: str):
    source_key = (source or "").lower()
    for key, patterns in PROPERTY_ESTIMATE_PATTERNS.items():
        if key in source_key:
            return patterns
    return [pattern for patterns in PROPERTY_ESTIMATE_PATTERNS.values() for pattern in patterns]
