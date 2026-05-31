from enum import Enum


class AssetType(str, Enum):
    STOCK = "stock"
    FUND = "fund"
    CASH_EQUIVALENTS = "cash equivalents"
    CRYPTO = "crypto"
    OTHER = "other"


ASSET_TYPES = tuple(asset_type.value for asset_type in AssetType)


def normalize_asset_type(ticker: str, asset_type: AssetType | str | None = None, is_manual: bool = False) -> str:
    if ticker.upper() == "CASH":
        return AssetType.CASH_EQUIVALENTS.value

    normalized = asset_type.value if isinstance(asset_type, AssetType) else (asset_type or "").strip().lower()
    if not normalized and ticker.upper().endswith("-USD"):
        return AssetType.CRYPTO.value
    if normalized in AssetType._value2member_map_:
        return normalized

    return AssetType.OTHER.value if is_manual else AssetType.STOCK.value
