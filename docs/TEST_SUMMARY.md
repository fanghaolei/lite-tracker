# Test Summary

## Baseline

- Command: `python -m pytest tests -q`
- Result: 65 passed

## Modules Covered

- `tests/test_asset_types.py`
  - Asset type normalization rules.
- `tests/test_crud.py`
  - Holding upsert/delete and cash-flow CRUD logic.
- `tests/test_snapshot_service.py`
  - Snapshot item calculations and serialization.

## Notes

- Current suite is clean except one SQLAlchemy deprecation warning from
  `declarative_base()` in `app/core/database.py`.
