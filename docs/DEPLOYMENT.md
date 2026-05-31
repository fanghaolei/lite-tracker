# Deployment Checklist

## Build

1. Install dependencies.
2. Run tests: `python -m pytest tests -v`
3. Build frontend: `npm run build`

## Run

Use a process manager and run:
`python -m uvicorn main:app --host 0.0.0.0 --port 8000`

## Operational Notes

- Back up `lite-tracker.db` regularly.
- Keep static assets behind a web server or CDN in production.
- Add authentication and secrets management before internet exposure.
