"""Unit tests for app/services/settings.py"""

from app.db import schemas
from app.services import settings


def test_branding_defaults_are_generic(db_session):
    """Default branding should not contain user-specific labels."""
    result = settings.get_branding_settings(db_session)

    assert result.app_name == "Lite Tracker"


def test_branding_update_persists_to_database(db_session):
    """Branding values should be loaded from app_settings after update."""
    payload = schemas.BrandingSettingsUpdate(
        app_name="Growth Ledger",
        portfolio_subtitle="Portfolio in motion",
    )

    updated = settings.update_branding_settings(db_session, payload)
    reloaded = settings.get_branding_settings(db_session)

    assert updated.app_name == "Growth Ledger"
    assert reloaded.app_name == "Growth Ledger"
    assert reloaded.portfolio_subtitle == "Portfolio in motion"
    assert reloaded.accounts_subtitle == settings.DEFAULT_BRANDING["accounts_subtitle"]


def test_branding_read_creates_settings_table_if_missing(db_session):
    """Settings calls should self-heal when the table is not present yet."""
    settings.models.AppSetting.__table__.drop(bind=db_session.get_bind(), checkfirst=True)

    result = settings.get_branding_settings(db_session)

    assert result.app_name == "Lite Tracker"


def test_branding_update_creates_settings_table_if_missing(db_session):
    """Saving should work even before app_settings exists in an older local DB."""
    settings.models.AppSetting.__table__.drop(bind=db_session.get_bind(), checkfirst=True)

    result = settings.update_branding_settings(
        db_session,
        schemas.BrandingSettingsUpdate(app_name="Growth Ledger"),
    )

    assert result.app_name == "Growth Ledger"
