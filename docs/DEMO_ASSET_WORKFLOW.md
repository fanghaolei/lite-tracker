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
     & $chrome --headless=new --disable-gpu --hide-scrollbars --run-all-compositor-stages-before-draw --window-size=1440,1050 --force-device-scale-factor=1 --user-data-dir=$profile --virtual-time-budget=10000 --screenshot="$PWD\docs\assets\demo\$name" "http://127.0.0.1:8765$($pages[$name])"
   }
   ```

6. Rebuild the GIF from the demo PNGs. Set an explicit frame delay so each page is readable, and end on Portfolio:

   ```powershell
   Add-Type -AssemblyName PresentationCore
   $out = "$PWD\docs\assets\demo\demo-preview.gif"
   $sequence = @('portfolio.png', 'accounts.png', 'cash-flow.png', 'mortgage.png', 'portfolio.png')
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

   Inject frame delays after encoding:

   ```powershell
   @'
   from pathlib import Path

   path = Path("docs/assets/demo/demo-preview.gif")
   data = path.read_bytes()
   delay = 180
   control = bytes([0x21, 0xF9, 0x04, 0x08, delay & 0xFF, delay >> 8, 0x00, 0x00])

   pos = 13
   packed = data[10]
   if packed & 0x80:
       pos += 3 * (2 ** ((packed & 0x07) + 1))
   out = bytearray(data[:pos])

   while pos < len(data):
       marker = data[pos]
       if marker == 0x3B:
           out.extend(data[pos:])
           break
       if marker == 0x21:
           start = pos
           pos += 2
           while True:
               size = data[pos]
               pos += 1
               if size == 0:
                   break
               pos += size
           out.extend(data[start:pos])
           continue
       if marker == 0x2C:
           out.extend(control)
           start = pos
           image_packed = data[pos + 9]
           pos += 10
           if image_packed & 0x80:
               pos += 3 * (2 ** ((image_packed & 0x07) + 1))
           pos += 1
           while True:
               size = data[pos]
               pos += 1
               if size == 0:
                   break
               pos += size
           out.extend(data[start:pos])
           continue
       raise ValueError(f"Unexpected GIF marker {marker:#x} at {pos}")

   path.write_bytes(out)
   '@ | python -
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
- `demo-preview.gif` uses readable frame timing.
- `demo-preview.gif` opens and returns to Portfolio at the end.
- README preview links still point to `docs/assets/demo/demo-preview.gif`.
