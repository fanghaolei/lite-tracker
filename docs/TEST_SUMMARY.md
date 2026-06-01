# Test Summary

## Baseline

- Command: `python -m pytest tests -q`
- Result: 70 passed

## Modules Covered

- `tests/test_asset_types.py`
  - Asset type normalization rules.
- `tests/test_operations.py`
  - Holding upsert/delete and cash-flow repository logic.
- `tests/test_snapshot_service.py`
  - Snapshot item calculations and serialization.
- `tests/test_settings_service.py`
  - Branding settings defaults and persistence.
- `tests/test_demo_data.py`
  - Demo database seed coverage.

## Notes

- Current suite is clean.
