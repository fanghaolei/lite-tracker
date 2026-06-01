# Demo Asset Workflow

Use this workflow when refreshing README screenshots or `docs/assets/demo/demo-preview.gif`.

## Safety Rules

- Never capture from `http://127.0.0.1:8000`; that port may be running a real local database.
- Always create a fresh `demo-lite-tracker.db` before capture.
- Always serve the demo app on an isolated port, such as `8765`.
- Always set `LITE_TRACKER_DB_PATH` to the demo database path for the capture server.
- Always verify `/api/settings/branding` returns `app_name: "Demo Ledger"` before taking screenshots.
- Always use a temporary Chrome profile so browser `localStorage` from the real app cannot leak into screenshots.
- Do not describe, commit, or keep screenshots if the branding check fails.

## Capture Steps

1. Build the frontend:

   ```powershell
   $env:PATH='C:\Program Files\nodejs;' + $env:PATH
   & 'C:\Program Files\nodejs\npm.cmd' run build
   ```

2. Create a fresh demo database:

   ```powershell
   python -c "from app.demo.demo_data import create_demo_database; create_demo_database('demo-lite-tracker.db')"
   ```

3. Start a demo-only server on an isolated port:

   ```powershell
   $env:LITE_TRACKER_DB_PATH = "$PWD\demo-lite-tracker.db"
   python -m uvicorn main:app --host 127.0.0.1 --port 8765
   ```

4. Verify the server is using demo data:

   ```powershell
   Invoke-WebRequest -Uri http://127.0.0.1:8765/api/settings/branding -UseBasicParsing
   ```

   Continue only if the response contains `"app_name":"Demo Ledger"`.

5. Capture screenshots with headless Chrome and a temporary profile:

   ```powershell
   $chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
   $profile = "$PWD\.chrome-demo-profile"
   $pages = @{
     'portfolio.png' = '/'
     'accounts.png' = '/accounts'
     'cash-flow.png' = '/cash-flow'
     'mortgage.png' = '/mortgage'
   }

   foreach ($name in $pages.Keys) {
     & $chrome --headless=new --disable-gpu --hide-scrollbars --window-size=1440,1050 --force-device-scale-factor=1 --user-data-dir=$profile --virtual-time-budget=5000 --screenshot="$PWD\docs\assets\demo\$name" "http://127.0.0.1:8765$($pages[$name])"
   }
   ```

6. Rebuild the GIF from the demo PNGs. Repeat each page frame so the preview is readable, and end on Portfolio:

   ```powershell
   Add-Type -AssemblyName PresentationCore
   $out = "$PWD\docs\assets\demo\demo-preview.gif"
   $sequence = @(
     'portfolio.png','portfolio.png','portfolio.png',
     'accounts.png','accounts.png','accounts.png',
     'cash-flow.png','cash-flow.png','cash-flow.png',
     'mortgage.png','mortgage.png','mortgage.png',
     'portfolio.png','portfolio.png','portfolio.png'
   )
   $encoder = New-Object System.Windows.Media.Imaging.GifBitmapEncoder
   foreach ($name in $sequence) {
     $stream = [System.IO.File]::OpenRead("$PWD\docs\assets\demo\$name")
     try {
       $bitmap = New-Object System.Windows.Media.Imaging.BitmapImage
       $bitmap.BeginInit()
       $bitmap.CacheOption = [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad
       $bitmap.StreamSource = $stream
       $bitmap.DecodePixelWidth = 960
       $bitmap.EndInit()
       $bitmap.Freeze()
       $encoder.Frames.Add([System.Windows.Media.Imaging.BitmapFrame]::Create($bitmap))
     } finally {
       $stream.Close()
     }
   }
   $outStream = [System.IO.File]::Create($out)
   try { $encoder.Save($outStream) } finally { $outStream.Close() }
   ```

7. Clean temporary files:

   ```powershell
   Remove-Item -LiteralPath .chrome-demo-profile -Recurse -Force -ErrorAction SilentlyContinue
   ```

8. Verify:

   ```powershell
   python -m pytest tests -q
   git status --short
   ```

## Review Checklist

- Screenshots show `Demo Ledger`, not a personal app name.
- Screenshots contain only fake demo accounts and fake demo values.
- `demo-preview.gif` opens and returns to Portfolio at the end.
- README preview links still point to `docs/assets/demo/demo-preview.gif`.
