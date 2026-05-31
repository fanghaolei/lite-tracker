"""Unit tests for app/settings_service.py"""

from app import schemas, settings_service


def test_branding_defaults_are_generic(db_session):
    """Default branding should not contain user-specific labels."""
    result = settings_service.get_branding_settings(db_session)

    assert result.app_name == "Lite Tracker"


def test_branding_update_persists_to_database(db_session):
    """Branding values should be loaded from app_settings after update."""
    payload = schemas.BrandingSettingsUpdate(
        app_name="Growth Ledger",
        portfolio_subtitle="Portfolio in motion",
    )

    updated = settings_service.update_branding_settings(db_session, payload)
    reloaded = settings_service.get_branding_settings(db_session)

    assert updated.app_name == "Growth Ledger"
    assert reloaded.app_name == "Growth Ledger"
    assert reloaded.portfolio_subtitle == "Portfolio in motion"
    assert reloaded.accounts_subtitle == settings_service.DEFAULT_BRANDING["accounts_subtitle"]


def test_branding_read_creates_settings_table_if_missing(db_session):
    """Settings calls should self-heal when the table is not present yet."""
    settings_service.models.AppSetting.__table__.drop(bind=db_session.get_bind(), checkfirst=True)

    result = settings_service.get_branding_settings(db_session)

    assert result.app_name == "Lite Tracker"


def test_branding_update_creates_settings_table_if_missing(db_session):
    """Saving should work even before app_settings exists in an older local DB."""
    settings_service.models.AppSetting.__table__.drop(bind=db_session.get_bind(), checkfirst=True)

    result = settings_service.update_branding_settings(
        db_session,
        schemas.BrandingSettingsUpdate(app_name="Growth Ledger"),
    )

    assert result.app_name == "Growth Ledger"
