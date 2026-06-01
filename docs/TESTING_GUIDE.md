# Testing Guide

## Common Commands

- Run all tests:
  `python -m pytest tests -v`
- Run one file:
  `python -m pytest tests/test_operations.py -v`
- Run one test:
  `python -m pytest tests/test_operations.py::TestUpdateHolding::test_create_new_holding -v`
- Filter by name:
  `python -m pytest tests -k "asset_type" -v`

## Coverage

- Generate coverage:
  `python -m pytest tests --cov=app --cov-report=html`
- Open report:
  `htmlcov/index.html`
