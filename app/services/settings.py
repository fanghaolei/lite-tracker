from datetime import datetime
from typing import Dict

from sqlalchemy.orm import Session

from app.db import models, schemas

BRANDING_KEYS = (
    "app_name",
    "portfolio_subtitle",
    "accounts_subtitle",
    "cashflow_subtitle",
    "mortgage_subtitle",
)

DEFAULT_BRANDING: Dict[str, str] = {
    "app_name": "Lite Tracker",
    "portfolio_subtitle": "\U0001F33F Portfolio growth in motion \U0001FA99",
    "accounts_subtitle": "\U0001F9ED Accounts in balance \U0001FA99",
    "cashflow_subtitle": "\U0001F4C6 Cash flow with confidence \U0001FA99",
    "mortgage_subtitle": "\U0001F3E0 Home equity in motion \U0001FA99",
}


def ensure_settings_table(db: Session) -> None:
    models.AppSetting.__table__.create(bind=db.get_bind(), checkfirst=True)


def get_branding_settings(db: Session) -> schemas.BrandingSettings:
    ensure_settings_table(db)
    rows = (
        db.query(models.AppSetting)
        .filter(models.AppSetting.key.in_(BRANDING_KEYS))
        .all()
    )
    values = DEFAULT_BRANDING.copy()
    values.update({row.key: row.value for row in rows if row.value is not None})
    return schemas.BrandingSettings(**values)


def update_branding_settings(db: Session, payload: schemas.BrandingSettingsUpdate) -> schemas.BrandingSettings:
    ensure_settings_table(db)
    updates = payload.model_dump(exclude_unset=True)
    now = datetime.now()

    for key in BRANDING_KEYS:
        if key not in updates:
            continue
        row = db.query(models.AppSetting).filter(models.AppSetting.key == key).first()
        value = updates[key] or ""
        if row:
            row.value = value
            row.updated_at = now
        else:
            db.add(models.AppSetting(key=key, value=value, updated_at=now))

    db.commit()
    return get_branding_settings(db)
