# Testing

## Commands

- Run all tests:
  `python -m pytest tests -v`
- Quiet mode:
  `python -m pytest tests -q`
- Coverage:
  `python -m pytest tests --cov=app --cov-report=term-missing`

## Current Status

- Test suite: 85 tests
- Result: passing

## Scope

- `tests/test_asset_types.py`
- `tests/test_operations.py`
- `tests/test_demo_data.py`
- `tests/test_quote_service.py`
- `tests/test_sync_endpoint.py`
- `tests/test_settings_service.py`
- `tests/test_snapshot_service.py`

On Windows, if pytest cannot access the default temp directory, run with a repo-local temp directory:

```powershell
New-Item -ItemType Directory -Force .tmp\pytest | Out-Null
$env:TMP = "$PWD\.tmp\pytest"
$env:TEMP = "$PWD\.tmp\pytest"
python -m pytest tests -q
```
