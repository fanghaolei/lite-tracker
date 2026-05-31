# Troubleshooting

## `npm` or `node` not found on Windows

- Ensure Node.js is installed.
- Open a new terminal after install.
- Verify:
  - `node -v`
  - `npm -v`

## Frontend not updating

- Rebuild assets: `npm run build`
- Hard refresh browser.

## Port 8000 in use

- Stop existing process on port 8000.
- Restart server.

## Test failures

- Reinstall test deps:
  `pip install -r requirements.txt`
- Re-run:
  `python -m pytest tests -v`
