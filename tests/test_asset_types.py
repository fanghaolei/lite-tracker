"""Unit tests for app/db/enums.py"""
import pytest
from app.db.enums import normalize_asset_type, AssetType, ASSET_TYPES


class TestNormalizeAssetType:
    """Test asset type normalization logic."""

    def test_cash_ticker_always_returns_cash_equivalents(self):
        """CASH ticker should always normalize to cash equivalents."""
        assert normalize_asset_type("CASH") == AssetType.CASH_EQUIVALENTS.value
        assert normalize_asset_type("cash") == AssetType.CASH_EQUIVALENTS.value
        assert normalize_asset_type("CASH", "stock") == AssetType.CASH_EQUIVALENTS.value
        assert normalize_asset_type("CASH", "crypto", is_manual=True) == AssetType.CASH_EQUIVALENTS.value

    def test_explicit_asset_type_normalization(self):
        """Explicit asset types should be normalized correctly."""
        assert normalize_asset_type("AAPL", "stock") == "stock"
        assert normalize_asset_type("AAPL", "Stock") == "stock"
        assert normalize_asset_type("AAPL", "STOCK") == "stock"
        assert normalize_asset_type("BTC", "crypto") == "crypto"
        assert normalize_asset_type("VTSAX", "fund") == "fund"
        assert normalize_asset_type("BOND", "cash equivalents") == "cash equivalents"

    def test_enum_asset_type(self):
        """Should accept AssetType enum values."""
        assert normalize_asset_type("AAPL", AssetType.STOCK) == "stock"
        assert normalize_asset_type("BTC", AssetType.CRYPTO) == "crypto"
        assert normalize_asset_type("ETF", AssetType.FUND) == "fund"

    def test_crypto_ticker_detection(self):
        """Tickers ending in -USD should default to crypto."""
        assert normalize_asset_type("BTC-USD", None, is_manual=False) == "crypto"
        assert normalize_asset_type("ETH-USD", None) == "crypto"
        assert normalize_asset_type("SOL-USD") == "crypto"

    def test_none_asset_type_defaults_to_stock(self):
        """None asset type should default to stock for non-manual, non-crypto holdings."""
        assert normalize_asset_type("AAPL", None, is_manual=False) == "stock"
        assert normalize_asset_type("IBM", "", is_manual=False) == "stock"
        assert normalize_asset_type("GOOGL", "  ", is_manual=False) == "stock"

    def test_none_asset_type_defaults_to_other_for_manual(self):
        """None asset type should default to other for manual holdings."""
        assert normalize_asset_type("TICKER", None, is_manual=True) == "other"
        assert normalize_asset_type("GOLD", "", is_manual=True) == "other"
        assert normalize_asset_type("PROPERTY", "  ", is_manual=True) == "other"

    def test_invalid_asset_type_defaults_to_stock(self):
        """Invalid asset types should default to stock for non-manual."""
        assert normalize_asset_type("AAPL", "invalid_type", is_manual=False) == "stock"
        assert normalize_asset_type("IBM", "foobar", is_manual=False) == "stock"
        assert normalize_asset_type("GOOGL", "xyz123", is_manual=False) == "stock"

    def test_invalid_asset_type_defaults_to_other_for_manual(self):
        """Invalid asset types should default to other for manual."""
        assert normalize_asset_type("AAPL", "invalid_type", is_manual=True) == "other"
        assert normalize_asset_type("REAL_ESTATE", "unknown", is_manual=True) == "other"

    def test_case_insensitive_asset_type(self):
        """Asset types should be case-insensitive."""
        assert normalize_asset_type("AAPL", "STOCK") == "stock"
        assert normalize_asset_type("AAPL", "Stock") == "stock"
        assert normalize_asset_type("AAPL", "sToCk") == "stock"
        assert normalize_asset_type("BTC", "CRYPTO") == "crypto"
        assert normalize_asset_type("ETF", "Fund") == "fund"

    def test_whitespace_handling(self):
        """Asset types with whitespace should be trimmed."""
        assert normalize_asset_type("AAPL", "  stock  ", is_manual=False) == "stock"
        assert normalize_asset_type("BTC", "  crypto  ") == "crypto"
        assert normalize_asset_type("VTSAX", "\tfund\n") == "fund"

    def test_cash_equivalents_special_handling(self):
        """cash equivalents should be handled correctly."""
        assert normalize_asset_type("BOND", "cash equivalents") == "cash equivalents"
        assert normalize_asset_type("BOND", "Cash Equivalents") == "cash equivalents"
        assert normalize_asset_type("BOND", "CASH EQUIVALENTS") == "cash equivalents"

    def test_all_valid_asset_types_recognized(self):
        """All valid asset types should be recognized."""
        for asset_type in ASSET_TYPES:
            result = normalize_asset_type("TEST", asset_type)
            assert result == asset_type, f"Failed for {asset_type}"

    def test_priority_cash_over_crypto_suffix(self):
        """CASH ticker (exact match) should override crypto suffix detection."""
        # Exact match "CASH" should be cash equivalents
        assert normalize_asset_type("CASH", None) == "cash equivalents"
        # But "CASH-USD" ends with -USD so it's detected as crypto (correct behavior)
        assert normalize_asset_type("CASH-USD", None) == "crypto"

    def test_explicit_type_overrides_crypto_detection(self):
        """Explicit asset type should override crypto suffix detection."""
        assert normalize_asset_type("BTC-USD", "stock") == "stock"
        assert normalize_asset_type("ETH-USD", "fund") == "fund"
        assert normalize_asset_type("SOL-USD", "other", is_manual=True) == "other"

    def test_ticker_case_normalization(self):
        """Ticker case shouldn't affect normalization (always uppercased internally)."""
        assert normalize_asset_type("aapl", "stock") == "stock"
        assert normalize_asset_type("Aapl", "stock") == "stock"
        assert normalize_asset_type("btc-usd", None) == "crypto"
        assert normalize_asset_type("BTC-USD", None) == "crypto"

    @pytest.mark.parametrize("ticker,asset_type,is_manual,expected", [
        ("AAPL", None, False, "stock"),
        ("BTC-USD", None, False, "crypto"),
        ("CASH", None, False, "cash equivalents"),
        ("REAL_ESTATE", None, True, "other"),
        ("AAPL", "fund", False, "fund"),
        ("AAPL", "invalid", True, "other"),
    ])
    def test_normalize_asset_type_parametrized(self, ticker, asset_type, is_manual, expected):
        """Parametrized tests for common scenarios."""
        assert normalize_asset_type(ticker, asset_type, is_manual) == expected
