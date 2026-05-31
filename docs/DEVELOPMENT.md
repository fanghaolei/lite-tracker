# Development Workflow

## Standard Loop

1. Create or switch branch.
2. Implement backend/frontend changes.
3. Run tests: `python -m pytest tests -v`
4. Rebuild frontend: `npm run build`
5. Run app and verify behavior in browser.
6. Update docs if behavior or API changed.

## File Ownership

- Backend API: `app/api/endpoints.py`
- Domain logic: `app/*_service.py`, `app/crud.py`
- Data model: `app/models.py`, `app/schemas.py`
- Frontend pages/components: `frontend/src/components`

## Pull Request Checklist

- Tests pass.
- No stale docs.
- No dead code introduced.
