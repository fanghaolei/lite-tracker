# Testing

## Commands

- Run all tests:
  `python -m pytest tests -v`
- Quiet mode:
  `python -m pytest tests -q`
- Coverage:
  `python -m pytest tests --cov=app --cov-report=term-missing`

## Current Status

- Test suite: 70 tests
- Result: passing

## Scope

- `tests/test_asset_types.py`
- `tests/test_operations.py`
- `tests/test_demo_data.py`
- `tests/test_settings_service.py`
- `tests/test_snapshot_service.py`
