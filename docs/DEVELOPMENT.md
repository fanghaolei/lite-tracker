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
- API schemas: `app/db/schemas.py`
- Data access: `app/db/models.py`, `app/db/operations.py`, `app/db/session.py`
- Domain enums: `app/db/enums.py`
- Service logic: `app/services`
- Demo seed data: `app/demo/demo_data.py`
- Frontend page orchestration: `ui/src/components/*Page.tsx`
- Frontend feature components: `ui/src/components/{portfolio,accounts,cash-flow,mortgage}`
- Frontend domain helpers: `ui/src/domain`

## Pull Request Checklist

- Tests pass.
- No stale docs.
- No dead code introduced.
